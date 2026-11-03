"""Download only missing pinned Wan2.1 small-model components; CPU/network only."""
import hashlib
import json
from pathlib import Path
import urllib.request
from runlog import snapshot, append, now

REPO='Comfy-Org/Wan-2.1'
REV='123acf1cc74bccbb9bfff8ac1ee72edc08c2341d'
FILES=[('split_files/diffusion_models/wan2.1_t2v_1.3B_bf16.safetensors',2838104528,'6f999b0d6cb9a72b3d98ac386ed96f57f8cecae13994a69232514ea4974ad5fd'),
       ('split_files/vae/wan_2.1_vae.safetensors',253815318,'2fc39d31359a4b0a64f55876d8ff7fa8d780956ae2cb13463b0223e15148976b')]

def main():
    root=Path(__file__).resolve().parents[2]
    current=json.loads((root/'orchestrator/output/local-video-recovery-20261029/stage-b/current-run.json').read_text())
    out=Path(current['out']);assets=root/'local-assets/experiments/video-recovery-20261029/wan21'
    assets.mkdir(parents=True,exist_ok=True)
    entries=[]
    for remote,size,expected in FILES:
        target=assets/Path(remote).name;url=f'https://huggingface.co/{REPO}/resolve/{REV}/{remote}?download=true'
        if not target.exists():
            partial=target.with_suffix(target.suffix+'.partial')
            if partial.exists():raise RuntimeError('Existing partial retained; inspect before explicit resume: '+str(partial))
            append(out/'asset-download.jsonl',{'runId':current['runId'],'event':'download_start','url':url,'path':str(target),'expectedSha256':expected})
            with urllib.request.urlopen(url,timeout=30) as response, partial.open('xb') as f:
                count=0
                while True:
                    chunk=response.read(4*1024*1024)
                    if not chunk:break
                    f.write(chunk);count+=len(chunk)
                    if count%(128*1024*1024)==0:
                        f.flush();append(out/'asset-download.jsonl',{'runId':current['runId'],'event':'download_progress','file':target.name,'bytes':count})
                f.flush();__import__('os').fsync(f.fileno())
            if partial.stat().st_size!=size:raise RuntimeError('Download size mismatch; retain partial')
            digest=hashlib.file_digest(partial.open('rb'),'sha256').hexdigest()
            if digest!=expected:raise RuntimeError('SHA mismatch; retain partial')
            partial.rename(target)
        else:
            assert target.stat().st_size==size and hashlib.file_digest(target.open('rb'),'sha256').hexdigest()==expected
        entry={'source':REPO,'revision':REV,'file':remote,'url':url,'path':str(target),'bytes':size,'sha256':expected,'verifiedAt':now(),'license':'Apache-2.0 model-card declaration, inherited Wan2.1 weight license'}
        entries.append(entry);snapshot(out/'assets.json',entries);print(target.name,'verified',flush=True)
    # Existing quantized UMT5 and embedded tokenizer are not downloaded again.
    append(out/'asset-download.jsonl',{'runId':current['runId'],'event':'downloads_complete','files':len(entries),'gpuInitialized':False})


if __name__=='__main__':main()
