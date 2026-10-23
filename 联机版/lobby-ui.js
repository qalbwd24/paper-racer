'use strict';
const raceLobby=document.createElement('room-browser');raceLobby.id='raceLobby';raceLobby.setAttribute('game',netVersion);
raceLobby.setAttribute('creatable','');raceLobby.onCreate=()=>netEnter(false);
document.querySelector('main').before(raceLobby);
const hallLink=document.createElement('a');hallLink.href='/games/';hallLink.className='admin-entry';hallLink.textContent='← 游戏大厅';document.querySelector('.header-actions').prepend(hallLink);
customElements.whenDefined('room-browser').then(()=>{raceLobby.onJoin=async room=>{
  if(netSession){if(room.id===netSession.code)return;throw Error('请先离开当前房间并释放座位。');}
  $('netCode').value=room.id;await netEnter(true);if(!netSession)throw Error('未能加入，房间可能刚被占满，请刷新后重试。');
};});
const beforeLobbyRender=render;render=function(){beforeLobbyRender();raceLobby.hidden=!!netSession;};render();
if(!netSession&&invited&&new URLSearchParams(location.hash.slice(1)).get('join')==='1')netEnter(true);
