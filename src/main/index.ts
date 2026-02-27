import { app, shell, BrowserWindow, ipcMain, net } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { machineIdSync } from 'node-machine-id'
import { autoUpdater } from 'electron-updater'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: 'G.Lab Assets',
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let isManualUpdateCheck = false

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Device ID IPC
  ipcMain.handle('get-device-id', () => {
    try {
      return machineIdSync();
    } catch (e) {
      console.error('Failed to get machine ID', e);
      return 'UNKNOWN_DEVICE_ID';
    }
  })

  // Download Asset IPC
  ipcMain.handle('download-asset', async (event, url: string, filename: string) => {
    return new Promise((resolve, reject) => {
      try {
        // Đường dẫn chuẩn của Mac OS cho DaVinci Resolve
        const basePath = join(os.homedir(), 'Library', 'Application Support', 'Blackmagic Design', 'DaVinci Resolve', 'Support', 'Fusion', 'Templates')

        // Tạo thư mục nếu máy chưa có
        if (!fs.existsSync(basePath)) {
          fs.mkdirSync(basePath, { recursive: true })
        }

        const filePath = join(basePath, filename)
        const file = fs.createWriteStream(filePath)

        // Sử dụng module `net` của Chromium thay vì `https` để giải quyết vụ Chứng chỉ SSL khắt khe của node.js
        const request = net.request(url)

        request.on('response', (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: Status code ${response.statusCode}`))
            return
          }

          const rawLength = response.headers['content-length']
          const totalSize = parseInt(Array.isArray(rawLength) ? rawLength[0] : rawLength || '0', 10)
          let downloadedSize = 0

          response.on('data', (chunk) => {
            downloadedSize += chunk.length
            file.write(chunk)

            const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0
            if (!event.sender.isDestroyed()) {
              event.sender.send('download-progress', { filename, progress })
            }
          })

          response.on('end', () => {
            file.end()
            resolve(filePath)
          })
        })

        request.on('error', (err) => {
          fs.unlink(filePath, () => { })
          reject(err)
        })

        request.end()

      } catch (err: any) {
        reject(err)
      }
    })
  })

  createWindow()

  // Bắt đầu kiểm tra Update sau khi tạo Window (Tự động)
  if (!is.dev) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  // --- AUTO UPDATER EVENTS ---
  autoUpdater.on('checking-for-update', () => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('updater-message', { type: 'checking-for-update', isManual: isManualUpdateCheck })
    })
  })

  autoUpdater.on('update-available', (info) => {
    // Thông báo cho renderer biết có phiên bản mới
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('updater-message', { type: 'update-available', info, isManual: isManualUpdateCheck })
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('updater-message', { type: 'update-not-available', info, isManual: isManualUpdateCheck })
    })
    // Reset cờ sau khi check xong để các lần check sau tính lại
    isManualUpdateCheck = false
  })

  autoUpdater.on('download-progress', (progressObj) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('updater-message', { type: 'download-progress', progress: progressObj.percent, isManual: isManualUpdateCheck })
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('updater-message', { type: 'update-downloaded', info, isManual: isManualUpdateCheck })
    })
    isManualUpdateCheck = false
  })

  autoUpdater.on('error', (err) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('updater-message', { type: 'error', error: err.message, isManual: isManualUpdateCheck })
    })
    isManualUpdateCheck = false
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.handle('check-for-updates', () => {
  // Khi người dùng chủ động ấn nút Check
  isManualUpdateCheck = true
  autoUpdater.checkForUpdatesAndNotify()
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})
