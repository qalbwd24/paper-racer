/* Exact multi-source breadth-first search. No heuristic or speed cap. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./rules.js'));else root.RaceSolver=factory(root.RaceRules);})(globalThis,function(R){
'use strict';
const key=s=>`${s.position.x},${s.position.y},${s.velocity.x},${s.velocity.y}`;
async function solve(track,{starts=track.starts,signal,onProgress=()=>{},maxStates=500000,yieldMs=12}={}){
if(!starts.length||starts.some(p=>!track.starts.some(s=>s.x===p.x&&s.y===p.y)))throw Error('请选择起跑线上的有效起点。');
const nodes=[],seen=new Set(),geometry=new Map();let head=0,expanded=0,transitions=0,layer=0,lastYield=Date.now();
for(const p of starts){const s={position:{...p},velocity:R.P(0,0)};if(!seen.has(key(s))){seen.add(key(s));nodes.push({s,parent:-1,ax:0,ay:0,depth:0});}}
const progress=()=>({expanded,discovered:nodes.length,depth:layer,pending:nodes.length-head});
function finish(index,end,ax,ay){const moves=[{ax,ay}],states=[end];let n=nodes[index];while(n.parent!==-1){moves.push({ax:n.ax,ay:n.ay});states.push(n.s);n=nodes[n.parent];}states.push(n.s);moves.reverse();states.reverse();return {status:'optimal',turns:moves.length,start:n.s.position,moves,states,...progress()};}
while(head<nodes.length){if(signal?.aborted)return {status:'cancelled',...progress()};const index=head++,n=nodes[index];layer=n.depth;expanded++;
for(let ay=-1;ay<=1;ay++)for(let ax=-1;ax<=1;ax++){
const vx=n.s.velocity.x+ax,vy=n.s.velocity.y+ay,tx=n.s.position.x+vx,ty=n.s.position.y+vy;
// Collision outcome depends on the segment only, not how its velocity arose.
const segment=`${n.s.position.x},${n.s.position.y},${tx},${ty}`;let g=geometry.get(segment);
if(!g){const o=R.evaluate(track,n.s,ax,ay);g={status:o.status,impact:o.impact,fraction:o.fraction};if(geometry.size<350000)geometry.set(segment,g);transitions++;}
if(g.status==='crashed')continue;
const s={position:R.P(tx,ty),velocity:R.P(vx,vy),status:g.status,impact:g.impact,fraction:g.fraction};
if(g.status==='finished')return finish(index,s,ax,ay);
const k=key(s);if(seen.has(k))continue;
if(nodes.length>=maxStates)return {status:'limit',...progress()};
seen.add(k);nodes.push({s,parent:index,ax,ay,depth:n.depth+1});
}
if(Date.now()-lastYield>=yieldMs){onProgress(progress());await new Promise(resolve=>setTimeout(resolve,0));lastYield=Date.now();}
}
return {status:'unreachable',...progress()};
}
return {solve};
});
