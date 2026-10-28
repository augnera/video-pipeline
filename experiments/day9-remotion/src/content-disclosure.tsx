import {useCurrentFrame} from 'remotion';
export interface Disclosure {assetId:string;fromFrame:number;toFrame:number;status:'pending_review'|'not_required'|'required';label:string|null;reason:string}
export function validateDisclosures(entries:Disclosure[]){
 for(const e of entries){
  if(!['pending_review','not_required','required'].includes(e.status))throw new Error('Unknown disclosure review status');
  if(!e.reason?.trim())throw new Error('Disclosure review needs a reason');
  if(e.fromFrame<0||e.toFrame<=e.fromFrame)throw new Error('Invalid disclosure interval');
  if(e.status==='required'&&!e.label?.trim())throw new Error('Required disclosure must have explicit text');
 }
}
// A private preview may show unresolved entries; publication must resolve them.
export function disclosureReviewComplete(entries:Disclosure[]){validateDisclosures(entries);return entries.every(e=>e.status!=='pending_review');}
export function activeDisclosures(entries:Disclosure[],frame:number){validateDisclosures(entries);return entries.filter(e=>e.status==='required'&&frame>=e.fromFrame&&frame<e.toFrame);}
export function ContentDisclosures({entries}:{entries:Disclosure[]}){
 const f=useCurrentFrame();validateDisclosures(entries);
 const active=activeDisclosures(entries,f);
 if(!active.length)return null;
 return <div data-content-disclosure style={{position:'absolute',left:80,right:80,bottom:300,color:'#fff',background:'#0a1028dc',padding:'14px 20px',fontSize:32,textAlign:'center',borderRadius:12}}>{active.map(e=>e.label).join(' / ')}</div>;
}
