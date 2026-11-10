const {app,BrowserWindow}=require('electron'),path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
const root=path.resolve('artifacts/vertical-margin-'+Date.now());fs.mkdirSync(root,{recursive:true});const file=path.join(root,'边距测试.txt');fs.writeFileSync(file,'第一章\n'+('正文上下边距与阅读位置测试。\n'.repeat(250)));
process.env.QINGREAD_READER_DATA=root;app.setPath('userData',path.join(root,'profile'));require(path.resolve(process.env.QINGREAD_MAIN_MODULE||'electron/dist/main.js'));
const timeout=setTimeout(()=>{console.error('vertical-margin test timed out');app.exit(1);},30000);
app.whenReady().then(async()=>{
 await new Promise(r=>setTimeout(r,600));const win=BrowserWindow.getAllWindows()[0];win.setSize(820,600);if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
 const result=await win.webContents.executeJavaScript(`(async()=>{
 const imported=await desktop.call('import-paths',{paths:[${JSON.stringify(file)}]});await refresh();await openBook(imported[0].book);const source=active;
 const doc=$('reader').contentDocument,v=doc.getElementById('viewport'),content=doc.getElementById('content');const wait=()=>new Promise(r=>setTimeout(r,120));
 const control=()=>Array.from(document.querySelectorAll('#fields>label')).find(l=>l.textContent.includes('上下边距')).querySelector('input');
 if(prefs.verticalMargin!==32||control().value!=='32')throw Error('default missing');
 control().value=56;await control().onchange();await wait();if(prefs.verticalMargin!==56)throw Error('setting not saved');
 for(const mode of ['scroll','paged'])for(const compact of [false,true])for(const margin of [0,56,96]){
 prefs.mode=mode;prefs.compact=compact;prefs.verticalMargin=margin;await savePrefs();await wait();const style=doc.defaultView.getComputedStyle(content),value=parseFloat(doc.defaultView.getComputedStyle(doc.documentElement).getPropertyValue('--vertical-margin'));
 if(value!==margin)throw Error('margin value wrong');if(mode==='scroll'){if(parseFloat(style.paddingTop)!==margin||parseFloat(style.paddingBottom)!==margin)throw Error('scroll margins wrong');}else{if(parseFloat(style.marginTop)!==margin||parseFloat(style.marginBottom)!==margin||Math.abs(content.getBoundingClientRect().height-(v.clientHeight-margin*2))>1)throw Error('paged margins wrong');reader().page(1);await wait();if(v.scrollLeft<=0||Math.abs(v.scrollLeft/v.clientWidth-Math.round(v.scrollLeft/v.clientWidth))>.01)throw Error('page alignment wrong '+v.scrollLeft+'/'+v.clientWidth+' total '+v.scrollWidth);}
 }
 prefs.verticalMargin=56;await savePrefs();await wait();const offset=reader().position();await openBook(source);await wait();if(prefs.verticalMargin!==56||control().value!=='56')throw Error('reopen lost margins');if(Math.abs(reader().position()-offset)>100)throw Error('reopen lost position');
 window.i18n.setLanguage('en');await wait();if(!$('fields').textContent.includes('Top and bottom margins'))throw Error('English label missing');window.i18n.setLanguage('zh-CN');
 await $('reset').onclick();await wait();if(prefs.verticalMargin!==32||control().value!=='32')throw Error('reset failed');
 prefs.mode='paged';prefs.verticalMargin=96;await savePrefs();await wait();reader().pause();await savePosition();await writing;
 return 'PASS defaults, live setting, scroll/paged/compact layouts at 0/56/96px, page alignment, persistence, location restore, English and reset';
 })().catch(e=>({error:String(e),stack:e.stack}))`);assert.equal(typeof result,'string',JSON.stringify(result));win.setSize(360,118);await new Promise(r=>setTimeout(r,350));assert(await win.webContents.executeJavaScript(`(()=>{const doc=$('reader').contentDocument,v=doc.getElementById('viewport'),content=doc.getElementById('content');return content.getBoundingClientRect().height>=Math.min(48,v.clientHeight)-1;})()`),'small window has no reading area');clearTimeout(timeout);console.log(result);app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
