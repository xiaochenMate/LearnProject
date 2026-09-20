import * as THREE from 'three';
import { BOUNDS, CANAL, CHAPTERS, reindex } from './campaign-core.js';
const V=THREE.Vector3;
export function expandWorld(scene,nav){
  nav.bounds={...BOUNDS};nav.canal={...CANAL,bridges:[...CANAL.bridges]};
  const root=new THREE.Group();root.name='CampaignLandscape';scene.add(root);
  let seed=117;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const tex=(kind)=>{const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
    ctx.fillStyle=kind==='roof'?'#3a5055':kind==='wall'?'#b7bcb0':'#737e74';ctx.fillRect(0,0,256,256);
    for(let i=0;i<2500;i++){const q=Math.floor(90+rand()*100);ctx.fillStyle=`rgba(${q},${q},${q},.09)`;ctx.fillRect(rand()*256,rand()*256,2+rand()*6,2+rand()*9);}
    if(kind==='roof'){for(let y=0;y<256;y+=22)for(let x=-12;x<256;x+=16){ctx.strokeStyle='#1e33376b';ctx.lineWidth=2;ctx.strokeRect(x+(y%44?8:0),y,16,22);ctx.fillStyle='#8e9d9728';ctx.fillRect(x+3,y+3,3,16);}}
    if(kind==='stone'){for(let y=0;y<256;y+=32)for(let x=-32;x<256;x+=64){ctx.strokeStyle='#273e3c75';ctx.lineWidth=2;ctx.strokeRect(x+(y%64?32:0),y,64,32);}}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;};
  const mats={wall:new THREE.MeshStandardMaterial({map:tex('wall'),roughness:.87,color:0xb9c2b5}),roof:new THREE.MeshStandardMaterial({map:tex('roof'),roughness:.4,metalness:.08}),stone:new THREE.MeshStandardMaterial({map:tex('stone'),roughness:.51,color:0xa6b4a7}),earth:new THREE.MeshStandardMaterial({color:0x5e7063,roughness:.98}),rice:new THREE.MeshStandardMaterial({color:0x829061,roughness:1}),wood:new THREE.MeshStandardMaterial({color:0x504a37,roughness:.85}),red:new THREE.MeshStandardMaterial({color:0x8d5b4b,roughness:.7}),dark:new THREE.MeshStandardMaterial({color:0x233334,roughness:.55}),leaf:new THREE.MeshStandardMaterial({color:0x55796a,roughness:.94}),gold:new THREE.MeshStandardMaterial({color:0xb9a474,roughness:.58})};
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(.5,.6,1,7),cone:new THREE.ConeGeometry(.5,1,7),leaf:new THREE.IcosahedronGeometry(.5,0)};
  const batches=new Map(),o=new THREE.Object3D();
  function instance(shape,mat,x,y,z,w,h,d,rx=0,ry=0,rz=0){const key=shape+':'+mat;if(!batches.has(key))batches.set(key,{shape,mat,items:[]});batches.get(key).items.push([x,y,z,w,h,d,rx,ry,rz]);}
  const g=nav.ground;
  function collider(name,x,z,w,h,d,kind='building'){const c={name,min:[x-w/2,g,z-d/2],max:[x+w/2,g+h,z+d/2],kind};nav.colliders.push(c);return c;}
  function box(mat,x,z,w,h,d,y=g+h/2){instance('box',mat,x,y,z,w,h,d);}
  // New land stops at the canal. The old stone arch bridge remains a landmark, not a tank road.
  const northDepth=CANAL.north-BOUNDS.minZ,southDepth=BOUNDS.maxZ-CANAL.south;
  box('earth',0,(CANAL.north+BOUNDS.minZ)/2,224,1.8,northDepth,g-.94);
  box('earth',0,(CANAL.south+BOUNDS.maxZ)/2,224,1.8,southDepth,g-.94);
  const roads=[[-57,-40,106,10],[57,-40,106,10],[0,-72,10,80],[-58,-57,12,119],[48,-57,12,119],[0,45,220,10],[-58,47,12,62],[48,47,12,62]];
  for(const [x,z,w,d] of roads)box('stone',x,z,w,.045,d,g-.003);
  for(const x of CANAL.bridges){box('stone',x,12,14,1.2,18,g-.6);for(const s of [-1,1]){box('stone',x+s*7.15,12,.6,1.2,18);collider('加固桥护栏',x+s*7.15,12,.6,1.2,18,'rail');for(const z of [6,12,18])box('stone',x+s*6.7,z,.8,2,.8,g-1);}}
  // Chunked bank blocks leave the two bridge approaches open and provide readable water edges.
  for(const z of [CANAL.north,CANAL.south])for(let x=-110;x<110;x+=5){if(CANAL.bridges.some(b=>Math.abs(x-b)<10))continue;if(z===CANAL.north&&x>-32&&x<32)continue;box('stone',x,z,4.8,1.4,.65,g-.55);}
  function house(x,z,w=10,d=8,h=6){
    box('wall',x,z,w,h,d);collider('白墙民居',x,z,w,h,d);
    box('stone',x,z,w+.4,.4,d+.4);const rise=d*.28,half=d/2+.7,len=Math.hypot(half,rise),angle=Math.atan2(rise,half);
    for(const s of [-1,1])instance('box','roof',x,g+h+rise/2,z+s*half/2,w+1.5,.26,len,s*angle);
    box('roof',x,z,w+1.9,.38,.38,g+h+rise+.1);
    for(const s of [-1,1]){box('wood',x,z+s*(d/2+.025),1.6,3,.12,g+1.5);for(const dx of [-w*.29,w*.29]){box('red',x+dx,z+s*(d/2+.08),1.5,1.8,.18,g+3.2);box('dark',x+dx,z+s*(d/2+.18),1.15,1.44,.09,g+3.2);for(const a of [-.35,.35])box('red',x+dx+a,z+s*(d/2+.24),.1,1.5,.09,g+3.2);}}
  }
  for(const p of [[-90,-36,12,9,7],[-89,-87,12,8,6],[-37,-84,9,8,5],[-91,-62,10,7,6],[-37,-56,8,8,5],[82,-52,11,8,7],[84,-89,12,9,6],[29,-93,8,8,5],[-94,35,13,9,8],[-35,59,12,8,7],[-69,70,11,8,6],[77,56,10,8,7],[87,29,12,8,6],[31,64,10,8,5],[-26,-86,10,8,6],[25,-88,10,8,6]])house(...p);
  // Fields are traversable; their rows are batched geometry rather than thousands of game objects.
  for(const [x,z] of [[-76,-88],[-44,-100],[-83,-17],[-43,-20]]){box('rice',x,z,18,.07,13,g+.002);for(let i=0;i<15;i++)box('rice',x-8+i*1.1,z,.13,.30,12,g+.14);}
  for(const [x,z,w,d] of [[-79,-52,12,1],[-51,-65,1,11],[40,-70,1,10],[73,-77,10,1],[-69,30,10,1],[67,62,12,1],[-13,-101,1,9],[14,-91,1,9]]){box('stone',x,z,w,1.9,d);collider('断墙',x,z,w,1.9,d,'wall');}
  const reserved=CHAPTERS.flatMap(c=>[c.spawn,c.goal,...c.enemies.map(e=>e.slice(0,2)),...(c.relays||[]),...(c.route||[]),...(c.waves||[]).flat().map(e=>e.slice(0,2))]);
  function clearDecor(x,z){if(z>0&&z<27)return false;if(Math.abs(x)<33&&z>-33)return false;if(roads.some(([a,b,w,d])=>Math.abs(x-a)<w/2+3&&Math.abs(z-b)<d/2+3))return false;if(reserved.some(([a,b])=>Math.hypot(x-a,z-b)<10))return false;return !nav.colliders.some(c=>x>c.min[0]-4&&x<c.max[0]+4&&z>c.min[2]-4&&z<c.max[2]+4);}
  for(let i=0;i<210;i++){const x=rand()*210-105,z=rand()*184-110;if(!clearDecor(x,z))continue;const bamboo=x>20&&z<-50,h=4+rand()*5;
    instance('cylinder','wood',x,g+h/2,z,bamboo?.3:.65,h,bamboo?.3:.65);collider(bamboo?'竹干':'树干',x,z,bamboo?.32:.7,h,bamboo?.32:.7,'tree');
    for(let j=0;j<3;j++)instance(bamboo?'cone':'leaf','leaf',x+(rand()-.5)*2,g+h*.65+j*1.3,z+(rand()-.5)*2,bamboo?2.1:4.8,3.3,bamboo?2.1:4.8,0,rand()*6);
  }
  // Dock decking, bollards, lamp posts, water-control structures and a distant skyline.
  for(const x of [-82,-92]){box('wood',x,24,7,.20,8,g+.02);for(const z of [21,27])for(const s of [-1,1])instance('cylinder','wood',x+s*3,g-.5,z,.35,3,.35);}
  for(const [x,z] of [[-62,-54],[62,46],[0,-108]]){box('dark',x,z,2.2,2.4,2.2);collider('控制台',x,z,2.2,2.4,2.2);instance('cylinder','dark',x,g+5,z,.18,8,.18);box('gold',x,z,3,.12,.15,g+8);}
  for(const [x,z] of CHAPTERS[2].relays){box('dark',x,z,1.2,1.4,1.2);collider('转发终端',x,z,1.2,1.4,1.2);instance('cylinder','gold',x,g+3,z,.1,4.8,.1);}
  for(let i=0;i<13;i++){const x=-145+i*24,h=12+rand()*22;instance('cone','earth',x,h/2,-144-rand()*15,40,h,36,0,rand()*3);}
  for(const {shape,mat,items} of batches.values()){const m=new THREE.InstancedMesh(geometries[shape],mats[mat],items.length);items.forEach((a,i)=>{o.position.set(...a.slice(0,3));o.scale.set(...a.slice(3,6));o.rotation.set(...a.slice(6,9));o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.castShadow=mat!=='earth'&&mat!=='rice';m.receiveShadow=true;m.computeBoundingSphere();root.add(m);}
  const crates=[];
  for(const [x,z] of [[-42,-39],[-78,-51],[24,-70],[76,-72],[-86,56],[-49,34],[58,62],[17,-105]]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.8,2.4),mats.wood);mesh.position.set(x,g+.9,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);const c=collider('木质补给箱',x,z,2.4,1.8,2.4,'crate');c.hp=35;c.mesh=mesh;crates.push(c);}
  reindex(nav);
  return {root,roads,crates,materials:mats};
}
