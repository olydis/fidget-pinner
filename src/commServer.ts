import { BrowserWindow, ipcMain } from "electron";

export function createFunc<T, U>(win: Electron.BrowserWindow, channel: string, handler: (arg: T) => Promise<U> | U): void {
  const f = async (ev: any, id: number, arg: T) => {
    const sender: Electron.WebContents = ev.sender.webContents;
    if (ev.webContents === win.webContents) {
      try {
        const result = await handler(arg);
        sender.send(channel, id, null, result);
      } catch (e) {
        sender.send(channel, id, e);
      }
    }
  };
  ipcMain.on(channel, f);
  win.once("close", () => ipcMain.removeListener(channel, f));
}