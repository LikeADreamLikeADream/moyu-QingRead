"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const node_child_process_1 = require("node:child_process");
const node_readline_1 = __importDefault(require("node:readline"));
electron_1.protocol.registerSchemesAsPrivileged([{ scheme: 'qingread', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const root = process.env.QINGREAD_READER_DATA || node_path_1.default.join(process.env.LOCALAPPDATA, 'QingRead.Reader');
const serviceRoot = electron_1.app.isPackaged ? node_path_1.default.join(process.resourcesPath, 'service') : node_path_1.default.resolve(__dirname, '../../artifacts/electron-service');
const uiRoot = node_path_1.default.resolve(__dirname, '../ui');
let win, tray, exiting = false;
let settings = { width: 820, height: 600, opacity: 1, transparent: false, topmost: false, bossKey: 'Alt+Z', autoHide: true, hideOnLeave: false, captureProtection: false };
node_fs_1.default.mkdirSync(root, { recursive: true });
const config = node_path_1.default.join(root, 'electron-window.json');
try {
    settings = { ...settings, ...JSON.parse(node_fs_1.default.readFileSync(config, 'utf8')) };
}
catch {
    try {
        const old = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(root, 'window.json'), 'utf8'));
        settings = { ...settings, width: old.Width || 820, height: old.Height || 600, opacity: old.Opacity ?? 1, transparent: old.Transparent ?? false, topmost: old.AlwaysOnTop ?? false, bossKey: old.BossKey || 'Alt+Z', autoHide: old.AutoHideToolbar ?? true, hideOnLeave: old.HideOnLeave ?? false, captureProtection: old.CaptureProtection ?? false };
    }
    catch { }
}
const backend = (0, node_child_process_1.spawn)(node_path_1.default.join(serviceRoot, 'QingRead.Service.exe'), [root], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, QINGREAD_CONVERTER: electron_1.app.isPackaged ? node_path_1.default.join(serviceRoot, 'tools/calibre/ebook-convert.exe') : node_path_1.default.resolve(__dirname, '../../artifacts/QingRead-MemberFeatures-win-x64/tools/calibre/ebook-convert.exe') } });
let sequence = 0;
const pending = new Map();
node_readline_1.default.createInterface({ input: backend.stdout }).on('line', line => { try {
    const message = JSON.parse(line);
    const task = pending.get(message.requestId);
    pending.delete(message.requestId);
    message.error ? task?.reject(new Error(message.error)) : task?.resolve(message.result);
}
catch { } });
let backendError;
function fail(error) { backendError = error; for (const task of pending.values())
    task.reject(error); pending.clear(); }
