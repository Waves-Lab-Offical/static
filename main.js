const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

const IconExtension = {
    'darwin': '.icns',
    'win32': '.ico',
    'linux': '.png'
};

let OSNativeIconPath;

const defaultOS = 'linux';

const currentOS = IconExtension[os.platform()] ? os.platform() : defaultOS;

OSNativeIconPath = path.join(
    __dirname,
    'icons',
    currentOS || defaultOS,
    `icon${IconExtension[currentOS] || IconExtension[defaultOS]}`
);

class Game {
    constructor() {
        this.window = null;
        this.isDev = !app.isPackaged;
    }

    createWindow() {
        this.window = new BrowserWindow({
            width: 1000,
            height: 600,
            autoHideMenuBar: true,
            icon: OSNativeIconPath,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                devTools: this.isDev,
                enableRemoteModule: false,
                sandbox: true,
            }
        });

        if (this.isDev) {
            this.window.loadURL('http://localhost:5173');
        } else {
            this.window.loadFile(path.join(__dirname, 'static', 'index.html'));
        }

        this.window.on('closed', () => {
            this.window = null;
        });
    }
}

function MainGame() {
    const game = new Game();

    app.whenReady().then(() => {
        game.createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                game.createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    ipcMain.handle('platform', () => {
        return os.platform()
    })

    ipcMain.handle('exit', () => {
        return process.exit(0)
    })
}

MainGame();
