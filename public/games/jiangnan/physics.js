export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function walkable(nav,x,z,r=1.52){
  if(x*x+z*z>(nav.radius-r)**2||z>nav.riverLimit-r)return false;
  for(const c of nav.colliders){const a=c.min,b=c.max;const dx=x-clamp(x,a[0],b[0]),dz=z-clamp(z,a[2],b[2]);if(dx*dx+dz*dz<r*r)return false;}
  return true;
}
export function segmentBox(a,b,min,max,padding=0){
  let lo=0,hi=1;
  for(let i=0;i<3;i++){const d=b[i]-a[i];if(Math.abs(d)<1e-8){if(a[i]<min[i]-padding||a[i]>max[i]+padding)return null;continue;}let u=(min[i]-padding-a[i])/d,v=(max[i]+padding-a[i])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return null;}
  return lo;
}
export function segmentSphere(a,b,c,r){
  const d=b.map((v,i)=>v-a[i]),m=a.map((v,i)=>v-c[i]);const aa=d.reduce((s,v)=>s+v*v,0),bb=m.reduce((s,v,i)=>s+v*d[i],0),cc=m.reduce((s,v)=>s+v*v,0)-r*r;if(cc<0)return 0;if(aa<1e-9)return null;const h=bb*bb-aa*cc;if(h<0)return null;const t=(-bb-Math.sqrt(h))/aa;return t>=0&&t<=1?t:null;
}
export function clearShot(nav,a,b){return !nav.colliders.some(c=>segmentBox(a,b,c.min,c.max,.05)!==null);}
export function bodyClear(nav,x,z,yaw){
  const sx=Math.sin(yaw),cx=Math.cos(yaw),hw=1.62,hl=2.2;
  for(const u of [-1,1])for(const v of [-1,1]){const px=x+u*hw*cx+v*hl*sx,pz=z-u*hw*sx+v*hl*cx;if(px*px+pz*pz>nav.radius**2||pz>nav.riverLimit)return false;}
  for(const c of nav.colliders){const bx=(c.min[0]+c.max[0])/2,bz=(c.min[2]+c.max[2])/2,ex=(c.max[0]-c.min[0])/2,ez=(c.max[2]-c.min[2])/2,dx=bx-x,dz=bz-z;
    if(Math.abs(dx)>ex+hw*Math.abs(cx)+hl*Math.abs(sx)||Math.abs(dz)>ez+hw*Math.abs(sx)+hl*Math.abs(cx))continue;
    if(Math.abs(dx*cx-dz*sx)>hw+ex*Math.abs(cx)+ez*Math.abs(sx)||Math.abs(dx*sx+dz*cx)>hl+ex*Math.abs(sx)+ez*Math.abs(cx))continue;
    return false;
  }return true;
}
export function createNavigator(nav,step=.75){
  const cells=[];const lookup=new Map();
  for(let z=-30;z<3;z+=step)for(let x=-30;x<=30;x+=step)if(walkable(nav,x,z,1.62)){const n={x,z,id:cells.length,edges:[]};lookup.set(`${Math.round(x/step)},${Math.round(z/step)}`,n);cells.push(n);}
  for(const n of cells)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(dx||dz){const b=lookup.get(`${Math.round(n.x/step)+dx},${Math.round(n.z/step)+dz}`);if(b&&walkable(nav,(n.x+b.x)/2,(n.z+b.z)/2,1.65))n.edges.push(b.id);}
  const nearest=(x,z)=>cells.reduce((a,b)=>(b.x-x)**2+(b.z-z)**2<(a.x-x)**2+(a.z-z)**2?b:a,cells[0]);
  return {cells,nearest,path(x,z,tx,tz){const a=nearest(x,z),b=nearest(tx,tz),open=[a.id],seen=new Set(),g=new Map([[a.id,0]]),from=new Map();while(open.length){open.sort((u,v)=>(g.get(v)+Math.hypot(cells[v].x-b.x,cells[v].z-b.z))-(g.get(u)+Math.hypot(cells[u].x-b.x,cells[u].z-b.z)));const id=open.pop();if(id===b.id){const path=[];let cur=id;while(cur!==a.id){path.unshift(cells[cur]);cur=from.get(cur);}return path;}if(seen.has(id))continue;seen.add(id);for(const e of cells[id].edges){const cost=g.get(id)+Math.hypot(cells[e].x-cells[id].x,cells[e].z-cells[id].z);if(cost<(g.get(e)??Infinity)){g.set(e,cost);from.set(e,id);open.push(e);}}}return [];}};
}
