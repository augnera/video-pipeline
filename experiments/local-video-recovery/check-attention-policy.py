"""No-CUDA regressions for the fixed Comfy initialization and SDPA call path."""
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import types
import unittest
from unittest.mock import patch
from runlog import snapshot

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out',type=Path,required=True)
arg=parser.parse_args()
arg.out.mkdir(parents=True,exist_ok=False)
assert os.environ.get('CUDA_VISIBLE_DEVICES')=='-1','Use CUDA_VISIBLE_DEVICES=-1'
import torch
torch.set_num_threads(1)
assert not torch.cuda.is_initialized()
def forbid_cuda(*a,**k):raise AssertionError('CUDA initialization prohibited in this regression')
torch.cuda.init=forbid_cuda
torch.cuda._lazy_init=forbid_cuda

def flags():
    c=torch.backends.cuda
    return {'math':c.math_sdp_enabled(),'flash':c.flash_sdp_enabled(),'memoryEfficient':c.mem_efficient_sdp_enabled(),'cudnn':c.cudnn_sdp_enabled()}

# Reproduce the old order with actual Comfy imports, not an invented initializer.
torch.backends.cuda.enable_math_sdp(True);torch.backends.cuda.enable_flash_sdp(False)
torch.backends.cuda.enable_mem_efficient_sdp(False);torch.backends.cuda.enable_cudnn_sdp(False)
before_import=flags()
source=Path('/home/chen/ai-models/ComfyUI')
expected='426f5eea52a7ece1dd599fff4cb6cd1f352ddd24'
assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==expected
profile=json.loads(Path(__file__).with_name('wan21-profile.json').read_text())
sys.path.insert(0,str(source))
sys.argv=['cpu-attention-regression']+[x for x in profile['comfyArgs'] if x!='--lowvram']+['--cpu','--base-directory',str(arg.out/'runtime')]
import comfy.options
comfy.options.enable_args_parsing()
import comfy_kitchen as ck
import comfy.sd
import comfy.sample
import comfy.model_management as mm
import comfy.ops as ops
import comfy.ldm.modules.attention as attention
import comfy.ldm.wan.model as wan
import comfy.text_encoders.t5 as t5
from attention_policy import MathAttentionPolicy
after_import=flags()
assert not torch.cuda.is_initialized()
originals={'sdpa':ops.scaled_dot_product_attention,'pytorch':attention.attention_pytorch,
           'optimized':attention.optimized_attention,'masked':attention.optimized_attention_masked,
           'wan':wan.optimized_attention}
ops_optional={k:getattr(ops,k) for k in ('SDPA_BACKEND_PRIORITY','SDPA_CONTIGUOUS_KV_L2_SIZE','sdpa_kernel') if hasattr(ops,k)}
applied_states=[]
primitive_evidence=[]


