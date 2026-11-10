'use strict';
let bookAnnotations=[],annotationDraft=null,notebookVersion=0;
function notesText(text){return window.i18n.t(text);}
async function refreshAnnotations(){
 if(active&&book){const id=active.id;const items=await call('annotations',{id});if(active?.id!==id)return;bookAnnotations=items;reader().setAnnotations(items.filter(a=>a.chapterKey===book.chapters[chapter].key));if(side==='notes'&&!$('sidebar').hidden)await showBookNotes();}
 if(!$('notebook').hidden)await notebookResults();
}
function addNotebookCard(){
 const card=document.createElement('button');card.className='book notebook-card';card.setAttribute('aria-label',notesText('笔记'));
 const cover=document.createElement('div');cover.className='cover default-cover';cover.textContent=notesText('笔记');const title=document.createElement('strong');title.textContent=notesText('笔记');card.append(cover,title);card.onclick=run(openNotebook);$('books').append(card);
}
async function openNotebook(){await savePosition();await writing;book=null;active=null;clearJumpOrigin();$('library').hidden=true;$('reading').hidden=true;$('toolbar').hidden=true;$('notebook').hidden=false;$('title').textContent=notesText('笔记');$('notebookQuery').value='';appearance();await notebookResults();}
async function notebookResults(){
 const version=++notebookVersion,items=await call('annotations',{query:$('notebookQuery').value});if(version!==notebookVersion)return;$('notebookResults').replaceChildren();const groups=new Map();
 for(const item of items){if(!groups.has(item.bookId)){const group=document.createElement('section');group.className='note-book-group';const heading=document.createElement('h3');heading.textContent=item.title;group.append(heading);if(item.category&&item.category!=='未分类'){const category=document.createElement('small');category.textContent=item.category;group.append(category);}groups.set(item.bookId,group);$('notebookResults').append(group);}groups.get(item.bookId).append(annotationRow(item));}
 if(!items.length){const empty=document.createElement('p');empty.className='notes-empty';empty.textContent=notesText('暂无笔记');$('notebookResults').append(empty);}
}
async function showBookNotes(){
 const id=active?.id,query=$('query').value,items=await call('annotations',{id,query});if(id!==active?.id||side!=='notes'||query!==$('query').value)return;$('results').replaceChildren();for(const item of items)$('results').append(annotationRow(item));if(!items.length){const empty=document.createElement('p');empty.textContent=notesText('暂无笔记');$('results').append(empty);}
}
function annotationRow(item){
 const row=document.createElement('article');row.className='annotation-row';row.dataset.annotationId=item.id;
 const quote=document.createElement('button');quote.className='annotation-quote';quote.textContent=item.quote;quote.style.backgroundColor=item.color;quote.onclick=run(()=>jumpToAnnotation(item));row.append(quote);
 if(item.note){const note=document.createElement('p');note.className='annotation-note';note.textContent=item.note;row.append(note);}
 const actions=document.createElement('div');actions.className='annotation-actions';actions.append(actionButton(notesText('编辑'),()=>editAnnotation(item)),actionButton(notesText('删除'),()=>deleteAnnotation(item)));row.append(actions);return row;
}
async function jumpToAnnotation(item){
 if(!book||active?.id!==item.bookId){const source=books.find(b=>b.id===item.bookId);if(!source)return;$('notebook').hidden=true;await openBook(source);}
 reader().pause();const origin=currentPosition();const target=book.chapters.findIndex(c=>c.key===item.chapterKey);if(target<0)return;await savePosition();chapter=target;await render(item.start);const after=currentPosition();if(origin&&after&&(after.chapterKey!==origin.chapterKey||after.offset!==origin.offset)){if(!jumpOrigin)jumpOrigin={bookId:active.id,...origin};showJumpReturn();}
}
function editAnnotation(item){
 annotationDraft={...item};$('annotationQuote').textContent=item.quote||'';$('annotationNote').value=item.note||'';$('annotationColor').value=item.color||'#ffe08a';$('annotationColor').onchange=()=>{};$('annotationColorControls').replaceChildren(colorPicker($('annotationColor'),'annotationColor',notesText('划线背景颜色')));$('annotationDelete').hidden=!item.id;$('annotationDialog').showModal();
}
async function deleteAnnotation(item){
 const confirmed=await new Promise(resolve=>{const dialog=$('deleteAnnotationDialog');dialog.returnValue='';dialog.onclose=()=>resolve(dialog.returnValue==='confirm');dialog.showModal();});if(!confirmed)return;
 await call('removeAnnotation',{annotationId:item.id});await refreshAnnotations();status(notesText('划线已删除'));
}
async function saveSelection(selection,edit){
 if(!book||!active)return;const c=book.chapters[chapter],draft={bookId:active.id,chapterKey:c.key,start:selection.start,end:selection.end,quote:c.text.slice(selection.start,selection.end),note:'',color:selection.color};const existing=bookAnnotations.find(a=>a.chapterKey===draft.chapterKey&&a.start===draft.start&&a.end===draft.end);if(existing)Object.assign(draft,existing,{color:selection.color});
 if(edit){editAnnotation(draft);return;}await call('saveAnnotation',{...draft,id:active.id});await refreshAnnotations();status(notesText('划线已保存'));
}
function initAnnotations(){
 $('annotationDialog').addEventListener('close',()=>{for(const panel of $('annotationDialog').querySelectorAll('.color-popover:popover-open'))panel.hidePopover();});
 $('notebookQuery').oninput=run(notebookResults);
 $('annotationCancel').onclick=()=>$('annotationDialog').close();
 $('annotationSave').onclick=run(async()=>{if(!annotationDraft)return;await call('saveAnnotation',{...annotationDraft,id:annotationDraft.bookId,note:$('annotationNote').value,color:$('annotationColor').value});$('annotationDialog').close();await refreshAnnotations();status(notesText('笔记已保存'));});
 $('annotationDelete').onclick=run(async()=>{const item=annotationDraft;$('annotationDialog').close();if(item?.id)await deleteAnnotation(item);});
}
