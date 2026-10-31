import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {Worker} from 'node:worker_threads';
const defaults={fontSize:20,lineHeight:1.9,margin:48,theme:'paper',font:'Microsoft YaHei',mode:'scroll',compact:false,autoSeconds:20,textColor:null,backgroundColor:null,spread:true,autoSpeed:30,pauseOnLeave:true,pauseOnMinimize:true,previousKey:'Left',nextKey:'Right',singleMode:'horizontal',singleSpeed:2,singleFontSize:15};
function camel(value:any):any{if(Array.isArray(value))return value.map(camel);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k[0].toLowerCase()+k.slice(1),camel(v)]));return value;}
export class Library {
 private db:DatabaseSync;private worker:Worker|undefined;private cancelCurrent:(()=>Promise<void>)|undefined;private importing=false;
 constructor(private root:string){fs.mkdirSync(root,{recursive:true});this.db=new DatabaseSync(path.join(root,'library.db'));this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA synchronous=FULL;
 CREATE TABLE IF NOT EXISTS books(id TEXT PRIMARY KEY,hash TEXT NOT NULL UNIQUE,title TEXT NOT NULL,format TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS progress(book_id TEXT PRIMARY KEY REFERENCES books(id),chapter_key TEXT NOT NULL,paragraph INTEGER NOT NULL CHECK(paragraph>=0));
 CREATE TABLE IF NOT EXISTS book_details(book_id TEXT PRIMARY KEY REFERENCES books(id),author TEXT NOT NULL,cover TEXT,category TEXT NOT NULL DEFAULT '未分类');
 CREATE TABLE IF NOT EXISTS reader_positions(book_id TEXT PRIMARY KEY REFERENCES books(id),chapter_key TEXT NOT NULL,offset INTEGER NOT NULL CHECK(offset>=0),percent REAL NOT NULL CHECK(percent>=0 AND percent<=100),updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS bookmarks(id TEXT PRIMARY KEY,book_id TEXT NOT NULL REFERENCES books(id),chapter_key TEXT NOT NULL,offset INTEGER NOT NULL CHECK(offset>=0),label TEXT NOT NULL,UNIQUE(book_id,chapter_key,offset));
 CREATE TABLE IF NOT EXISTS preferences(book_id TEXT PRIMARY KEY REFERENCES books(id),json TEXT NOT NULL);`);}
 private dir(id:string){if(!/^[a-f0-9]{32}$/.test(id))throw Error('无效书籍标识。');return path.join(this.root,'books',id);}
 private row(id:string):any{this.dir(id);const item=this.db.prepare('SELECT * FROM books WHERE id=?').get(id);if(!item)throw Error('书籍不存在。');return item;}
 list(){return this.db.prepare(`SELECT b.id,b.title,b.format,COALESCE(d.author,'作者未知') author,d.cover,COALESCE(d.category,'未分类') category,COALESCE(p.percent,0) percent,p.updated_at lastRead FROM books b LEFT JOIN book_details d ON d.book_id=b.id LEFT JOIN reader_positions p ON p.book_id=b.id ORDER BY p.updated_at DESC,b.rowid DESC`).all();}
 private load(id:string){const row=this.row(id);return {...camel(JSON.parse(fs.readFileSync(path.join(this.dir(id),'book.json'),'utf8'))),title:row.title};}
 private parseBook(source:string,stage:string){let cancelled=false;return new Promise((resolve,reject)=>{
    const worker=new Worker(path.join(__dirname,'book-parser.js'),{workerData:{source,stage}});this.worker=worker;let settled=false;
    const finish=(error?:Error,value?:any)=>{if(settled)return;settled=true;this.worker=undefined;this.cancelCurrent=undefined;error?reject(error):resolve(value);};
    this.cancelCurrent=async()=>{cancelled=true;await worker.terminate();finish(Object.assign(Error('已取消导入'),{name:'AbortError'}));};
    worker.once('message',message=>{finish(message.error?Error(message.error):undefined,message.book);});worker.once('error',finish);worker.once('exit',code=>{if(!settled&&!cancelled)finish(Error('书籍解析线程异常退出：'+code));});
   });}
 private async repairMobi(id:string){
  const row=this.row(id);if(row.format!=='.mobi')return;
  const previous=this.load(id);if(previous.parserVersion===2||previous.chapters.some((c:any)=>!/^\d+$/.test(c.key)))return;
  if(this.importing)throw Error('正在解析书籍，请稍后再试。');this.importing=true;
  const directory=this.dir(id),stage=path.join(this.root,'staging',randomUUID().replaceAll('-',''));fs.mkdirSync(stage,{recursive:true});
  try{const parsed:any=await this.parseBook(path.join(directory,'original.mobi'),stage);const prefix='images/mobi-'+randomUUID().replaceAll('-','');fs.mkdirSync(path.join(directory,prefix),{recursive:true});for(const file of fs.readdirSync(path.join(stage,'images')))fs.copyFileSync(path.join(stage,'images',file),path.join(directory,prefix,file));for(const chapter of parsed.chapters)for(const block of chapter.blocks||[])if(block.image)block.image=prefix+'/'+path.basename(block.image);if(parsed.cover)parsed.cover=prefix+'/'+path.basename(parsed.cover);parsed.title=row.title;const cache=path.join(directory,'book.json');fs.copyFileSync(cache,cache+'.before-mobi-fix');fs.writeFileSync(cache+'.tmp',JSON.stringify(parsed));fs.renameSync(cache+'.tmp',cache);if(parsed.cover)this.db.prepare('UPDATE book_details SET cover=? WHERE book_id=?').run(parsed.cover,id);
  }finally{this.importing=false;fs.rmSync(stage,{recursive:true,force:true});}
 }
 async cancel(){await this.cancelCurrent?.();return true;}
 private async importBook(source:string){
  if(this.importing)throw Error('正在导入，请等待当前任务完成。');this.importing=true;
  const id=randomUUID().replaceAll('-',''),stage=path.join(this.root,'staging',id),destination=this.dir(id);let committed=false,cancelled=false;const abort=()=>{if(cancelled)throw Object.assign(Error('已取消导入'),{name:'AbortError'});};this.cancelCurrent=async()=>{cancelled=true;};
  try{
   const info=await fs.promises.stat(source);if(!info.isFile()||!info.size||info.size>100*1024*1024)throw Error('文件为空或超过 100 MiB。');const format=path.extname(source).toLowerCase();if(!['.txt','.epub','.mobi','.azw3'].includes(format))throw Error('仅支持 TXT、EPUB、MOBI、AZW3。');
   fs.mkdirSync(stage,{recursive:true});const copy=path.join(stage,'original'+format);await fs.promises.copyFile(source,copy);const bytes=await fs.promises.readFile(copy);const hash=createHash('sha256').update(bytes).digest('hex').toUpperCase();const existing:any=this.db.prepare('SELECT id FROM books WHERE hash=?').get(hash);if(existing)return this.list().find((item:any)=>item.id===existing.id);
   abort();
   const book:any=await this.parseBook(copy,stage);
   abort();
   if(format==='.txt')book.title=path.basename(source,format);
   await fs.promises.writeFile(path.join(stage,'book.json'),JSON.stringify(book));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(stage,destination);
   this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('INSERT INTO books VALUES(?,?,?,?)').run(id,hash,book.title,format);this.db.prepare('INSERT INTO book_details(book_id,author,cover) VALUES(?,?,?)').run(id,book.author,book.cover);this.db.exec('COMMIT');committed=true;}catch(error){this.db.exec('ROLLBACK');throw error;}return this.list().find((item:any)=>item.id===id);
  }catch(error:any){if(error.name==='AbortError')return {cancelled:true};throw error;}
  finally{this.importing=false;this.cancelCurrent=undefined;fs.rmSync(stage,{recursive:true,force:true});if(!committed)fs.rmSync(destination,{recursive:true,force:true});}
 }
 async call(method:string,data:any={}):Promise<any>{
  const id=data.id;
  switch(method){
   case 'cancel':return this.cancel();
   case 'list':return this.list();
   case 'import':return this.importBook(data.path);
   case 'open':{await this.repairMobi(id);const book=this.load(id);const p:any=this.db.prepare('SELECT json FROM preferences WHERE book_id=?').get(id);return {book,preferences:{...defaults,...(p?camel(JSON.parse(p.json)):{})},position:this.db.prepare('SELECT chapter_key chapterKey,offset,percent FROM reader_positions WHERE book_id=?').get(id)||null,bookmarks:await this.call('bookmarks',{id})};}
   case 'preferences':this.row(id);this.db.prepare('INSERT INTO preferences VALUES(?,?) ON CONFLICT(book_id) DO UPDATE SET json=excluded.json').run(id,JSON.stringify({...defaults,...data.value}));return true;
   case 'position':{this.row(id);const p=data.value;this.db.prepare('INSERT INTO reader_positions VALUES(?,?,?,?,?) ON CONFLICT(book_id) DO UPDATE SET chapter_key=excluded.chapter_key,offset=excluded.offset,percent=excluded.percent,updated_at=excluded.updated_at').run(id,p.chapterKey,p.offset,p.percent,new Date().toISOString());return true;}
   case 'bookmarks':this.row(id);return this.db.prepare('SELECT id,book_id bookId,chapter_key chapterKey,offset,label FROM bookmarks WHERE book_id=? ORDER BY rowid DESC').all(id);
   case 'addBookmark':this.row(id);if(Array.from(data.label).length>200)throw Error('书签名称最多 200 个字符。');this.db.prepare('INSERT OR REPLACE INTO bookmarks VALUES(?,?,?,?,?)').run(randomUUID().replaceAll('-',''),id,data.position.chapterKey,data.position.offset,data.label);return this.call('bookmarks',{id});
   case 'removeBookmark':this.db.prepare('DELETE FROM bookmarks WHERE id=?').run(data.bookmarkId);return true;
   case 'editBook':{this.row(id);const title=data.title.trim(),category=data.category.trim()||'未分类';if(!title||title.length>200||category.length>30)throw Error('书名或分类长度无效。');this.db.exec('BEGIN');try{this.db.prepare('UPDATE books SET title=? WHERE id=?').run(title,id);this.db.prepare('UPDATE book_details SET category=? WHERE book_id=?').run(category,id);this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');throw error;}return true;}
   case 'category':this.row(id);if(!data.category.trim()||data.category.trim().length>30)throw Error('分类需为 1–30 个字。');this.db.prepare("INSERT INTO book_details(book_id,author,category) VALUES(?,'作者未知',?) ON CONFLICT(book_id) DO UPDATE SET category=excluded.category").run(id,data.category.trim());return true;
   case 'exportBook':{const row=this.row(id);const file=path.join(this.dir(id),'original'+row.format);if(!['.txt','.epub','.mobi','.azw3'].includes(row.format)||!fs.existsSync(file))throw Error('书籍原文件不存在。');return file;}
   case 'removeBook':{this.row(id);const source=this.dir(id),trash=path.join(this.root,'removed',id);fs.mkdirSync(path.dirname(trash),{recursive:true});this.db.exec('BEGIN IMMEDIATE');let moved=false;try{for(const table of ['progress','book_details','reader_positions','bookmarks','preferences','books'])this.db.prepare(`DELETE FROM ${table} WHERE ${table==='books'?'id':'book_id'}=?`).run(id);if(fs.existsSync(source)){fs.renameSync(source,trash);moved=true;}this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');if(moved)fs.renameSync(trash,source);throw error;}fs.rmSync(trash,{recursive:true,force:true});return true;}
   case 'search':{const book=this.load(id),hits:any[]=[];const query=String(data.query).toLowerCase();if(!query.trim())return [];for(const c of book.chapters){let offset=0;while(offset<=c.text.length-query.length){const found=c.text.toLowerCase().indexOf(query,offset);if(found<0)break;hits.push({chapterKey:c.key,chapterTitle:c.title,offset:found,excerpt:c.text.slice(Math.max(0,found-28),found+query.length+45).replaceAll('\n',' ')});if(hits.length===200)return hits;offset=found+query.length;}}return hits;}
   default:throw Error('Unsupported operation');
  }
 }
 resetFont(family:string){this.db.exec('BEGIN');try{for(const row of this.db.prepare('SELECT book_id,json FROM preferences').all()){const prefs=camel(JSON.parse(String(row.json)));if(prefs.font===family){prefs.font='Microsoft YaHei';this.db.prepare('UPDATE preferences SET json=? WHERE book_id=?').run(JSON.stringify(prefs),String(row.book_id));}}this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');throw error;}}
 close(){void this.worker?.terminate();this.db.close();}
}
