from pathlib import Path
p=Path(__file__).parent/"dist"/"app.js"
s=p.read_text()
s=s.replace("import * as T from './vendor/three.module.js';","""import * as T from './vendor/three.module.js';
import {makeReplay} from './replay.js';
import {loadVehicles} from './vehicle.js';
import {driveStep} from './dynamics.js';
const trackID=new URLSearchParams(location.search).get('track')||'monza';
if(!['monza','silverstone','monaco'].includes(trackID))throw new Error('Unknown circuit');
const response=await fetch('./data/'+trackID+'.json');
if(!response.ok)throw new Error('Recorded lap could not be loaded');
const replay=makeReplay(await response.json());
const data=replay.data;
""")
a=s.index("const control=")
b=s.index("const texCanvas=",a)
s=s[:a]+"""const curve=replay.curve,N=1000,points=replay.points,trackWidth=1.65,physicalLength=replay.length,scale=replay.scale;
"""+s[b:]
s=s.replace("nx*1.63*s","nx*(trackWidth/2+.06)*s").replace("nz*1.63*s","nz*(trackWidth/2+.06)*s")
s=s.replace("ctx.lineWidth=12","ctx.lineWidth=6")
s=s.replace("ctx.fillText('APEX / PROJECTION LAB',790,710)","ctx.fillText(data.name.toUpperCase()+' / RED BULL',790,710)")
s=s.replace("ctx.fillText('CIRCUIT 01     •     340 M',800,745)","ctx.fillText('VERSTAPPEN  /  2024 QUALIFYING',800,745)")
a=s.index("const car=new T.Group()")
b=s.index("const lockRing=",a)
s=s[:a]+"""const {car,ghost,meshCount}=await loadVehicles(markerTex);
scene.add(car,ghost);
"""+s[b:]
s=s.replace("[[-.85,-1.6],[.85,-1.6],[.85,1.3],[-.85,1.3]]","[[-.4,-1.05],[.4,-1.05],[.4,1.05],[-.4,1.05]]")
s=s.replace("const ghostPeriod=33","const ghostPeriod=data.lapDuration")
s=s.replace("if(obj===ghost)obj.rotation.z=-h;else obj.rotation.y=h","obj.rotation.y=h")
s=s.replace("let mode='demo'","let steering=Number(localStorage.getItem('apex-steering')||1.4),steerState=0,ghostSample=replay.at(0);\nlet mode='demo'")
s=s.replace("heading=poseAt(0,car);poseAt(0,ghost);","heading=poseAt(0,car);poseAt(0,ghost);steerState=0;")
s=s.replace("best=Infinity;$('modeText')","best=Infinity;$('modeText')")
s=s.replace("'DEMO LAP · AUTOPILOT'","'VERSTAPPEN · RECORDED LAP'")
s=s.replace("function nearest(){let min=Infinity,idx=0;for(let i=0;i<N;i++){let d=(car.position.x-points[i].x)**2+(car.position.z-points[i].z)**2;if(d<min){min=d;idx=i}}return {u:idx/N,d:Math.sqrt(min)}}","function nearest(){return replay.nearest(car.position.x,car.position.z)}")
s=s.replace("Math.round(Math.abs(speed)*scale*3.6)","Math.round(mode==='demo'?ghostSample.speed:Math.abs(speed)*scale*3.6)")
s=s.replace("$('gear').textContent=speed<-.1?","$('gear').textContent=mode==='demo'?ghostSample.gear:speed<-.1?")
a=s.index("let gap=((u-ghostU")
b=s.index("$('progress')",a)
s=s[:a]+"""const reference=nearest().t;let gap=((elapsed%ghostPeriod-reference+ghostPeriod*1.5)%ghostPeriod)-ghostPeriod*.5;
$('delta').textContent=(gap>=0?'+':'−')+Math.abs(gap).toFixed(3);$('delta').title='Approximate gap to recorded reference at your nearest track position';
$('ghostSpeed').textContent=Math.round(ghostSample.speed)+' KM/H';$('ghostGear').textContent=ghostSample.gear;
$('throttle').style.width=ghostSample.throttle+'%';$('brake').style.width=ghostSample.brake+'%';
"""+s[b:]
s=s.replace("elapsed+=dt;lapElapsed+=dt;ghostU=elapsed/ghostPeriod%1;poseAt(ghostU,ghost);","""elapsed+=dt;lapElapsed+=dt;ghostSample=replay.at(elapsed);ghostU=ghostSample.u;ghost.position.x=ghostSample.x;ghost.position.z=ghostSample.z;ghost.rotation.y=ghostSample.heading;""")
a=s.index("if(mode==='demo'){demoU=")
b=s.index("\nlet du=",a)
s=s[:a]+"""if(mode==='demo'){
  car.position.x=ghostSample.x;car.position.z=ghostSample.z;heading=ghostSample.heading;car.rotation.y=heading;
  speed=ghostSample.speed/(3.6*scale);near=nearest();
}else{
  const input={accelerate:keys.w||keys.arrowup,brake:keys.s||keys.arrowdown,steer:(keys.a||keys.arrowleft?1:0)-(keys.d||keys.arrowright?1:0)};
  const state={speed,heading,steer:steerState,x:car.position.x,z:car.position.z};
  driveStep(state,input,dt,scale,steering);speed=state.speed;heading=state.heading;steerState=state.steer;
  car.rotation.y=heading;car.position.x=T.MathUtils.clamp(state.x,-43,43);car.position.z=T.MathUtils.clamp(state.z,-24,27);
  near=nearest();off=near.d>trackWidth/2-.24;if(off){invalid=true;speed*=Math.exp(-dt*.6)}
}"""+s[b:]
s=s.replace("trackWidth/2-.52","trackWidth/2-.24")
s=s.replace("best=Math.min(best,lapElapsed)","if(mode==='drive')best=Math.min(best,lapElapsed)")
s=s.replace("if(view==='chase'){pos.set(car.position.x+Math.sin(heading)*6,3.8,car.position.z+Math.cos(heading)*6);target.set(car.position.x-Math.sin(heading)*3,.4,car.position.z-Math.cos(heading)*3)}","""if(view==='chase'){pos.set(car.position.x+Math.sin(heading)*3.3,1.9,car.position.z+Math.cos(heading)*3.3);target.set(car.position.x-Math.sin(heading)*1.5,.15,car.position.z-Math.cos(heading)*1.5)}else if(view==='car'){pos.set(car.position.x+2.2,1.1,car.position.z-2.5);target.set(car.position.x,.2,car.position.z)}""")
s=s.replace("camera.position.set(20,40,48);reset();requestAnimationFrame(animate);","""$('circuit').value=trackID;$('circuit').onchange=e=>location.search='?track='+e.target.value;
$('steering').value=steering;$('steerValue').textContent=steering.toFixed(1)+'×';
$('steering').oninput=e=>{steering=Number(e.target.value);localStorage.setItem('apex-steering',steering);$('steerValue').textContent=steering.toFixed(1)+'×'};
$('circuitName').textContent=data.name.toUpperCase();$('trackLength').textContent=(data.circuitLength/1000).toFixed(3)+' KM';
$('referenceLap').textContent=fmt(data.lapDuration);$('referenceSource').textContent='2024 '+data.name+' · Qualifying · Lap '+data.lapNumber;
$('lapSource').href=data.sources.laps;$('positionSource').href=data.sources.location;$('carDataSource').href=data.sources.carData;
$('modelStatus').textContent=meshCount+'-PART F1 MESH · RED BULL LIVERY';
$('loading').hidden=true;
camera.position.set(20,40,48);reset();requestAnimationFrame(animate);""")
s=s.replace("position:car.position.toArray(),best","position:car.position.toArray(),best,steering,heading,trackID,ghostSample,meshCount")
p.write_text(s)
