import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      downloadAsset: (url: string, filename: string) => Promise<string>,
      getDeviceId: () => Promise<string>,
      quitAndInstall: () => Promise<void>,
      checkForUpdates: () => Promise<void>,
      onUpdaterMessage: (callback: (data: any) => void) => () => void
    }
  }
}
