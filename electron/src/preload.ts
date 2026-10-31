import { contextBridge, ipcRenderer, webUtils } from 'electron';
contextBridge.exposeInMainWorld('desktop',{
 call:(method:string,data:unknown={})=>ipcRenderer.invoke('reader',method,data),
 importFiles:(files:File[])=>ipcRenderer.invoke('reader','import-paths',{paths:files.map(file=>webUtils.getPathForFile(file))}),
 on:(callback:(event:string)=>void)=>ipcRenderer.on('window-event',(_event,name)=>callback(name))
});
