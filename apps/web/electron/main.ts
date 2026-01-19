import { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development" ||
  (process.env.NODE_ENV !== "production" && !app.isPackaged);

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;
const SERVER_PORT = 3000;

function getStandalonePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone");
  } else {
    return path.join(__dirname, "../.next/standalone");
  }
}

function findNodePath(): string {
  const possiblePaths = [
    path.join(process.env.HOME || "", ".nvm/versions/node"),
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
    "/usr/bin/node",
    path.join(process.env.HOME || "", ".fnm/node-versions"),
  ];

  const nvmPath = path.join(process.env.HOME || "", ".nvm/versions/node");
  if (fs.existsSync(nvmPath)) {
    try {
      const versions = fs.readdirSync(nvmPath).filter(v => v.startsWith("v")).sort().reverse();
      if (versions.length > 0) {
        const nodePath = path.join(nvmPath, versions[0], "bin/node");
        if (fs.existsSync(nodePath)) {
          console.log("Found Node.js via NVM:", nodePath);
          return nodePath;
        }
      }
    } catch (e) {
      console.error("Error reading NVM directory:", e);
    }
  }

  for (const p of possiblePaths) {
    if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) {
      console.log("Found Node.js at:", p);
      return p;
    }
  }

  console.log("Using 'node' from PATH");
  return "node";
}

async function startNextServer(): Promise<void> {

  return new Promise((resolve, reject) => {
    const standalonePath = getStandalonePath();
    const serverPath = path.join(standalonePath, "server.js");

    console.log("Starting Next.js server from:", serverPath);

    if (!fs.existsSync(serverPath)) {
      console.error("Standalone server not found at:", serverPath);
      console.error("Standalone path:", standalonePath);
      console.error("Is packaged:", app.isPackaged);
      console.error("Resources path:", process.resourcesPath);
      reject(new Error("Standalone server not found. Run 'npm run build' with ELECTRON_BUILD=true"));
      return;
    }

    const env = {
      ...process.env,
      PORT: String(SERVER_PORT),
      HOSTNAME: "localhost",
      NODE_ENV: "production",
    };

    const nodePath = findNodePath();
    console.log("Using Node.js:", nodePath);

    nextServer = spawn(nodePath, [serverPath], {
      env,
      cwd: standalonePath,
      stdio: ["ignore", "pipe", "pipe"],
    });

    nextServer.stdout?.on("data", (data) => {
      const output = data.toString();
      console.log("[Next.js]", output);
      if (output.includes("Ready") || output.includes("started server") || output.includes(`localhost:${SERVER_PORT}`)) {
        resolve();
      }
    });

    nextServer.stderr?.on("data", (data) => {
      console.error("[Next.js Error]", data.toString());
    });

    nextServer.on("error", (error) => {
      console.error("Failed to start Next.js server:", error);
      reject(error);
    });

    nextServer.on("close", (code) => {
      console.log("Next.js server exited with code:", code);
      nextServer = null;
    });

    setTimeout(() => resolve(), 5000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0b0b0b" : "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: path.join(__dirname, "../public/icon-dark.png"),
  });

  mainWindow.once("ready-to-show", () => {
    console.log("Window ready to show");
    mainWindow?.show();
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Failed to load:", validatedURL, errorCode, errorDescription);
    mainWindow?.show();
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log("Forcing window to show after timeout");
      mainWindow.show();
    }
  }, 10000);

  const url = `http://localhost:${SERVER_PORT}/desktop`;
  console.log("Loading URL:", url);
  mainWindow.loadURL(url).catch(err => {
    console.error("Error loading URL:", err);
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createMenu() {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
        {
          label: app.name,
          submenu: [
            { role: "about" as const },
            { type: "separator" as const },
            { role: "services" as const },
            { type: "separator" as const },
            { role: "hide" as const },
            { role: "hideOthers" as const },
            { role: "unhide" as const },
            { type: "separator" as const },
            { role: "quit" as const },
          ],
        },
      ]
      : []),
    {
      label: "File",
      submenu: [
        { type: "separator" },
        isMac ? { role: "close" as const } : { role: "quit" as const },
      ],
    },
    {
      label: "Edit",
      submenu: [
        //TODO
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" as const },
        { role: "forceReload" as const },
        { role: "toggleDevTools" as const },
        { type: "separator" as const },
        { role: "resetZoom" as const },
        { role: "zoomIn" as const },
        { role: "zoomOut" as const },
        { type: "separator" as const },
        { role: "togglefullscreen" as const },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" as const },
        { role: "zoom" as const },
        ...(isMac
          ? [{ type: "separator" as const }, { role: "front" as const }, { type: "separator" as const }, { role: "window" as const }]
          : [{ role: "close" as const }]),
      ],
    },
    {
      role: "help" as const,
      submenu: [
        {
          label: "Documentation",
          click: async () => {
            await shell.openExternal("https://caplayground.vercel.app/docs");
          },
        },
        {
          label: "Report Issue",
          click: async () => {
            await shell.openExternal("https://github.com/CAPlayground/CAPlayground/issues");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.handle("app:get-path", (_, name: string) => {
  return app.getPath(name as any);
});

ipcMain.handle("app:get-version", () => {
  return app.getVersion();
});

app.whenReady().then(async () => {
  try {
    await startNextServer();

    createWindow();
    createMenu();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error("Failed to start app:", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});

app.on("quit", () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});

nativeTheme.on("updated", () => {
  mainWindow?.webContents.send("theme-changed", nativeTheme.shouldUseDarkColors ? "dark" : "light");
});

app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin === `http://localhost:${SERVER_PORT}`) {
      return;
    }
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
