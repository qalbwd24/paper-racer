'use strict';
// A DOM dialog keeps game requests visible and remains usable on desktop and mobile.
let rematchShown=null,rematchNoticeSeen=null;
const rematchDialog=document.createElement('dialog');rematchDialog.id='rematchDialog';rematchDialog.setAttribute('aria-labelledby','rematchTitle');rematchDialog.innerHTML='<h2 id="rematchTitle">对手邀请再来一局</h2><p>同意后会中止当前局，双方重新选起点，悔棋次数恢复。拒绝则保留当前对局。</p><p id="rematchExpiry"></p><div class="actions"><button id="rematchAccept" class="primary">同意重开</button><button id="rematchReject">拒绝</button></div><button id="rematchLater" class="wide">稍后处理，继续当前局</button>';
document.body.append(rematchDialog);const rematchStatus=document.createElement('p');rematchStatus.id='rematchStatus';rematchStatus.setAttribute('role','status');$('netRematch').parentElement.after(rematchStatus);
const adminLink=document.createElement('a');adminLink.href=netBase+'admin/';adminLink.target='_blank';adminLink.rel='noopener';adminLink.className='admin-entry';adminLink.textContent='管理员登录';document.querySelector('.header-actions').prepend(adminLink);
function rematchIncoming(){const q=netRoom?.rematchRequest;return q&&q.from!==netSession?.playerId&&q.expiresAt>Date.now()?q:null;}
function rematchOpen(){const q=rematchIncoming();if(q&&!rematchDialog.open){rematchShown=q.id;rematchDialog.showModal();}}
function rematchRefresh(){const q=netRoom?.rematchRequest,active=q&&q.expiresAt>Date.now();if(!netSession||!active){if(rematchDialog.open)rematchDialog.close();rematchShown=null;}else if(q.from!==netSession.playerId&&rematchShown!==q.id)rematchOpen();
const incoming=!!rematchIncoming();$('netRematch').disabled=netBusy||!netOnline||!netRoom||netRoom.players.length<2;$('netRematch').textContent=active?(incoming?'处理重开请求':'撤回重开请求'):'再来一局';rematchStatus.textContent=active?`${incoming?'对手邀请重开':'已邀请对手重开'} · ${Math.max(0,Math.ceil((q.expiresAt-Date.now())/1000))} 秒内有效 · 当前局仍保留`:netRoom?.rematchNotice?.text||'可随时邀请重开，需要对手同意。';$('rematchExpiry').textContent=active?'剩余 '+Math.max(0,Math.ceil((q.expiresAt-Date.now())/1000))+' 秒':'';for(const id of ['rematchAccept','rematchReject'])$(id).disabled=netBusy||!netOnline||!incoming;
if(netRoom?.rematchNotice&&rematchNoticeSeen!==netRoom.rematchNotice.id){rematchNoticeSeen=netRoom.rematchNotice.id;toast(netRoom.rematchNotice.text);}}
async function rematchReply(accept){const q=rematchIncoming();if(!q||netBusy)return;await netAction({type:'rematch-reply',requestId:q.id,accept});}
$('rematchAccept').onclick=()=>rematchReply(true);$('rematchReject').onclick=()=>rematchReply(false);$('rematchLater').onclick=()=>rematchDialog.close();
$('netRematch').onclick=()=>{if(netBusy)return;const q=netRoom?.rematchRequest;if(q&&q.expiresAt>Date.now()){if(q.from===netSession.playerId)netAction({type:'rematch-cancel',requestId:q.id});else rematchOpen();}else netAction({type:'rematch'});};
const beforeRematchRender=render;render=function(){beforeRematchRender();rematchRefresh();};render();
const beforeRematchMove=netCanMove,beforeRematchUndo=netCanUndo;netCanMove=function(){return !rematchDialog.open&&beforeRematchMove();};netCanUndo=function(){return !rematchDialog.open&&beforeRematchUndo();};
