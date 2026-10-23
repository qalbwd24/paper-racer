const assert=require('node:assert/strict'),R=require('./dist/rules.js'),S=require('./dist/continuous-solver.js');
(async()=>{
const t=R.makeTrack({name:'straight',width:6,points:[R.P(5,16),R.P(35,16)]}),frames=[];
const plain=await S.solve(t),shown=await S.solve(t,{frameDelayMs:1,onProgress:p=>frames.push(p)});
assert.deepEqual(shown.moves,plain.moves);assert.deepEqual(shown.start,plain.start);
let tried=0,rejected=0;
for(const p of frames){assert.ok(p.attempted>=tried&&p.rejected>=rejected&&p.rejected<=p.attempted);tried=p.attempted;rejected=p.rejected;assert.ok(p.edges.length<=160);assert.equal(p.actionCount,49);assert.ok(p.kept<=3000);assert.equal(p.path.length,p.depth+1);for(const e of p.edges)for(const pt of [e.from,e.to])assert.ok(Number.isFinite(pt.x)&&Number.isFinite(pt.y));}
assert.equal(frames.at(-1).phase,'finished');assert.equal(frames.filter(p=>p.phase!=='searching').length,shown.turns);
const ac=new AbortController();const cancelled=await S.solve(t,{signal:ac.signal,onProgress:()=>ac.abort()});assert.equal(cancelled.status,'cancelled');
console.log('PASS telemetry preserves route; counters, bounded geometry, depth frames and cancellation');
})().catch(e=>{console.error(e);process.exitCode=1;});
