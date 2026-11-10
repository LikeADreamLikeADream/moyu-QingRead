const {app,BrowserWindow}=require('electron'),path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
const root=path.resolve('artifacts/reading-menu-'+Date.now());fs.mkdirSync(root,{recursive:true});const file=path.join(root,'阅读模式.txt');fs.writeFileSync(file,'第一章\n'+('阅读模式与菜单测试。\n'.repeat(300)));
process.env.QINGREAD_READER_DATA=root;app.setPath('userData',path.join(root,'profile'));require(path.resolve(process.env.QINGREAD_MAIN_MODULE||'electron/dist/main.js'));
app.whenReady().then(async()=>{
 await new Promise(r=>setTimeout(r,600));const win=BrowserWindow.getAllWindows()[0];
 if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
 const result=await win.webContents.executeJavaScript(`(async()=>{
 const imported=await desktop.call('import-paths',{paths:[${JSON.stringify(file)}]});await refresh();await openBook(imported[0].book);
 const doc=$('reader').contentDocument;
 if(prefs.mode!=='scroll'||$('mode').textContent!=='翻页'||doc.body.classList.contains('paged'))throw Error('scroll mode must offer paged action');
 await $('mode').onclick();if(prefs.mode!=='paged'||$('mode').textContent!=='滚动'||!doc.body.classList.contains('paged'))throw Error('paged mode must offer scroll action');
 await render(0);if($('mode').textContent!=='滚动')throw Error('render changed action label');
 window.i18n.setLanguage('en');await new Promise(r=>setTimeout(r,50));if($('mode').textContent!=='Scroll')throw Error('English action wrong');
 window.i18n.setLanguage('zh-CN');await $('reset').onclick();if(prefs.mode!=='scroll'||$('mode').textContent!=='翻页')throw Error('reset action stale');
 settings.hideOnLeave=true;settings.autoHide=false;$('toolbarMore').click();if(!$('readingActions').matches(':popover-open'))throw Error('menu did not open');
 windowPointer(false);if(!document.body.classList.contains('hoverHidden'))throw Error('window did not hide');if($('readingActions').matches(':popover-open'))throw Error('menu stayed open on leave');
 windowPointer(true);if(document.body.classList.contains('hoverHidden')||$('readingActions').matches(':popover-open'))throw Error('menu reopened on return');
 settings.hideOnLeave=false;$('toolbarMore').click();windowPointer(false);if($('readingActions').matches(':popover-open'))throw Error('menu stayed open with hide disabled');if(document.body.classList.contains('hoverHidden'))throw Error('disabled hide hid window');
 reader().pause();await savePosition();await writing;
 return 'PASS mode action, actual reader layout, rerender, English, reset, menu dismissal on hide and return';
 })().catch(e=>({error:String(e),stack:e.stack}))`);
 assert.equal(typeof result,'string',JSON.stringify(result));await new Promise(r=>setTimeout(r,300));console.log(result);app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
