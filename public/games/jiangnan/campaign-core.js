/** Jiangnan campaign v2. Pure simulation helpers; no DOM or renderer dependencies. */
export const VERSION = 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const BOUNDS = { minX: -112, maxX: 112, minZ: -116, maxZ: 80 };
export const CANAL = { north: 4.3, south: 19.7, bridges: [-58, 48], halfWidth: 7 };
export const REGIONS = [
  { name: '枕河古镇', x: -5, z: -12 }, { name: '稻田驿路', x: -65, z: -58 },
  { name: '竹海电台', x: 52, z: -78 }, { name: '运河码头', x: -71, z: 45 },
  { name: '青石水闸', x: 63, z: 46 }, { name: '北山信标', x: 0, z: -100 }
];
export const CHAPTERS = [
  { id: 'town', title: '一 · 雨巷来信', region: 0, type: 'clear', spawn: [-22, -11], goal: [-18, -24],
    intro: '青岚镇撤离当日，河谷的无人装甲系统突然失控。你驾驶旧式救援坦克“青禾”，接到通讯员许岚的求援：先打通古镇出口，工程车才能进镇。',
    radio: '许岚：别碰带台阶的老石桥。沿河岸绕到镇西，先清除封锁出口的两辆无人战车。',
    outro: '街口恢复通行。周伯从篷船上递来一张旧水系图：驿路的电台，也许知道失控的原因。',
    enemies: [[-23,-23,'scout'],[28,-1,'scout']], hold: 0, reward: 180 },
  { id: 'fields', title: '二 · 稻浪中的回声', region: 1, type: 'capture', spawn: [-20,-31], goal: [-65,-54],
    intro: '驿路电台仍在重复昨天的撤离广播。必须抢修中继站，查明哪些道路还能通行。稻田视野开阔，谷仓与田埂是仅有的掩护。',
    radio: '许岚：进入金色光圈，清走附近敌军。保持联机十二秒，我来解开广播里的校验码。',
    outro: '广播不是求救，而是被篡改的旧指令。真正的控制信号，来自竹海深处的三座转发器。',
    enemies: [[-82,-43,'scout'],[-55,-72,'medium'],[-87,-73,'scout']], hold: 12, reward: 220 },
  { id: 'bamboo', title: '三 · 竹海静默', region: 2, type: 'relay', spawn: [20,-48], goal: [50,-78],
    intro: '三座转发器互为备份。逐一靠近终端停留三秒，将它们切断；仅击毁守卫并不能解除封锁。竹林中的碎墙可以挡住炮火。',
    radio: '许岚：我把三个终端标在地图上了。烟幕能暂时遮断敌军视线，别硬闯交叉火力。',
    outro: '三盏红灯依次熄灭。北山信标失去了备用链路，但水闸正在关闭；周伯提醒你，最后的工程车还在北岸。',
    enemies: [[36,-70,'scout'],[65,-87,'medium'],[68,-63,'scout']],
    relays: [[34,-81],[53,-62],[64,-97]], hold: 3, reward: 260 },
  { id: 'convoy', title: '四 · 渡河的人', region: 3, type: 'escort', spawn: [-51,-13], goal: [-82,50],
    intro: '工程车载着水闸的手动控制器。护送它沿西侧加固桥过河，再驶入码头。你与工程车相距超过三十米时，它会停车等待。',
    radio: '周伯：走新修的平桥，别上老拱桥！照看那辆带白色标记的工程车，它不是作战坦克。',
    outro: '工程车驶入码头，控制器完好无损。维修师林舟打开了工具箱：下一步，是让水闸重新听从人工指令。',
    enemies: [[-82,29,'scout'],[-41,45,'medium'],[-85,65,'scout']],
    route: [[-58,-9],[-58,0],[-58,27],[-69,43],[-82,50]], hold: 0, reward: 300 },
  { id: 'sluice', title: '五 · 水闸四十五秒', region: 4, type: 'defend', spawn: [18,42], goal: [62,46],
    intro: '许岚需要四十五秒接管水闸。靠近控制台开始联机，并抵挡三批来袭战车。离开光圈或有敌军逼近时，联机进度暂停，但不会清零。',
    radio: '林舟：维修箱已经备好。把正面留给敌军，受伤就退到闸房后修理，我替你盯着接管进度。',
    outro: '闸门停住了。水位恢复正常，镇民的航路终于安全。最后一段控制信号仍在北山闪烁——这一切还没有结束。',
    enemies: [[85,36,'medium'],[88,66,'scout']], waves: [[[40,69,'scout'],[100,24,'medium']],[[88,67,'medium'],[30,66,'scout']]], hold: 45, reward: 340 },
  { id: 'beacon', title: '六 · 天光归航', region: 5, type: 'boss', spawn: [44,-38], goal: [0,-99],
    intro: '失控的指挥战车守在北山信标下。它的正面装甲很厚，绕到侧后方攻击，并清除护卫。终止指令后，回到信标确认断电，战役才算完成。',
    radio: '许岚：重型目标的血量条已经显示。不要站在正面换炮；利用维修、烟幕和两侧掩体绕过去。',
    outro: '信标熄灭，雨停了。竹篷船重新驶过河道，林舟把“青禾”停在石桥旁。许岚的最后一条广播只有一句：江南，恢复通航。',
    enemies: [[0,-94,'boss'],[-21,-100,'medium'],[24,-100,'medium']], hold: 0, reward: 500 }
];
export const TANK_TYPES = {
  scout: { hp: 62, speed: 3.6, reload: 4.8, damage: 12 },
  medium: { hp: 90, speed: 2.9, reload: 4.4, damage: 17 },
  boss: { hp: 280, speed: 2, reload: 3.9, damage: 22 }
};
export function landAt(nav,x,z){
  const b=nav.bounds||BOUNDS, c=nav.canal||CANAL;
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return false;
  return z<=c.north||z>=c.south||c.bridges.some(v=>Math.abs(x-v)<=c.halfWidth);
}
export function reindex(nav){
  const cells=new Map(),step=12;
  for(const c of nav.colliders){if(c.enabled===false)continue;
    for(let x=Math.floor(c.min[0]/step);x<=Math.floor(c.max[0]/step);x++)for(let z=Math.floor(c.min[2]/step);z<=Math.floor(c.max[2]/step);z++){
      const k=x+','+z;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(c);
    }
  }nav.spatial={cells,step};nav.version=(nav.version||0)+1;
}
export function nearby(nav,x,z,r=4){
  if(!nav.spatial)return nav.colliders;
  const {cells,step}=nav.spatial,seen=new Set();
  for(let a=Math.floor((x-r)/step);a<=Math.floor((x+r)/step);a++)for(let b=Math.floor((z-r)/step);b<=Math.floor((z+r)/step);b++)for(const c of cells.get(a+','+b)||[])if(c.enabled!==false)seen.add(c);
  return seen;
}
export function walkable(nav,x,z,r=2.96){
  for(const [dx,dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.71,r*.71],[-r*.71,r*.71],[r*.71,-r*.71],[-r*.71,-r*.71]])if(!landAt(nav,x+dx,z+dz))return false;
  for(const c of nearby(nav,x,z,r)){if(c.enabled===false)continue;const dx=x-clamp(x,c.min[0],c.max[0]),dz=z-clamp(z,c.min[2],c.max[2]);if(dx*dx+dz*dz<r*r)return false;}return true;
}
export function bodyClear(nav,x,z,yaw){
  const s=Math.sin(yaw),c=Math.cos(yaw),w=1.65,l=2.4;
  // Centre and edge midpoints matter: corners alone can straddle a narrow water gap.
  for(const u of [-1,0,1])for(const v of [-1,0,1])if(!landAt(nav,x+u*w*c+v*l*s,z-u*w*s+v*l*c))return false;
  for(const o of nearby(nav,x,z,3)){
    if(o.enabled===false)continue;const dx=(o.min[0]+o.max[0])/2-x,dz=(o.min[2]+o.max[2])/2-z,ex=(o.max[0]-o.min[0])/2,ez=(o.max[2]-o.min[2])/2;
    if(Math.abs(dx)>ex+w*Math.abs(c)+l*Math.abs(s)||Math.abs(dz)>ez+w*Math.abs(s)+l*Math.abs(c))continue;
    if(Math.abs(dx*c-dz*s)>w+ex*Math.abs(c)+ez*Math.abs(s)||Math.abs(dx*s+dz*c)>l+ex*Math.abs(s)+ez*Math.abs(c))continue;
    return false;
  }return true;
}
export function segmentBox(a,b,min,max,pad=0){let lo=0,hi=1;for(let i=0;i<3;i++){const d=b[i]-a[i];if(Math.abs(d)<1e-9){if(a[i]<min[i]-pad||a[i]>max[i]+pad)return null;continue;}let u=(min[i]-pad-a[i])/d,v=(max[i]+pad-a[i])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return null;}return lo;}
export function segmentTank(a,b,t,ground){const s=Math.sin(t.yaw),c=Math.cos(t.yaw),local=p=>{const x=p[0]-t.x,z=p[2]-t.z;return [x*c-z*s,p[1]-ground,x*s+z*c];};return segmentBox(local(a),local(b),[-1.73,.05,-2.48],[1.73,2.6,2.48],.08);}
export const clearShot=(nav,a,b)=>!nav.colliders.some(c=>c.enabled!==false&&segmentBox(a,b,c.min,c.max,.06)!==null);
class Heap{constructor(){this.a=[];}push(id,f){const a=this.a;let i=a.length;a.push({id,f});while(i){const p=(i-1)>>1;if(a[p].f<=f)break;a[i]=a[p];i=p;}a[i]={id,f};}pop(){const a=this.a,root=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=v.f)break;a[i]=a[j];i=j;}a[i]=v;}return root.id;}get size(){return this.a.length;}}
export function createNavigator(nav,step=3){
  const b=nav.bounds||BOUNDS,cells=[],lookup=new Map();
  for(let iz=Math.ceil(b.minZ/step);iz<=Math.floor(b.maxZ/step);iz++)for(let ix=Math.ceil(b.minX/step);ix<=Math.floor(b.maxX/step);ix++)if(walkable(nav,ix*step,iz*step)){
    const n={x:ix*step,z:iz*step,ix,iz,id:cells.length,edges:[]};cells.push(n);lookup.set(ix+','+iz,n);
  }
  if(!cells.length)throw Error('地图没有可通行区域');
  for(const n of cells)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(dx||dz){const v=lookup.get((n.ix+dx)+','+(n.iz+dz));if(!v)continue;if(dx&&dz&&(!lookup.has((n.ix+dx)+','+n.iz)||!lookup.has(n.ix+','+(n.iz+dz))))continue;if(walkable(nav,(n.x+v.x)/2,(n.z+v.z)/2))n.edges.push(v.id);}
  const nearest=(x,z)=>{let best=null,score=Infinity;for(const n of cells){const d=(n.x-x)**2+(n.z-z)**2;if(d<score){best=n;score=d;}}return best;};
  return {cells,nearest,path(x,z,tx,tz){const a=nearest(x,z),goal=nearest(tx,tz);if(a.id===goal.id)return [];
    const open=new Heap(),g=new Float64Array(cells.length).fill(Infinity),parent=new Int32Array(cells.length).fill(-1),seen=new Uint8Array(cells.length);g[a.id]=0;open.push(a.id,0);
    let visits=0;while(open.size&&visits++<cells.length*4){const id=open.pop();if(seen[id])continue;seen[id]=1;if(id===goal.id){const result=[];let cur=id;while(cur!==a.id&&cur>=0){result.push(cells[cur]);cur=parent[cur];}return result.reverse();}
      for(const e of cells[id].edges){if(seen[e])continue;const v=cells[e],cost=g[id]+Math.hypot(v.x-cells[id].x,v.z-cells[id].z);if(cost<g[e]){g[e]=cost;parent[e]=id;open.push(e,cost+Math.hypot(v.x-goal.x,v.z-goal.z));}}
    }return [];
  }};
}
const integer=(n,max,def=0)=>Number.isFinite(n)?clamp(Math.floor(n),0,max):def;
export function sanitizeSave(raw={}){if(!raw||typeof raw!=='object')raw={};return {version:VERSION,unlocked:integer(raw.unlocked,5),selected:Math.min(integer(raw.selected,5),integer(raw.unlocked,5)),credits:integer(raw.credits,99999),stars:Array.from({length:6},(_,i)=>integer(raw.stars?.[i],3)),upgrades:Object.fromEntries(['armor','engine','loader'].map(k=>[k,integer(raw.upgrades?.[k],3)])),bestWave:integer(raw.bestWave,9999)};}
export function awardChapter(save,index,stars){index=integer(index,5);stars=clamp(Math.floor(stars)||1,1,3);const first=!save.stars[index],bonus=Math.max(0,stars-save.stars[index])*25;save.credits+=(first?CHAPTERS[index].reward:0)+bonus;save.stars[index]=Math.max(save.stars[index],stars);save.unlocked=Math.max(save.unlocked,Math.min(5,index+1));save.selected=Math.min(5,index+1);return (first?CHAPTERS[index].reward:0)+bonus;}
export const upgradeCost=level=>160+level*120;
export function buyUpgrade(save,key){if(!Object.hasOwn(save.upgrades,key))return false;const level=save.upgrades[key],cost=upgradeCost(level);if(level>=3||save.credits<cost)return false;save.credits-=cost;save.upgrades[key]++;return true;}
export function makeObjective(chapter){return {progress:0,relays:(chapter.relays||[]).map(()=>0),wave:0,route:0,done:false};}
export function stepObjective(state,chapter,dt,{distance=Infinity,threats=0,enemies=0,relayDistances=[],convoyDistance=Infinity,convoyAlive=true}={}){
  if(state.done)return true;dt=clamp(dt,0,.1);
  if(chapter.type==='relay'){state.relays.forEach((v,i)=>{if(v<chapter.hold&&relayDistances[i]<6&&threats===0)state.relays[i]=Math.min(chapter.hold,v+dt);});state.done=state.relays.every(v=>v>=chapter.hold)&&enemies===0;}
  else if(chapter.type==='escort')state.done=convoyAlive&&convoyDistance<6&&enemies===0;
  else if(chapter.type==='capture'||chapter.type==='defend'){if(distance<12&&threats===0)state.progress=Math.min(chapter.hold,state.progress+dt);state.done=state.progress>=chapter.hold&&enemies===0&&(chapter.type!=='defend'||state.wave===(chapter.waves||[]).length);}
  else state.done=enemies===0&&distance<9;
  return state.done;
}