class AttentionRegression(unittest.TestCase):
    def setUp(self):
        ops.scaled_dot_product_attention=originals['sdpa']
        attention.attention_pytorch=originals['pytorch']
        attention.optimized_attention=originals['optimized']
        attention.optimized_attention_masked=originals['masked']
        wan.optimized_attention=originals['wan']
        for k in ('SDPA_BACKEND_PRIORITY','SDPA_CONTIGUOUS_KV_L2_SIZE','sdpa_kernel'):
            if k in ops_optional:setattr(ops,k,ops_optional[k])
            elif hasattr(ops,k):delattr(ops,k)

    def install(self):
        policy=MathAttentionPolicy(torch,ck,ops,attention,wan,t5)
        applied_states.append({'case':self.id(),'state':policy.assert_intact()})
        return policy

    def test_actual_import_reproduces_old_guard_failure_then_fixed_order_passes(self):
        self.assertTrue(before_import['math']);self.assertFalse(before_import['flash'])
        self.assertTrue(after_import['flash']);self.assertTrue(after_import['memoryEfficient'])
        with self.assertRaises(AssertionError):
            assert after_import['math'] and not after_import['flash'] and not after_import['memoryEfficient']
        self.assertEqual(self.install().assert_intact()['flash'],False)

    def test_real_wan_and_t5_dispatch_reach_guarded_cpu_sdpa(self):
        policy=self.install();q=torch.ones((1,3,8),device='cpu')
        calls=[];original=torch.nn.functional.scaled_dot_product_attention
        def spy(*a,**kw):calls.append(flags());return original(*a,**kw)
        with patch.object(torch.nn.functional,'scaled_dot_product_attention',side_effect=spy):
            y=wan.optimized_attention(q,q,q,heads=2)
            route=t5.optimized_attention_for_device(torch.device('cpu'),small_input=True)
            self.assertIs(route,policy.guarded_attention)
            z=route(q,q,q,heads=2)
            # Wan's actual path transfers tensor ownership through containers.
            v=wan.optimized_attention(*(attention.AttentionTensorContainer(q.clone()) for _ in range(3)),heads=2)
        self.assertEqual(len(calls),3);self.assertTrue(torch.isfinite(y).all() and torch.equal(y,z) and torch.equal(y,v))
        self.assertTrue(all(s=={'math':True,'flash':False,'memoryEfficient':False,'cudnn':False} for s in calls))
        primitive_evidence.append({'case':self.id(),'device':'cpu','statesAtPrimitiveCall':calls,'containerPathChecked':True})

    def test_actual_gpu_wrapper_large_branch_on_cpu_cannot_reenable_fused_backends(self):
        # CPU imports cannot select this branch. Extract its exact function AST
        # from the pinned source, execute it with CPU tensors and real sdpa_kernel.
        tree=ast.parse((source/'comfy/ops.py').read_text())
        candidates=[n for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) and n.name=='scaled_dot_product_attention']
        node=next(n for n in candidates if any(isinstance(k,ast.With) and 'sdpa_kernel' in ast.unparse(k) for k in ast.walk(n)))
        ops.sdpa_kernel=torch.nn.attention.sdpa_kernel
        ops.SDPA_CONTIGUOUS_KV_L2_SIZE=0
        ops.SDPA_BACKEND_PRIORITY=[torch.nn.attention.SDPBackend.FLASH_ATTENTION,torch.nn.attention.SDPBackend.MATH]
        exec(compile(ast.Module(body=[node],type_ignores=[]),str(source/'comfy/ops.py'),'exec'),ops.__dict__)
        policy=self.install();q=torch.ones((1,1,512,256),device='cpu')
        calls=[];original=torch.nn.functional.scaled_dot_product_attention
        def spy(*a,**kw):calls.append(flags());return original(*a,**kw)
        with patch.object(torch.nn.functional,'scaled_dot_product_attention',side_effect=spy):y=ops.scaled_dot_product_attention(q,q,q)
        self.assertEqual(len(calls),1);self.assertTrue(torch.isfinite(y).all())
        self.assertEqual(calls[0],{'math':True,'flash':False,'memoryEfficient':False,'cudnn':False})
        self.assertEqual(ops.SDPA_BACKEND_PRIORITY,[policy.math])
        primitive_evidence.append({'case':self.id(),'device':'cpu','exactPinnedGpuWrapperAst':True,'statesAtPrimitiveCall':calls})

    def test_later_flag_override_fails_before_primitive(self):
        policy=self.install();q=torch.ones((1,1,2,4),device='cpu')
        torch.backends.cuda.enable_flash_sdp(True)
        with patch.object(torch.nn.functional,'scaled_dot_product_attention') as primitive:
            with self.assertRaises(AssertionError):ops.scaled_dot_product_attention(q,q,q)
            primitive.assert_not_called()

    def test_later_priority_override_fails_before_primitive(self):
        ops.SDPA_BACKEND_PRIORITY=[torch.nn.attention.SDPBackend.MATH]
        policy=self.install();ops.SDPA_BACKEND_PRIORITY.append(torch.nn.attention.SDPBackend.FLASH_ATTENTION)
        with self.assertRaises(AssertionError):policy.assert_intact()

    def test_per_layer_preference_and_runtime_overrides_are_rejected(self):
        self.install();q=torch.ones((1,3,8),device='cpu')
        bad=unittest.mock.Mock()
        with self.assertRaises(AssertionError):wan.optimized_attention(q,q,q,heads=2,preferred_attention=types.SimpleNamespace(function=bad))
        with self.assertRaises(AssertionError):wan.optimized_attention(q,q,q,heads=2,transformer_options={'optimized_attention_override':bad})
        bad.assert_not_called()

    def test_child_checks_bootstrap_before_any_weight_loading(self):
        child=ast.parse(Path(__file__).with_name('wan21-child.py').read_text())
        calls=[n for n in ast.walk(child) if isinstance(n,ast.Call)]
        install=next(n.lineno for n in calls if isinstance(n.func,ast.Name) and n.func.id=='MathAttentionPolicy')
        checked=next(n.lineno for n in calls if isinstance(n.func,ast.Name) and n.func.id=='report' and n.args and isinstance(n.args[0],ast.Constant) and n.args[0].value=='bootstrap_completed')
        imports=[n.lineno for n in ast.walk(child) if isinstance(n,ast.Import) and any(x.name.startswith('comfy.') for x in n.names)]
        self.assertLess(max(imports),install)
        for n in calls:
            if isinstance(n.func,ast.Attribute) and n.func.attr in ('load_clip','load_diffusion_model','VAE'):
                self.assertGreater(n.lineno,checked)
        self.assertLess(install,checked)


suite=unittest.defaultTestLoader.loadTestsFromTestCase(AttentionRegression)
result=unittest.TextTestRunner(verbosity=2).run(suite)
assert not torch.cuda.is_initialized()
snapshot(arg.out/'result.json',{'verificationOnly':True,'cudaInitialized':torch.cuda.is_initialized(),'modelWeightsLoaded':False,'samplingAttempts':0,'testsRun':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'passed':result.wasSuccessful(),'beforeActualComfyImport':before_import,'afterActualComfyImport':after_import,'appliedStates':applied_states,'primitiveEvidence':primitive_evidence,'comfyCommit':expected,'sourceSha256':{n:hashlib.sha256((source/n).read_bytes()).hexdigest() for n in ['comfy/ops.py','comfy/model_management.py','comfy/ldm/modules/attention.py','comfy/ldm/wan/model.py','comfy/text_encoders/t5.py']},'gpuWrapperCoverage':'exact pinned function AST executed on CPU with spy; actual CUDA kernels NOT_EVALUATED'})
sys.exit(0 if result.wasSuccessful() else 1)