backend.on('error', fail);
backend.on('exit', () => fail(new Error('本地阅读服务已退出，请重新启动软件')));
backend.stderr.on('data', () => { });
function rpc(method, data = {}) { return new Promise((resolve, reject) => { if (backendError)
    return reject(backendError); const requestId = ++sequence; pending.set(requestId, { resolve, reject }); backend.stdin.write(JSON.stringify({ requestId, method, data }) + '\n', error => { if (error) {
    pending.delete(requestId);
    reject(error);
} }); }); }
function save() { const bounds = win.getNormalBounds(); settings.width = bounds.width; settings.height = bounds.height; node_fs_1.default.writeFileSync(config + '.tmp', JSON.stringify(settings)); node_fs_1.default.renameSync(config + '.tmp', config); }
function recover() { win.show(); win.restore(); win.setOpacity(1); win.focus(); win.webContents.send('window-event', 'recover'); }
function bindHotkey(key) { return electron_1.globalShortcut.register(key, () => win.isVisible() ? win.hide() : recover()); }
if (!electron_1.app.requestSingleInstanceLock()) {
    backend.kill();
    electron_1.app.quit();
}
else
    electron_1.app.whenReady().then(async () => {
        electron_1.protocol.handle('qingread', async (request) => {
            const url = new URL(request.url);
            let base;
            if (url.host === 'app')
                base = uiRoot;
            else if (url.host === 'book')
                base = node_path_1.default.join(root, 'books');
            else if (url.host === 'fonts')
                base = node_path_1.default.join(root, 'fonts');
            else
                return new Response('', { status: 404 });
            const target = node_path_1.default.resolve(base, '.' + decodeURIComponent(url.pathname));
            if (!target.startsWith(base + node_path_1.default.sep) || !['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.ttf', '.ico'].includes(node_path_1.default.extname(target).toLowerCase()))
                return new Response('', { status: 403 });
            try {
                return await electron_1.net.fetch((0, node_url_1.pathToFileURL)(target).href);
            }
            catch {
                return new Response('', { status: 404 });
            }
        });
        win = new electron_1.BrowserWindow({ width: settings.width, height: settings.height, minWidth: 360, minHeight: 118, frame: false, transparent: true, backgroundColor: '#00000000', webPreferences: { preload: node_path_1.default.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
        win.setOpacity(Math.max(.01, Math.min(1, settings.opacity)));
        win.setAlwaysOnTop(settings.topmost);
        win.setContentProtection(settings.captureProtection);
        win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        win.webContents.on('will-navigate', event => event.preventDefault());
        win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
        win.webContents.session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith('qingread://') }));
        electron_1.ipcMain.handle('reader', async (event, method, data = {}) => {
            if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame)
                throw new Error('Invalid sender');
            if (method === 'init')
                return { settings, books: await rpc('list') };
            if (method === 'finish-close') {
                save();
                exiting = true;
                win.close();
                return true;
            }
            if (method === 'import') {
                const selection = await electron_1.dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'], filters: [{ name: '小说', extensions: ['txt', 'epub', 'mobi', 'azw3'] }] });
                const results = [];
                for (const file of selection.filePaths.slice(0, 50)) {
                    try {
                        results.push({ book: await rpc('import', { path: file }) });
                    }
                    catch (error) {
                        results.push({ error: String(error) });
                    }
                }
                return results;
            }
            if (method === 'window') {
                switch (data.action) {
                    case 'close':
                        win.close();
                        break;
                    case 'minimize':
                        win.minimize();
                        break;
                    case 'maximize':
                        win.isMaximized() ? win.unmaximize() : win.maximize();
                        break;
                    case 'hide':
                        win.hide();
                        break;
                    case 'size':
                        win.setSize(Math.max(360, Math.min(2000, Number(data.width) || 820)), Math.max(118, Math.min(1400, Number(data.height) || 600)));
                        break;
                }
                return true;
            }
            if (method === 'settings') {
                if (data.bossKey && data.bossKey !== settings.bossKey) {
                    if (!bindHotkey(data.bossKey))
                        throw new Error('老板键已被占用');
                    electron_1.globalShortcut.unregister(settings.bossKey);
                }
                settings = { ...settings, ...data };
                settings.opacity = Math.max(.01, Math.min(1, Number(settings.opacity) || 1));
                win.setOpacity(settings.opacity);
                win.setAlwaysOnTop(Boolean(settings.topmost));
                win.setContentProtection(Boolean(settings.captureProtection));
                save();
                return settings;
            }
            if (!['list', 'open', 'preferences', 'position', 'search', 'bookmarks', 'addBookmark', 'removeBookmark', 'category'].includes(method))
                throw new Error('Unsupported operation');
            return rpc(method, data);
        });
        const icon = electron_1.nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=');
        tray = new electron_1.Tray(icon);
        tray.setToolTip('轻阅 Electron');
        tray.setContextMenu(electron_1.Menu.buildFromTemplate([{ label: '显示并找回', click: recover }, { label: '退出', click: () => win.close() }]));
        tray.on('double-click', recover);
        bindHotkey(settings.bossKey);
        win.on('close', event => { if (!exiting) {
            event.preventDefault();
            win.webContents.send('window-event', 'closing');
        } });
        win.on('closed', () => electron_1.app.quit());
        win.on('minimize', () => win.webContents.send('window-event', 'minimized'));
        win.on('hide', () => win.webContents.send('window-event', 'hidden'));
        await win.loadURL('qingread://app/index.html');
    });
electron_1.app.on('second-instance', () => win && recover());
electron_1.app.on('before-quit', () => { exiting = true; electron_1.globalShortcut.unregisterAll(); backend.stdin.end(); tray?.destroy(); });
