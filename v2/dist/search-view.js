'use strict';
// Search telemetry is display-only. Each completed depth becomes one replay frame.
let searchFrames=[],searchSelected=null,searchTimer=null,searchPlaying=false;
function searchStop(){clearTimeout(searchTimer);searchTimer=null;searchPlaying=false;}
function searchClear(){searchStop();searchFrames=[];searchSelected=null;}
function searchReceive(p){searchSelected=p;if(p.phase==='layer'||p.phase==='finished')searchFrames.push(p);searchRefresh();searchDraw();}
function searchRefresh(){
  const p=searchSelected,n=searchFrames.length;
  $('searchSlow').disabled=!!aiSearch||editing;
  $('searchReplay').disabled=!!aiSearch||editing||n<1;
  $('searchReplay').textContent=searchPlaying?'暂停回放':'回放搜索';
  $('searchFrame').disabled=!!aiSearch||editing||n<1;
  $('searchFrame').max=Math.max(0,n-1);
  $('searchFrame').value=Math.max(0,searchFrames.indexOf(p));
  $('searchStatus').textContent=p?`第 ${p.depth} 回合 · 已尝试 ${p.attempted.toLocaleString()} 次移动 · 撞墙淘汰 ${p.rejected.toLocaleString()} 次 · ${p.phase==='layer'?`本轮保留 ${p.kept} 个状态`:p.phase==='finished'?'找到终点路线':`本轮候选 ${p.candidates} 个状态`}`:'点击“计算人机路线”，观察它逐回合尝试、筛选路线。';
}
function searchDraw(){
  board.querySelectorAll('[data-search-overlay]').forEach(n=>n.remove());
  const p=searchSelected;if(editing||!$('searchVisible').checked||!p)return;
  const g=el('g',{'data-search-overlay':'true','pointer-events':'none','aria-label':'搜索片段抽样'});
  for(const edge of p.edges)g.append(line(edge.from,edge.to,{stroke:edge.crash?'#c7524a':'#6a80b8','stroke-width':edge.crash?1.5:1,opacity:edge.crash?.4:.17}));
  if(p.path.length)g.append(el('polyline',{points:pointStr(p.path),fill:'none',stroke:'#8b4bc2','stroke-width':3,'stroke-dasharray':'5 4',opacity:.85}));
  board.append(g);
}
function searchSelect(i){searchSelected=searchFrames[Math.max(0,Math.min(i,searchFrames.length-1))]??null;searchRefresh();render();}
function searchTick(){if(!searchPlaying)return;const i=searchFrames.indexOf(searchSelected)+1;if(i>=searchFrames.length){searchStop();searchRefresh();return;}searchSelect(i);searchTimer=setTimeout(searchTick,550);}
$('searchReplay').onclick=()=>{if(aiSearch||editing||!searchFrames.length)return;if(searchPlaying){searchStop();searchRefresh();return;}aiStop();searchPlaying=true;searchSelect(0);searchTimer=setTimeout(searchTick,550);};
$('searchFrame').oninput=()=>{searchStop();searchSelect(Number($('searchFrame').value));};
$('searchVisible').onchange=render;
const searchOriginalInvalidate=aiInvalidate;aiInvalidate=function(){searchClear();searchOriginalInvalidate();};
const searchOriginalRender=render;render=function(){searchOriginalRender();searchRefresh();searchDraw();};
render();
