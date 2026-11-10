'use strict';
const viewport=document.getElementById('viewport'), content=document.getElementById('content');
let data=null, settings={}, lastOffset=0, loading=false, auto=false, frame=0, lastTick=0, elapsed=0, notifyTimer=0;
const send=(type,extra={})=>parent.postMessage({type,token:data?.token,...extra}, location.origin);
const blocks=()=>Array.from(content.children);
const single=document.getElementById('single');let singleOffset=0,singleText='',singleCarry=0;
function showSingle(offset){singleOffset=Math.max(0,Math.min(data?.length||0,Math.floor(offset)));single.textContent=singleText.slice(singleOffset).replace(/\n/g,' ');lastOffset=singleOffset;if(typeof annotatedText==='function')annotatedText(single,single.textContent,singleOffset);}
const measure=document.createElement('canvas').getContext('2d');
function singleStep(){
 measure.font=getComputedStyle(single).font;const text=singleText.slice(singleOffset).replace(/\n/g,' ');
 let low=1,high=Math.min(2000,text.length),fit=1;
 while(low<=high){const mid=Math.floor((low+high)/2);if(measure.measureText(text.slice(0,mid)).width<=viewport.clientWidth-24){fit=mid;low=mid+1;}else high=mid-1;}
 return fit;
}
const importedFontFaces=new Map();
function syncImportedFonts(){const fonts=settings.fonts||[];for(const [family,face] of importedFontFaces)if(!fonts.some(f=>f.family===family)){document.fonts.delete(face);importedFontFaces.delete(family);}for(const font of fonts)if(!importedFontFaces.has(font.family)){const face=new FontFace(font.family,'url("qingread://fonts/'+font.file+'")');document.fonts.add(face);importedFontFaces.set(font.family,face);}}
let pagedEnd=null;
function alignPagedEnd(){
 pagedEnd?.remove();pagedEnd=null;
 if(settings.mode!=='paged'||settings.single)return;
 const width=viewport.clientWidth;if(!width)return;
 const pages=Math.max(1,Math.ceil(viewport.scrollWidth/width));
 pagedEnd=document.createElement('div');pagedEnd.setAttribute('aria-hidden','true');pagedEnd.style.cssText='position:absolute;top:0;width:1px;height:1px;pointer-events:none;left:'+(pages*width-1)+'px';viewport.append(pagedEnd);
}
function configure(){
 syncImportedFonts();
 pagedEnd?.remove();pagedEnd=null;
 const themes={paper:['#f7f2e8','#333c38'],light:['#ffffff','#303735'],night:['#202725','#c4cdc5'],green:['#e4eee5','#2c4737']};
 const t=themes[settings.theme]||themes.paper, root=document.documentElement.style;
 document.body.classList.toggle('transparent',!!settings.transparent);
 root.setProperty('--paper',settings.transparent?'transparent':settings.backgroundColor||t[0]);root.setProperty('--ink',settings.textColor||(settings.transparent?'#7C8490':t[1]));
 root.setProperty('--single-font',(settings.singleFontSize||15)+'px');document.body.classList.toggle('single',!!settings.single);
 root.setProperty('--font',`${Math.max(12,Math.min(36,settings.fontSize||20))}px`);
 root.setProperty('--line',String(settings.lineHeight||1.9));root.setProperty('--family',settings.font||'Microsoft YaHei');
 const margin=Math.min(settings.margin??48,Math.max(8,viewport.clientWidth/8));root.setProperty('--margin',margin+'px');
 const verticalMargin=Math.min(Math.max(0,settings.verticalMargin??32),96,Math.max(0,(viewport.clientHeight-48)/2));root.setProperty('--vertical-margin',verticalMargin+'px');
 document.body.classList.toggle('bold',!!settings.fontBold);document.body.classList.toggle('compact',!!settings.compact);document.body.classList.toggle('paged',settings.mode==='paged');
 const columns=settings.spread&&viewport.clientWidth>=700?2:1;
 content.style.columnCount=settings.mode==='paged'?String(columns):'';
 content.style.columnWidth=settings.mode==='paged'?Math.max(80,(viewport.clientWidth-2*margin*columns)/columns)+'px':'';
 content.style.width=settings.mode==='paged'?Math.max(80,viewport.clientWidth-2*margin)+'px':'';
}
function position(){
 if(!data)return 0;
 if(settings.single)return singleOffset;
 const nodes=blocks();let chosen=nodes.find(e=>{const r=e.getBoundingClientRect();return r.right>2&&r.left<viewport.clientWidth-2&&r.bottom>1&&r.top<viewport.clientHeight;});
 if(!chosen)return lastOffset;
 let offset=Number(chosen.dataset.offset)||0;
 if(chosen.tagName==='FIGURE')return offset;
 const r=chosen.getBoundingClientRect();
 const range=document.caretRangeFromPoint(Math.max(2,r.left+4),Math.max(r.top+4,4));
 if(range&&chosen.contains(range.startContainer)){
  const before=document.createRange();before.selectNodeContents(chosen);before.setEnd(range.startContainer,range.startOffset);offset+=before.toString().length;
 }
 return Math.max(0,Math.min(data.length,offset));
}
function restore(offset){
 if(settings.single){showSingle(offset);return;}
 const nodes=blocks();let block=nodes.find(e=>Number(e.dataset.offset)+Number(e.dataset.length)>=offset)||nodes.at(-1);
 if(!block)return;let rect=block.getBoundingClientRect();
 if(block.tagName!=='FIGURE'&&block.textContent.length){
  let remain=Math.max(0,offset-Number(block.dataset.offset));const walk=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let node;
  while(node=walk.nextNode()){
   if(remain<=node.length){const range=document.createRange();range.setStart(node,Math.min(remain,node.length));range.setEnd(node,Math.min(remain+1,node.length));rect=range.getBoundingClientRect();break;}
   remain-=node.length;
  }
 }
 if(settings.mode==='paged')viewport.scrollLeft=Math.floor(Math.max(0,rect.left+viewport.scrollLeft)/Math.max(1,viewport.clientWidth))*viewport.clientWidth;
 else viewport.scrollTop=Math.max(0,rect.top+viewport.scrollTop-8);
 lastOffset=offset;
}
function snapshot(){const offset=position();const max=settings.mode==='paged'?viewport.scrollWidth-viewport.clientWidth:viewport.scrollHeight-viewport.clientHeight;
 if(settings.single)return {offset,atEnd:offset+singleStep()>=data.length};
 const atEnd=max<=1||(settings.mode==='paged'?viewport.scrollLeft:viewport.scrollTop)>=max-2;
 return {offset,atEnd};}
