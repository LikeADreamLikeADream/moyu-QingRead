const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('electron/src/main.ts','utf8');
let bounds={x:120,y:80,width:662,height:602},maximized=false,restore,ignoreBounds=false;
const area={x:0,y:0,width:1707,height:1019},events=[];
const win={isMaximized:()=>maximized,isMinimized:()=>false,isVisible:()=>true,isFocused:()=>true,getBounds:()=>({...bounds}),hide:()=>events.push('hide'),show:()=>events.push('show'),showInactive:()=>events.push('showInactive'),setBounds:value=>{events.push('bounds');if(!ignoreBounds)bounds={...bounds,...value};},once:(_,fn)=>restore=fn,unmaximize(){}};
const context=vm.createContext({screen:{getDisplayMatching:()=>({workArea:area})},win,fs:{writeFileSync(){},renameSync(){}},config:'test'});
const code=source.slice(source.indexOf('function rememberSize()'),source.indexOf('function recover()')).replaceAll('Promise<void>','Promise').replace('bounds:Partial<Electron.Rectangle>','bounds');
vm.runInContext("let expandedBounds;let layout='normal',settings={width:662,height:602,smallWidth:410,smallHeight:410};"+code,context);
(async()=>{
 for(let i=0;i<3;i++){
  assert.equal(vm.runInContext('toggleMaximize()',context),true);assert.deepEqual(bounds,area);
  assert.equal(vm.runInContext('toggleMaximize()',context),false);assert.deepEqual(bounds,{x:120,y:80,width:662,height:602});
 }
 assert.equal(events.includes('hide'),false,'resizing must not hide the window');
 vm.runInContext("layout='small'",context);await vm.runInContext('resizeLayout()',context);assert.equal(bounds.width,410);assert.equal(bounds.height,410);
 vm.runInContext("layout='normal'",context);await vm.runInContext('resizeLayout()',context);assert.equal(bounds.width,662);assert.equal(bounds.height,602);
 vm.runInContext('toggleMaximize();layout="small"',context);await vm.runInContext('resizeLayout()',context);assert.equal(bounds.width,410);assert.equal(bounds.x,120);assert.equal(vm.runInContext('expandedBounds',context),undefined);
 maximized=true;vm.runInContext("layout='single'",context);const pending=vm.runInContext('resizeLayout()',context);assert.equal(bounds.width,410);maximized=false;restore();await pending;assert.equal(bounds.width,650);assert.equal(bounds.height,118);
 ignoreBounds=true;assert.throws(()=>vm.runInContext('toggleMaximize()',context),/窗口尺寸调整未生效/);assert.equal(vm.runInContext('expandedBounds',context),undefined);assert.equal(events.at(-1),'bounds');
 console.log('PASS transparent window resize without hide/show; repeated maximize/restore; layouts; native restore; failed resize does not report success');
})().catch(error=>{console.error(error);process.exitCode=1;});

