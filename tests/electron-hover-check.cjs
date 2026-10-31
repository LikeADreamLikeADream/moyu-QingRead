const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const main=fs.readFileSync('electron/src/main.ts','utf8').replaceAll('\r\n','\n'),ui=fs.readFileSync('electron/ui/app.js','utf8');
let tick,closed,cursor={x:120,y:130},paused=0;
const classes=new Set(),events=[];
const context=vm.createContext({book:{},settings:{hideOnLeave:true},prefs:{pauseOnLeave:true},$:()=>({open:false}),reader:()=>({pause:()=>paused++}),document:{body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}}}});
vm.runInContext(ui.slice(ui.indexOf('function windowPointer('),ui.indexOf("document.addEventListener('pointerenter'")),context);
vm.runInNewContext(main.slice(main.indexOf(' let pointerInside:'),main.indexOf("\n});\napp.on('second-instance'" )).replace('pointerInside:boolean|undefined','pointerInside'),{
 screen:{getCursorScreenPoint:()=>cursor},setInterval:fn=>(tick=fn,1),clearInterval:()=>{},
 win:{isDestroyed:()=>false,isVisible:()=>true,isMinimized:()=>false,getBounds:()=>({x:100,y:100,width:500,height:400}),once:(_,fn)=>closed=fn,webContents:{send:(_,event)=>{events.push(event);vm.runInContext(`windowPointer(${event==='pointer-enter'})`,context);}}}
});
tick();assert.equal(classes.size,0);
cursor={x:600,y:130};tick();assert.ok(classes.has('hoverHidden'));assert.equal(paused,1);
tick();assert.equal(events.length,2);
cursor={x:599,y:130};tick();assert.equal(classes.size,0);
vm.runInContext('settings.hideOnLeave=false',context);cursor={x:99,y:130};tick();assert.equal(classes.size,0);
closed();console.log('PASS window boundary leave/return, pause, disabled setting, duplicate suppression');

