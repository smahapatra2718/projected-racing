import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {GLTFLoader} from './dist/vendor/GLTFLoader.js';
import {makeReplay} from './dist/replay.js';
import {driveStep} from './dist/dynamics.js';
import {loadVehicles} from './dist/vehicle.js';
const binary=fs.readFileSync(new URL('./dist/models/qvist-2026-web.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),'');
let meshCount=0,triangles=0;gltf.scene.traverse(o=>{if(o.isMesh){meshCount++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3}});
assert.equal(meshCount,16);assert.ok(triangles>10000);
console.log(`Model parsed: ${meshCount} meshes, ${triangles} triangles, no external dependencies.`);
const context=new Proxy({},{get:()=>()=>{}});
function element(){const classes=new Set(['active']);return {style:{},classList:{contains:x=>classes.has(x),toggle(x,v){v??=!classes.has(x);v?classes.add(x):classes.delete(x)}},getContext:()=>context,appendChild(){},addEventListener(){},setPointerCapture(){},showModal(){this.open=true},close(){this.open=false},open:false}}
globalThis.document={createElement:element};
const originalLoad=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async()=>({scene:gltf.scene.clone(true)});
const vehicles=await loadVehicles(new T.Texture());
GLTFLoader.prototype.loadAsync=originalLoad;
const carSize=new T.Box3().setFromObject(vehicles.car).getSize(new T.Vector3());
const ghostSize=new T.Box3().setFromObject(vehicles.ghost).getSize(new T.Vector3());
assert.ok(carSize.z>1.8&&carSize.z<1.9);
assert.ok(carSize.x<.9&&carSize.y>.2);
assert.ok(ghostSize.y<.02);
assert.ok(vehicles.car.children.length>1);
console.log('Vehicle assembly: forward axis, dimensions, detailed ghost flattening, labels and marker PASS.');
class FakeRenderer{constructor(){this.domElement=element();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>1}}setSize(){}setPixelRatio(){}render(){}}
for(const id of ['monza','silverstone','monaco']){
  const data=JSON.parse(fs.readFileSync(new URL(`./dist/data/${id}.json`,import.meta.url)));
  const replay=makeReplay(data);
  assert.equal(data.driverNumber,1);assert.ok(data.samples.length>250);assert.equal(data.samples.at(-1)[0],data.lapDuration);
  for(let t=0;t<data.lapDuration;t+=.2){const p=replay.at(t);assert.ok(Number.isFinite(p.x+p.z+p.speed));assert.ok(replay.nearest(p.x,p.z).d<.001)}
  const a=replay.at(0),b=replay.at(data.lapDuration-.001);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.02);
  const handlers={},elements=new Map(),views=['orbit','chase','car','top','sensor'].map(view=>({...element(),dataset:{view}}));
  let frame;
  const sandbox={T,FakeRenderer,makeReplay,driveStep,loadVehicles:async()=>({car:new T.Group(),ghost:new T.Group(),meshCount}),fetch:async()=>({ok:true,json:async()=>data}),URLSearchParams,location:{search:'?track='+id},localStorage:{getItem:()=>null,setItem(){}},console,innerWidth:1440,innerHeight:900,devicePixelRatio:1,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:f=>frame=f,addEventListener:(k,f)=>handlers[k]=f,window:{},document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,querySelectorAll:q=>q==='[data-view]'?views:[]}};
  vm.createContext(sandbox);
  const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import .+;\n/gm,'').replace('new T.WebGLRenderer({antialias:true})','new FakeRenderer()');
  await vm.runInContext('(async()=>{'+source+'})()',sandbox);
  let now=0;function tick(seconds){for(let i=0;i<seconds*60;i++)frame(now+=1000/60)}
  tick(data.lapDuration+1);assert.equal(sandbox.window.apex.state().lapNum,2);assert.equal(sandbox.window.apex.state().best,Infinity);assert.equal(sandbox.window.apex.state().invalid,false);
  elements.get('drive').onclick();assert.equal(sandbox.window.apex.state().mode,'drive');
  handlers.keydown({key:'w',preventDefault(){}});tick(15);handlers.keyup({key:'w'});
  assert.ok(sandbox.window.apex.state().speed>0);assert.equal(sandbox.window.apex.state().invalid,true);
  elements.get('pause').onclick();const before=JSON.stringify(sandbox.window.apex.state().position);tick(2);assert.equal(JSON.stringify(sandbox.window.apex.state().position),before);
  for(const v of views){v.onclick();tick(.1);assert.equal(sandbox.window.apex.state().view,v.dataset.view)}
  elements.get('steering').oninput({target:{value:'1.8'}});assert.equal(sandbox.window.apex.state().steering,1.8);
  elements.get('reset').onclick();assert.equal(sandbox.window.apex.state().invalid,false);assert.equal(sandbox.window.apex.state().lapNum,1);
  console.log(`${id}: ${data.lapDuration}s lap, source alignment, loop, lap count, driving, track limits, pause, 5 views, steering, reset PASS.`);
}
const state={x:0,z:0,speed:1,heading:0,steer:0};
for(let i=0;i<60;i++)driveStep(state,{steer:1},1/60,40,1.4);
const oldHeading=1*.105/(1+.035);
assert.ok(state.heading>oldHeading*5);assert.ok(state.steer<Math.PI/2);
console.log(`Turning: ${state.heading.toFixed(3)} rad vs previous ${oldHeading.toFixed(3)} rad over 1s (more than 5×).`);
console.log('PASS. WebGL rendering and final browser layout not tested.');
