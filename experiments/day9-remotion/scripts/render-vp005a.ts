import { spawn } from "node:child_process";
import { readFile, writeFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const project=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const root=resolve(project,"../..");
const out=resolve(root,"orchestrator/output/day9-vp005a");
const browser=process.env.VP003A_CHROME??"/home/chen/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
await access(browser);
const timeline=JSON.parse(await readFile(resolve(out,"timeline.json"),"utf8"));
const runs=[];
 for(const variant of [
  {name:"day9-preview",entry:"src/vp005a.ts",composition:"Day9Full"},
  {name:"day9-clean",entry:"src/vp005a-clean.ts",composition:"Day9FullClean"},
 ]){
 const video=resolve(out,`${variant.name}.mp4`);
 try{await access(video);throw new Error(`Refusing to overwrite ${video}`)}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}
 const args=["--require","./scripts/loopback.cjs","node_modules/@remotion/cli/remotion-cli.js","render",variant.entry,variant.composition,video,
   `--browser-executable=${browser}`,"--gl=swangle","--concurrency=2","--codec=h264","--audio-codec=aac","--audio-bitrate=192k","--crf=18","--pixel-format=yuv420p","--log=info"];
 const startedAt=new Date().toISOString(),t0=performance.now();
 const child=spawn(process.execPath,args,{cwd:project,env:{...process.env,NO_COLOR:"1",npm_config_cache:"/tmp/vp005a-npm-cache"}});
 let log="";child.stdout.on("data",b=>{log+=b;process.stdout.write(b)});child.stderr.on("data",b=>{log+=b;process.stderr.write(b)});
 const exitCode=await new Promise<number|null>(done=>child.on("close",done));
 const renderSeconds=(performance.now()-t0)/1000;
 await writeFile(resolve(out,`${variant.name}.render.log`),log,{flag:"wx"});
 const run={variant:variant.name,startedAt,completedAt:new Date().toISOString(),exitCode,renderSeconds,
   browserExecutable:browser,softwareRendering:"Remotion swangle; CPU H.264; no GPU model",audioSource:timeline.audio.path,audioSha256:timeline.audio.sha256,
   fps:30,width:1080,height:1920,durationInFrames:2514,durationSeconds:2514/30,videoPath:video};
 await writeFile(resolve(out,`${variant.name}.render.json`),JSON.stringify(run,null,2)+"\n",{flag:"wx"});runs.push(run);
 if(exitCode!==0)throw new Error(`${variant.name} render failed with exit ${exitCode}`);
}
console.log(JSON.stringify(runs,null,2));
