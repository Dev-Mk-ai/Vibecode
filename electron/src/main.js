const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

const store = new Store()
const isDev = process.argv.includes('--dev')

let mainWindow

// ── CREATE WINDOW ──────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0c0c0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'))

  if (isDev) mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  createWindow()
  buildMenu()
  app.on('activate', () => { if (!mainWindow) createWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── MENU ───────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu:new-file') },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => openFileDialog() },
        { label: 'Open Folder...', accelerator: 'CmdOrCtrl+Shift+O', click: () => openFolderDialog() },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu:save-as') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu:find') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle File Tree', accelerator: 'CmdOrCtrl+B', click: () => mainWindow.webContents.send('menu:toggle-tree') },
        { label: 'Toggle AI Chat', accelerator: 'CmdOrCtrl+J', click: () => mainWindow.webContents.send('menu:toggle-chat') },
        { type: 'separator' },
        { role: 'reload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'AI',
      submenu: [
        { label: 'Configure Model...', accelerator: 'CmdOrCtrl+,', click: () => mainWindow.webContents.send('menu:config') },
        { label: 'New Chat', accelerator: 'CmdOrCtrl+Shift+L', click: () => mainWindow.webContents.send('menu:new-chat') },
        { type: 'separator' },
        { label: 'Explain Selection', accelerator: 'CmdOrCtrl+Shift+E', click: () => mainWindow.webContents.send('menu:explain') },
        { label: 'Refactor Selection', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow.webContents.send('menu:refactor') },
        { label: 'Find Bugs', accelerator: 'CmdOrCtrl+Shift+B', click: () => mainWindow.webContents.send('menu:bugs') },
      ],
    },
    { role: 'help', submenu: [{ label: 'About VibeCode', click: () => shell.openExternal('https://github.com/yourname/vibecode') }] },
  ]

  if (process.platform === 'darwin') {
    template.unshift({ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ── FILE SYSTEM IPC ────────────────────────────────────────────────────────
async function openFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Code Files', extensions: ['py','js','ts','json','md','txt','html','css','yaml','toml'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    const content = fs.readFileSync(filePath, 'utf-8')
    mainWindow.webContents.send('file:opened', { filePath, content })
  }
}

async function openFolderDialog() {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0]
    const tree = buildFileTree(folderPath)
    mainWindow.webContents.send('folder:opened', { folderPath, tree })
  }
}

function buildFileTree(dirPath, depth = 0) {
  if (depth > 4) return []
  const ignored = ['node_modules', '.git', '__pycache__', '.DS_Store', 'dist', '.venv', 'venv']
  try {
    return fs.readdirSync(dirPath)
      .filter(name => !ignored.includes(name) && !name.startsWith('.'))
      .map(name => {
        const fullPath = path.join(dirPath, name)
        const isDir = fs.statSync(fullPath).isDirectory()
        return {
          name,
          path: fullPath,
          isDir,
          children: isDir ? buildFileTree(fullPath, depth + 1) : [],
        }
      })
      .sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name))
  } catch { return [] }
}

// IPC handlers
ipcMain.handle('fs:read-file', (_, filePath) => {
  return fs.readFileSync(filePath, 'utf-8')
})

ipcMain.handle('fs:write-file', (_, { filePath, content }) => {
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
})

ipcMain.handle('fs:save-dialog', async (_, { defaultName, content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'All Files', extensions: ['*'] }],
  })
  if (!result.canceled) {
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return result.filePath
  }
  return null
})

ipcMain.handle('dialog:open-file', openFileDialog)
ipcMain.handle('dialog:open-folder', openFolderDialog)

// Settings persistence
ipcMain.handle('store:get', (_, key) => store.get(key))
ipcMain.handle('store:set', (_, { key, value }) => { store.set(key, value); return true })
