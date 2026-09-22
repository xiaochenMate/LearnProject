import {BOUNDS,RIVER,BRIDGES} from './campaign-core.js';
// Deterministic geometry/collision layout shared by rendering and navigation tests.
export const BUILDINGS=[
 [-89,-21,9,8,8],[-58,-20,10,7,9],[-89,-47,10,8,10],[-58,-49,9,7,9],[-89,-72,9,8,10],[-58,-76,10,9,8],
 [-31,-45,10,8,10],[-10,-45,9,8,10],[13,-45,11,9,10],[33,-44,9,8,10],
 [-31,-68,10,10,9],[14,-69,10,8,10],[34,-72,8,7,11],
 [-34,-92,12,9,8],[14,-92,11,8,8],
 [51,-49,10,9,12],[85,-48,12,10,12],[50,-76,12,9,12],[86,-76,12,10,13],
 [50,-21,9,8,9],[86,-19,11,8,10],
 [-88,47,10,7,8],[-43,48,11,8,8],[-21,48,9,7,8],[24,48,10,7,8],[46,48,11,9,8],[86,48,10,8,8]
];
export function extendNavigation(base){
  const nav={...base,bounds:{...BOUNDS},water:[{...RIVER}],bridges:BRIDGES.map(b=>({...b})),colliders:base.colliders.map(c=>({...c,min:[...c.min],max:[...c.max]}))};
  for(const [x,z,w,h,d] of BUILDINGS)nav.colliders.push({name:'扩展民居',kind:'building',min:[x-w/2,nav.ground,z-d/2],max:[x+w/2,nav.ground+h+2.8,z+d/2]});
  // Railings never block bridge entrances, but prevent driving sideways into water.
  for(const b of BRIDGES)for(const x of [b.minX-.25,b.maxX+.25])nav.colliders.push({name:'平桥护栏',kind:'rail',min:[x-.2,nav.ground,5],max:[x+.2,nav.ground+1.1,23]});
  nav.decorTrees=[];
  let seed=20260912;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  for(let i=0;i<140;i++){const x=-96+rnd()*192,z=-97+rnd()*148;
    if(z>1&&z<28||Math.abs(z-36)<9||[-88,-60,-36,-5].some(a=>Math.abs(z-a)<9)||[-77,-68,-42,0,35,68].some(a=>Math.abs(x-a)<9)||x*x+z*z<38*38)continue;
    if(nav.colliders.some(c=>x>c.min[0]-5&&x<c.max[0]+5&&z>c.min[2]-5&&z<c.max[2]+5))continue;
    const h=4+rnd()*3,leaves=[];for(let k=0;k<3;k++)leaves.push([(rnd()-.5)*3,(rnd()-.5)*3,rnd()]);
    nav.decorTrees.push({x,z,h,leaves});nav.colliders.push({name:'树干',kind:'tree',min:[x-.4,nav.ground,z-.4],max:[x+.4,nav.ground+h,z+.4]});
  }
  nav.colliders.push({name:'北塔基座',kind:'building',min:[-10.5,nav.ground,-88.5],max:[-5.5,nav.ground+10,-83.5]});
  for(const x of [-93,-87,-60])for(const z of [-89,-94])nav.colliders.push({name:'货箱',kind:'cargo',min:[x-1,nav.ground,z-1],max:[x+1,nav.ground+1.5,z+1]});
  return nav;
}
