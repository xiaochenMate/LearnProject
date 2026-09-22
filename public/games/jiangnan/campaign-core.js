/** Pure campaign rules and navigation. No renderer, DOM or third-party dependencies. */
export const VERSION = 2;
export const SAVE_KEY = 'jiangnan.campaign.v2';
export const BOUNDS = { minX: -100, maxX: 100, minZ: -100, maxZ: 54 };
export const RIVER = { minX: -100, maxX: 100, minZ: 5, maxZ: 23 };
export const BRIDGES = [-68, 0, 68].map(x => ({ minX: x - 6, maxX: x + 6, minZ: 3, maxZ: 25 }));
export const DISTRICTS = [
  { name:'枕河古镇', x:8, z:-14 }, { name:'西埠码头', x:-72, z:-42 },
  { name:'南岸柳堤', x:-55, z:37 }, { name:'东岸粮仓', x:67, z:-62 },
  { name:'竹林驿道', x:-64, z:-78 }, { name:'北塔信标', x:-8, z:-78 }
];
export const MISSIONS = [
  { title:'雾中来电', area:'枕河古镇', type:'clear', start:[-40,-12], target:[-42,-35], radius:10,
    brief:'青岚镇的航道信号熄灭了。驾驶「雨燕」清理西巷，找到失联的巡检站。',
    radio:'阿禾 / 通讯员：先别急着开火。沿河向西，避开老石桥；黄色光圈就是巡检站。',
    goal:'击毁两辆侦察车，然后抵达巡检站。', enemies:[[-64,-39,'scout'],[-42,-54,'scout']] },
  { title:'码头复电', area:'西埠码头', type:'capture', start:[-42,-35], target:[-77,-62], radius:9, duration:8,
    brief:'巡检站只剩一段录音：货船被困在雾里。先夺回码头电台，让补给车收到安全航路。',
    radio:'老周 / 工程师：清掉电台附近的守卫，在信号圈里停留八秒，我来恢复供电。',
    goal:'清除守卫后，在码头信号圈内坚守 8 秒。', enemies:[[-82,-82,'guard'],[-56,-60,'scout'],[-78,-40,'guard']] },
  { title:'绕桥南渡', area:'南岸柳堤', type:'reach', start:[-77,-62], target:[-68,36], radius:8,
    brief:'古桥承受不了战车。工程队架好了西侧平桥，穿过它，去南岸接应载着灯芯的补给车。',
    radio:'阿禾：原来的台阶古桥仍然禁行。找小地图上西侧的宽桥，别向河里开。',
    goal:'经过西侧平桥，抵达南岸接应点。', enemies:[[-45,-7,'scout'],[-48,36,'guard']] },
  { title:'一车灯火', area:'南岸 → 东岸', type:'escort', start:[-68,28], target:[68,-36], radius:9,
    route:[[-68,36],[-8,36],[68,36],[68,-36]],
    brief:'灯芯和备用电池装上了补给车。护送它沿南堤前进，再从东桥返回粮仓；离得太远，司机会停车等待。',
    radio:'老周：我跟着你走。保持二十四米以内，别把我留在桥头。',
    goal:'护送补给车到东岸。离车超过 24 米时，车辆等待。', enemies:[[-23,38,'scout'],[44,37,'guard'],[68,-16,'guard']] },
  { title:'粮仓回响', area:'东岸粮仓', type:'clear', start:[68,-36], target:[68,-77], radius:10,
    brief:'仓库里的自动防御还在运行。一辆重装守卫挡住了道路，先借仓墙掩护，再把电池送到北塔。',
    radio:'阿禾：重装车装甲更厚、行动更慢。烟幕能争取时间，修理包不要等装甲归零才用。',
    goal:'击毁粮仓守卫和重装车，然后检查仓库入口。', enemies:[[43,-57,'guard'],[85,-57,'scout'],[45,-87,'guard'],[73,-85,'heavy']] },
  { title:'烟雨归航', area:'北塔信标', type:'defend', start:[68,-77], target:[-8,-78], radius:12, duration:40,
    brief:'灯塔重新亮起需要四十秒。在信号圈内保护启动过程，挡住两轮反扑，让第一艘归船看见青岚镇。',
    radio:'阿禾：最后一段了。靠近北塔才会启动倒计时；守完四十秒，还要清掉剩下的敌车。',
    goal:'在北塔圈内累计守住 40 秒，并清除两轮来袭车辆。', enemies:[],
    waves:[{at:0, enemies:[[-37,-81,'guard'],[23,-87,'scout']]},{at:18,enemies:[[-47,-59,'scout'],[29,-64,'heavy'],[0,-98,'command']]}] }
];
export const ENEMY_TYPES = {
  scout:{ hp:52, speed:4.5, reload:4.6, damage:12, color:0x926746 },
  guard:{ hp:82, speed:3.1, reload:4.2, damage:16, color:0x756c52 },
  heavy:{ hp:156, speed:2.0, reload:5.3, damage:24, color:0x54585e },
  command:{ hp:220, speed:2.4, reload:4.8, damage:22, color:0x754d42 }
};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function freshSave(){return {version:VERSION,unlocked:0,stars:Array(6).fill(0),credits:0,upgrades:{armor:0,reload:0,engine:0},difficulty:'easy'};}
export function readSave(text){
  try {const s=JSON.parse(text);if(s?.version!==VERSION)return freshSave();const n=freshSave();
    n.unlocked=clamp(Math.floor(Number(s.unlocked)||0),0,5);n.credits=clamp(Math.floor(Number(s.credits)||0),0,99);
    n.stars=n.stars.map((_,i)=>clamp(Math.floor(Number(s.stars?.[i])||0),0,3));
    for(const k of Object.keys(n.upgrades))n.upgrades[k]=clamp(Math.floor(Number(s.upgrades?.[k])||0),0,3);
    n.difficulty=['easy','normal','hard'].includes(s.difficulty)?s.difficulty:'easy';return n;
  }catch{return freshSave();}
}
export function completeMission(save,index,stars){
  const s=readSave(JSON.stringify(save));index=clamp(Math.floor(index),0,5);stars=clamp(Math.floor(stars),1,3);
  const earned=Math.max(0,stars-s.stars[index]);s.credits+=earned;s.stars[index]=Math.max(s.stars[index],stars);s.unlocked=Math.max(s.unlocked,Math.min(5,index+1));return s;
}
export function buyUpgrade(save,key){const s=readSave(JSON.stringify(save));if(!Object.hasOwn(s.upgrades,key))return s;const cost=s.upgrades[key]+1;if(s.upgrades[key]<3&&s.credits>=cost){s.credits-=cost;s.upgrades[key]++;}return s;}
export function pointOnLand(nav,x,z,r=0){
  const b=nav.bounds||BOUNDS;if(x<b.minX+r||x>b.maxX-r||z<b.minZ+r||z>b.maxZ-r)return false;
  for(const w of nav.water||[RIVER])if(x+r>w.minX&&x-r<w.maxX&&z+r>w.minZ&&z-r<w.maxZ){
    if(!(nav.bridges||BRIDGES).some(t=>x-r>=t.minX&&x+r<=t.maxX&&t.minZ<=w.minZ&&t.maxZ>=w.maxZ))return false;
  }return true;
}
export function walkable(nav,x,z,r=2.55){if(!pointOnLand(nav,x,z,r))return false;return !nav.colliders.some(c=>{const dx=x-clamp(x,c.min[0],c.max[0]),dz=z-clamp(z,c.min[2],c.max[2]);return dx*dx+dz*dz<r*r;});}
export function bodyClear(nav,x,z,yaw){const sx=Math.sin(yaw),cx=Math.cos(yaw),hw=1.62,hl=2.25;
  for(const u of [-1,1])for(const v of [-1,1])if(!pointOnLand(nav,x+u*hw*cx+v*hl*sx,z-u*hw*sx+v*hl*cx))return false;
  for(const c of nav.colliders){const bx=(c.min[0]+c.max[0])/2,bz=(c.min[2]+c.max[2])/2,ex=(c.max[0]-c.min[0])/2,ez=(c.max[2]-c.min[2])/2,dx=bx-x,dz=bz-z;
    if(Math.abs(dx)>ex+hw*Math.abs(cx)+hl*Math.abs(sx)||Math.abs(dz)>ez+hw*Math.abs(sx)+hl*Math.abs(cx))continue;
    if(Math.abs(dx*cx-dz*sx)>hw+ex*Math.abs(cx)+ez*Math.abs(sx)||Math.abs(dx*sx+dz*cx)>hl+ex*Math.abs(sx)+ez*Math.abs(cx))continue;return false;
  }return true;
}
export function segmentBox(a,b,min,max,pad=0){let lo=0,hi=1;for(let i=0;i<3;i++){const d=b[i]-a[i];if(Math.abs(d)<1e-9){if(a[i]<min[i]-pad||a[i]>max[i]+pad)return null;continue;}let u=(min[i]-pad-a[i])/d,v=(max[i]+pad-a[i])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return null;}return lo;}
export function segmentSphere(a,b,c,r){const d=b.map((v,i)=>v-a[i]),m=a.map((v,i)=>v-c[i]);const aa=d.reduce((s,v)=>s+v*v,0),bb=m.reduce((s,v,i)=>s+v*d[i],0),cc=m.reduce((s,v)=>s+v*v,0)-r*r;if(cc<=0)return 0;if(aa<1e-9)return null;const h=bb*bb-aa*cc;if(h<0)return null;const t=(-bb-Math.sqrt(h))/aa;return t>=0&&t<=1?t:null;}
export const clearShot=(nav,a,b)=>!nav.colliders.some(c=>segmentBox(a,b,c.min,c.max,.08)!==null);
class Heap {constructor(){this.q=[];}push(v){const a=this.q;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}pop(){const a=this.q,top=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=v.f)break;a[i]=a[j];i=j;}a[i]=v;}return top;}}
export function createNavigator(nav,step=2){
  const b=nav.bounds||BOUNDS,nx=Math.floor((b.maxX-b.minX)/step)+1,nz=Math.floor((b.maxZ-b.minZ)/step)+1,cells=new Map();
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=b.minX+i*step,z=b.minZ+j*step;if(walkable(nav,x,z))cells.set(j*nx+i,{x,z,i,j,id:j*nx+i});}
  if(!cells.size)throw Error('地图没有可通行区域');
  const nearest=(x,z)=>{const i=clamp(Math.round((x-b.minX)/step),0,nx-1),j=clamp(Math.round((z-b.minZ)/step),0,nz-1);for(let r=0;r<Math.max(nx,nz);r++){let best=null,d=Infinity;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(r&&Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;const xx=i+dx,zz=j+dy;if(xx<0||xx>=nx||zz<0||zz>=nz)continue;const n=cells.get(zz*nx+xx),dd=n?(n.x-x)**2+(n.z-z)**2:Infinity;if(dd<d){best=n;d=dd;}}if(best)return best;}return null;};
  return {cells:[...cells.values()],nearest,path(x,z,tx,tz){const a=nearest(x,z),end=nearest(tx,tz);if(!a||!end)return [];const open=new Heap(),cost=new Map([[a.id,0]]),prev=new Map(),seen=new Set();open.push({id:a.id,f:0});let visits=0;
    while(open.q.length&&visits++<12000){const {id}=open.pop();if(seen.has(id))continue;if(id===end.id){const path=[];let k=id;while(k!==a.id){path.push(cells.get(k));k=prev.get(k);}return path.reverse();}seen.add(id);const n=cells.get(id);
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(!dx&&!dz)continue;const i=n.i+dx,j=n.j+dz;if(i<0||i>=nx||j<0||j>=nz)continue;const next=cells.get(j*nx+i);if(!next||seen.has(next.id))continue;if(dx&&dz&&(!cells.has(n.j*nx+i)||!cells.has(j*nx+n.i)))continue;if(!walkable(nav,(n.x+next.x)/2,(n.z+next.z)/2))continue;const g=cost.get(id)+Math.hypot(dx,dz)*step;if(g<(cost.get(next.id)??Infinity)){cost.set(next.id,g);prev.set(next.id,id);open.push({id:next.id,f:g+Math.hypot(next.x-end.x,next.z-end.z)});}}
    }return [];}
  };
}
