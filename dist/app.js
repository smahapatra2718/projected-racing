import * as T from './vendor/three.module.js';
import {makeReplay} from './replay.js';
import {loadVehicles} from './vehicle.js';
import {driveStep} from './dynamics.js';
const trackID=new URLSearchParams(location.search).get('track')||'monza';
if(!['monza','silverstone','monaco'].includes(trackID))throw new Error('Unknown circuit');
const response=await fetch('./data/'+trackID+'.json');
if(!response.ok)throw new Error('Recorded lap could not be loaded');
const replay=makeReplay(await response.json());
const data=replay.data;

const $=id=>document.getElementById(id), scene=new T.Scene();
scene.background=new T.Color('#0c1115');scene.fog=new T.FogExp2('#0c1115',.016);
const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.1,180),renderer=new T.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;$('scene').appendChild(renderer.domElement);
const mat=(color,roughness=.6,metalness=.2)=>new T.MeshStandardMaterial({color,roughness,metalness}),dark=mat('#10171b',.35,.65),metal=mat('#586568',.32,.75),white=mat('#e7ece5',.25,.45),mint=mat('#b8f97a');
const emissive=(c,p=1)=>new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:p});
function box(w,h,d,m,x=0,y=0,z=0,parent=scene){let o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function cyl(r,h,m,x,y,z,parent=scene){let o=new T.Mesh(new T.CylinderGeometry(r,r,h,24),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
scene.add(new T.HemisphereLight('#b9d1dc','#182219',2));const key=new T.DirectionalLight('#d7e6f0',3);key.position.set(-8,22,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-30,right:30,top:25,bottom:-25});scene.add(key);
const spot=new T.PointLight('#d3ffab',65,45,2);spot.position.set(0,10,0);scene.add(spot);
box(120,.3,100,mat('#222b2c',.72,.3),0,-.2,0);let grid=new T.GridHelper(100,50,'#43504d','#303a39');grid.position.y=-.035;scene.add(grid);
box(100,18,.5,mat('#1c2428'),0,8,-27);for(let x=-45;x<=45;x+=9){box(.35,18,.4,metal,x,8,-26.5);box(5,.065,.1,emissive('#d1e0df',2),x,7,-26.15);box(.1,1.8,.1,emissive('#9fc978'),x,1,-26.15)}
const curve=replay.curve,N=1000,points=replay.points,trackWidth=1.65,physicalLength=replay.length,scale=replay.scale;
const texCanvas=document.createElement('canvas');texCanvas.width=2048;texCanvas.height=1400;const ctx=texCanvas.getContext('2d'),tx=x=>(x+25)/50*2048,tz=z=>(z+17)/34*1400;
function path(c){c.beginPath();points.forEach((p,i)=>i?c.lineTo(tx(p.x),tz(p.z)):c.moveTo(tx(p.x),tz(p.z)));c.closePath()}
ctx.fillStyle='#252e2b';ctx.fillRect(0,0,2048,1400);ctx.strokeStyle='#516a44';ctx.lineWidth=trackWidth*2048/50+28;path(ctx);ctx.stroke();ctx.strokeStyle='#d5ded1';ctx.lineWidth=trackWidth*2048/50+8;path(ctx);ctx.stroke();ctx.strokeStyle='#333f3d';ctx.lineWidth=trackWidth*2048/50;path(ctx);ctx.stroke();
for(let i=0;i<N;i+=5){let p=points[i],t=curve.getTangentAt(i/N),nx=-t.z,nz=t.x;for(let s of [-1,1]){ctx.strokeStyle=Math.floor(i/5)%2?'#e2e8de':'#d66551';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(tx(p.x+nx*(trackWidth/2+.06)*s),tz(p.z+nz*(trackWidth/2+.06)*s));let q=points[(i+4)%N];ctx.lineTo(tx(q.x+nx*(trackWidth/2+.06)*s),tz(q.z+nz*(trackWidth/2+.06)*s));ctx.stroke()}}
let start=points[0],st=curve.getTangentAt(0);ctx.save();ctx.translate(tx(start.x),tz(start.z));ctx.rotate(-Math.atan2(st.x,st.z));for(let a=0;a<8;a++)for(let b=0;b<2;b++){ctx.fillStyle=(a+b)%2?'#1b2423':'#f2f5e6';ctx.fillRect((a-4)*16,b*12,16,12)}ctx.restore();ctx.fillStyle='#9cae90';ctx.font='bold 36px sans-serif';ctx.fillText(data.name.toUpperCase()+' / RED BULL',790,710);ctx.font='16px monospace';ctx.fillStyle='#627b5e';ctx.fillText('VERSTAPPEN  /  2024 QUALIFYING',800,745);
const trackTex=new T.CanvasTexture(texCanvas);trackTex.colorSpace=T.SRGBColorSpace;trackTex.anisotropy=renderer.capabilities.getMaxAnisotropy();
const track=new T.Mesh(new T.PlaneGeometry(50,34),new T.MeshStandardMaterial({map:trackTex,emissiveMap:trackTex,emissive:'#ffffff',emissiveIntensity:.42,roughness:.95}));track.rotation.x=-Math.PI/2;track.position.y=.012;track.receiveShadow=true;scene.add(track);
for(let x of [-25,25])for(let z of [-17,17]){box(1,.02,.04,emissive('#b8f97a'),x,.03,z);box(.04,.02,1,emissive('#b8f97a'),x,.03,z)}
const racingLine=new T.Line(new T.BufferGeometry().setFromPoints([...points,points[0]].map(p=>new T.Vector3(p.x,.05,p.z))),new T.LineDashedMaterial({color:'#b8f97a',dashSize:.45,gapSize:.35,transparent:true,opacity:.65}));racingLine.computeLineDistances();scene.add(racingLine);
const rig=new T.Group();scene.add(rig);box(5.4,2.9,4,dark,0,11,0,rig);for(let x of [-2.2,2.2])box(.06,12,.06,metal,x,18,0,rig);
const scoreCanvas=document.createElement('canvas');scoreCanvas.width=1024;scoreCanvas.height=512;const sc=scoreCanvas.getContext('2d'),scoreTex=new T.CanvasTexture(scoreCanvas);scoreTex.colorSpace=T.SRGBColorSpace;
for(let side=0;side<4;side++){let scr=new T.Mesh(new T.PlaneGeometry(side%2?3.8:5.2,2.6),new T.MeshBasicMaterial({map:scoreTex}));scr.rotation.y=side*Math.PI/2;scr.position.set(side===1?2.71:side===3?-2.71:0,11,side===0?2.01:side===2?-2.01:0);rig.add(scr)}
box(1.7,.65,1.5,metal,0,8.95,0,rig);cyl(.34,.25,dark,0,8.5,0,rig);cyl(.23,.03,emissive('#ddffbd',3),0,8.36,0,rig);box(.45,.28,.45,dark,.95,8.7,.25,rig);cyl(.12,.08,emissive('#7bc4df'),.95,8.52,.25,rig);box(.04,.05,.04,emissive('#9aff67',3),1.17,8.7,.45,rig);
const beamGeo=new T.BufferGeometry();beamGeo.setAttribute('position',new T.Float32BufferAttribute([0,8.3,0,-25,.04,-17,25,.04,-17,0,8.3,0,25,.04,-17,25,.04,17,0,8.3,0,25,.04,17,-25,.04,17,0,8.3,0,-25,.04,17,-25,.04,-17],3));const beam=new T.Mesh(beamGeo,new T.MeshBasicMaterial({color:'#bfefa3',transparent:true,opacity:.025,side:T.DoubleSide,depthWrite:false}));scene.add(beam);
const markerCanvas=document.createElement('canvas');markerCanvas.width=128;markerCanvas.height=128;const mc=markerCanvas.getContext('2d');mc.fillStyle='white';mc.fillRect(0,0,128,128);mc.fillStyle='black';mc.fillRect(10,10,108,108);
const bits=['01110','00100','00101','00011','01011'];for(let y=0;y<5;y++)for(let x=0;x<5;x++)if(bits[y][x]==='1'){mc.fillStyle='white';mc.fillRect(26+x*15,26+y*15,15,15)}const markerTex=new T.CanvasTexture(markerCanvas);markerTex.magFilter=T.NearestFilter;
const {car,ghost,meshCount}=await loadVehicles(markerTex);
scene.add(car,ghost);
const lockRing=new T.LineLoop(new T.BufferGeometry().setFromPoints([[-.4,-1.05],[.4,-1.05],[.4,1.05],[-.4,1.05]].map(p=>new T.Vector3(p[0],.08,p[1]))),new T.LineBasicMaterial({color:'#b8f97a',transparent:true,opacity:.6}));car.add(lockRing);
let steering=Number(localStorage.getItem('apex-steering')||1.4),steerState=0,ghostSample=replay.at(0);
let mode='demo',view='orbit',paused=false,elapsed=0,lapElapsed=0,lapNum=1,best=Infinity,invalid=false,speed=0,heading=0,ghostU=0,demoU=0,previousU=0,progressAccum=0,orbitAngle=.32,orbitRadius=64,keys={},last=performance.now(),hudClock=0;
const ghostPeriod=data.lapDuration,map=$('map').getContext('2d');
function poseAt(u,obj){const p=curve.getPointAt((u%1+1)%1),t=curve.getTangentAt((u%1+1)%1);obj.position.x=p.x;obj.position.z=p.z;let h=Math.atan2(-t.x,-t.z);obj.rotation.y=h;return h}
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.opacity=0,2800)}
function reset(){elapsed=0;lapElapsed=0;lapNum=1;invalid=false;speed=0;ghostU=0;demoU=0;previousU=0;progressAccum=0;heading=poseAt(0,car);poseAt(0,ghost);steerState=0;toast('Session reset · start / finish')}
function fmt(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(3).padStart(6,'0')}
function takeWheel(){mode=mode==='demo'?'drive':'demo';reset();best=Infinity;$('modeText').textContent=mode==='drive'?'MANUAL CONTROL · YOUR LAP':'VERSTAPPEN · RECORDED LAP';$('drive').innerHTML=mode==='drive'?'Return to demo <span>↗</span>':'Take the wheel <span>↗</span>';toast(mode==='drive'?'W / ↑ to accelerate · A / D to steer':'Autopilot engaged')}
$('credits').onclick=()=>$('sources').showModal();$('closeSources').onclick=()=>$('sources').close();
$('drive').onclick=takeWheel;$('help').onclick=()=>$('instructions').showModal();$('closeHelp').onclick=()=>$('instructions').close();$('helpDrive').onclick=()=>{$('instructions').close();if(mode==='demo')takeWheel()};$('reset').onclick=reset;
function pause(){paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').ariaLabel=paused?'Resume simulation':'Pause simulation'}$('pause').onclick=pause;
$('line').onclick=()=>{racingLine.visible=!racingLine.visible;$('line').classList.toggle('active',racingLine.visible)};$('beam').onclick=()=>{$('beam').classList.toggle('active')};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('active',v===b))});
addEventListener('keydown',e=>{if($('instructions').open||$('sources').open||['INPUT','SELECT'].includes(e.target?.tagName))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key.toLowerCase()]=true;if(e.repeat)return;if(e.key===' ')pause();if(e.key.toLowerCase()==='r')reset()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('blur',()=>keys={});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key.toLowerCase()]=true};b.onpointerup=b.onpointercancel=()=>keys[b.dataset.key.toLowerCase()]=false});
let drag=false,px=0;renderer.domElement.onpointerdown=e=>{drag=true;px=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)};renderer.domElement.onpointerup=()=>drag=false;renderer.domElement.onpointermove=e=>{if(drag&&view==='orbit'){orbitAngle-=(e.clientX-px)*.006;px=e.clientX}};renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();orbitRadius=T.MathUtils.clamp(orbitRadius+e.deltaY*.035,35,95)},{passive:false});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
function nearest(){return replay.nearest(car.position.x,car.position.z)}
function updateHud(u,off,locked){const km=Math.round(mode==='demo'?ghostSample.speed:Math.abs(speed)*scale*3.6);$('speed').textContent=String(km).padStart(3,'0');$('gear').textContent=mode==='demo'?ghostSample.gear:speed<-.1?'R':km<2?'N':Math.min(8,1+Math.floor(km/28));$('speedbar').style.width=Math.min(km/220*100,100)+'%';$('lapTime').textContent=fmt(lapElapsed);$('lap').textContent=String(lapNum).padStart(2,'0');$('best').textContent=isFinite(best)?fmt(best):'—';const reference=nearest().t;let gap=((elapsed%ghostPeriod-reference+ghostPeriod*1.5)%ghostPeriod)-ghostPeriod*.5;
$('delta').textContent=(gap>=0?'+':'−')+Math.abs(gap).toFixed(3);$('delta').title='Approximate gap to recorded reference at your nearest track position';
$('ghostSpeed').textContent=Math.round(ghostSample.speed)+' KM/H';$('ghostGear').textContent=ghostSample.gear;
$('throttle').style.width=ghostSample.throttle+'%';$('brake').style.width=ghostSample.brake+'%';
$('progress').textContent=Math.floor(u*100)+'%';$('limits').textContent=off?'● OUTSIDE TRACK · LAP INVALID':invalid?'● ON TRACK · LAP INVALID':'● WITHIN TRACK LIMITS';$('limits').style.color=invalid?'#ff9676':'#b8f97a';$('lock').textContent=locked?'LOCKED':'LOST';$('lock').style.color=locked?'#b8f97a':'#ff9676';$('tracking').textContent=locked?'MARKER 07 · VIRTUAL SENSOR':'OUTSIDE CAMERA FOOTPRINT';lockRing.visible=locked;
map.clearRect(0,0,440,260);map.lineWidth=14;map.strokeStyle='#37443f';map.beginPath();points.forEach((p,i)=>{let x=220+p.x*9,y=130+p.z*9;i?map.lineTo(x,y):map.moveTo(x,y)});map.closePath();map.stroke();map.lineWidth=1;map.strokeStyle='#697c67';map.stroke();for(let [o,c] of [[ghost,'#88e8ff'],[car,'#ffffff']]){map.beginPath();map.fillStyle=c;map.arc(220+o.position.x*9,130+o.position.z*9,6,0,Math.PI*2);map.fill()}
sc.fillStyle='#0a1213';sc.fillRect(0,0,1024,512);sc.fillStyle='#b8f97a';sc.font='bold 36px sans-serif';sc.fillText('APEX / LIVE SESSION',45,65);sc.fillStyle='#667a72';sc.fillRect(45,90,934,2);sc.fillStyle='#f0f4e9';sc.font='bold 112px monospace';sc.fillText(fmt(lapElapsed),42,237);sc.font='30px monospace';sc.fillStyle='#9aaea3';sc.fillText('LAP '+String(lapNum).padStart(2,'0')+'    '+km+' KM/H    '+(mode==='demo'?'DEMO':'MANUAL'),45,320);sc.fillStyle=off?'#ff9676':'#b8f97a';sc.font='bold 33px sans-serif';sc.fillText(off?'OUTSIDE TRACK LIMITS':invalid?'LAP INVALID':'TRACK LIMITS / CLEAR',45,433);scoreTex.needsUpdate=true}
function animate(now){requestAnimationFrame(animate);let dt=Math.min((now-last)/1000,.04);last=now;let off=false,near=nearest();if(!paused){elapsed+=dt;lapElapsed+=dt;ghostSample=replay.at(elapsed);ghostU=ghostSample.u;ghost.position.x=ghostSample.x;ghost.position.z=ghostSample.z;ghost.rotation.y=ghostSample.heading;
if(mode==='demo'){
  car.position.x=ghostSample.x;car.position.z=ghostSample.z;heading=ghostSample.heading;car.rotation.y=heading;
  speed=ghostSample.speed/(3.6*scale);near=nearest();
}else{
  const input={accelerate:keys.w||keys.arrowup,brake:keys.s||keys.arrowdown,steer:(keys.a||keys.arrowleft?1:0)-(keys.d||keys.arrowright?1:0)};
  const state={speed,heading,steer:steerState,x:car.position.x,z:car.position.z};
  driveStep(state,input,dt,scale,steering);speed=state.speed;heading=state.heading;steerState=state.steer;
  car.rotation.y=heading;car.position.x=T.MathUtils.clamp(state.x,-43,43);car.position.z=T.MathUtils.clamp(state.z,-24,27);
  near=nearest();off=near.d>trackWidth/2-.24;if(off){invalid=true;speed*=Math.exp(-dt*.6)}
}
let du=near.u-previousU;if(du<-.5)du+=1;if(du>.5)du-=1;if(Math.abs(du)<.08)progressAccum+=du;if(previousU>.92&&near.u<.08&&progressAccum>.92){if(!invalid){if(mode==='drive')best=Math.min(best,lapElapsed);toast('Lap complete · '+fmt(lapElapsed))}else toast('Invalid lap · new attempt started');lapNum++;lapElapsed=0;progressAccum=0;invalid=false}previousU=near.u}
off=near.d>trackWidth/2-.24;const locked=Math.abs(car.position.x)<25&&Math.abs(car.position.z)<17;hudClock+=dt;if(hudClock>.08){updateHud(near.u,off,locked);hudClock=0}
let target=new T.Vector3(),pos=new T.Vector3();if(view==='chase'){pos.set(car.position.x+Math.sin(heading)*3.3,1.9,car.position.z+Math.cos(heading)*3.3);target.set(car.position.x-Math.sin(heading)*1.5,.15,car.position.z-Math.cos(heading)*1.5)}else if(view==='car'){pos.set(car.position.x+2.2,1.1,car.position.z-2.5);target.set(car.position.x,.2,car.position.z)}else if(view==='top'){pos.set(0,62,.01)}else if(view==='sensor'){pos.set(.95,8.25,.25);camera.fov=142}else{pos.set(Math.sin(orbitAngle)*orbitRadius,orbitRadius*.62,Math.cos(orbitAngle)*orbitRadius*.78);target.set(-1,1.5,0)}if(view!=='sensor')camera.fov=view==='chase'?65:43;camera.updateProjectionMatrix();camera.position.lerp(pos,1-Math.exp(-dt*6));camera.lookAt(target);rig.visible=view!=='sensor'&&view!=='top';beam.visible=$('beam').classList.contains('active')&&view==='orbit';renderer.render(scene,camera)}
$('circuit').value=trackID;$('circuit').onchange=e=>location.search='?track='+e.target.value;
$('steering').value=steering;$('steerValue').textContent=steering.toFixed(1)+'×';
$('steering').oninput=e=>{steering=Number(e.target.value);localStorage.setItem('apex-steering',steering);$('steerValue').textContent=steering.toFixed(1)+'×'};
$('circuitName').textContent=data.name.toUpperCase();$('trackLength').textContent=(data.circuitLength/1000).toFixed(3)+' KM';
$('referenceLap').textContent=fmt(data.lapDuration);$('referenceSource').textContent='2024 '+data.name+' · Qualifying · Lap '+data.lapNumber;
$('lapSource').href=data.sources.laps;$('positionSource').href=data.sources.location;$('carDataSource').href=data.sources.carData;
$('modelStatus').textContent=meshCount+'-PART F1 MESH · RED BULL LIVERY';
$('loading').hidden=true;
camera.position.set(20,40,48);reset();requestAnimationFrame(animate);
window.apex={state:()=>({mode,view,paused,speed,invalid,lapNum,position:car.position.toArray(),best,steering,heading,trackID,ghostSample,meshCount}),reset};
