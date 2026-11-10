const fs=require('fs'),path=require('path'),assert=require('assert');
const {Library}=require(process.env.QINGREAD_LIBRARY_MODULE||'../electron/dist/library.js');
(async()=>{
 const root=path.resolve('artifacts/annotations-store-'+Date.now()),file=path.join(root,'sample.txt');fs.mkdirSync(root,{recursive:true});fs.writeFileSync(file,'原文第一段，测试划线和笔记。\n原文第二段，可以跨段落选择。');
 let lib=new Library(root);const book=await lib.call('import',{path:file}),opened=await lib.call('open',{id:book.id}),chapter=opened.book.chapters[0];
 const data={id:book.id,chapterKey:chapter.key,start:2,end:20,color:'#b9dcff',note:'我的笔记'};
 let rows=await lib.call('saveAnnotation',data);assert.equal(rows.length,1);assert.equal(rows[0].quote,chapter.text.slice(2,20));
 rows=await lib.call('saveAnnotation',{...data,note:'修改后的笔记',color:'#f5bfd4'});assert.equal(rows.length,1);assert.equal(rows[0].color,'#f5bfd4');
 await assert.rejects(lib.call('saveAnnotation',{...data,end:999999}));assert.equal((await lib.call('annotations',{query:'修改后'})).length,1);
 lib.close();lib=new Library(root);rows=await lib.call('annotations',{id:book.id});assert.equal(rows[0].note,'修改后的笔记');
 await lib.call('editBook',{id:book.id,title:'新书名',category:'新分类'});assert.equal((await lib.call('annotations'))[0].category,'新分类');
 await lib.call('removeAnnotation',{annotationId:rows[0].id});assert.equal((await lib.call('annotations')).length,0);
 await lib.call('saveAnnotation',data);await lib.call('removeBook',{id:book.id});assert.equal((await lib.call('annotations')).length,0);lib.close();
 console.log('PASS annotations quote validation, update, search, restart, category sync, deletion and book cascade');
})().catch(e=>{console.error(e);process.exitCode=1;});
