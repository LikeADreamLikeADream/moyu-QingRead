const {app,BrowserWindow}=require('electron'),fs=require('fs'),assert=require('assert');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:600,height:500,show:true});
 await win.loadURL('data:text/html,<body></body>');
 const source=fs.readFileSync(process.env.QINGREAD_COLOR_PICKER||'electron/ui/color-picker.js','utf8');
 await win.webContents.executeJavaScript(`${source};for(const key of ['annotationColor','textColor','backgroundColor']){const input=document.createElement('input');input.value='#ffe08a';input.onchange=()=>{};const picker=colorPicker(input,key,key);picker.id=key;document.body.append(input,picker);}`);
 for(const key of ['annotationColor','textColor','backgroundColor']){
  const point=await win.webContents.executeJavaScript(`(()=>{const picker=document.getElementById('${key}');picker.querySelector('button').click();const panel=picker.querySelector('.color-popover');panel.style.cssText='position:fixed;left:100px;top:100px;width:220px;height:220px;margin:0';return {x:150,y:150};})()`);
  win.webContents.sendInputEvent({type:'mouseMove',...point});await new Promise(r=>setTimeout(r,100));
  assert(await win.webContents.executeJavaScript(`document.querySelector('#${key} .color-popover').matches(':popover-open')`),'movement inside must keep picker open');
  win.webContents.sendInputEvent({type:'mouseMove',x:500,y:400});await new Promise(r=>setTimeout(r,100));
  assert.equal(await win.webContents.executeJavaScript(`document.querySelector('#${key} .color-popover').matches(':popover-open')`),key!=='annotationColor',key+' leave behavior');
  await win.webContents.executeJavaScript(`document.querySelector('#${key} .color-popover').hidePopover()`);
 }
 console.log('PASS real mouse movement: highlight picker hides on leave; text/background pickers unchanged');app.exit();
}).catch(error=>{console.error(error);app.exit(1);});
