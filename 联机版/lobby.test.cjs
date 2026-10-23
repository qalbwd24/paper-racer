const {test}=require('node:test'),assert=require('node:assert/strict');
const {Rooms,createServer}=require('./server.cjs');
test('racer lobby isolates versions and exposes seats without trajectories or credentials',()=>{
 const rooms=new Rooms(),a=rooms.create('v1'),b=rooms.create('v2');
 let list=rooms.lobby('v1',a.token);assert.equal(list.length,1);assert.equal(list[0].mine,true);assert.equal(list[0].count,1);assert.equal(list[0].joinable,true);
 assert.equal(rooms.lobby('v1','outsider')[0].mine,false);
 const c=rooms.join(a.code,'v1');list=rooms.lobby('v1');assert.equal(list[0].joinable,false);assert.equal(list[0].phase,'ready');
 assert.throws(()=>rooms.join(a.code,'v1'));const r=rooms.find(a.code);r.phase='racing';r.players[0].history=[{secret:'trajectory'}];assert.equal(rooms.lobby('v1')[0].phase,'playing');
 const body=JSON.stringify(rooms.lobby('v1'));for(const secret of [a.token,a.ownerToken,c.token,'history','trajectory','velocity','sealed','undoUsed'])assert.ok(!body.includes(secret));
 rooms.act(a.code,a.token,{game:r.game,type:'leave'});assert.equal(rooms.lobby('v1')[0].joinable,true);
 rooms.manage(a.code,a.ownerToken,{type:'close'});assert.equal(rooms.lobby('v1').length,0);assert.equal(rooms.lobby('v2')[0].id,b.code);
 rooms.find(b.code).touched=Date.now()-86400001;assert.equal(rooms.lobby('v2').length,0);assert.throws(()=>rooms.lobby('unknown'));
});
test('racer lobby HTTP read works without a seat but same-origin and management boundaries remain',async()=>{
 const {server,rooms}=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/racer/';
 try{rooms.create('v2');const r=await fetch(url+'api/lobby?version=v2');assert.equal(r.status,200);assert.equal((await r.json()).rooms.length,1);assert.equal((await fetch(url+'api/lobby?version=v2',{headers:{Origin:'https://elsewhere.invalid'}})).status,403);assert.equal((await fetch(url+'api/rooms').then(r=>r.json())).rooms.length,0);assert.equal((await fetch(url+'api/lobby?version=bad')).status,400);}finally{await new Promise(r=>server.close(r));}
});
