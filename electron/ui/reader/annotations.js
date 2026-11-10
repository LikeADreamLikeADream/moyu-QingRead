'use strict';
let chapterAnnotations=[],selectedAnnotationRange=null;
const annotationTools=document.createElement('div');annotationTools.id='annotationTools';annotationTools.hidden=true;
const annotationColor=document.createElement('input');annotationColor.value='#ffe08a';annotationColor.onchange=()=>{};
const annotationPicker=colorPicker(annotationColor,'annotationColor','划线背景颜色');annotationTools.append(annotationColor,annotationPicker);
function hideAnnotationTools(){activeColorPicker?.hidePopover();annotationTools.hidden=true;}
for(const [label,edit] of [['划线',false],['笔记',true]]){const button=document.createElement('button');button.dataset.annotationAction=edit?'note':'underline';button.textContent=label;button.onpointerdown=e=>e.preventDefault();button.onclick=()=>{if(selectedAnnotationRange)send('annotation-select',{selection:{...selectedAnnotationRange,color:annotationColor.value},edit});hideAnnotationTools();window.getSelection()?.removeAllRanges();};annotationTools.append(button);}
document.body.append(annotationTools);
function annotatedText(element,text,start){
 const matches=chapterAnnotations.filter(a=>a.start<start+text.length&&a.end>start),cuts=new Set([0,text.length]);
 for(const a of matches){cuts.add(Math.max(0,a.start-start));cuts.add(Math.min(text.length,a.end-start));}
 const points=[...cuts].sort((a,b)=>a-b);element.replaceChildren();
 for(let i=0;i<points.length-1;i++){const from=points[i],to=points[i+1],a=matches.find(a=>a.start<=start+from&&a.end>=start+to);if(!a){element.append(document.createTextNode(text.slice(from,to)));continue;}const mark=document.createElement('mark');mark.className='annotation';mark.dataset.annotationId=a.id;mark.style.backgroundColor=a.color;mark.textContent=text.slice(from,to);mark.onclick=()=>{if(!window.getSelection()?.toString())send('annotation-edit',{annotationId:a.id});};element.append(mark);}
}
function renderAnnotations(){
 chapterAnnotations=data?.annotations||[];
 for(const element of Array.from(content.children)){if(element.tagName!=='FIGURE'&&element.textContent)annotatedText(element,element.textContent,Number(element.dataset.offset)||0);}
 if(singleText)annotatedText(single,singleText.slice(singleOffset).replace(/\n/g,' '),singleOffset);
}
function setAnnotations(items){if(!data)return;data.annotations=items;renderAnnotations();}
function annotationOffset(node,offset){
 if(settings.single&&single.contains(node)){const range=document.createRange();range.selectNodeContents(single);range.setEnd(node,offset);return singleOffset+range.toString().length;}
 const element=(node.nodeType===Node.ELEMENT_NODE?node:node.parentElement)?.closest('#content>[data-offset]');
 if(!element||element.tagName==='FIGURE')return null;const range=document.createRange();range.selectNodeContents(element);range.setEnd(node,offset);return Number(element.dataset.offset)+range.toString().length;
}
let annotationSelecting=false;
function updateAnnotationTools(){
 if(annotationSelecting||annotationTools.contains(document.activeElement))return;
 const selection=window.getSelection();if(!data||!selection?.rangeCount||selection.isCollapsed){annotationTools.hidden=true;return;}
 const range=selection.getRangeAt(0),start=annotationOffset(range.startContainer,range.startOffset),end=annotationOffset(range.endContainer,range.endOffset);
 if(start===null||end===null||end<=start){annotationTools.hidden=true;return;}pause();selectedAnnotationRange={start,end};
 const rect=range.getBoundingClientRect();annotationTools.hidden=false;annotationTools.style.left=Math.max(8,Math.min(innerWidth-annotationTools.offsetWidth-8,rect.left))+'px';annotationTools.style.top=Math.max(4,Math.min(innerHeight-annotationTools.offsetHeight-4,rect.bottom+6))+'px';
 const english=settings.language==='en';annotationTools.querySelector('[data-annotation-action="underline"]').textContent=english?'Underline':'划线';annotationTools.querySelector('[data-annotation-action="note"]').textContent=english?'Note':'笔记';annotationPicker.querySelector('.color-swatch').setAttribute('aria-label',english?'Choose highlight color':'选择划线背景颜色');

}
document.addEventListener('selectionchange',updateAnnotationTools);
document.addEventListener('pointerdown',event=>{if(!annotationTools.contains(event.target)){annotationSelecting=true;hideAnnotationTools();}});
document.addEventListener('pointerup',()=>{annotationSelecting=false;updateAnnotationTools();});
viewport.addEventListener('scroll',hideAnnotationTools);

window.reader.setAnnotations=setAnnotations;
