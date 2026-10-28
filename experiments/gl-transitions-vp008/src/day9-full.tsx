import React,{useEffect} from 'react';
import {Composition,registerRoot,useCurrentFrame,staticFile} from 'remotion';
import {GLBackground} from './GLTimeline';
import {PocMotionSample} from '../../day9-remotion/src/Vp006R1Root';
import {TimelineVisual} from '../../day9-remotion/src/Vp007Root';
import {ContentDisclosures} from '../../day9-remotion/src/content-disclosure';
import {FullGraphic} from './FullGraphics';
import timeline from '../../../orchestrator/output/day9-vp009/timeline.json';
function LayoutProbe(){const frame=useCurrentFrame();useEffect(()=>{void document.fonts.ready.then(()=>{
 const s=timeline.scenes.find(s=>frame>=s.from&&frame<s.to);if(!s||s.kind!=='diagram')return;
 const rect=(selector:string,range=false)=>{const el=document.querySelector(selector);if(!el)return null;let b;if(range){const r=document.createRange();r.selectNodeContents(el);b=r.getBoundingClientRect()}else b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom,centerX:b.x+b.width/2}};
 const original=s.templateId==='accepted-opinion-card',foundation=s.templateId==='system-foundation';
 const titles=foundation?Array.from(document.querySelectorAll('div')).filter(e=>e.textContent===s.labels?.mainTitle):[];
 // Existing foundation has no DOM markers; its original pixel-zone check remains authoritative.
 if(foundation)return;
 const main=rect(original?'[data-check="headline"]':'[data-vq-title]',true),sub=rect(original?'[data-check="emphasis"]':'[data-vq-subtitle]',true),body=rect(original?'[aria-label="抽象功能叠加示意，不是真实产品界面"]':'[data-vq-body]');
 console.log('VP009_LAYOUT:'+JSON.stringify({scene:s.id,frame,available:!!(main&&sub&&body),mainCenterX:main?.centerX,secondaryCenterX:sub?.centerX,diagramBottomY:body?.bottom,clipped:!!(main&&sub&&(main.x<40||main.right>1040||sub.x<40||sub.right>1040)),centerAlignmentRequired:!original,main,secondary:sub,body,method:'Actual DOM text Range and SVG bounds after document.fonts.ready; not aesthetic judgement',originalCompositionPreserved:original}));
 });},[frame]);return null;}
function Sample({qualityProbeNoTransitions=false,qualityProbeLayout=false}:{qualityProbeNoTransitions?:boolean;qualityProbeLayout?:boolean}){return <PocMotionSample background={<GLBackground timeline={timeline} qualityProbeNoTransitions={qualityProbeNoTransitions} renderVisual={s=>s.kind==='diagram'?<FullGraphic scene={s}/>:<TimelineVisual s={s} fps={30}/>}/>} audioSrc={staticFile(timeline.publicVoice)} captionOffsetSeconds={0} captions={timeline.captions} showBrand={false} showSceneBadge={false} extraOverlay={<><ContentDisclosures entries={timeline.disclosures as any}/>{qualityProbeLayout&&<LayoutProbe/>}</>}/>;}
registerRoot(()=> <Composition id="GLDay9" component={Sample} width={1080} height={1920} fps={30} durationInFrames={timeline.durationInFrames}/>);
