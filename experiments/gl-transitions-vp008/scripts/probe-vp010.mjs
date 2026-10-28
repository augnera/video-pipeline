import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('../..'),out=resolve(root,'orchestrator/output/microsoft-veo-skills-20261028-vp010'),t=JSON.parse(await readFile(out+'/timeline.json'));
const aliases=Object.fromEntries(['react','react-dom','remotion','@remotion/fonts','@remotion/media','@remotion/transitions'].map(x=>[x,resolve('node_modules',x)]));
const url=await bundle({entryPoint:resolve('src/microsoft-skills.tsx'),publicDir:resolve('public'),rspack:false,webpackOverride:c=>({...c,resolve:{...c.resolve,alias:{...c.resolve?.alias,...aliases}}})});
const browser=await openBrowser('chrome',{browserExecutable:resolve('scripts/chrome-software.sh'),chromiumOptions:{gl:'swangle'},logLevel:'error'});const layouts=[],captions=[];await mkdir(out+'/quality-evidence',{recursive:true});
try {const props={qualityProbeLayout:true,qualityProbeNoTransitions:true},c=await selectComposition({serveUrl:url,id:'GLDay9',inputProps:props,puppeteerInstance:browser,timeoutInMilliseconds:120000});
 const frames=[...new Set([...t.scenes.filter(s=>s.kind==='diagram').map(s=>Math.floor((s.from+s.to)/2)),...t.captions.map(s=>Math.floor((s.startSeconds+s.endSeconds)*15))])];
 for(const frame of frames){await renderStill({serveUrl:url,composition:c,inputProps:props,puppeteerInstance:browser,frame,output:out+'/quality-evidence/layout-frame-'+frame+'.png',imageFormat:'png',overwrite:true,timeoutInMilliseconds:120000,logLevel:'error',onBrowserLog:log=>{const at=log.text.indexOf('VP010_LAYOUT:');if(at>=0){try {const r=JSON.parse(log.text.slice(at+13));if(r.frame!==frame)return;captions.push(r);if(r.title&&r.body)layouts.push({scene:r.scene,frame,available:true,mainCenterX:r.title.centerX,secondaryCenterX:r.title.centerX,diagramBottomY:r.body.bottom,clipped:r.title.x<40||r.title.right>1040,main:r.title,body:r.body,centerAlignmentRequired:true,method:'Actual DOM Range bounds after document.fonts.ready; does not certify aesthetic balance'});}catch{}}}});console.log('Probe '+frame);}
 await writeFile(out+'/quality-evidence/layouts.json',JSON.stringify(layouts,null,2));await writeFile(out+'/quality-evidence/caption-layouts.json',JSON.stringify(captions,null,2));
} finally {await browser.close({silent:true})}
