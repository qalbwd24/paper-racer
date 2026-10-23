(() => {
  'use strict';
  const assets = new URL('.', document.currentScript.src);
  class RoomBrowser extends HTMLElement {
    connectedCallback() {
      if (this.started) return;
      this.started = true; this.busy = false; this.joining = false; this.generation = 0;
      const root = this.attachShadow({mode:'open'});
      root.innerHTML = `<link rel="stylesheet" href="${new URL('room-browser.css',assets)}"><section aria-label="现有房间"><header><div><span class="eyebrow">ROOMS</span><h2>找一间房，开始玩</h2></div><button class="refresh" type="button">刷新房间</button></header><div class="toolbar"><label><input type="checkbox">只看可加入</label><span class="count"></span></div><p class="notice" role="status">正在读取房间…</p><div class="rooms"></div><p class="foot">每 5 秒更新 · 离线不等于空位，席位会为原玩家保留。</p></section>`;
      root.querySelector('.refresh').onclick = () => this.load();
      if(this.hasAttribute('creatable')){const create=document.createElement('button');create.type='button';create.className='create';create.textContent='创建房间';create.onclick=()=>this.onCreate?.();root.querySelector('header').append(create);}
      root.querySelector('input').onchange = () => this.paint();
      this.load(); this.timer = setInterval(() => { if (!document.hidden && !this.hidden) this.load(); },5000);
    }
    disconnectedCallback() { clearInterval(this.timer); this.generation++; }
    async load() {
      if (this.busy || this.joining) return;
      this.busy = true; const generation = this.generation;
      const q = this.getAttribute('game') === 'quoridor';
      try {
        const headers = {};
        if (q) {
          const session = await fetch('/quoridor/api/session',{credentials:'same-origin',signal:AbortSignal.timeout(8000)});
          if (!session.ok) throw Error('需要先登录游戏，或联机服务暂不可用。');
        } else {
          try { const seat = JSON.parse(sessionStorage.getItem('paper-race-online:'+this.getAttribute('game'))); if(seat?.token) headers['X-Player-Token']=seat.token; } catch {}
        }
        const url = q ? '/quoridor/api/lobby' : '/racer/api/lobby?version='+encodeURIComponent(this.getAttribute('game'));
        const response = await fetch(url,{headers,credentials:'same-origin',signal:AbortSignal.timeout(8000)});
        if (!response.ok) throw Error(response.status===401?'请先登录游戏，再刷新房间。':'房间列表暂不可用，请稍后刷新。');
        const data = await response.json();
        if(generation!==this.generation)return;
        this.rooms = data.rooms; this.paint();
        this.shadowRoot.querySelector('.notice').textContent = this.rooms.length ? '' : '还没有房间。创建一间，等朋友来加入。';
      } catch(e) {
        if(generation!==this.generation)return;
        this.rooms = []; this.paint(); this.shadowRoot.querySelector('.notice').textContent=e.name==='TimeoutError'?'连接超时，请刷新重试。':e.message;
      } finally { this.busy=false; }
    }
    paint() {
      const root=this.shadowRoot, list=root.querySelector('.rooms'), rooms=this.rooms||[];
      const signature=JSON.stringify([rooms,root.querySelector('input').checked,this.joining]);if(signature===this.painted)return;this.painted=signature;
      list.replaceChildren(); root.querySelector('.count').textContent=`${rooms.length} 间房 · ${rooms.filter(r=>r.joinable).length} 间可加入`;
      const filtered=rooms.filter(r=>!root.querySelector('input').checked||r.joinable||r.mine);
      if(rooms.length&&!filtered.length){const p=document.createElement('p');p.textContent='暂时没有空位，可以创建新房间。';list.append(p);}
      for(const room of filtered){
        const card=document.createElement('article');card.className='room';card.dataset.room=room.id;
        const top=document.createElement('div');top.className='room-top';
        const title=document.createElement('h3');title.textContent=room.name;
        const status=document.createElement('span');status.className='badge '+(room.phase==='waiting'?'waiting':room.phase==='ended'?'ended':'playing');status.textContent={waiting:'等待加入',ready:'选择起点',playing:'进行中',ended:'已结束'}[room.phase]||'等待中';top.append(title,status);
        const code=document.createElement('p');code.className='code';code.textContent=`房间 ${room.id.length>10?room.id.slice(0,8):room.id} · ${room.count} / 2 人${room.mine?' · 你在这里':''}`;
        const seats=document.createElement('div');seats.className='seats';
        for(let i=0;i<2;i++){const p=room.players[i],seat=document.createElement('div');seat.className='seat '+(p?'occupied':'empty');const dot=document.createElement('span');dot.className='pawn '+(i?'orange':'blue');dot.textContent=p?'●':'＋';const label=document.createElement('span');label.textContent=p?`${p.name} · ${p.online?'在线':'离线'}`:'空位';seat.append(dot,label);seats.append(seat);}
        const join=document.createElement('button');join.className='join';join.type='button';join.textContent=room.mine?'返回房间':room.joinable?'加入房间':room.count===2?'已满 · 保留席位':'仅限邀请';join.disabled=this.joining||(!room.joinable&&!room.mine);
        join.onclick=async()=>{if(this.joining)return;this.joining=true;join.disabled=true;root.querySelector('.notice').textContent='正在加入…';try{if(this.onJoin)await this.onJoin(room);else location.href=(this.getAttribute('game')==='quoridor'?'/quoridor/':'/racer/'+this.getAttribute('game')+'/')+'#room='+encodeURIComponent(room.id)+'&join=1';root.querySelector('.notice').textContent='';}catch(e){root.querySelector('.notice').textContent=e.message;}finally{this.joining=false;this.painted=null;this.paint();}};
        card.append(top,code,seats,join);list.append(card);
      }
    }
  }
  customElements.define('room-browser',RoomBrowser);
})();

