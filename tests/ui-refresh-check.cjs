const {app,BrowserWindow}=require('electron');
const path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:820,height:600,frame:false,webPreferences:{backgroundThrottling:false,preload:path.resolve('tests/i18n-preload.cjs')}});
 await win.loadFile(path.resolve(process.env.QINGREAD_UI_FILE||'electron/ui/index.html'));
 await new Promise(resolve=>setTimeout(resolve,150));
 await win.webContents.executeJavaScript(`books=['瓦尔登湖','人间草木','月亮与六便士','小王子','山茶文具店','长安的荔枝'].map((title,i)=>({id:String(i).repeat(32),title,author:'',category:'文学',format:'.txt',percent:i*12.3}));shelf();`);
 const output=path.resolve('artifacts/ui-refresh');fs.mkdirSync(output,{recursive:true});
 for(const width of [820,410,360]){
  win.setSize(width,600);await new Promise(resolve=>setTimeout(resolve,80));
  assert(await win.webContents.executeJavaScript(`document.getElementById('library').scrollWidth<=document.getElementById('library').clientWidth`),'bookshelf overflow');
  fs.writeFileSync(path.join(output,`bookshelf-${width}.png`),(await win.webContents.capturePage()).toPNG());
 }
 await win.webContents.executeJavaScript(`document.getElementById('library').hidden=true;document.getElementById('reading').hidden=false;document.getElementById('toolbar').hidden=false;document.getElementById('progress').textContent='3/12 · 24.6%';`);
 for(const width of [820,410,360]){
  win.setSize(width,600);await new Promise(resolve=>setTimeout(resolve,80));
  assert(await win.webContents.executeJavaScript(`document.getElementById('toolbar').scrollWidth<=document.getElementById('toolbar').clientWidth`),'toolbar overflow');
  assert(await win.webContents.executeJavaScript(`(()=>{const header=document.querySelector('header').getBoundingClientRect(),footer=document.getElementById('toolbar').getBoundingClientRect();return header.height===footer.height&&footer.height===29&&document.getElementById('prev').getBoundingClientRect().height===25;})()`),'toolbar heights differ');
 }
 await win.webContents.executeJavaScript(`document.getElementById('toolbarMore').click();`);
 assert(await win.webContents.executeJavaScript(`document.getElementById('readingActions').matches(':popover-open')`));
 assert.equal(await win.webContents.executeJavaScript(`document.querySelectorAll('#readingActions button').length`),5);
 assert(await win.webContents.executeJavaScript(`!!document.querySelector('.notebook-card')&&!!document.querySelector('#sidebar [data-side=notes]')&&!!document.querySelector('#readingActions [data-side=notes]')`),'notes entry missing');
 await win.webContents.executeJavaScript(`document.querySelector('#readingActions [data-side]').click();`);
 assert(await win.webContents.executeJavaScript(`!document.getElementById('readingActions').matches(':popover-open')`));
 await win.webContents.executeJavaScript(`window.i18n.setLanguage('en')`);
 assert.equal(await win.webContents.executeJavaScript(`document.getElementById('toolbarMore').getAttribute('aria-label')`),'More reading actions');
 await win.webContents.executeJavaScript(`window.i18n.setLanguage('zh-CN');prefs={font:'Microsoft YaHei',theme:'paper',fontSize:20,lineHeight:1.9,margin:48};fields();document.getElementById('settings').hidden=false;`);
 win.setSize(361,600);await new Promise(resolve=>setTimeout(resolve,80));win.setSize(360,600);await new Promise(resolve=>setTimeout(resolve,80));
 assert(await win.webContents.executeJavaScript(`!document.getElementById('settings').hidden`));
 fs.writeFileSync(path.join(output,'settings-360.png'),(await win.webContents.capturePage()).toPNG());
 win.setSize(820,600);await new Promise(resolve=>setTimeout(resolve,80));
 fs.writeFileSync(path.join(output,'settings-820.png'),(await win.webContents.capturePage()).toPNG());
 await win.webContents.executeJavaScript(`document.getElementById('settings').hidden=true;document.body.classList.add('transparent');`);
 assert(await win.webContents.executeJavaScript(`getComputedStyle(document.getElementById('reading')).backgroundColor==='rgba(0, 0, 0, 0)'`));
 assert.equal(await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.cover')).boxShadow`),'none');
 console.log('PASS bookshelf and toolbar at 360/410/820px, more-menu open/select, bilingual label, transparent surfaces; screenshots: '+output);
 app.exit();
}).catch(error=>{console.error(error);app.exit(1);});
