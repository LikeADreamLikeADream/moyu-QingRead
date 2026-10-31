const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../electron/ui/app.js'),'utf8');
const code=source.slice(source.indexOf('async function results()'),source.indexOf('function ask('));
const nodes={query:{value:''},results:{children:[],replaceChildren(){this.children=[];},append(button){this.children.push(button);}}};
const context=vm.createContext({$:id=>nodes[id],document:{createElement:()=>({})},run:fn=>fn,actionButton:()=>({}),call:async()=>[]});
vm.runInContext("let searchVersion=0,side='toc',active={id:'test'},book={toc:null,chapters:[{key:'a',title:'第一章'},{key:'b',title:'第二章'}]};"+code,context);
(async()=>{
 await vm.runInContext('results()',context);assert.deepEqual(nodes.results.children.map(x=>x.textContent),['第一章','第二章']);
 nodes.query.value='第二';await vm.runInContext('results()',context);assert.equal(nodes.results.children.length,1);assert.equal(nodes.results.children[0].textContent,'第二章');
 vm.runInContext("book.toc=[{chapterKey:'b',title:'EPUB 目录',offset:12}];",context);nodes.query.value='';await vm.runInContext('results()',context);assert.equal(nodes.results.children[0].textContent,'EPUB 目录');
 console.log('PASS legacy TXT chapter fallback, directory filtering, EPUB TOC');
})().catch(error=>{console.error(error);process.exitCode=1;});
