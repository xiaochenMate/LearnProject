// Only for world-layout unit tests. No rendering claims are made by this stub.
class Triple { set(){return this;} }
export class Object3D { constructor(){this.position=new Triple();this.scale=new Triple();this.rotation=new Triple();this.matrix={};this.children=[];this.visible=true;} add(...x){this.children.push(...x);} updateMatrix(){} }
export class Group extends Object3D {}
export class Mesh extends Object3D {constructor(g,m){super();this.geometry=g;this.material=m;}}
export class InstancedMesh extends Mesh {setMatrixAt(){} computeBoundingSphere(){} }
export class Vector3 {}
export class CanvasTexture {constructor(){this.repeat=new Triple();}}
export class MeshStandardMaterial {constructor(options){Object.assign(this,options);}}
export class BoxGeometry {} export class CylinderGeometry {} export class ConeGeometry {} export class IcosahedronGeometry {}
export const SRGBColorSpace='srgb',RepeatWrapping='repeat';
