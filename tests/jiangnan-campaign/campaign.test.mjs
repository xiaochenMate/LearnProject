import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Group} from 'three';
import {expandWorld} from '../../public/games/jiangnan/campaign-world.js';
import {CHAPTERS,BOUNDS,CANAL,landAt,reindex,walkable,bodyClear,segmentBox,segmentTank,createNavigator,sanitizeSave,awardChapter,buyUpgrade,makeObjective,stepObjective} from '../../public/games/jiangnan/campaign-core.js';
import {originalNavigation} from './fixture.mjs';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){}})})};
const nav=originalNavigation();const world=expandWorld(new Group(),nav);const grid=createNavigator(nav);
const reference=grid.nearest(-20,-35);

test('world uses the enlarged 224×196 bounds and preserves the original bridge restriction',()=>{
  assert.equal(BOUNDS.maxX-BOUNDS.minX,224);assert.equal(BOUNDS.maxZ-BOUNDS.minZ,196);
  assert(nav.colliders.some(c=>c.kind==='bridge'));assert.equal(bodyClear(nav,-22,3,0),false);
  assert(world.crates.length===8);assert(grid.cells.length>2500);
});
test('canal excludes tanks except on two reinforced bridges; hull cannot straddle bank',()=>{
  assert.equal(landAt(nav,0,12),false);assert.equal(bodyClear(nav,0,3.8,0),false);
  for(const x of CANAL.bridges){assert(landAt(nav,x,12));assert(bodyClear(nav,x,12,0));}
  assert.equal(landAt(nav,113,0),false);assert.equal(landAt(nav,NaN,0),false);
});
for(const [index,c] of CHAPTERS.entries())test(`chapter ${index+1}: all objective, spawn and enemy anchors connect to the open world`,()=>{
  const points=[c.spawn,c.goal,...c.enemies,...(c.relays||[]),...(c.route||[]),...(c.waves||[]).flat()];
  for(const p of points){const n=grid.nearest(p[0],p[1]);assert(Math.hypot(n.x-p[0],n.z-p[1])<7,`anchor too far: ${p}`);const path=grid.path(reference.x,reference.z,p[0],p[1]);assert(path.length>0||n.id===reference.id,`isolated anchor: ${p}`);
    for(const q of path){for(const a of [0,Math.PI/4,Math.PI/2,Math.PI*3/4])assert(bodyClear(nav,q.x,q.z,a),`hull rotation blocked at ${q.x},${q.z}`);}
  }
});
test('escort route remains reachable across the actual west bridge, not across water',()=>{
  const c=CHAPTERS[3];for(let i=1;i<c.route.length;i++){const from=grid.nearest(...c.route[i-1]),path=grid.path(from.x,from.z,...c.route[i]);assert(path.length);let prev=from;
    for(const p of path){for(let a=0;a<=10;a++){const f=a/10;assert(walkable(nav,prev.x+(p.x-prev.x)*f,prev.z+(p.z-prev.z)*f),`blocked escort path at ${p.x},${p.z}`);}prev=p;}
  }
});
test('cover collision catches a fast shell and chooses cover before a tank',()=>{
  const a=[-20,3.5,0],b=[20,3.5,0];const wall=segmentBox(a,b,[-1,0,-3],[1,6,3]);const hit=segmentTank(a,b,{x:10,z:0,yaw:Math.PI/2},nav.ground);
  assert(wall!==null&&hit!==null&&wall<hit);assert.equal(segmentBox([0,10,0],[0,10,30],[-1,0,5],[1,6,8]),null);
  assert.equal(segmentBox([0,2,0],[0,2,0],[-1,0,-1],[1,3,1]),0);
});
test('rotated tank hitbox includes side hits but rejects shots above the turret',()=>{
  assert.notEqual(segmentTank([-10,3.5,0],[10,3.5,0],{x:0,z:0,yaw:1.2},nav.ground),null);
  assert.equal(segmentTank([-10,20,0],[10,20,0],{x:0,z:0,yaw:0},nav.ground),null);
});
test('destroyed crates leave the spatial index and cease blocking navigation',()=>{
  const c=world.crates[0],x=(c.min[0]+c.max[0])/2,z=(c.min[2]+c.max[2])/2;
  assert(!bodyClear(nav,x,z,0));c.enabled=false;reindex(nav);assert(bodyClear(nav,x,z,0));c.enabled=true;reindex(nav);
});
test('save loading rejects invalid numeric fields and clamps locked selections',()=>{
  for(const bad of [null,5,'x',undefined])assert.equal(sanitizeSave(bad).credits,0);
  const s=sanitizeSave({unlocked:0,selected:5,credits:Infinity,stars:[9,-1,NaN],upgrades:{armor:-2,engine:999,loader:'2'}});
  assert.equal(s.selected,0);assert.equal(s.credits,0);assert.deepEqual(s.stars.slice(0,3),[3,0,0]);assert.deepEqual(s.upgrades,{armor:0,engine:3,loader:0});
});
test('chapter replay cannot farm first-clear currency, upgrades enforce price and cap',()=>{
  const s=sanitizeSave();const first=awardChapter(s,0,2);assert.equal(first,230);assert.equal(s.unlocked,1);assert.equal(awardChapter(s,0,2),0);assert.equal(awardChapter(s,0,3),25);
  assert(buyUpgrade(s,'armor'));assert.equal(s.upgrades.armor,1);assert(!buyUpgrade(s,'armor'));assert(!buyUpgrade(s,'unknown'));
  s.credits=9999;assert(buyUpgrade(s,'armor'));assert(buyUpgrade(s,'armor'));assert(!buyUpgrade(s,'armor'));
});
test('clear objective requires both destroying guards and reaching the exit',()=>{
  const c=CHAPTERS[0],s=makeObjective(c);assert(!stepObjective(s,c,.05,{distance:1,enemies:1}));assert(!stepObjective(s,c,.05,{distance:20,enemies:0}));assert(stepObjective(s,c,.05,{distance:2,enemies:0}));
});
test('capture freezes outside the zone or during contesting and resumes its progress',()=>{
  const c=CHAPTERS[1],s=makeObjective(c);for(let i=0;i<60;i++)stepObjective(s,c,.1,{distance:2,enemies:1});const progress=s.progress;
  for(let i=0;i<10;i++)stepObjective(s,c,.1,{distance:2,enemies:1,threats:1});assert.equal(s.progress,progress);
  stepObjective(s,c,.1,{distance:15});assert.equal(s.progress,progress);
  for(let i=0;i<70;i++)stepObjective(s,c,.1,{distance:2,enemies:0});assert(s.done);
});
test('relay objective requires all three terminal interactions and cleared guards',()=>{
  const c=CHAPTERS[2],s=makeObjective(c);for(let target=0;target<3;target++)for(let i=0;i<32;i++)stepObjective(s,c,.1,{enemies:1,relayDistances:[0,1,2].map(j=>target===j?4:99)});
  assert(!s.done);assert(stepObjective(s,c,.1,{enemies:0}));assert(s.relays.every(v=>v===3));
});
test('escort fails to complete without a living engineering vehicle at destination',()=>{
  const c=CHAPTERS[3],s=makeObjective(c);assert(!stepObjective(s,c,.1,{convoyDistance:2,convoyAlive:false,enemies:0}));assert(!stepObjective(s,c,.1,{convoyDistance:2,convoyAlive:true,enemies:1}));assert(stepObjective(s,c,.1,{convoyDistance:2,convoyAlive:true,enemies:0}));
});
test('defence cannot finish before both reinforcement waves and all guards are cleared',()=>{
  const c=CHAPTERS[4],s=makeObjective(c);for(let i=0;i<460;i++)stepObjective(s,c,.1,{distance:2,enemies:0});assert(!s.done);s.wave=2;assert(stepObjective(s,c,.1,{distance:2,enemies:0}));
});
test('chapter six requires shutdown confirmation after defeating the command tank',()=>{
  const c=CHAPTERS[5],s=makeObjective(c);assert(!stepObjective(s,c,.1,{distance:30,enemies:0}));assert(stepObjective(s,c,.1,{distance:6,enemies:0}));
});
test('new HTML contains every literal DOM ID used by the game and links the correct entry point',async()=>{
  const [js,html]=await Promise.all(['campaign-engine.js','index.html'].map(p=>readFile(new URL('../../public/games/jiangnan/'+p,import.meta.url),'utf8')));
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const [,id] of js.matchAll(/\$\('([^']+)'\)/g))if(!id.endsWith('-'))assert(ids.has(id),'missing DOM node '+id);
  assert(html.includes('campaign-engine.js?v=2'));assert(html.includes('campaign.css?v=2'));
});
