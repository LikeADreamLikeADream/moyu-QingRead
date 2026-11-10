const {app,BrowserWindow}=require('electron'),path=require('path'),assert=require('node:assert/strict');app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:820,height:600,webPreferences:{preload:path.resolve('tests/i18n-preload.cjs')}});
 await win.loadFile(path.resolve(process.env.QINGREAD_UI_FILE||'electron/ui/index.html'));await new Promise(r=>setTimeout(r,150));
 const result=await win.webContents.executeJavaScript(`(()=>{try{
 books=['.txt','.epub','.mobi','.azw3'].flatMap((format,i)=>[false,true].map((covered,j)=>({id:String(i*2+j).repeat(32),title:format+(covered?'有封面':'无封面'),author:'',category:'测试',format,cover:covered?'cover.png':null,percent:12.3+i*20})));shelfSettings.coverProgress=true;shelf();
 for(const item of books){const card=document.querySelector('[data-book-id="'+item.id+'"]');const badge=card.querySelector('.cover-progress');if(!badge||badge.textContent!==item.percent.toFixed(1)+'%')throw Error(item.title+' progress missing');const cover=card.querySelector('.cover').getBoundingClientRect(),r=badge.getBoundingClientRect();if(r.bottom>cover.bottom||r.top<cover.top)throw Error('progress outside cover');}
 shelfSettings.coverProgress=false;shelf();if(document.querySelector('.cover-progress'))throw Error('progress toggle ignored');for(const detail of document.querySelectorAll('.book-item small'))if(detail.textContent.includes('%'))throw Error('metadata progress still shown');
 shelfSettings.coverProgress=true;shelf();document.body.classList.add('transparent');for(const badge of document.querySelectorAll('.cover-progress'))if(getComputedStyle(badge).backgroundColor!=='rgba(0, 0, 0, 0)')throw Error('transparent badge has background');
 if(!document.querySelector('.notebook-card'))throw Error('notebook missing');return 'PASS TXT/EPUB/MOBI/AZW3 with and without covers, progress values and placement, visibility toggle, transparent mode, notebook entry';
 }catch(error){return {error:String(error)};}})()`);assert.equal(typeof result,'string',JSON.stringify(result));console.log(result);app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
