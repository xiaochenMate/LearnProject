import * as THREE from 'three';
import {BOUNDS,RIVER,BRIDGES,DISTRICTS} from './campaign-core.js';
// All additions use shared geometries/materials; original Blender GLBs stay intact.
import {BUILDINGS} from './campaign-layout.js';
export {extendNavigation} from './campaign-layout.js';
export function buildWorld(scene,nav){
  const root=new THREE.Group();root.name='ExpandedJiangnan';scene.add(root);
  const mat=(c,r=.72,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
  const materials={land:mat(0x677467),stone:mat(0x7c8881,.38),wall:mat(0xb7bdb0),roof:mat(0x3c5656,.42),wood:mat(0x554239),red:mat(0x794b40),leaf:mat(0x5c7763),trunk:mat(0x4c5243),gold:mat(0xd9bc72,.4,.2)};
  const cube=new THREE.BoxGeometry(1,1,1),buckets=new Map(),helper=new THREE.Object3D();
  function part(type,x,y,z,w,h,d,rx=0,ry=0){if(!buckets.has(type))buckets.set(type,[]);buckets.get(type).push({x,y,z,w,h,d,rx,ry});}
  const g=nav.ground;
  part('land',0,g-.35,-47.5,200,.65,105);part('land',0,g-.35,38.5,200,.65,31);
  // Roads form traversable loops instead of a larger empty square.
  for(const z of [-88,-60,-36,-5])part('stone',0,g-.025,z,197,.04,11);
  for(const x of [-77,-42,0,35,68])part('stone',x,g-.015,-48,11,.045,101);
  part('stone',0,g-.01,36,196,.05,12);
  for(const b of BRIDGES){const x=(b.minX+b.maxX)/2;part('stone',x,g-.15,14,12,.3,22);for(const sx of [-1,1]){part('stone',x+sx*6.25,g+.6,14,.35,1.2,18);for(let z=5;z<=23;z+=3)part('stone',x+sx*6.25,g+.8,z,.6,1.6,.6);}}
  // Stone quay edges deliberately stop at the bridge mouths.
  for(const z of [4.8,23.2])for(let x=-98;x<100;x+=2){if(BRIDGES.some(b=>x>=b.minX-1&&x<=b.maxX+1))continue;part('stone',x,g-.4,z,1.85,.8,.75);}
  for(const [x,z,w,h,d] of BUILDINGS){
    part('wall',x,g+h/2,z,w,h,d);part('stone',x,g+.18,z,w+.4,.36,d+.4);
    const slope=.45,roofD=(d/2+1)/Math.cos(slope);
    for(const s of [-1,1])part('roof',x,g+h+1.15,z+s*(d/4+.3),w+1.4,.3,roofD,s*slope);
    part('roof',x,g+h+2.5,z,w+1.7,.32,.45);
    part('wood',x,g+1.7,z+d/2+.04,1.8,3.2,.16);
    for(const s of [-1,1]){part('red',x+s*w*.29,g+3.7,z+d/2+.08,1.8,2,.18);part('wood',x+s*w*.29,g+3.7,z+d/2+.19,1.35,1.5,.12);part('gold',x+s*w*.29,g+4.8,z+d/2+.5,.5,.8,.5);}
    // Repeated battens make roof silhouettes read clearly without thousands of tiles.
    for(let q=-w/2;q<=w/2;q+=1.2)for(const s of [-1,1])part('roof',x+q,g+h+1.3,z+s*(d/4+.3),.1,.12,roofD,s*slope);
  }
  // Decorative trees stay off the navigation grid; trunks have matching colliders.
  for(const {x,z,h,leaves} of nav.decorTrees){part('trunk',x,g+h/2,z,.65,h,.65);leaves.forEach(([dx,dz,ry],k)=>part('leaf',x+dx,g+h+k*.8,z+dz,3.5,1.6,3.5,.15,ry));}
  // Cargo stacks, field ridges and a distinct beacon give each district a landmark.
  for(const x of [-93,-87,-60])for(const z of [-89,-94])part('gold',x,g+.75,z,2,1.5,2);
  for(let x=-92;x<-50;x+=4)part('leaf',x,g+.12,-85,.6,.22,12);
  part('stone',-8,g+.4,-86,5,.8,5);part('wood',-8,g+5,-86,2,9,2);part('roof',-8,g+10,-86,5,.4,5);part('gold',-8,g+8.7,-86,2.8,1.5,2.8);
  for(const [type,items] of buckets){const mesh=new THREE.InstancedMesh(cube,materials[type],items.length);for(let i=0;i<items.length;i++){const p=items[i];helper.position.set(p.x,p.y,p.z);helper.scale.set(p.w,p.h,p.d);helper.rotation.set(p.rx,p.ry,0);helper.updateMatrix();mesh.setMatrixAt(i,helper.matrix);}mesh.castShadow=!['land','stone'].includes(type);mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);}
  const labels=[];
  for(const district of DISTRICTS){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#14292add';ctx.fillRect(0,0,256,64);ctx.font='26px sans-serif';ctx.textAlign='center';ctx.fillStyle='#dfd4b0';ctx.fillText(district.name,128,42);const texture=new THREE.CanvasTexture(c),label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));label.position.set(district.x,g+16,district.z);label.scale.set(13,3.25,1);root.add(label);labels.push(label);}
  return {root,labels};
}
