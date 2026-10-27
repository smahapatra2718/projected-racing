export function driveStep(state,input,dt,scale,sensitivity=1.4){
  const kmh=Math.abs(state.speed)*scale*3.6;
  const accel=(input.accelerate?17:0)-(input.brake?state.speed>0?32:9:0);
  state.speed+=(accel/scale-state.speed*.09)*dt;
  state.speed=Math.max(-25/(3.6*scale),Math.min(345/(3.6*scale),state.speed));
  // A short virtual wheelbase makes a tabletop car turn tightly. Speed-dependent
  // lock retains precision at racing speed; this is tunable arcade handling.
  const target=input.steer*Math.min(1.25,(.95/(1+kmh/210))*sensitivity);
  state.steer+=(target-state.steer)*(1-Math.exp(-dt*14));
  state.heading+=state.speed/.58*Math.tan(state.steer)*dt;
  state.x-=Math.sin(state.heading)*state.speed*dt;
  state.z-=Math.cos(state.heading)*state.speed*dt;
}
