"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('desktop', {
    call: (method, data = {}) => electron_1.ipcRenderer.invoke('reader', method, data),
    on: (callback) => electron_1.ipcRenderer.on('window-event', (_event, name) => callback(name))
});
