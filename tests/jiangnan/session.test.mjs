import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {freshSave,MISSIONS} from '../../public/games/jiangnan/campaign-core.js';
import {readCheckpoint,loadoutKey,repairRecipient,missionRating,objectiveSteps,stickHeading} from '../../public/games/jiangnan/campaign-session.js';

function fixture(chapter=0){
  const save=freshSave();save.unlocked=5;
  const tank=(x,z,type)=>({x,z,yaw:0,aim:0,hp:type?52:73,reload:0,...(type?{type}:{})});
  const m=MISSIONS[chapter];
  return {save,c:{version:1,chapter,loadout:loadoutKey(save),savedAt:Date.now(),player:tank(...m.start),enemies:m.enemies.map(([x,z,type])=>({...tank(x,z,type),hp:50})),convoy:m.type==='escort'?{x:-68,z:36,hp:96,yaw:0,routeIndex:1}:null,time:21,progress:0,waves:0,kills:0,shots:2,hits:1,repairs:2,smokes:1,smokeTime:0,smokeCooldown:0,repairCooldown:0,damageTaken:27,damageDealt:40}};
}
test('all six in-progress chapter snapshots round trip without awarding progress',()=>{
  for(let i=0;i<6;i++){const {c,save}=fixture(i),before=JSON.stringify(save);assert.deepEqual(readCheckpoint(JSON.stringify(c),save),c);assert.equal(JSON.stringify(save),before);}
});
test('checkpoints reject corruption, locked chapters and incompatible loadouts',()=>{
  const {c,save}=fixture();for(const text of [null,'{}','{','null'])assert.equal(readCheckpoint(text,save),null);
  for(const edit of [x=>x.version=8,x=>x.chapter=6,x=>x.loadout='hard:3:3:3',x=>x.player.hp=0,x=>x.player.hp=200,x=>x.player.x=999,x=>x.player.x='1',x=>x.player.yaw=null,x=>x.hits=8,x=>x.waves=2,x=>x.repairs=4,x=>x.damageTaken=-1,x=>x.enemies.push(x.enemies[0]),x=>x.enemies[0].type='command',x=>x.enemies[0].hp=999]){const broken=structuredClone(c);edit(broken);assert.equal(readCheckpoint(JSON.stringify(broken),save),null);}
  save.unlocked=0;c.chapter=1;assert.equal(readCheckpoint(JSON.stringify(c),save),null);
});
test('escort snapshots require a living convoy and a nonterminal route step',()=>{
  const {c,save}=fixture(3);for(const edit of [x=>x.convoy=null,x=>x.convoy.hp=0,x=>x.convoy.routeIndex=4,x=>x.convoy.routeIndex=1.5,x=>x.convoy.z=999]){const bad=structuredClone(c);edit(bad);assert.equal(readCheckpoint(JSON.stringify(bad),save),null);}
});
test('defence snapshots validate only already-spawned waves',()=>{
  const {c,save}=fixture(5);c.waves=1;c.progress=5;c.enemies=MISSIONS[5].waves[0].enemies.map(([x,z,type])=>({x,z,type,yaw:0,aim:0,hp:50,reload:1}));assert(readCheckpoint(JSON.stringify(c),save));c.waves=2;assert.equal(readCheckpoint(JSON.stringify(c),save),null);
});
test('repair prioritizes nearby endangered convoy, never heals a distant vehicle',()=>{
  const player={hp:73,maxHP:100},convoy={hp:50,maxHP:140};
  assert.equal(repairRecipient(player,convoy,12),convoy);assert.equal(repairRecipient(player,convoy,12.01),player);
  player.hp=15;assert.equal(repairRecipient(player,convoy,3),player);player.hp=100;assert.equal(repairRecipient(player,convoy,8),convoy);convoy.hp=140;assert.equal(repairRecipient(player,convoy,8),null);
});
test('ratings expose the real health and resource thresholds',()=>{
  assert.equal(missionRating({hp:39,maxHP:100,repairs:0}),1);assert.equal(missionRating({hp:40,maxHP:100,repairs:1}),3);
  assert.equal(missionRating({hp:100,maxHP:100,convoy:{hp:83},repairs:3}),2);assert.equal(missionRating({hp:100,maxHP:100,convoy:{hp:84},repairs:0}),3);
});
test('clearing enemies alone is not a completed arrival step',()=>{
  let steps=objectiveSteps(MISSIONS[0],{alive:0,progress:1,inside:false});assert.equal(steps[0].done,true);assert.equal(steps[1].done,false);
  steps=objectiveSteps(MISSIONS[0],{alive:0,progress:1,inside:true});assert(steps.every(s=>s.done));
  assert.equal(objectiveSteps(MISSIONS[5],{alive:0,progress:40,waves:1})[2].done,false);
});
test('both sticks follow camera-relative cardinal directions',()=>{
  for(const heading of [0,.7,-2.4]){
    assert.equal(stickHeading(heading,0,-1),heading);
    assert.equal(stickHeading(heading,1,0),heading-Math.PI/2);
    assert.equal(stickHeading(heading,-1,0),heading+Math.PI/2);
    assert.equal(stickHeading(heading,0,1),heading-Math.PI);
  }
});

test('bridge rejects wrong origin, wrong window and malformed commands',()=>{
  const listeners={},sent=[],calls=[];
  const parent={postMessage:(...args)=>sent.push(args)},window={addEventListener:(name,callback)=>listeners[name]=callback,jiangnan:{dispose:()=>calls.push('dispose'),suspend:()=>calls.push('suspend')}};
  vm.runInNewContext(readFileSync(new URL('../../public/games/jiangnan/campaign-bridge.js',import.meta.url),'utf8'),{window,parent,location:{origin:'http://localhost:8888'}});
  const send=(data,origin='http://localhost:8888',source=parent)=>listeners.message({data,origin,source});
  const command={type:'jiangnan:command',protocol:1,command:'dispose'};
  send(command,'https://example.com');send(command,undefined,{});send({...command,protocol:2});send({...command,command:'finish'});send(null);assert.deepEqual(calls,[]);
  send({...command,command:'hello'});assert.equal(sent.length,2);assert.equal(sent[1][1],'http://localhost:8888');
  send(command);send({...command,command:'suspend'});assert.deepEqual(calls,['dispose','suspend']);
});

test('both entry points stay identical and use local boot and icon assets',()=>{
  const source=name=>readFileSync(new URL('../../public/games/jiangnan/'+name,import.meta.url),'utf8');
  assert.equal(source('index.html'),source('campaign.html'));
  assert.match(source('index.html'),/name="jiangnan-build" content="campaign-3"/);
  assert(source('index.html').indexOf('campaign-bridge.js')<source('index.html').indexOf('campaign-game.js'));
});
