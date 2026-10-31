import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export type ImportedFont={family:string;name:string;file:string};
export class FontStore{
 constructor(private root:string){}
 private get manifest(){return path.join(this.root,'fonts','imported.json');}
 list():ImportedFont[]{if(!fs.existsSync(this.manifest))return [];const entries=JSON.parse(fs.readFileSync(this.manifest,'utf8'));if(!Array.isArray(entries))throw Error('字体列表无效');return entries.filter((f:any)=>/^QingRead-[a-f0-9]{64}$/.test(f.family)&&/^imported\/[a-f0-9]{64}\.(ttf|otf|woff|woff2)$/.test(f.file)&&typeof f.name==='string'&&fs.existsSync(path.join(this.root,'fonts',f.file)));}
 private save(fonts:ImportedFont[]){fs.mkdirSync(path.dirname(this.manifest),{recursive:true});fs.writeFileSync(this.manifest+'.tmp',JSON.stringify(fonts));fs.renameSync(this.manifest+'.tmp',this.manifest);}
 import(file:string){const bytes=fs.readFileSync(file);if(!bytes.length||bytes.length>40*1024*1024)throw Error('字体文件为空或超过 40 MiB');const extension=path.extname(file).toLowerCase(),magic=bytes.subarray(0,4).toString('hex');const signatures:Record<string,string[]>={'.ttf':['00010000','74727565'],'.otf':['4f54544f'],'.woff':['774f4646'],'.woff2':['774f4632']};if(bytes.length<12||!signatures[extension]?.includes(magic))throw Error('不支持或无效的字体文件');const hash=createHash('sha256').update(bytes).digest('hex'),family='QingRead-'+hash;const fonts=this.list();const existing=fonts.find(f=>f.family===family);if(existing)return existing;const font={family,name:path.basename(file,extension),file:'imported/'+hash+extension};fs.mkdirSync(path.join(this.root,'fonts','imported'),{recursive:true});fs.writeFileSync(path.join(this.root,'fonts',font.file),bytes);this.save([...fonts,font]);return font;}
 remove(family:string){const fonts=this.list(),font=fonts.find(f=>f.family===family);if(!font)throw Error('只能删除已导入的字体');this.save(fonts.filter(f=>f.family!==family));fs.rmSync(path.join(this.root,'fonts',font.file),{force:true});return this.list();}
}
