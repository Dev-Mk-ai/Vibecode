const { contextBridge, ipcRenderer } = require('electron')

// Expose safe API to renderer (no direct Node access)
contextBridge.exposeInMainWorld('vibecode', {
  // File system
  readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write-file', { filePath, content }),
  saveDialog: (defaultName, content) => ipcRenderer.invoke('fs:save-dialog', { defaultName, content }),
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
  openFolderDialog: () => ipcRenderer.invoke('dialog:open-folder'),

  // Settings persistence
  getSetting: (key) => ipcRenderer.invoke('store:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('store:set', { key, value }),

  // Menu events from main process → renderer
  onMenuEvent: (callback) => {
    const events = [
      'menu:new-file', 'menu:save', 'menu:save-as', 'menu:find',
      'menu:toggle-tree', 'menu:toggle-chat', 'menu:config', 'menu:new-chat',
      'menu:explain', 'menu:refactor', 'menu:bugs',
    ]
    events.forEach(event => {
      ipcRenderer.on(event, () => callback(event))
    })
  },

  // File opened/folder opened events
  onFileOpened: (callback) => ipcRenderer.on('file:opened', (_, data) => callback(data)),
  onFolderOpened: (callback) => ipcRenderer.on('folder:opened', (_, data) => callback(data)),

  // Platform info
  platform: process.platform,
  isDev: process.argv.includes('--dev'),
})
