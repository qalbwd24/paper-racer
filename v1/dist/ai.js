'use strict';
let aiResult=null,aiSearch=null,aiEpoch=0,aiTimer=null,aiFrame=0,aiPlaying=false,aiSignature='',aiProgress=null;
const aiCache=new Map();
function aiKey(){const root=history[0]?.position;return JSON.stringify([track.points,track.width,$('aiScope').value,$('aiScope').value==='selected'?root:null]);}
function aiStop(){clearTimeout(aiTimer);aiTimer=null;aiPlaying=false;}
function aiInvalidate(){aiEpoch++;if(aiSearch)aiSearch.abort();aiSearch=null;aiStop();aiResult=null;aiProgress=null;aiFrame=0;}
function aiRefresh(){const sig=aiKey();if(sig!==aiSignature){aiInvalidate();aiSignature=sig;if(aiCache.has(sig))aiResult=aiCache.get(sig);}if(editing&&(aiSearch||aiPlaying))aiInvalidate();
const ready=aiResult?.status==='optimal',needsStart=$('aiScope').value==='selected'&&!history.length;
$('aiSolve').disabled=editing||needsStart;$('aiSolve').textContent=aiSearch?'取消计算':'计算最佳路线';$('aiScope').disabled=!!aiSearch||editing;$('aiPlay').disabled=!ready||editing;$('aiPlay').textContent=aiPlaying?'暂停演示':aiFrame>=aiResult?.turns?'重新播放':'播放人机';$('aiPath').disabled=!ready||editing;
let msg=needsStart?'先在绿色起跑线上选一个点。':'最佳指最少回合数；默认同时比较所有发车点。';
if(aiSearch)msg=`正在寻找最少回合路线… 已检查 ${aiProgress?.expanded.toLocaleString()??0} 个状态，搜索至第 ${aiProgress?.depth??0} 回合。`;
else if(ready)msg=`已证明最少 ${aiResult.turns} 回合 · ${$('aiScope').value==='all'?'所有起点中最优':'所选起点最优'}。人机第 ${aiFrame} / ${aiResult.turns} 回合。`;
else if(aiResult?.status==='limit')msg='达到本次计算上限，尚未证明最佳路线。可缩短自定义赛道后再试。';
else if(aiResult?.status==='unreachable')msg='搜索已完成：按当前规则，从这些起点无法到达终点。';
else if(aiResult?.status==='cancelled')msg='计算已取消。';else if(aiResult?.status==='error')msg='计算未完成：'+aiResult.message;
$('aiStatus').textContent=msg;}
function aiDraw(){if(editing||aiResult?.status!=='optimal')return;const states=aiResult.states,pts=states.map(s=>s.status==='finished'?s.impact:s.position),group=el('g',{'pointer-events':'none','aria-label':'最少回合人机路线'});
if($('aiPath').checked){group.append(el('polyline',{points:pointStr(pts),fill:'none',stroke:'#168575','stroke-width':3,'stroke-dasharray':'8 5',opacity:.65}));pts.forEach((p,i)=>{const q=xy(p);group.append(el('circle',{cx:q.x,cy:q.y,r:3,fill:'#168575'}));group.append(textAt(R.P(p.x-.25,p.y+.65),String(i),{fill:'#168575','font-size':12,'text-anchor':'end'}));});}
const q=xy(pts[Math.min(aiFrame,pts.length-1)]);group.append(el('rect',{x:q.x-7,y:q.y-7,width:14,height:14,rx:3,fill:'#168575',stroke:'#fff','stroke-width':2}),el('text',{x:q.x+11,y:q.y-10,fill:'#087164','font-size':13,'font-weight':700},'AI'));board.append(group);}
async function aiSolve(){if(editing)return;if(aiSearch){aiSearch.abort();return;}const sig=aiKey(),selected=history[0]?.position;if($('aiScope').value==='selected'&&!selected)return;
aiInvalidate();aiSignature=sig;const epoch=aiEpoch;aiSearch=new AbortController();aiRefresh();const originalTrack=track;
try{const result=await RaceSolver.solve(originalTrack,{starts:$('aiScope').value==='selected'?[selected]:track.starts,signal:aiSearch.signal,onProgress:p=>{if(epoch===aiEpoch){aiProgress=p;aiRefresh();}}});if(epoch!==aiEpoch||sig!==aiKey())return;aiResult=result;if(result.status==='optimal')aiCache.set(sig,result);}catch(e){if(epoch===aiEpoch)aiResult={status:'error',message:e.message};}
finally{if(epoch===aiEpoch){aiSearch=null;aiFrame=Math.max(0,Math.min(history.length-1,aiResult?.turns??0));render();}}return aiResult;
}
function aiAdvance(){if(!aiPlaying)return;aiFrame++;if(aiFrame>=aiResult.turns)aiStop();render();if(aiPlaying)aiTimer=setTimeout(aiAdvance,500);}
function aiPlay(){if(editing||aiResult?.status!=='optimal')return;if(aiPlaying){aiStop();render();return;}if(aiFrame>=aiResult.turns)aiFrame=0;aiPlaying=true;render();aiTimer=setTimeout(aiAdvance,500);}
const aiOriginalRender=render;render=function(){aiRefresh();aiOriginalRender();aiDraw();};
const aiOriginalMove=move;move=function(ax,ay){const before=history.length;aiStop();aiOriginalMove(ax,ay);if(history.length!==before&&aiResult?.status==='optimal'){aiFrame=Math.min(history.length-1,aiResult.turns);render();}};
$('aiSolve').onclick=aiSolve;$('aiPlay').onclick=aiPlay;$('aiScope').onchange=()=>{aiInvalidate();render();};$('aiPath').onchange=render;
// Pause the ghost when restarting or undoing; a new track invalidates the search.
const aiOriginalReset=reset;reset=function(){aiStop();aiFrame=0;aiOriginalReset();};$('restart').onclick=reset;
const aiOriginalUndo=undo;undo=function(){aiStop();aiOriginalUndo();aiFrame=Math.max(0,Math.min(history.length-1,aiResult?.turns??0));render();};$('undo').onclick=undo;
const aiOriginalChoose=chooseStart;chooseStart=function(p){aiStop();aiFrame=0;aiOriginalChoose(p);};
render();
if(document.modelContext?.registerTool){const life=new AbortController(),status=()=>({status:aiSearch?'searching':aiResult?.status??'idle',turns:aiResult?.turns??null,scope:$('aiScope').value,frame:aiFrame,playing:aiPlaying,progress:aiProgress});const reg=(name,description,inputSchema,execute,readOnlyHint=false)=>{try{Promise.resolve(document.modelContext.registerTool({name,description,inputSchema,execute,annotations:{readOnlyHint,untrustedContentHint:false}},{signal:life.signal})).catch(()=>{});}catch{}};
reg('solve_optimal_race','Compute a proven minimum-turn ghost route for all starts or the selected start.',{type:'object',properties:{scope:{type:'string',enum:['all','selected']}},required:['scope'],additionalProperties:false},async input=>{if(!input||!['all','selected'].includes(input.scope))throw Error('Invalid scope');if(editing||aiSearch)throw Error('Finish editing or cancel the running search first');if(input.scope==='selected'&&!history.length)throw Error('Choose a start first');$('aiScope').value=input.scope;await aiSolve();return status();});
reg('read_optimal_race','Read optimal route proof status and ghost playback progress.',{type:'object',properties:{},additionalProperties:false},status,true);
reg('play_optimal_race','Play, pause or rewind the solved ghost route; does not affect personal records.',{type:'object',properties:{action:{type:'string',enum:['play','pause','rewind']}},required:['action'],additionalProperties:false},input=>{if(!input||!['play','pause','rewind'].includes(input.action))throw Error('Invalid playback action');if(editing||aiResult?.status!=='optimal')throw Error('Solve a route first');if(input.action==='play'){if(!aiPlaying)aiPlay();}else{aiStop();if(input.action==='rewind')aiFrame=0;render();}return status();});window.addEventListener('pagehide',()=>{life.abort();aiInvalidate();},{once:true});}