function report(){if(loading||!data)return;const current=snapshot();lastOffset=current.offset;send('position',current);}
let readingInteraction=0,scrollEdgePending=false;
for(const type of ['wheel','keydown','pointerdown','touchstart'])window.addEventListener(type,()=>readingInteraction++,{capture:true,passive:true});
async function loadChapter(payload,offset,prefs){
 pause();++settingsRevision;loading=true;data=payload;settings=prefs;content.replaceChildren();viewport.scrollTop=0;viewport.scrollLeft=0;
 singleText=payload.blocks.map(b=>b.text).join('\n');singleCarry=0;
 let start=0;const fragment=document.createDocumentFragment();
 for(const block of payload.blocks){
  const e=document.createElement(block.kind==='img'?'figure':block.kind==='h2'?'h2':'p');e.dataset.offset=start;e.dataset.length=block.text.length;
  if(block.kind==='img'&&block.image){const img=document.createElement('img');img.src='qingread://book/'+payload.bookId+'/'+block.image;img.alt=block.text;img.onerror=()=>{const c=document.createElement('figcaption');c.textContent=settings.language==='en'?'Unable to display illustration':'插图无法显示';e.append(c);};e.append(img);}
  else {e.textContent=block.text;if(!block.text)e.append(document.createElement('br'));}
  fragment.append(e);start+=block.text.length+1;
 }
 content.append(fragment);configure();renderAnnotations();const imagesReady=Promise.all(Array.from(content.querySelectorAll('img')).map(i=>i.decode().catch(()=>{})));
 if(settings.mode==='paged')await imagesReady;await document.fonts.ready;
 await new Promise(requestAnimationFrame);alignPagedEnd();restore(offset);loading=false;scrollEdgePending=false;report();send('loaded');
 if(settings.mode!=='paged'){const interaction=readingInteraction;imagesReady.then(()=>{if(data===payload&&readingInteraction===interaction&&!loading&&!auto){restore(offset);report();}});}
}
let settingsRevision=0;
async function setSettings(prefs){pause();let offset=position(),revision=++settingsRevision;loading=true;settings=prefs;configure();await document.fonts.ready;requestAnimationFrame(()=>{if(revision!==settingsRevision)return;alignPagedEnd();restore(offset);loading=false;report();});}
function page(direction){
 if(settings.single){const next=singleOffset+direction*singleStep();if(next>=data.length||next<0){send('edge',{direction,resumeAuto:auto});pause();return;}showSingle(next);report();return;}
 if(!data)return;const paged=settings.mode==='paged',current=paged?viewport.scrollLeft:viewport.scrollTop,max=paged?viewport.scrollWidth-viewport.clientWidth:viewport.scrollHeight-viewport.clientHeight;
 if(direction>0&&current>=max-2){send('edge',{direction:1,resumeAuto:auto});pause();return;}
 if(direction<0&&current<=1){send('edge',{direction:-1});return;}
 if(paged)viewport.scrollLeft+=direction*viewport.clientWidth;else viewport.scrollTop+=direction*Math.max(40,viewport.clientHeight-40);report();
}
let autoTimer=0;
function pause(){auto=false;clearTimeout(autoTimer);cancelAnimationFrame(frame);elapsed=0;send('auto',{running:false});}
function toggleAuto(){if(auto){pause();return;}auto=true;lastTick=performance.now();let scrollPosition=viewport.scrollTop;send('auto',{running:true});
 if((settings.single&&settings.singleMode!=='horizontal')||(!settings.single&&settings.mode==='paged')){
  const schedule=()=>{autoTimer=setTimeout(()=>{if(!auto)return;page(1);if(auto)schedule();},Math.max(.1,Number(settings.autoSeconds)||20)*1000);};schedule();return;
 }
 function tick(now){if(!auto)return;const dt=Math.min(100,now-lastTick);lastTick=now;elapsed+=dt;
  if(settings.single&&settings.singleMode==='horizontal'){
   singleCarry+=(settings.singleSpeed||2)*dt/1000;const step=Math.floor(singleCarry);
   if(step){singleCarry-=step;if(singleOffset+step>=data.length){send('edge',{direction:1,resumeAuto:true});pause();return;}showSingle(singleOffset+step);report();}
  }else if(settings.single||settings.mode==='paged'){if(elapsed>=(settings.autoSeconds||20)*1000){elapsed=0;page(1);}}
  else {const max=Math.max(0,viewport.scrollHeight-viewport.clientHeight);scrollPosition=Math.min(max,scrollPosition+(settings.autoSpeed||30)*dt/1000);viewport.scrollTop=scrollPosition;if(viewport.scrollTop>=max-1&&elapsed>1000){send('edge',{direction:1,resumeAuto:true});pause();return;}}
  frame=requestAnimationFrame(tick);
 }frame=requestAnimationFrame(tick);
}
viewport.addEventListener('scroll',()=>{if(loading)return;clearTimeout(notifyTimer);notifyTimer=setTimeout(report,120);},{passive:true});
let lastWheel=0,lastScrollEdge=-Infinity;viewport.addEventListener('wheel',e=>{if(auto)pause();if(settings.single||settings.mode==='paged'){e.preventDefault();if(performance.now()-lastWheel>250){lastWheel=performance.now();page(e.deltaY>=0?1:-1);}}else if(!loading&&!scrollEdgePending&&data&&((e.deltaY>0&&viewport.scrollTop>=viewport.scrollHeight-viewport.clientHeight-2)||(e.deltaY<0&&viewport.scrollTop<=2))){e.preventDefault();if(performance.now()-lastScrollEdge>160){lastScrollEdge=performance.now();scrollEdgePending=true;send('edge',{direction:e.deltaY>0?1:-1});}}},{passive:false});
document.addEventListener('keydown',e=>{send('key',{key:e.key,ctrl:e.ctrlKey,alt:e.altKey,shift:e.shiftKey});if(['ArrowRight','PageDown','ArrowLeft','PageUp','ArrowUp','ArrowDown','Escape'].includes(e.key))e.preventDefault();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&settings.pauseOnMinimize!==false)pause();});
let lastPointer=0;document.addEventListener('pointermove',e=>{if(performance.now()-lastPointer>100){lastPointer=performance.now();send('pointer',{edge:e.clientY<24||e.clientY>viewport.clientHeight-24});}});
document.addEventListener('pointerdown',()=>send('reader-click'));
document.addEventListener('pointerleave',()=>send('pointerLeave'));
let resizeTimer;window.addEventListener('resize',()=>{if(!data||loading)return;const offset=lastOffset;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{configure();alignPagedEnd();restore(offset);report();},100);});
window.reader={cancelEdge:()=>{scrollEdgePending=false;},loadChapter,setSettings,page,pause,toggleAuto,position,snapshot,restore,report,scrollBy:y=>{pause();viewport.scrollTop+=y;report();}};
