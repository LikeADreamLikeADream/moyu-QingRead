"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FontStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
class FontStore {
    root;
    constructor(root) {
        this.root = root;
    }
    get manifest() { return node_path_1.default.join(this.root, 'fonts', 'imported.json'); }
    list() { if (!node_fs_1.default.existsSync(this.manifest))
        return []; const entries = JSON.parse(node_fs_1.default.readFileSync(this.manifest, 'utf8')); if (!Array.isArray(entries))
        throw Error('字体列表无效'); return entries.filter((f) => /^QingRead-[a-f0-9]{64}$/.test(f.family) && /^imported\/[a-f0-9]{64}\.(ttf|otf|woff|woff2)$/.test(f.file) && typeof f.name === 'string' && node_fs_1.default.existsSync(node_path_1.default.join(this.root, 'fonts', f.file))); }
    save(fonts) { node_fs_1.default.mkdirSync(node_path_1.default.dirname(this.manifest), { recursive: true }); node_fs_1.default.writeFileSync(this.manifest + '.tmp', JSON.stringify(fonts)); node_fs_1.default.renameSync(this.manifest + '.tmp', this.manifest); }
    import(file) { const bytes = node_fs_1.default.readFileSync(file); if (!bytes.length || bytes.length > 40 * 1024 * 1024)
        throw Error('字体文件为空或超过 40 MiB'); const extension = node_path_1.default.extname(file).toLowerCase(), magic = bytes.subarray(0, 4).toString('hex'); const signatures = { '.ttf': ['00010000', '74727565'], '.otf': ['4f54544f'], '.woff': ['774f4646'], '.woff2': ['774f4632'] }; if (bytes.length < 12 || !signatures[extension]?.includes(magic))
        throw Error('不支持或无效的字体文件'); const hash = (0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex'), family = 'QingRead-' + hash; const fonts = this.list(); const existing = fonts.find(f => f.family === family); if (existing)
        return existing; const font = { family, name: node_path_1.default.basename(file, extension), file: 'imported/' + hash + extension }; node_fs_1.default.mkdirSync(node_path_1.default.join(this.root, 'fonts', 'imported'), { recursive: true }); node_fs_1.default.writeFileSync(node_path_1.default.join(this.root, 'fonts', font.file), bytes); this.save([...fonts, font]); return font; }
    remove(family) { const fonts = this.list(), font = fonts.find(f => f.family === family); if (!font)
        throw Error('只能删除已导入的字体'); this.save(fonts.filter(f => f.family !== family)); node_fs_1.default.rmSync(node_path_1.default.join(this.root, 'fonts', font.file), { force: true }); return this.list(); }
}
exports.FontStore = FontStore;
