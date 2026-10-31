"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_worker_threads_1 = require("node:worker_threads");
let DOMParser;
const jszip_1 = __importDefault(require("jszip"));
function htmlBlocks(html, image) {
    const doc = new DOMParser().parseFromString('<html><body>' + html + '</body></html>', 'text/html');
    doc.querySelectorAll('script,style,head,iframe,object,embed,form').forEach((n) => n.remove());
    const blocks = [];
    let text = '', kind = 'p', anchor = null;
    const flush = () => { const value = text.trim(); if (value || anchor)
        blocks.push({ kind, text: value, anchor }); text = ''; anchor = null; };
    const walk = (node) => { if (node.nodeType === 3) {
        text += node.textContent;
        return;
    } const tag = (node.localName || '').toLowerCase(); const block = ['p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'li', 'tr'].includes(tag); if (block) {
        flush();
        kind = /^h[1-4]$/.test(tag) ? 'h2' : 'p';
    } if (node.getAttribute?.('id')) {
        flush();
        anchor = node.getAttribute('id');
    } if (tag === 'br')
        flush();
    else if (tag === 'img') {
        flush();
        const src = image(node.getAttribute('src') || '');
        if (src)
            blocks.push({ kind: 'img', text: node.getAttribute('alt') || '插图', image: src });
    }
    else
        for (const child of node.childNodes || [])
            walk(child); if (block)
        flush(); };
    walk(doc.body);
    flush();
    return blocks;
}
function chapter(key, html, image) { const blocks = htmlBlocks(html, image); return { key, title: blocks.find(b => b.kind === 'h2')?.text || blocks.find(b => b.text)?.text.slice(0, 60) || '正文', text: blocks.map(b => b.text).join('\n'), blocks }; }
function relativeAsset(stage, src) { const full = node_path_1.default.resolve(src); const relative = node_path_1.default.relative(stage, full); return relative && !relative.startsWith('..') && !node_path_1.default.isAbsolute(relative) && node_fs_1.default.existsSync(full) ? relative.replaceAll('\\', '/') : null; }
async function parse(source, stage) {
    DOMParser = (await import('linkedom')).DOMParser;
    const bytes = await node_fs_1.default.promises.readFile(source), format = node_path_1.default.extname(source).toLowerCase();
    if (!bytes.length || bytes.length > 100 * 1024 * 1024)
        throw Error('文件为空或超过 100 MiB。');
    if (format === '.txt') {
        let text;
        if (bytes[0] === 255 && bytes[1] === 254)
            text = new TextDecoder('utf-16le').decode(bytes);
        else if (bytes[0] === 254 && bytes[1] === 255)
            text = new TextDecoder('utf-16be').decode(bytes);
        else {
            try {
                text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            }
            catch {
                text = new TextDecoder('gb18030', { fatal: true }).decode(bytes);
            }
        }
        text = text.replace(/\r\n?/g, '\n');
        if (!text.trim() || text.includes('\0'))
            throw Error('文件不是有效文本。');
        const matches = [...text.matchAll(/^(?:第[^\n]{1,20}[章节回卷][^\n]{0,40}|Chapter\s+[^\n]{1,40})$/gmi)];
        const starts = [...new Set([0, ...matches.map(m => m.index)])];
        const chapters = starts.map((start, i) => { const body = text.slice(start, starts[i + 1] ?? text.length); return { key: 'text:' + start, title: body.split('\n')[0].trim().slice(0, 60) || '正文', text: body }; });
        return { title: node_path_1.default.basename(source, '.txt'), author: '作者未知', chapters, imageCount: 0, navigationCount: matches.length, toc: chapters.map(c => ({ title: c.title, chapterKey: c.key, offset: 0, depth: 0 })), cover: null };
    }
    if (format === '.mobi' || format === '.azw3') {
        if (bytes.subarray(60, 68).toString() !== 'BOOKMOBI')
            throw Error('不是有效的 MOBI/AZW3 文件。');
        const { initMobiFile, initKf8File } = await import('@lingo-reader/mobi-parser');
        // KF8 headers are used by AZW3 and modern MOBI containers.
        const firstRecord = bytes.readUInt32BE(78);
        const version = bytes.length > firstRecord + 40 ? bytes.readUInt32BE(firstRecord + 36) : 0;
        let hybrid = false;
        const exth = firstRecord + 16 + bytes.readUInt32BE(firstRecord + 20);
        if (exth + 12 <= bytes.length && bytes.subarray(exth, exth + 4).toString() === 'EXTH') {
            const end = Math.min(bytes.length, exth + bytes.readUInt32BE(exth + 4));
            let record = exth + 12;
            const count = bytes.readUInt32BE(exth + 8);
            for (let i = 0; i < count && record + 8 <= end; i++) {
                const type = bytes.readUInt32BE(record), length = bytes.readUInt32BE(record + 4);
                if (length < 8 || record + length > end)
                    break;
                if (type === 121 && length >= 12 && bytes.readUInt32BE(record + 8) !== 0xffffffff)
                    hybrid = true;
                record += length;
            }
        }
        const parser = await (format === '.azw3' || version === 8 || hybrid ? initKf8File : initMobiFile)(source, node_path_1.default.join(stage, 'images'));
        if (format === '.azw3' || version === 8 || hybrid) {
            // The pinned KF8 parser grows rawHead by copying it for every 4 KiB record.
            // Joining once avoids quadratic copies for complete works and large books.
            const records = [];
            const count = parser.mobiFile.palmdocHeader.numTextRecords;
            for (let i = 0; i < count; i++)
                records.push(parser.mobiFile.loadTextBuffer(i));
            parser.rawHead = new Uint8Array(Buffer.concat(records));
            parser.lastLoadedHead = count - 1;
        }
        const chapters = [];
        for (const item of parser.getSpine()) {
            const content = await parser.loadChapter(item.id);
            if (content?.html) {
                const c = chapter(item.id, content.html, src => relativeAsset(stage, src));
                if (c.blocks.length)
                    chapters.push(c);
            }
        }
        const toc = [];
        const visit = (nodes, depth) => { for (const n of nodes) {
            const resolved = parser.resolveHref(n.href);
            const c = chapters.find(c => c.key === resolved?.id);
            if (c) {
                const anchor = resolved.selector?.match(/\[id=["']?(.*?)["']?\]/)?.[1];
                let offset = 0;
                for (const b of c.blocks) {
                    if (b.anchor === anchor)
                        break;
                    offset += b.text.length + 1;
                }
                toc.push({ title: n.label, chapterKey: c.key, offset: anchor ? offset : 0, depth });
            }
            visit(n.children || [], depth + 1);
        } };
        visit(parser.getToc() || [], 0);
        if (!chapters.length)
            throw Error('没有可读取的正文。');
        const metadata = parser.getMetadata();
        return { parserVersion: 2, title: metadata.title, author: metadata.author?.join('、') || '作者未知', chapters, toc: toc.length ? toc : chapters.map(c => ({ title: c.title, chapterKey: c.key, offset: 0, depth: 0 })), imageCount: node_fs_1.default.readdirSync(node_path_1.default.join(stage, 'images')).length, navigationCount: toc.length, cover: parser.getCoverImage() ? relativeAsset(stage, parser.getCoverImage()) : null };
    }
    if (format !== '.epub')
        throw Error('仅支持 TXT、EPUB、MOBI、AZW3。');
    const zip = await jszip_1.default.loadAsync(bytes);
    const files = Object.values(zip.files);
    if (files.length > 10000)
        throw Error('压缩包条目过多。');
    let total = 0;
    for (const f of files) {
        const name = f.unsafeOriginalName || f.name;
        if (name.startsWith('/') || name.split(/[\\/]/).includes('..') || name.includes(':'))
            throw Error('压缩包包含不安全路径。');
        total += f._data?.uncompressedSize || 0;
    }
    if (total > 256 * 1024 * 1024)
        throw Error('解压后容量超限。');
    if (zip.file('META-INF/encryption.xml'))
        throw Error('暂不支持包含加密资源的 EPUB。');
    const xml = async (name) => { const file = zip.file(name); if (!file)
        throw Error('EPUB 缺少 ' + name); return new DOMParser().parseFromString(await file.async('string'), 'text/xml'); };
    const container = await xml('META-INF/container.xml');
    const opfPath = container.querySelector('rootfile')?.getAttribute('full-path');
    if (!opfPath)
        throw Error('EPUB 缺少正文索引。');
    const opf = await xml(opfPath);
    const resolve = (base, href) => decodeURIComponent(node_path_1.default.posix.normalize(node_path_1.default.posix.join(node_path_1.default.posix.dirname(base), href.split('#')[0])));
    const manifest = new Map();
    opf.querySelectorAll('manifest item').forEach((n) => manifest.set(n.getAttribute('id'), { href: resolve(opfPath, n.getAttribute('href')), type: n.getAttribute('media-type'), properties: n.getAttribute('properties') || '' }));
    const images = new Map();
    node_fs_1.default.mkdirSync(node_path_1.default.join(stage, 'images'), { recursive: true });
    for (const item of manifest.values()) {
        if (/^image\/(jpeg|png|gif|webp|bmp)$/.test(item.type || '')) {
            const file = zip.file(item.href);
            if (file) {
                const relative = 'images/' + images.size + node_path_1.default.posix.extname(item.href);
                await node_fs_1.default.promises.writeFile(node_path_1.default.join(stage, relative), await file.async('nodebuffer'));
                images.set(item.href, relative);
            }
        }
    }
    const chapters = [];
    const hrefs = new Map();
    for (const ref of opf.querySelectorAll('spine itemref')) {
        const item = manifest.get(ref.getAttribute('idref'));
        if (!item || ref.getAttribute('linear') === 'no')
            continue;
        const file = zip.file(item.href);
        if (!file)
            continue;
        const c = chapter(ref.getAttribute('idref'), await file.async('string'), src => images.get(resolve(item.href, src)) || null);
        if (c.blocks.length) {
            chapters.push(c);
            hrefs.set(item.href, c);
        }
    }
    const toc = [];
    const add = (title, href, base, depth) => { const c = hrefs.get(resolve(base, href)); if (!c)
        return; const anchor = decodeURIComponent(href.split('#')[1] || ''); let offset = 0; if (anchor) {
        for (const b of c.blocks) {
            if (b.anchor === anchor)
                break;
            offset += b.text.length + 1;
        }
    } toc.push({ title, chapterKey: c.key, offset, depth }); };
    const nav = [...manifest.values()].find(i => i.properties.split(' ').includes('nav'));
    if (nav) {
        const doc = await xml(nav.href);
        const section = [...doc.querySelectorAll('nav')].find(n => n.getAttribute('epub:type') === 'toc') || doc.querySelector('nav');
        for (const a of section?.querySelectorAll('a') || []) {
            let depth = 0;
            for (let n = a.parentElement; n && n !== section; n = n.parentElement)
                if (n.localName === 'ol')
                    depth++;
            add(a.textContent || '', a.getAttribute('href') || '', nav.href, Math.max(0, depth - 1));
        }
    }
    else {
        const ncx = [...manifest.values()].find(i => i.type === 'application/x-dtbncx+xml');
        if (ncx) {
            const doc = await xml(ncx.href);
            for (const n of doc.querySelectorAll('navPoint')) {
                const content = n.querySelector('content');
                let depth = 0;
                for (let p = n.parentElement; p?.localName === 'navPoint'; p = p.parentElement)
                    depth++;
                add(n.querySelector('text')?.textContent || '', content?.getAttribute('src') || '', ncx.href, depth);
            }
        }
    }
    if (!chapters.length)
        throw Error('没有可读取的正文。');
    const elementText = (name) => [...opf.querySelectorAll('*')].find(n => n.localName === name || n.localName === 'dc:' + name)?.textContent;
    const coverId = opf.querySelector('meta[name="cover"]')?.getAttribute('content');
    const coverItem = manifest.get(coverId || '') || [...manifest.values()].find(i => i.properties.includes('cover-image'));
    return { title: elementText('title') || node_path_1.default.basename(source, '.epub'), author: elementText('creator') || '作者未知', chapters, imageCount: images.size, navigationCount: toc.length, toc: toc.length ? toc : chapters.map(c => ({ title: c.title, chapterKey: c.key, offset: 0, depth: 0 })), cover: images.get(coverItem?.href) || null };
}
if (node_worker_threads_1.parentPort)
    parse(node_worker_threads_1.workerData.source, node_worker_threads_1.workerData.stage).then(book => node_worker_threads_1.parentPort.postMessage({ book })).catch(error => node_worker_threads_1.parentPort.postMessage({ error: error.message }));
