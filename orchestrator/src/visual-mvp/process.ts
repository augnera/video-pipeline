import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
export async function runProcess(cmd:string,args:string[],options:{cwd?:string;log?:string;echo?:boolean}={}){
 return new Promise<Buffer>((done,fail)=>{
  const child=spawn(cmd,args,{cwd:options.cwd??root,env:{...process.env,NO_COLOR:'1'}});const out:Buffer[]=[],err:Buffer[]=[];
  const log=options.log?createWriteStream(options.log):null;
  child.stdout.on('data',(b:Buffer)=>{if(log)log.write(b);else out.push(b);if(options.echo)process.stdout.write(b);});
  child.stderr.on('data',(b:Buffer)=>{if(log)log.write(b);else err.push(b);if(options.echo)process.stderr.write(b);});
  child.on('error',fail);child.on('close',code=>{const complete=()=>code===0?done(Buffer.concat(out)):fail(new Error(`${cmd} exited ${code}; ${options.log?'see '+relative(root,options.log):Buffer.concat(err).toString().slice(-2200)}`));if(log)log.end(complete);else complete();});
 });
}
