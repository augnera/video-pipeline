import {parseArgs} from 'node:util';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runProcess} from './process.js';
import {runQualityGate} from './quality-run.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');let out='';
try{
 const {values}=parseArgs({options:{config:{type:'string'},out:{type:'string'},resume:{type:'boolean'},'plan-only':{type:'boolean'},'quality-only':{type:'boolean'}}});
 const config=resolve(root,values.config??'orchestrator/config/visual-mvp.json');const cfg=JSON.parse(await readFile(config,'utf8'));out=resolve(root,values.out??cfg.output);
 if(!values['quality-only']){
  const args=['--import',resolve(root,'orchestrator/node_modules/tsx/dist/loader.mjs'),resolve(root,'orchestrator/src/visual-mvp/cli.ts'),'--config',relative(root,config),'--out',out];
  if(values.resume)args.push('--resume');if(values['plan-only'])args.push('--plan-only');
  await runProcess(process.execPath,args,{echo:true});
 }
 if(!values['plan-only']){console.log('[visual-mvp] quality-gate → bounded repair → recheck');const report=await runQualityGate(out,{configPath:config});if(report.automaticSummary.FAIL>0)process.exitCode=2;}
}catch(e){
 console.error(String(e));process.exitCode=1;
 if(out){
  await mkdir(out,{recursive:true});const rules=JSON.parse(await readFile(resolve(root,'orchestrator/config/quality-rules.json'),'utf8'));
  const failure={version:rules.version,overallResult:'NOT_EVALUATED',executionFailed:true,error:String(e),checks:rules.rules.map((r:{id:string;human:string})=>({ruleId:r.id,result:'NOT_EVALUATED',automatic:{result:'NOT_EVALUATED',evidence:'Media/check execution incomplete'},modelAssisted:{result:'NOT_EVALUATED',reason:'Not run'},human:{result:'NOT_EVALUATED',questions:[r.human]},repairAction:null,repairAttempts:0,beforeAfterDifference:[],recheck:{performed:false,result:'NOT_EVALUATED'},manualGateRequired:true})),notEvaluatedIsNotPass:true,publicationReady:false};
  const save=(name:string,data:unknown)=>writeFile(resolve(out,name),JSON.stringify(data,null,2)+'\n');
  await save(`quality-attempt-${Date.now()}.json`,failure);await save('quality-rules.json',rules);
  try{await access(resolve(out,'quality-report.json'));}catch{await save('quality-report.json',failure);}
  try{await access(resolve(out,'repair-log.json'));}catch{await save('repair-log.json',{version:rules.version,repairs:[],executionError:String(e)});}
 }
}
