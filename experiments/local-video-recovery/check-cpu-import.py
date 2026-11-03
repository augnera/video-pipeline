"""CPU import regression only: no model loading, decoding, sampling or GPU work."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import sys
from runlog import append, snapshot, launcher_streams, now


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    a.out.mkdir(parents=True, exist_ok=False)
    with launcher_streams(a.out):
        assert os.environ.get('CUDA_VISIBLE_DEVICES') == '-1'
        append(a.out/'stages.jsonl', {'stage':'cpu_import_started','runId':a.out.name})
        import torch
        spec = importlib.util.spec_from_file_location('cancelled_reference', Path(__file__).with_name('cpu-reference-decode.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        attempts = []
        module.install_cuda_guard(torch, attempts)
        guards = [getattr(torch.cuda, n) for n in ('init','_lazy_init','current_device','set_device')]
        assert len({id(f) for f in guards}) == 4
        assert not torch.cuda.is_initialized() and not torch.cuda.is_available()
        source = Path('/home/chen/ai-models/ComfyUI')
        sys.path.insert(0, str(source))
        sys.argv = ['cpu-import-only','--cpu','--cpu-vae','--fp32-vae',
                    '--disable-async-offload','--disable-pinned-memory',
                    '--disable-dynamic-vram','--disable-comfy-compiler',
                    '--disable-cuda-graphs','--disable-triton-backend',
                    '--disable-xformers','--disable-all-custom-nodes','--offline']
        import comfy.options
        comfy.options.enable_args_parsing()
        import comfy_kitchen as ck
        for name in ck.list_backends():
            if name != 'eager': ck.registry.disable(name)
        ck.registry.set_priority(['eager'])
        import comfy.sd
        import comfy.model_management as mm
        import torch._dynamo
        assert mm.get_torch_device().type == 'cpu'
        assert not torch.cuda.is_initialized() and not attempts
        result = {'utc':now(),'runId':a.out.name,'result':'CPU_IMPORT_REGRESSION_PASS',
                  'distinctGuardObjects':4,'cudaInitialized':False,'guardCalls':attempts,
                  'device':str(mm.get_torch_device()),'torch':torch.__version__,
                  'comfyKitchenImported':True,'comfySdImported':True,'dynamoImported':True,
                  'weightsLoaded':False,'vaeDecodeCount':0,'samplingCount':0,
                  'sharedPytorchSourceModified':False,'referenceDecodeExperiment':'CANCELLED'}
        snapshot(a.out/'result.json',result)
        append(a.out/'stages.jsonl', {'stage':'cpu_import_completed','runId':a.out.name})
        print(json.dumps(result,indent=2))


if __name__ == '__main__':
    main()
