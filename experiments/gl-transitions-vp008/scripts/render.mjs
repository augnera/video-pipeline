import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia} from '@remotion/renderer';
import {resolve} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import transitions from 'gl-transitions';
const root=resolve('../..'), out=resolve(root,'orchestrator/output/day9-vp008');
await mkdir(out+'/previews',{recursive:true});
const serveUrl=await bundle({entryPoint:resolve('src/index.tsx'),publicDir:resolve('public'),rspack:false});
const browser=await openBrowser('chrome',{browserExecutable:resolve('scripts/chrome-software.sh'),chromiumOptions:{gl:'swangle'},logLevel:'error'});
const selected=process.argv.slice(2), list=selected.length?transitions.filter(x=>selected.includes(x.name)):transitions;
try{
 for (const t of list){
  const path=out+'/previews/'+t.name+'.mp4',evidence=out+'/previews/'+t.name+'.json';
  let prior;try{prior=JSON.parse(await readFile(evidence))}catch{};if(prior?.status==='EXPORTED'&&prior?.renderRevision===2){console.log('Cached '+t.name);continue}
  if(prior?.status==='FAILED'&&prior?.attemptCount>=2){console.log('Retry bound reached '+t.name);continue}
  const start=Date.now();let result={attemptCount:(prior?.attemptCount??0)+1,previousFailure:prior?.status==='FAILED'?prior:null,renderRevision:2,endpointGuard:'First and last transition frames show exact source/destination outside shader; prevents observed initial capture flash.',name:t.name,params:t.defaultParams,backend:'Chrome149 / WebGL2 ANGLE SwiftShader offscreen (swiftshader-webgl) / CPU libx264',width:360,height:640,fps:30,frames:30,extraTextures:t.textures,startedAt:new Date().toISOString()};
  try{
   const inputProps={name:t.name,params:t.defaultParams};
   const composition=await selectComposition({serveUrl,id:'GLPreview',inputProps,puppeteerInstance:browser,timeoutInMilliseconds:60000,logLevel:'error'});
   await renderMedia({serveUrl,composition,inputProps,puppeteerInstance:browser,codec:'h264',outputLocation:path,concurrency:1,crf:18,pixelFormat:'yuv420p',timeoutInMilliseconds:60000,logLevel:'error',chromiumOptions:{gl:'swangle'}});
   result={...result,status:'EXPORTED',previewPath:path.slice(root.length+1),elapsedSeconds:(Date.now()-start)/1000};
  }catch(e){result={...result,status:'FAILED',error:String(e.stack||e).slice(0,4000),elapsedSeconds:(Date.now()-start)/1000};}
  await writeFile(evidence,JSON.stringify(result,null,2)+'\n');console.log(t.name+' '+result.status+' '+result.elapsedSeconds+'s');
 }
} finally {await browser.close({silent:true});}
