// Controller integration test with a minimal DOM, not a browser visual test.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element{constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.value='';this.checked=false;this.disabled=false;this.textContent='';this.classList={add(){},remove(){},toggle(){}};}append(...children){this.children.push(...children);}replaceChildren(...c){this.children=c;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(){}getAttribute(k){return this.attrs[k];}}
const elements=new Map(),registered=new Map(),storage=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
for(const m of fs.readFileSync('dist/index.html','utf8').matchAll(/id="([^"]+)"/g))get(m[1]);get('aiScope').value='all';get('aiPath').checked=true;get('warnings').checked=true;get('width').value='6';
const document={getElementById:get,createElementNS:(ns,tag)=>new Element(tag),createElement:tag=>new Element(tag),querySelectorAll:()=>get('movePad').children,addEventListener(){},activeElement:{tagName:'BODY'},modelContext:{registerTool(t){registered.set(t.name,t);}}};
const context=vm.createContext({console,document,structuredClone,AbortController,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout,window:{addEventListener(){}},URL,Blob});
for(const f of ['rules.js','game.js','solver.js','ai.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),context,{filename:f});
const run=s=>vm.runInContext(s,context),call=(n,i)=>registered.get(n).execute(i);
(async()=>{
assert.equal(registered.size,7);const initial=await call('read_race',{});assert.equal(initial.turns,0);
await assert.rejects(()=>call('solve_optimal_race',{scope:'selected'}));assert.equal((await call('read_race',{})).state,null);
const solved=await call('solve_optimal_race',{scope:'all'});assert.equal(solved.status,'optimal');assert.equal(solved.turns,15);assert.equal((await call('read_race',{})).state,null);console.log('PASS computing does not replace human race');
await call('start_race',{track:'bay',startIndex:2,practice:true});await call('play_race_moves',{moves:[{ax:0,ay:-1}]});assert.equal((await call('read_optimal_race',{})).frame,1);console.log('PASS ghost advances with human');
const scoped=await call('solve_optimal_race',{scope:'selected'});assert.equal(scoped.turns,15);assert.equal(scoped.frame,1);assert.equal((await call('read_race',{})).turns,1);
await call('play_optimal_race',{action:'play'});assert.equal((await call('read_optimal_race',{})).playing,true);run('aiAdvance()');await call('play_optimal_race',{action:'pause'});assert.equal((await call('read_optimal_race',{})).playing,false);console.log('PASS playback and pause');
run('undo()');assert.equal((await call('read_optimal_race',{})).frame,0);run('reset()');assert.equal((await call('read_optimal_race',{})).status,'idle');console.log('PASS undo/restart clear selected-start ghost correctly');
await call('solve_optimal_race',{scope:'all'});const snapshot=JSON.stringify(await call('read_optimal_race',{}));assert.throws(()=>call('play_optimal_race',{action:'invalid'}));assert.equal(JSON.stringify(await call('read_optimal_race',{})),snapshot);console.log('PASS invalid action preserves state');
await call('play_optimal_race',{action:'play'});for(let i=0;i<15;i++)run('aiAdvance()');assert.equal((await call('read_optimal_race',{})).frame,15);assert.equal((await call('read_optimal_race',{})).playing,false);assert.equal(storage.size,0);console.log('PASS ghost finish does not write personal record');
const pending=call('solve_optimal_race',{scope:'all'});await call('start_race',{track:'rookie',startIndex:0,practice:true});await pending;assert.equal((await call('read_optimal_race',{})).status,'idle');assert.equal((await call('read_race',{})).track,'练习场');console.log('PASS changing track invalidates in-flight result');
assert.match(get('aiStatus').textContent,/最佳指/);run('aiInvalidate()');console.log('ALL CONTROLLER CHECKS PASSED');
})().catch(e=>{console.error(e);run('aiInvalidate()');process.exitCode=1;});
