/* Independently authored rules. All coordinates are in grid units. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RaceRules=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const EPS=1e-8, W=47,H=32;
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}),sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}),mul=(a,k)=>({x:a.x*k,y:a.y*k});
const dot=(a,b)=>a.x*b.x+a.y*b.y,cross=(a,b)=>a.x*b.y-a.y*b.x,len=a=>Math.hypot(a.x,a.y),unit=a=>mul(a,1/len(a));
const P=(x,y)=>({x,y});
const presets={bay:{name:'河湾',width:6,points:[P(6,27),P(6,22),P(12,16),P(22,16),P(31,8),P(39,8),P(42,16),P(39,27)]},rookie:{name:'练习场',width:8,points:[P(8,27),P(8,12),P(13,7),P(33,7),P(39,12),P(39,27)]},snake:{name:'折返',width:5,points:[P(5,26),P(13,26),P(20,21),P(18,12),P(26,7),P(38,7),P(42,14),P(39,25)]}};
function smooth(points){let out=points.map(p=>({...p}));for(let n=0;n<3;n++){const next=[out[0]];for(let i=0;i<out.length-1;i++){next.push(add(mul(out[i],.75),mul(out[i+1],.25)),add(mul(out[i],.25),mul(out[i+1],.75)));}next.push(out.at(-1));out=next;}return out.filter((p,i)=>!i||len(sub(p,out[i-1]))>EPS);}
// Inclusive segment intersection; collinear overlap counts as touching a wall.
function hit(a,b,c,d){const r=sub(b,a),s=sub(d,c),q=sub(c,a),den=cross(r,s),rr=dot(r,r);if(rr<EPS){if(Math.abs(cross(sub(a,c),s))<EPS&&dot(sub(a,c),sub(a,d))<=EPS)return 0;return null;}if(Math.abs(den)<EPS){if(Math.abs(cross(q,r))>EPS)return null;const t0=dot(q,r)/rr,t1=dot(sub(d,a),r)/rr,lo=Math.max(0,Math.min(t0,t1)),hi=Math.min(1,Math.max(t0,t1));return lo<=hi+EPS?lo:null;}const t=cross(q,s)/den,u=cross(q,r)/den;return t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS?Math.max(0,Math.min(1,t)):null;}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
function makeTrack(spec){
if(!spec||!Array.isArray(spec.points)||spec.points.length<2||spec.points.length>160)throw Error('路线需要 2–160 个点。');
const width=Number(spec.width);if(!Number.isFinite(width)||width<3||width>9)throw Error('道路宽度应在 3–9 格之间。');
const raw=spec.points.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<2||p.x>W-2||p.y<2||p.y>H-2)throw Error('路线点应留在画布内，距离边缘至少 2 格。');return P(p.x,p.y);}).filter((p,i,a)=>!i||len(sub(p,a[i-1]))>.1);
if(raw.length<2||raw.slice(1).reduce((s,p,i)=>s+len(sub(p,raw[i])),0)<6)throw Error('路线太短了，请再画长一些。');
const path=smooth(raw),left=[],right=[];
for(let i=0;i<path.length;i++){const before=unit(sub(path[i||1],path[i?i-1:0])),after=i===path.length-1?before:unit(sub(path[i+1],path[i]));const n1=P(-before.y,before.x),n2=P(-after.y,after.x),ns=add(n1,n2);if(len(ns)<.1)throw Error('弯道折返太急，请拉开转弯距离。');const normal=unit(ns),den=dot(normal,n2);if(den<.25)throw Error('弯道太急，请画得平缓一些。');const off=mul(normal,width/2/den);left.push(add(path[i],off));right.push(sub(path[i],off));}
const polygon=[...left,...right.slice().reverse()];for(let i=0;i<polygon.length;i++)for(let j=i+2;j<polygon.length;j++){if(i===0&&j===polygon.length-1)continue;if(hit(polygon[i],polygon[(i+1)%polygon.length],polygon[j],polygon[(j+1)%polygon.length])!==null)throw Error('道路边界交叉了。请缩小宽度，或把相邻路段拉开。');}
if(polygon.some(p=>p.x<0||p.x>W||p.y<0||p.y>H))throw Error('道路超出画布了，请把路线往里面挪一些，或缩小宽度。');
const start=[left[0],right[0]],finish=[left.at(-1),right.at(-1)],starts=[];for(let y=0;y<=H;y++)for(let x=0;x<=W;x++){const p=P(x,y),v=sub(start[1],start[0]);if(Math.abs(cross(sub(p,start[0]),v))<EPS&&dot(sub(p,start[0]),sub(p,start[1]))<-EPS)starts.push(p);}
if(!starts.length)throw Error('起跑线上没有格点，请把前两个点画成水平或竖直方向。');
const walls=[];for(let i=1;i<path.length;i++){walls.push([left[i-1],left[i]],[right[i-1],right[i]]);}
return {name:typeof spec.name==='string'?spec.name.slice(0,40):'手绘赛道',width,points:raw,path,polygon,start,finish,starts,walls,startDir:unit(sub(path[1],path[0])),finishDir:unit(sub(path.at(-1),path.at(-2)))};
}
function evaluate(track,state,ax,ay){if(![-1,0,1].includes(ax)||![-1,0,1].includes(ay))throw Error('无效动作');const velocity=add(state.velocity,P(ax,ay)),from=state.position,to=add(from,velocity);let wallT=Infinity;
for(const w of track.walls){const t=hit(from,to,...w);if(t!==null)wallT=Math.min(wallT,t);}
const st=hit(from,to,...track.start);if(st!==null){const startsOn=Math.abs(dot(sub(from,track.path[0]),track.startDir))<EPS;if(!startsOn||dot(velocity,track.startDir)<-EPS)wallT=Math.min(wallT,st);}
const ft=dot(velocity,track.finishDir)>EPS?hit(from,to,...track.finish):null;
let status='running',t=1;if(ft!==null&&ft<wallT-EPS){status='finished';t=ft;}else if(wallT!==Infinity){status='crashed';t=wallT;}else if(!inside(to,track.polygon)&&!(st!==null&&dot(velocity,track.startDir)>=-EPS)){status='crashed';t=1;}
return {position:to,velocity,status,impact:add(from,mul(velocity,t)),fraction:t,ax,ay};
}
return {presets,makeTrack,evaluate,hit,inside,P,W,H};
});
