import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  downloadAsset: (url: string, filename: string) => ipcRenderer.invoke('download-asset', url, filename),
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdaterMessage: (callback: (data: any) => void) => {
    ipcRenderer.on('updater-message', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('updater-message')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
