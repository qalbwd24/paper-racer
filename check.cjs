const assert=require('node:assert/strict'),fs=require('node:fs'),R=require('./dist/rules.js');
const P=R.P,straight=R.makeTrack({name:'test',width:6,points:[P(5,16),P(35,16)]});
const car=(x,y,vx,vy)=>({position:P(x,y),velocity:P(vx,vy),status:'running'});
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
test('initial nine choices',()=>{for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){const o=R.evaluate(straight,car(5,16,0,0),x,y);assert.deepEqual(o.position,P(5+x,16+y));assert.equal(o.status,x<0?'crashed':'running');}});
test('inertia and acceleration',()=>{const o=R.evaluate(straight,car(10,16,3,1),1,-1);assert.deepEqual(o.position,P(14,16));assert.deepEqual(o.velocity,P(4,0));});
test('zero acceleration keeps speed',()=>{assert.deepEqual(R.evaluate(straight,car(10,16,3,0),0,0).position,P(13,16));});
test('brake to stop and reverse allowed',()=>{const stopped=R.evaluate(straight,car(10,16,1,0),-1,0);assert.deepEqual(stopped.position,P(10,16));assert.deepEqual(R.evaluate(straight,stopped,-1,0).position,P(9,16));});
test('wall touch is a crash',()=>{assert.equal(R.evaluate(straight,car(10,16,0,3),0,0).status,'crashed');});
test('finish before later boundary',()=>{const o=R.evaluate(straight,car(30,16,12,0),0,0);assert.equal(o.status,'finished');assert.ok(Math.abs(o.impact.x-35)<1e-6);});
test('wall before finish',()=>{assert.equal(R.evaluate(straight,car(30,16,12,12),0,0).status,'crashed');});
test('finish wall corner is crash',()=>{assert.equal(R.evaluate(straight,car(30,16,5,3),0,0).status,'crashed');});
test('back through start is crash',()=>{assert.equal(R.evaluate(straight,car(6,16,-2,0),0,0).status,'crashed');});
test('stationary wait on start is valid',()=>{assert.equal(R.evaluate(straight,car(5,16,0,0),0,0).status,'running');});
test('collinear and corner intersection',()=>{assert.equal(R.hit(P(0,0),P(4,0),P(2,0),P(6,0)),.5);assert.equal(R.hit(P(0,0),P(4,4),P(4,4),P(8,0)),1);});
test('invalid and self intersecting tracks rejected',()=>{assert.throws(()=>R.makeTrack({width:6,points:[P(3,3)]}));assert.throws(()=>R.makeTrack({width:6,points:[P(NaN,2),P(20,20)]}));assert.throws(()=>R.makeTrack({width:9,points:[P(5,5),P(35,25),P(5,25),P(35,5)]}));});
test('all preset geometries valid with start choices',()=>{for(const spec of Object.values(R.presets))assert.ok(R.makeTrack(spec).starts.length>=3);});
test('inside endpoint cannot jump across U track walls',()=>{const t=R.makeTrack(R.presets.rookie);assert.ok(R.inside(P(39,22),t.polygon));assert.equal(R.evaluate(t,car(8,22,31,0),0,0).status,'crashed');});
test('all local assets resolve',()=>{const html=fs.readFileSync('dist/index.html','utf8');for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))assert.ok(fs.existsSync('dist/'+m[1]),m[1]);});
console.log(`${count} rule and asset checks passed`);
// An independent bounded route search: finds playable examples, does NOT certify optimality.
class Heap{a=[];push(o){this.a.push(o);let i=this.a.length-1;while(i){const p=(i-1)>>1;if(this.a[p].score<=o.score)break;this.a[i]=this.a[p];i=p;}this.a[i]=o;}pop(){const root=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1].score<this.a[c].score)c++;if(this.a[c].score>=last.score)break;this.a[i]=this.a[c];i=c;}this.a[i]=last;}return root;}}
function solve(t){const suffix=Array(t.path.length).fill(0);for(let i=t.path.length-2;i>=0;i--)suffix[i]=suffix[i+1]+Math.hypot(t.path[i+1].x-t.path[i].x,t.path[i+1].y-t.path[i].y);function heuristic(p){let best=Infinity,h=0;for(let i=0;i<t.path.length;i++){const d=Math.hypot(p.x-t.path[i].x,p.y-t.path[i].y);if(d<best){best=d;h=suffix[i];}}return h/3.5;}
const heap=new Heap(),seen=new Map();for(const start of t.starts)heap.push({s:car(start.x,start.y,0,0),g:0,score:heuristic(start),moves:[],start});let expanded=0;while(heap.a.length&&expanded<70000){const n=heap.pop(),key=[n.s.position.x,n.s.position.y,n.s.velocity.x,n.s.velocity.y].join(',');if((seen.get(key)??Infinity)<=n.g)continue;seen.set(key,n.g);expanded++;for(let ay=-1;ay<=1;ay++)for(let ax=-1;ax<=1;ax++){const o=R.evaluate(t,n.s,ax,ay);if(o.status==='crashed')continue;const moves=[...n.moves,[ax,ay]];if(o.status==='finished')return {start:n.start,moves,expanded};heap.push({s:o,g:n.g+1,score:n.g+1+heuristic(o.position),moves,start:n.start});}}throw Error('No example route found within search budget');}
const routes={};for(const [key,spec]of Object.entries(R.presets)){const route=solve(R.makeTrack(spec));routes[key]=route;console.log('PLAYABLE',key,route.moves.length,'turns',route.expanded,'search states');}fs.mkdirSync('checks',{recursive:true});fs.writeFileSync('checks/example-routes.json',JSON.stringify(routes,null,2));
