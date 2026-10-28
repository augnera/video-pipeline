import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pictureStyle, progress, sourceFrame, type EffectType} from '../src/visual-effects';
import config from '../src/generated/vp006-r1-effects.json';
test('five minimal types are finite, including zero-duration hard cuts',()=>{
 for(const type of ['hard_cut','crossfade','slide_in','blur_transition','zoom_in'] as EffectType[]){
  for(const frame of [-1,0,6,11,99]){
   const s=pictureStyle({type,durationFrames:12},frame);
   assert.ok(s.opacity>=0&&s.opacity<=1);assert.ok(!JSON.stringify(s).match(/NaN|Infinity/));
  }
 }
 assert.equal(pictureStyle({type:'hard_cut',durationFrames:0},0).opacity,1);
});
test('incoming crossfade covers an opaque outgoing layer, preventing dark dip',()=>{
 for(let i=0;i<12;i++)assert.equal(pictureStyle({type:'crossfade',durationFrames:12},i,false).opacity,1);
 assert.equal(pictureStyle({type:'crossfade',durationFrames:12},0).opacity,0);
 assert.equal(pictureStyle({type:'crossfade',durationFrames:12},11).opacity,1);
});
test('blur clears and zoom settles exactly on final frame',()=>{
 assert.equal(pictureStyle({type:'blur_transition',durationFrames:12},11).filter,'blur(0px)');
 assert.equal(pictureStyle({type:'zoom_in',durationFrames:12},11).transform,'scale(1)');
 assert.equal(pictureStyle({type:'slide_in',durationFrames:12},11).transform,'translateX(0px)');
});
test('overlap holds source edges without retiming matched source',()=>{
 assert.equal(sourceFrame(101,107,263),0);assert.equal(sourceFrame(107,107,263),0);
 assert.equal(sourceFrame(200,107,263),93);assert.equal(sourceFrame(268,107,263),155);
 assert.equal(progress(99,12),1);
});
test('all 546 frames covered; transition durations do not subtract from timeline',()=>{
 assert.equal(config.scenes[0].from,0);assert.equal(config.scenes.at(-1)?.to,546);
 for(let f=0;f<546;f++){
  const active=config.scenes.filter(s=>{const enter=config.transitions.find(t=>t.boundaryFrame===s.from);const exit=config.transitions.find(t=>t.boundaryFrame===s.to);return f>=(enter?.startFrame??s.from)&&f<(exit?exit.startFrame+exit.durationFrames:s.to)});
  assert.ok(active.length>=1&&active.length<=2);
 }
 for(const t of config.transitions)assert.ok(t.startFrame>=0&&t.startFrame+t.durationFrames<=546);
});

test('visible transition set settles cleanly and never generates invalid CSS',()=>{
 for(const type of ['whip_pan','zoom_blur','slide_wipe'] as EffectType[])for(const frame of [0,1,5,10,11])for(const incoming of [true,false]){
  const s=pictureStyle({type,durationFrames:12},frame,incoming);assert.ok(!JSON.stringify(s).match(/NaN|Infinity/));assert.ok(s.opacity>=0&&s.opacity<=1);
 }
 assert.equal(pictureStyle({type:'zoom_blur',durationFrames:12},11).filter,'blur(0px)');
 assert.equal(pictureStyle({type:'slide_wipe',durationFrames:12},11).clipPath,'inset(0 0% 0 0)');
});
test('whip-pan tiles cover the viewport throughout pan, including scaled blur overscan',()=>{
 for(let frame=0;frame<10;frame++){
  const bounds=[false,true].map(incoming=>{const s=pictureStyle({type:'whip_pan',durationFrames:10,widthPx:1080},frame,incoming);const x=Number(s.transform.match(/translateX\(([-\d.]+)px\)/)![1]);const scale=Number(s.transform.match(/scale\(([-\d.]+)\)/)![1]);return [x+540*(1-scale),x+540*(1+scale)];});
  assert.ok(bounds[0][0]<=.0001);assert.ok(bounds[1][1]>=1079.9999);assert.ok(bounds[0][1]>=bounds[1][0]-.0001);
 }
});
