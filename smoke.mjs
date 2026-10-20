import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
const handlers={}, elements=new Map();
const context=new Proxy({},{get:()=>()=>{}});
function element(){const classes=new Set(['active']);return {style:{},classList:{contains:x=>classes.has(x),toggle(x,v){v??=!classes.has(x);v?classes.add(x):classes.delete(x)}},getContext:()=>context,appendChild(){},addEventListener(){},setPointerCapture(){},showModal(){this.open=true},close(){this.open=false},open:false}}
const views=['orbit','chase','top','sensor'].map(view=>({...element(),dataset:{view}}));
let frame;
class FakeRenderer{constructor(){this.domElement=element();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>1}}setSize(){}setPixelRatio(){}render(){}}
const sandbox={T,FakeRenderer,console,innerWidth:1440,innerHeight:900,devicePixelRatio:1,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:f=>frame=f,addEventListener:(k,f)=>handlers[k]=f,window:{},document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,querySelectorAll:q=>q==='[data-view]'?views:[]}};
vm.createContext(sandbox);let source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace("import * as T from './vendor/three.module.js';",'').replace('new T.WebGLRenderer({antialias:true})','new FakeRenderer()');
vm.runInContext(source,sandbox);let now=0;function tick(seconds){for(let i=0;i<seconds*60;i++)frame(now+=1000/60)}
tick(38);assert.equal(sandbox.window.apex.state().lapNum,2);assert.ok(sandbox.window.apex.state().best>36);assert.equal(sandbox.window.apex.state().invalid,false);
elements.get('drive').onclick();assert.equal(sandbox.window.apex.state().mode,'drive');handlers.keydown({key:'w',preventDefault(){}});tick(5);handlers.keyup({key:'w'});assert.ok(sandbox.window.apex.state().speed>0);assert.equal(sandbox.window.apex.state().invalid,true);
elements.get('pause').onclick();const before=JSON.stringify(sandbox.window.apex.state().position);tick(2);assert.equal(JSON.stringify(sandbox.window.apex.state().position),before);
for(const v of views){v.onclick();tick(.1);assert.equal(sandbox.window.apex.state().view,v.dataset.view)}
elements.get('reset').onclick();assert.equal(sandbox.window.apex.state().invalid,false);assert.equal(sandbox.window.apex.state().lapNum,1);
console.log('PASS: demo lap timing, valid lap, manual acceleration, track violation, pause, four cameras, reset. Rendering not tested.');
