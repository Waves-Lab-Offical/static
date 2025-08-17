const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    platform: () => ipcRenderer.invoke('platform'),
    exit: () => ipcRenderer.invoke('exit'),
    isdev: () => ipcRenderer.invoke('isdev')
});