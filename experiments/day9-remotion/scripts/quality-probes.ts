import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..'),root=resolve(project,'../..');
const out=resolve(process.argv[2]),evidence=resolve(out,'quality-evidence');await mkdir(evidence,{recursive:true});
const cfg=JSON.parse(await readFile(resolve(root,process.argv[3]??'orchestrator/config/visual-mvp.json'),'utf8'));
const timeline=JSON.parse(await readFile(resolve(out,'timeline.json'),'utf8'));
const fingerprint=process.argv[4]?JSON.parse(await readFile(resolve(process.argv[4]),'utf8')):null;
const serveUrl=await bundle({entryPoint:resolve(project,'src/vp007.ts'),rootDir:project,publicDir:resolve(project,'public'),rspack:false,symlinkPublicDir:true});
const browser=await openBrowser('chrome',{browserExecutable:cfg.browserExecutable,chromiumOptions:{gl:'swangle'},logLevel:'error'});
const frames=[...new Set<number>(timeline.transitions.filter((t:{durationFrames:number})=>t.durationFrames>0).map((t:{boundaryFrame:number})=>t.boundaryFrame))];
try{
 const composition=await selectComposition({serveUrl,id:'VisualMvp',puppeteerInstance:browser,inputProps:{qualityProbeNoTransitions:true},timeoutInMilliseconds:90000,logLevel:'error'});
 for(const frame of frames){
  await renderStill({serveUrl,composition,puppeteerInstance:browser,inputProps:{qualityProbeNoTransitions:true},frame,output:resolve(evidence,`hard-cut-${frame}.png`),imageFormat:'png',timeoutInMilliseconds:90000,logLevel:'error',overwrite:true,chromiumOptions:{gl:'swangle'}});
  console.log(`Hard-cut control frame ${frame} rendered`);
 }
 await writeFile(resolve(evidence,'probe-run.json'),JSON.stringify({fingerprint,frames,control:'Same timeline, source clocks, typography and camera motion; transitions disabled only. Compare against actual encoded output frames.',modelUsed:null},null,2)+'\n');
}finally{await browser.close({silent:true});await rm(serveUrl,{recursive:true,force:true});}
