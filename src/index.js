import fs from "node:fs/promises";
import path from "node:path";

import Electron from "electron";

/**
 * @type {Electron.BrowserWindow}
 */
let globalWindow;
/**
 * @type {Electron.BrowserWindow}
 */
let overlayWindow;
let shuttingDown = false;

const createWindow = () => {
    const win = new Electron.BrowserWindow({
        icon: path.join(__dirname, '../../assets/app/icon_app.png'),
        width: 720,
        height: 640,
        sandbox: false,
        // show: !(env.getBool("ELECTRON_TRAY") && env.getBool("ELECTRON_TRAY_START")),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            webSecurity: false
        }
    });

    win.loadFile(path.join(__dirname, 'index.html'));
    return win;
};
const createOverlayWindow = () => {
    // Making the overlay window fullscreen breaks some apps that also want to be in fullscreen.
    // The taskbar will stay visible inside of games if we use real fullscreen.
    const display = Electron.screen.getPrimaryDisplay();
    const { x, y, width, height } = display.workArea;
    const win = new Electron.BrowserWindow({
        icon: path.join(__dirname, '../../assets/app/icon_overlay.png'),
        width,
        height,
        sandbox: false,
        transparent: true,
        resizable: false,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload-overlay.js'),
            nodeIntegration: true,
            webSecurity: false
        }
    });

    win.setIgnoreMouseEvents(true);
    win.setAlwaysOnTop(true, "screen-saver");
    win.setPosition(x, y, false);
    win.blur();

    win.loadFile(path.join(__dirname, 'overlay.html'));
    return win;
};
const createOverlayWindowSafe = () => {
    if (overlayWindow) return;

    const window = createOverlayWindow();
    window.on("close", () => {
        overlayWindow = null;
    });

    overlayWindow = window;
    return window;
};

const createHandlers = () => {
    // Electron.ipcMain.handle("request-self", async (_, options) => {
    //     const url = new URL(`http://localhost:${env.getNumber("PORT")}${options.postHref}`);
    //     if (url.hostname !== "localhost" && url.port !== env.get("PORT")) {
    //         throw new Error("Invalid URL");
    //     }

    //     const token = env.get("TOKEN");
    //     const headers = { ...options.headers };
    //     if (token) headers["Authorization"] = `Bearer ${token}`;

    //     const response = await fetch(url, {
    //         ...options,
    //         headers,
    //         redirect: "error",
    //     });
    //     const text = await response.text();
    //     return {
    //         ok: response.ok,
    //         headers: response.headers,
    //         status: response.status,
    //         statusText: response.statusText,
    //         text: text,
    //     };
    // });

    Electron.ipcMain.handle("create-overlay-window", () => {
        createOverlayWindowSafe();
    });
    Electron.ipcMain.handle("kill-overlay-window", () => {
        if (!overlayWindow) return;
        overlayWindow.close();
    });
    Electron.ipcMain.handle("get-overlay-window-selectable", () => {
        if (!overlayWindow) return false;
        return overlayWindow.isAlwaysOnTop();
    });
    Electron.ipcMain.handle("update-overlay-window-selectable", (_, selectable) => {
        if (!overlayWindow) return;

        const win = overlayWindow;
        if (selectable) {
            win.setIgnoreMouseEvents(false);
            win.setAlwaysOnTop(false);
            win.focus();
        } else {
            win.setIgnoreMouseEvents(true);
            win.setAlwaysOnTop(true, "screen-saver");
            win.blur();
        }
    });

    Electron.ipcMain.handle("delete-file-temp", (_, { path: filePath }) => {
        const tempPath = path.join(__dirname, "../../temp") + path.sep;
        if (!filePath.startsWith(tempPath)) return;

        if (!fs.existsSync(filePath)) return;
        fs.rmSync(filePath);
    });
};
const createSystemTray = () => {
    const iconPath = path.join(__dirname, '../../assets/app/icon_app.png');
    const icon = Electron.nativeImage.createFromPath(iconPath);
    const tray = new Electron.Tray(icon);

    tray.setToolTip('GSEDesktop - Green Screen Effects for Desktop');
    tray.setTitle('GSEDesktop');

    const contextMenu = Electron.Menu.buildFromTemplate([
        {
            label: 'Show Window', type: 'normal', click: () => {
                globalWindow.show();
            }
        },
        {
            label: 'Close', type: 'normal', click: () => {
                shuttingDown = true;
                Electron.app.quit();
            }
        },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on("click", () => {
        globalWindow.show();
    });

    Electron.app.on('before-quit', () => {
        tray.destroy();
    });
};
const initialize = async () => {
    await Electron.app.whenReady();
    Electron.app.setAppUserModelId('com.jeremygamer13.gsedesktop');

    const window = createWindow();
    // if (AppGlobal.isGoingToReloadALot) {
    //     window.blur();
    // }
    globalWindow = window;

    createHandlers();
    Electron.app.on('window-all-closed', () => {
        // if (!env.getBool("ELECTRON_TRAY")) {
            shuttingDown = true;
            if (process.platform !== 'darwin') Electron.app.quit();
            return;
        // }
    });

    // if (env.getBool("ELECTRON_TRAY")) {
    //     createSystemTray(window);
    //     window.on("close", (event) => {
    //         if (shuttingDown) return;
    //         event.preventDefault();
    //         window.hide();
    //     });
    // }

    // if (env.getBool("ELECTRON_NOTIFICATION") && !AppGlobal.isGoingToReloadALot) {
    //     const iconPath = path.join(__dirname, '../../assets/app/icon_app.png');
    //     const icon = Electron.nativeImage.createFromPath(iconPath);

    //     const notification = new Electron.Notification({
    //         title: "GSEDesktop",
    //         body: env.getBool("ELECTRON_TRAY") ?
    //             "GSEDesktop is active. Close in system tray to exit." :
    //             "GSEDesktop is active. Close window to exit.",
    //         icon,
    //     });

    //     notification.show();
    // }

    // if (env.getBool("ELECTRON_OVERLAY_WINDOW")) {
    //     createOverlayWindowSafe();
    // }

    return window;
};

await initialize();