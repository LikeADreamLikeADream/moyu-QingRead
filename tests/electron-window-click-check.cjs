const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('electron/ui/app.js','utf8');
const nodes={maximize:{setAttribute(){}},small:{}},calls=[],timers=new Map();let sequence=0;
const context=vm.createContext({$:id=>nodes[id],call:async(_,data)=>{calls.push(data.action);return true;},status:message=>{throw new Error(message);},setTimeout:fn=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id)});
const run=source.split('\n').find(line=>line.startsWith('const run='));
const windowButton=source.split('\n').find(line=>line.startsWith('function windowButton('));
vm.runInContext("let small=false,single=false,book=null;"+run+'\n'+windowButton+'\n'+source.split('\n').filter(line=>/^\$\('(maximize|small)'\)\.onclick=/.test(line)).join('\n'),context);
(async()=>{
 for(const name of ['maximize','small']){
  calls.length=0;timers.clear();
  await nodes[name].onclick({detail:1});assert.deepEqual(calls,[name],'single click must act immediately');
  await nodes[name].onclick({detail:2});assert.deepEqual(calls,[name],'double click must not undo the first click');
  await nodes[name].onclick({detail:3});assert.equal(calls.length,1);
  await nodes[name].onclick({detail:1});assert.deepEqual(calls,[name,name]);
  await nodes[name].onclick({detail:0});assert.equal(calls.length,3);
  assert.equal(timers.size,0,'window buttons must not delay actions');
 }
 console.log('PASS single click acts immediately; double click does not undo; keyboard activation toggles once');
})().catch(error=>{console.error(error);process.exitCode=1;});

