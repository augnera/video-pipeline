import { resolve } from 'node:path';
import { root, read, save, exists } from './core.ts';
import { runProcess } from '../visual-mvp/process.ts';
/** Local-first suggestions only. The Director still makes the second arrangement. */
export async function localAssetProposal(brief:any, voiced:any, c:any, dir:string) {
    const config = await read(c.assets.libraryConfigRef);
    if (!await exists(config.indexPath)) {
        const p={mode:'rules',modelUsed:null,recommendations:[],gaps:[{reason:'Local reuse index not built',action:'npm --prefix orchestrator run assets -- build'}]};
        await save(dir+'/asset-proposal.json',p); return p;
    }
    const timed=structuredClone(brief);
    for(const q of timed.requests){
        const s=voiced?.shots?.find((x:any)=>x.shotNumber===q.shotNumber);
        if(q.durationSeconds==null && s) q.durationSeconds=s.voiceover.timelineEndSeconds-s.voiceover.timelineStartSeconds;
        q.noVisibleFace ??= true;
    }
    await save(dir+'/local-reuse-brief.json',timed);
    await runProcess(c.paths.python,[resolve(root,'orchestrator/src/asset-library/library.py'),'--config',resolve(root,c.assets.libraryConfigRef),'match','--brief',dir+'/local-reuse-brief.json','--out',dir,'--purpose','private_review'],{log:dir+'/local-library.log'});
    const proposal = await read(dir+'/asset-proposal.json');
    if (proposal.gaps.length && c.assets.externalGapSearch && c.assets.networkConfigRef) {
        await runProcess(c.paths.python,[resolve(root,'orchestrator/src/asset-library/network.py'),'--config',resolve(root,c.assets.networkConfigRef),'discover','--brief',dir+'/local-reuse-brief.json','--out',dir+'/network-discovery'],{log:dir+'/network-discovery.log'});
        proposal.externalDiscovery=dir+'/network-discovery/discovery.json';
        await save(dir+'/asset-proposal.json',proposal);
    }
    return proposal;
}
