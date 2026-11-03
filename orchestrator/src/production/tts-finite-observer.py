"""Optional observation-only forward hook for a separately reviewed TTS diagnostic run.
No model loading, global patches, replacement values, or generation on import.
"""
import datetime,json,os,pathlib
class NonFiniteTTSLogits(RuntimeError):pass

def inspect_logits(logits):
    # Inspect last-token outputs on CPU; do not change the inference tensor or precision.
    import torch
    values=logits.detach()[..., -1, :].to(device='cpu',dtype=torch.float32)
    finite=torch.isfinite(values)
    good=values[finite]
    return {'shape':list(logits.shape),'sourceDtype':str(logits.dtype),'sourceDevice':str(logits.device),
            'nanCount':int(torch.isnan(values).sum()),'positiveInfCount':int(torch.isposinf(values).sum()),
            'negativeInfCount':int(torch.isneginf(values).sum()),'finiteMin':float(good.min()) if good.numel() else None,
            'finiteMax':float(good.max()) if good.numel() else None,'allFinite':bool(finite.all())},values

def install_observer(model,out):
    out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
    journal=out/'finite-observer.jsonl';calls=0
    def record(row):
        row={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),**row}
        with journal.open('a') as f:f.write(json.dumps(row,ensure_ascii=False)+'\n');f.flush();os.fsync(f.fileno())
    def after_forward(module,args,output):
        nonlocal calls
        calls+=1
        logits=getattr(output,'logits',None)
        if logits is None:raise RuntimeError('TTS diagnostic hook expected output.logits; no silent bypass')
        stats,values=inspect_logits(logits)
        if calls==1:record({'event':'first_logits_observed','call':calls,**stats})
        if not stats['allFinite']:
            import numpy as np
            # Unique names; no overwrite of original logs/tensors.
            target=out/('invalid-logits-'+str(calls)+'.npy')
            with target.open('xb') as f:np.save(f,values.numpy());f.flush();os.fsync(f.fileno())
            record({'event':'nonfinite_logits_stop','call':calls,'tensorPath':str(target),**stats})
            raise NonFiniteTTSLogits('Non-finite raw TTS logits detected before softmax/multinomial; no replacement or retry')
        # Returning None preserves the exact upstream output object.
    handle=model.gpt.inference_model.register_forward_hook(after_forward)
    record({'event':'observer_installed','mode':'raw_last_token_logits_CPU_observation','inferenceParametersChanged':False,
            'limitations':'Detects nonfinite raw logits only. Does not establish hardware root cause or cover every downstream probability transformation.'})
    return handle
