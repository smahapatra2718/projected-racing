import * as T from './vendor/three.module.js';

export function makeReplay(data) {
  const raw=data.samples;
  const mx=raw.reduce((a,s)=>a+s[1],0)/raw.length,my=raw.reduce((a,s)=>a+s[2],0)/raw.length;
  let xx=0,xy=0,yy=0;
  for(const s of raw){const x=s[1]-mx,y=s[2]-my;xx+=x*x;xy+=x*y;yy+=y*y}
  const angle=.5*Math.atan2(2*xy,xx-yy),c=Math.cos(angle),s=Math.sin(angle);
  const rotated=raw.map(r=>[(r[1]-mx)*c+(r[2]-my)*s,-(r[1]-mx)*s+(r[2]-my)*c]);
  const xs=rotated.map(p=>p[0]),ys=rotated.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  const fit=Math.min(43/(xmax-xmin),26/(ymax-ymin));
  const samples=raw.map((r,i)=>({t:r[0],x:(rotated[i][0]-(xmin+xmax)/2)*fit,z:(rotated[i][1]-(ymin+ymax)/2)*fit,speed:r[3],gear:r[4],throttle:r[5],brake:r[6],drs:r[7]}));
  // Broadcast positions can drift at the timing line. Distribute closure correction
  // over the last 1.5 seconds so the recorded-duration loop has no teleport.
  const first=samples[0],end=samples.at(-1),dx=end.x-first.x,dz=end.z-first.z;
  for(const p of samples){const f=Math.max(0,(p.t-(data.lapDuration-1.5))/1.5);p.x-=dx*f;p.z-=dz*f}
  const distances=[0];for(let i=1;i<samples.length;i++)distances.push(distances[i-1]+Math.hypot(samples[i].x-samples[i-1].x,samples[i].z-samples[i-1].z));
  const length=distances.at(-1);
  samples.forEach((p,i)=>p.u=distances[i]/length);
  const curve=new T.CatmullRomCurve3(samples.slice(0,-1).map(p=>new T.Vector3(p.x,0,p.z)),true,'centripetal');
  function at(t){t=((t%data.lapDuration)+data.lapDuration)%data.lapDuration;let lo=0,hi=samples.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid].t<=t)lo=mid;else hi=mid}
    const a=samples[lo],b=samples[hi],f=(t-a.t)/(b.t-a.t);
    return {x:T.MathUtils.lerp(a.x,b.x,f),z:T.MathUtils.lerp(a.z,b.z,f),heading:Math.atan2(-(b.x-a.x),-(b.z-a.z)),u:T.MathUtils.lerp(a.u,b.u,f),speed:T.MathUtils.lerp(a.speed,b.speed,f),gear:a.gear,throttle:a.throttle,brake:a.brake,drs:a.drs};
  }
  function nearest(x,z){let best={d:Infinity,u:0,t:0};for(let i=0;i<samples.length-1;i++){const a=samples[i],b=samples[i+1],dx=b.x-a.x,dz=b.z-a.z;const f=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1),d=Math.hypot(x-a.x-f*dx,z-a.z-f*dz);if(d<best.d)best={d,u:T.MathUtils.lerp(a.u,b.u,f),t:T.MathUtils.lerp(a.t,b.t,f)}}return best}
  return {data,samples,curve,points:curve.getSpacedPoints(1000).slice(0,-1),length,scale:data.circuitLength/length,at,nearest,closureCorrection:Math.hypot(dx,dz)};
}
