import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const opt=(key,fallback)=>process.argv.find(x=>x.startsWith('--'+key+'='))?.split('=').slice(1).join('=')??fallback;
const require=createRequire(import.meta.url),root=resolve('../..'),out=resolve(root,opt('out','orchestrator/output/day9-vp008'));
const entry=opt('entry','src/day9.tsx');
const aliases=Object.fromEntries(['react','react-dom','remotion','@remotion/fonts','@remotion/media','@remotion/transitions'].map(x=>[x,resolve('node_modules',x)]));
const serveUrl=await bundle({entryPoint:resolve(entry),publicDir:resolve('public'),rspack:false,webpackOverride:c=>({...c,resolve:{...c.resolve,alias:{...c.resolve?.alias,...aliases}}})});
const browser=await openBrowser('chrome',{browserExecutable:resolve('scripts/chrome-software.sh'),chromiumOptions:{gl:'swangle'},logLevel:'error'});
let renderOnlySeconds=null;const started=Date.now(),t=JSON.parse(await readFile(out+'/timeline.json'));
await mkdir(out+'/quality-evidence',{recursive:true});
try{
 const composition=await selectComposition({serveUrl,id:'GLDay9',puppeteerInstance:browser,timeoutInMilliseconds:90000,logLevel:'error'});
 if(!process.argv.includes('--probes-only')){const mediaStart=Date.now();await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',outputLocation:out+'/sample-picture.mp4',concurrency:2,crf:18,pixelFormat:'yuv420p',timeoutInMilliseconds:90000,logLevel:'error',chromiumOptions:{gl:'swangle'},onProgress:p=>{if(p.renderedFrames%60===0)console.log('Rendered '+p.renderedFrames)}});renderOnlySeconds=(Date.now()-mediaStart)/1000;}
 const layouts=[];
 if(entry==='src/day9-full.tsx'){for(const scene of t.scenes.filter(s=>s.kind==='diagram'&&s.templateId!=='system-foundation')){const frame=Math.min(scene.to-1,scene.from+Math.min(217,Math.floor((scene.to-scene.from)*.8)));const inputProps={qualityProbeNoTransitions:true,qualityProbeLayout:true};const c=await selectComposition({serveUrl,id:'GLDay9',inputProps,puppeteerInstance:browser,timeoutInMilliseconds:90000,logLevel:'error'});await renderStill({serveUrl,composition:c,inputProps,puppeteerInstance:browser,frame,output:out+'/quality-evidence/layout-'+scene.id+'.png',imageFormat:'png',overwrite:true,timeoutInMilliseconds:90000,logLevel:'error',chromiumOptions:{gl:'swangle'},onBrowserLog:log=>{const text=log.text;const at=text.indexOf('VP009_LAYOUT:');if(at>=0){try{const row=JSON.parse(text.slice(at+13));if(row.scene===scene.id){const prev=layouts.findIndex(x=>x.scene===row.scene);if(prev>=0)layouts[prev]=row;else layouts.push(row);}}catch{}}}});}}
 await writeFile(out+'/quality-evidence/layouts.json',JSON.stringify(layouts,null,2)+'\n');
 for(const cut of t.transitions){
  if(!cut.durationFrames)continue;
  for(const control of [false,true]){
   const probeProps={qualityProbeNoTransitions:control};
   const probeComposition=await selectComposition({serveUrl,id:'GLDay9',inputProps:probeProps,puppeteerInstance:browser,timeoutInMilliseconds:90000,logLevel:'error'});
   await renderStill({serveUrl,composition:probeComposition,puppeteerInstance:browser,inputProps:probeProps,frame:cut.boundaryFrame,output:out+'/quality-evidence/'+(control?'hard-cut-':'effect-')+cut.boundaryFrame+'.png',imageFormat:'png',overwrite:true,timeoutInMilliseconds:90000,logLevel:'error',chromiumOptions:{gl:'swangle'}});
  }
 }
 await writeFile(out+(process.argv.includes('--probes-only')?'/day9-probes.json':'/day9-render.json'),JSON.stringify({status:process.argv.includes('--probes-only')?'PROBES_EXPORTED':'EXPORTED',renderOnlySeconds,backend:'Chrome149 CanvasDrawElement / WebGL2 ANGLE SwiftShader offscreen (swiftshader-webgl) / libx264 CPU',durationSeconds:t.durationInFrames/t.fps,elapsedSeconds:(Date.now()-started)/1000,concurrency:2,qualityProbeFrames:t.transitions.map(x=>x.boundaryFrame),mediaCombinations:t.transitions.map(x=>({transitionId:x.transitionId,from:t.scenes.find(s=>s.id===x.fromShotId).kind,to:t.scenes.find(s=>s.id===x.toShotId).kind})),subjectiveEvaluation:'NOT_EVALUATED'},null,2)+'\n');
}catch(e){await writeFile(out+'/day9-render-error.json',JSON.stringify({error:String(e.stack||e),elapsedSeconds:(Date.now()-started)/1000},null,2));throw e;}finally{await browser.close({silent:true});}
