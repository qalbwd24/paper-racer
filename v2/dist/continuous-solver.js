/* Finite action sampling + beam search. A found route is feasible, never certified optimal. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./rules.js'));else root.ContinuousSolver=factory(root.RaceRules);})(globalThis,function(R){
async function solve(t,{starts,signal,onProgress=()=>{},beamWidth=3000,maxTurns=80,yieldMs=12,frameDelayMs=0}={}){
starts=starts??Array.from({length:9},(_,i)=>{const u=(i+1)/10;return {x:t.start[0].x*(1-u)+t.start[1].x*u,y:t.start[0].y*(1-u)+t.start[1].y*u};});
const actions=[];for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)if(x*x+y*y<=16)actions.push({ax:x/4,ay:y/4});
const suffix=Array(t.path.length).fill(0);for(let i=t.path.length-2;i>=0;i--)suffix[i]=suffix[i+1]+Math.hypot(t.path[i+1].x-t.path[i].x,t.path[i+1].y-t.path[i].y);
function score(s){let nearest=Infinity,index=0;for(let i=0;i<t.path.length;i++){const d=(s.position.x-t.path[i].x)**2+(s.position.y-t.path[i].y)**2;if(d<nearest){nearest=d;index=i;}}const p=t.path[Math.max(0,index-1)],q=t.path[Math.min(t.path.length-1,index+1)],d=Math.hypot(q.x-p.x,q.y-p.y),dx=(q.x-p.x)/d,dy=(q.y-p.y)/d;return suffix[index]+Math.sqrt(nearest)*.3-(s.velocity.x*dx+s.velocity.y*dy)*.6+Math.abs(s.velocity.x*dy-s.velocity.y*dx)*.7;}
let frontier=starts.map(position=>({s:{position,velocity:{x:0,y:0},status:'running'},parent:null})),expanded=0,attempted=0,rejected=0,last=Date.now(),lastVisual=0;
const route=n=>{const out=[];for(let at=n;at;at=at.parent)out.push(at.s.status==='finished'?at.s.impact:at.s.position);return out.reverse();};
for(let depth=1;depth<=maxTurns;depth++){const next=new Map(),edges=[];let best=null;
const report=(phase,kept=0,winner=null)=>{onProgress({expanded,depth,attempted,rejected,candidates:next.size,kept,phase,edges:edges.slice(),path:route(winner??best),actionCount:actions.length});lastVisual=Date.now();};
for(const n of frontier){if(signal?.aborted)return {status:'cancelled',expanded,depth};expanded++;for(const a of actions){attempted++;const s=R.evaluateContinuous(t,n.s,a.ax,a.ay);const crash=s.status==='crashed';if(crash)rejected++;
// A rolling sample of actual attempted segments; this never changes search decisions.
edges.push({from:n.s.position,to:s.impact??s.position,crash});if(edges.length>160)edges.shift();
if(crash)continue;const node={s,parent:n,...a,score:score(s)};if(!best||node.score<best.score)best=node;if(s.status==='finished'){report('finished',0,node);const states=[],moves=[];let at=node;while(at.parent){states.push(at.s);moves.push({ax:at.ax,ay:at.ay});at=at.parent;}states.push(at.s);return {status:'approximate',turns:moves.length,start:at.s.position,states:states.reverse(),moves:moves.reverse(),expanded,depth};}
// Quantization is pruning only: retained positions themselves are never snapped.
const k=[s.position.x,s.position.y,s.velocity.x,s.velocity.y].map(v=>Math.round(v*2)).join(',');if(!next.has(k)||next.get(k).score>node.score)next.set(k,node);}
if(Date.now()-last>=yieldMs){if(Date.now()-lastVisual>=120)report('searching');await new Promise(r=>setTimeout(r,0));last=Date.now();}}
frontier=[...next.values()].sort((a,b)=>a.score-b.score).slice(0,beamWidth);report('layer',frontier.length);await new Promise(r=>setTimeout(r,Math.max(0,Math.min(frameDelayMs,500))));if(signal?.aborted)return {status:'cancelled',expanded,depth};if(!frontier.length)return {status:'not-found',expanded,depth};}
return {status:'not-found',expanded,depth:maxTurns};
}
return {solve};
});

