import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

export async function loadVehicles(markerTexture){
  const gltf=await new GLTFLoader().loadAsync('./models/qvist-2026-web.glb');
  const model=gltf.scene;
  const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const k=1.85/size.x;
  model.position.set(-center.x*k,-bounds.min.y*k,-center.z*k);model.scale.setScalar(k);
  const oriented=new T.Group();oriented.add(model);oriented.rotation.y=-Math.PI/2;
  model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;o.material=o.material.clone();const name=o.name;
    if(/chassis|sidepod|engine-cover|halo|mirrors/.test(name)){o.material.color.set('#10234c');o.material.metalness=.35;o.material.roughness=.35}
    if(name==='front-wing')o.material.color.set('#e9b622');
    if(name==='rear-wing')o.material.color.set('#142348');
  });
  const car=new T.Group();car.add(oriented);
  const label=document.createElement('canvas');label.width=1024;label.height=256;const c=label.getContext('2d');
  c.fillStyle='#10234c';c.fillRect(0,0,1024,256);c.fillStyle='#fff';c.font='bold 110px Arial';c.fillText('ORACLE',35,120);
  c.fillStyle='#ffcf28';c.beginPath();c.arc(800,125,102,0,Math.PI*2);c.fill();c.fillStyle='#ec203c';c.font='bold italic 69px Arial';c.fillText('Red Bull',32,220);c.font='bold 112px Arial';c.fillText('1',765,170);
  const texture=new T.CanvasTexture(label);texture.colorSpace=T.SRGBColorSpace;
  for(const side of [-1,1]){const panel=new T.Mesh(new T.PlaneGeometry(.67,.17),new T.MeshStandardMaterial({map:texture,roughness:.4,side:T.DoubleSide}));panel.rotation.y=side*Math.PI/2;panel.position.set(side*.235,.23,.13);car.add(panel)}
  const stripe=new T.Mesh(new T.BoxGeometry(.12,.025,.39),new T.MeshStandardMaterial({color:'#f5c526'}));stripe.position.set(0,.13,-.61);car.add(stripe);
  const ghost=car.clone(true);
  ghost.traverse(o=>{if(o.isMesh){o.material=new T.MeshBasicMaterial({color:'#88e8ff',transparent:true,opacity:.45,depthWrite:false,side:T.DoubleSide});o.castShadow=false;o.receiveShadow=false}});
  // Flatten the same detailed mesh onto the floor: a projected image, not a
  // second solid vehicle. Keep the silhouette and aero geometry.
  ghost.scale.y=.025;ghost.position.y=.055;
  const marker=new T.Mesh(new T.PlaneGeometry(.21,.21),new T.MeshBasicMaterial({map:markerTexture,side:T.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.set(0,size.y*k+.025,.13);car.add(marker);
  return {car,ghost,meshCount:(()=>{let n=0;model.traverse(o=>{if(o.isMesh)n++});return n})()};
}
