import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,

  getVersion: () => ipcRenderer.invoke("app:get-version"),
  getPath: (name: string) => ipcRenderer.invoke("app:get-path", name),
});

declare global {
  interface Window {
    electronAPI?: {
      platform: NodeJS.Platform;
      isElectron: boolean;
      getVersion: () => Promise<string>;
      getPath: (name: string) => Promise<string>;
    };
  }
}
