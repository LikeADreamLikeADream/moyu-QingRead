import { app, BrowserWindow, ipcMain, protocol, net, dialog, globalShortcut, Tray, Menu, nativeImage, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Library } from './library.js';
import { FontStore } from './fonts.js';



// Windows transparent windows need software compositing to repaint reliably after resizing.
if(process.platform==='win32')app.disableHardwareAcceleration();
protocol.registerSchemesAsPrivileged([{scheme:'qingread',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const root=process.env.QINGREAD_READER_DATA||(process.platform==='win32'?path.join(process.env.LOCALAPPDATA!,'QingRead.Reader'):app.getPath('userData'));
const uiRoot=path.resolve(__dirname,'../ui');
let win:BrowserWindow, tray:Tray, exiting=false;
let expandedBounds:Electron.Rectangle|undefined;
let layout:'normal'|'small'|'single'='small', beforeSingle:'normal'|'small'='small';
type Settings={width:number;height:number;smallWidth?:number;smallHeight?:number;opacity:number;transparent:boolean;topmost:boolean;bossKey:string;autoHide:boolean;hideOnLeave:boolean;captureProtection:boolean;hideTrayText?:boolean;trayIcon?:boolean};
let settings:Settings={width:820,height:600,opacity:1,transparent:false,topmost:false,bossKey:'Alt+Z',autoHide:true,hideOnLeave:false,captureProtection:false};
fs.mkdirSync(root,{recursive:true});
const config=path.join(root,'electron-window.json');
const shelfConfig=path.join(root,'electron-shelf.json');
let shelfSettings={language:'zh-CN',sort:'manual',showCategoryCounts:false,coverTitle:true,coverProgress:true,coverType:true,order:[] as string[]};
try{const saved=JSON.parse(fs.readFileSync(shelfConfig,'utf8'));shelfSettings={language:saved.language==='en'?'en':'zh-CN',sort:saved.sort==='recent'?'recent':'manual',showCategoryCounts:saved.showCategoryCounts===true,coverTitle:saved.coverTitle!==false,coverProgress:saved.coverProgress!==false,coverType:saved.coverType!==false,order:Array.isArray(saved.order)?saved.order.filter((id:unknown)=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id)):[]};}catch{}
try{settings={...settings,...JSON.parse(fs.readFileSync(config,'utf8'))};}catch{
 try{const old=JSON.parse(fs.readFileSync(path.join(root,'window.json'),'utf8'));settings={...settings,width:old.Width||820,height:old.Height||600,opacity:old.Opacity??1,transparent:old.Transparent??false,topmost:old.AlwaysOnTop??false,bossKey:old.BossKey||'Alt+Z',autoHide:old.AutoHideToolbar??true,hideOnLeave:old.HideOnLeave??false,captureProtection:old.CaptureProtection??false};}catch{}
}
if(typeof settings.bossKey!=='string'||!settings.bossKey.trim())settings.bossKey='Alt+Z';else settings.bossKey=settings.bossKey.trim();
let activeBossKey='',bossKeyNotice='',editingBossKey=false;
const library=new Library(root);const fonts=new FontStore(root);
let activeImportId=0,cancelBatch=false;
function rpc(method:string,data:any={}){if(method==='import')activeImportId=1;return library.call(method,data);}
async function importBooks(paths:string[]){cancelBatch=false;const results=[];for(const file of paths){if(cancelBatch)break;try{const book=await rpc('import',{path:file});if(book.cancelled){results.push({cancelled:true});break;}results.push({book});}catch(error){results.push({error:String(error)});}}if(cancelBatch&&!results.some(item=>item.cancelled))results.push({cancelled:true});activeImportId=0;return results;}
function rememberSize(){if(expandedBounds||win.isMaximized()||win.isMinimized())return;const bounds=win.getBounds(),area=screen.getDisplayMatching(bounds).workArea;if(Math.abs(bounds.width-area.width)<=4&&Math.abs(bounds.height-area.height)<=4)return;if(layout==='normal'){settings.width=bounds.width;settings.height=bounds.height;}else if(layout==='small'){settings.smallWidth=bounds.width;settings.smallHeight=bounds.height;}}
function save(){rememberSize();fs.writeFileSync(config+'.tmp',JSON.stringify(settings));fs.renameSync(config+'.tmp',config);}
function applyWindowBounds(bounds:Partial<Electron.Rectangle>){
 win.setBounds(bounds);
 const actual=win.getBounds();
 if((bounds.width!==undefined&&Math.abs(actual.width-bounds.width)>2)||(bounds.height!==undefined&&Math.abs(actual.height-bounds.height)>2))throw new Error('窗口尺寸调整未生效，请重启轻阅后重试');
}
async function resizeLayout(){if(win.isMaximized())await new Promise<void>(resolve=>{win.once('unmaximize',()=>resolve());win.unmaximize();});const normal=expandedBounds;applyWindowBounds({...normal,width:layout==='single'?650:layout==='small'?(settings.smallWidth||410):settings.width,height:layout==='single'?118:layout==='small'?(settings.smallHeight||410):settings.height});expandedBounds=undefined;}
function toggleMaximize(){if(expandedBounds){applyWindowBounds(expandedBounds);expandedBounds=undefined;return false;}rememberSize();const previous=win.getBounds();applyWindowBounds(screen.getDisplayMatching(previous).workArea);expandedBounds=previous;return true;}
function recover(){win.show();win.restore();win.setOpacity(1);win.focus();win.webContents.send('window-event','recover');}
function updateTrayLanguage(){if(!tray)return;const english=shelfSettings.language==='en';tray.setContextMenu(Menu.buildFromTemplate([{label:english?'Show window':'显示并找回',click:recover},{label:english?'Exit':'退出',click:()=>win.webContents.send('window-event','closing')}]));}
function resumeBossKey(){if(editingBossKey){editingBossKey=false;if(activeBossKey&&!globalShortcut.isRegistered(activeBossKey))bindHotkey(activeBossKey);}}
function bindHotkey(key:string){try{return globalShortcut.register(key,()=>{if(win.isVisible()&&!win.isMinimized())win.hide();else recover();});}catch{return false;}}
if(!app.requestSingleInstanceLock()){library.close();app.quit();}
else app.whenReady().then(async()=>{
 protocol.handle('qingread',async request=>{
  const url=new URL(request.url);let base:string;
  if(url.host==='app')base=uiRoot;else if(url.host==='book')base=path.join(root,'books');else if(url.host==='fonts')base=path.join(root,'fonts');else return new Response('',{status:404});
  const target=path.resolve(base,'.'+decodeURIComponent(url.pathname));
  if(!target.startsWith(base+path.sep)||!['.html','.css','.js','.png','.jpg','.jpeg','.webp','.gif','.bmp','.ttf','.otf','.woff','.woff2','.ico'].includes(path.extname(target).toLowerCase()))return new Response('',{status:403});
  try{const response=await net.fetch(pathToFileURL(target).href);if(url.host==='fonts'){const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin','qingread://app');return new Response(response.body,{status:response.status,headers});}return response;}catch{return new Response('',{status:404});}
 });
 win=new BrowserWindow({width:settings.smallWidth||410,height:settings.smallHeight||410,minWidth:360,minHeight:118,skipTaskbar:true,frame:false,thickFrame:false,transparent:true,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.setOpacity(Math.max(.01,Math.min(1,settings.opacity)));win.setAlwaysOnTop(settings.topmost);win.setContentProtection(settings.captureProtection);
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());
 win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 win.webContents.session.webRequest.onBeforeRequest((details,callback)=>callback({cancel:details.webContentsId===win.webContents.id&&!details.url.startsWith('qingread://')}));
 ipcMain.handle('reader',async(event,method:string,data:any={})=>{
  if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw new Error('Invalid sender');
  if(method==='boss-key-edit'){if(data.editing){editingBossKey=true;if(activeBossKey)globalShortcut.unregister(activeBossKey);}else resumeBossKey();return true;}
  if(method==='init')return {settings,shelfSettings,small:layout==='small',books:await rpc('list'),fonts:fonts.list(),bossKeyNotice};
  if(method==='shelf-settings'){
   if(data.language!==undefined&&!['zh-CN','en'].includes(data.language))throw new Error('Invalid interface language');
   if(data.sort!==undefined&&data.sort!=='manual'&&data.sort!=='recent')throw new Error('无效排序规则');
   for(const key of ['showCategoryCounts','coverTitle','coverProgress','coverType'])if(data[key]!==undefined&&typeof data[key]!=='boolean')throw new Error('无效书架设置');
   if(data.order!==undefined&&(!Array.isArray(data.order)||data.order.length>100000||data.order.some((id:unknown)=>typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id))))throw new Error('无效书籍顺序');
   const next={...shelfSettings};
   for(const key of ['language','sort','showCategoryCounts','coverTitle','coverProgress','coverType','order'] as const)if(data[key]!==undefined)(next as any)[key]=data[key];
   fs.writeFileSync(shelfConfig+'.tmp',JSON.stringify(next));fs.renameSync(shelfConfig+'.tmp',shelfConfig);shelfSettings=next;updateTrayLanguage();return shelfSettings;
  }
  if(method==='cancel-import'){cancelBatch=true;return activeImportId?rpc('cancel',{requestId:activeImportId}):true;}
  if(method==='font-import'){
   const chosen=await dialog.showOpenDialog(win,{title:shelfSettings.language==='en'?'Import font':'导入字体',properties:['openFile'],filters:[{name:shelfSettings.language==='en'?'Fonts':'字体',extensions:['ttf','otf','woff','woff2']}]});
   if(chosen.canceled)return null;const font=fonts.import(chosen.filePaths[0]);return {font,fonts:fonts.list()};
  }
  if(method==='font-remove'){if(!fonts.list().some(f=>f.family===data.family))throw Error('只能删除已导入的字体');library.resetFont(data.family);return fonts.remove(data.family);}
  if(method==='trayIcon'){
   if(data.reset){settings.trayIcon=false;tray.setImage(icon);save();return true;}
   const chosen=await dialog.showOpenDialog(win,{filters:[{name:shelfSettings.language==='en'?'Icons':'图标',extensions:['ico','png']}],properties:['openFile']});if(chosen.canceled)return false;
   const file=chosen.filePaths[0];if(fs.statSync(file).size>1048576)throw new Error('图标不能超过 1 MB');const image=nativeImage.createFromPath(file);if(image.isEmpty())throw new Error('图标无法读取');
   fs.writeFileSync(path.join(root,'electron-tray.png'),image.toPNG());tray.setImage(image);settings.trayIcon=true;save();return true;
  }
  if(method==='exportBook'){
   const item=(await rpc('list')).find((book:any)=>book.id===data.id);if(!item)throw new Error('书籍不存在');
   const source=await rpc('exportBook',{id:item.id});
   const chosen=await dialog.showSaveDialog(win,{defaultPath:item.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+item.format,filters:[{name:item.format.slice(1).toUpperCase()+(shelfSettings.language==='en'?' books':' 书籍'),extensions:[item.format.slice(1)]}]});
   if(chosen.canceled||!chosen.filePath)return false;
   if(path.resolve(chosen.filePath).toLowerCase()===path.resolve(source).toLowerCase())throw new Error('请选择书库以外的导出位置');
   await fs.promises.copyFile(source,chosen.filePath);return true;
  }
  if(method==='import-paths'){
   if(!Array.isArray(data.paths)||data.paths.length>50)throw new Error('最多导入 50 本');
   return importBooks(data.paths);
  }
  if(method==='finish-hide'){save();return true;}
  if(method==='finish-close'){save();exiting=true;win.close();return true;}
  if(method==='import'){
   const selection=await dialog.showOpenDialog(win,{properties:['openFile','multiSelections'],filters:[{name:shelfSettings.language==='en'?'Books':'小说',extensions:['txt','epub','mobi','azw3']}]});
   return importBooks(selection.filePaths.slice(0,50));
  }
  if(method==='window'){
   if(data.action==='small'){rememberSize();const previous=layout;layout=(layout==='single'?beforeSingle:layout)==='small'?'normal':'small';try{await resizeLayout();}catch(error){layout=previous;throw error;}return layout==='small';}
   if(data.action==='single'){rememberSize();if(layout==='single')layout=beforeSingle;else{beforeSingle=layout;layout='single';}await resizeLayout();return layout==='single';}
   switch(data.action){case 'close':win.close();break;case 'minimize':win.minimize();break;case 'maximize':return toggleMaximize();case 'hide':win.hide();break;case 'size':applyWindowBounds({width:Math.max(360,Math.min(2000,Number(data.width)||820)),height:Math.max(118,Math.min(1400,Number(data.height)||600))});break;}return true;
  }
  if(method==='settings'){
   if(data.bossKey!==undefined){if(typeof data.bossKey!=='string'||!data.bossKey.trim())throw new Error('老板键不能为空');data={...data,bossKey:data.bossKey.trim()};if(data.bossKey!==activeBossKey||!globalShortcut.isRegistered(activeBossKey)){if(!bindHotkey(data.bossKey))throw new Error('老板键无效或已被占用，请换一个组合键');if(activeBossKey&&activeBossKey!==data.bossKey)globalShortcut.unregister(activeBossKey);activeBossKey=data.bossKey;editingBossKey=false;}}
   settings={...settings,...data};settings.opacity=Math.max(.01,Math.min(1,Number(settings.opacity)||1));
   win.setOpacity(settings.opacity);win.setAlwaysOnTop(Boolean(settings.topmost));win.setContentProtection(Boolean(settings.captureProtection));tray.setToolTip(settings.hideTrayText?'':'轻阅');save();return settings;
  }
  if(!['annotations','saveAnnotation','removeAnnotation','list','open','preferences','position','search','bookmarks','addBookmark','removeBookmark','category','removeBook','editBook'].includes(method))throw new Error('Unsupported operation');
  return rpc(method,data);
 });
 const icon=nativeImage.createFromPath(path.join(uiRoot,'tray.png'));
 tray=new Tray(icon);tray.setToolTip('轻阅');updateTrayLanguage();tray.on('double-click',recover);
 if(settings.hideTrayText)tray.setToolTip('');
 if(settings.trayIcon){const savedIcon=nativeImage.createFromPath(path.join(root,'electron-tray.png'));if(!savedIcon.isEmpty())tray.setImage(savedIcon);}
 const requestedBossKey=settings.bossKey;
 for(const candidate of [...new Set([requestedBossKey,'Alt+Z','Ctrl+Alt+Z','Ctrl+Shift+Z'])]){if(bindHotkey(candidate)){activeBossKey=candidate;settings.bossKey=candidate;if(candidate!==requestedBossKey)bossKeyNotice='原老板键不可用，已改为 '+candidate;save();break;}}
 if(!activeBossKey)bossKeyNotice='老板键注册失败，请在阅读设置中重新设置';
 win.on('close',event=>{if(!exiting){event.preventDefault();win.hide();save();win.webContents.send('window-event','tray-hide');}});
 win.on('closed',()=>app.quit());
 win.on('minimize',()=>win.webContents.send('window-event','minimized'));
 win.on('hide',()=>{resumeBossKey();win.webContents.send('window-event','hidden');});
 win.on('blur',resumeBossKey);
 if(process.platform==='darwin')app.dock?.hide();
 await win.loadURL('qingread://app/index.html');
 let pointerInside:boolean|undefined;
 const pointerTimer=setInterval(()=>{
  if(win.isDestroyed()||!win.isVisible()||win.isMinimized())return;
  const cursor=screen.getCursorScreenPoint(),bounds=win.getBounds();
  const inside=cursor.x>=bounds.x&&cursor.x<bounds.x+bounds.width&&cursor.y>=bounds.y&&cursor.y<bounds.y+bounds.height;
  if(inside!==pointerInside){pointerInside=inside;win.webContents.send('window-event',inside?'pointer-enter':'pointer-leave');}
 },100);
 win.once('closed',()=>clearInterval(pointerTimer));
});
app.on('second-instance',()=>win&&recover());
app.on('before-quit',()=>{exiting=true;globalShortcut.unregisterAll();library.close();tray?.destroy();});
