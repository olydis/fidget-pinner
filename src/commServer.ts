import { BrowserWindow, ipcMain } from "electron";

let id = 0;

export function callFunc<T, U>(win: Electron.BrowserWindow, channel: string, arg: T): Promise<U> {
  const callId = ++id;
  return new Promise<U>((res, rej) => 
  {
    const resFunc = (ev: any, id: number, err: any, argRes: U) => {
      const sender: Electron.WebContents = ev.sender.webContents;
      if (sender === win.webContents && callId === id) {
        ipcMain.removeListener(channel, resFunc);
        if (err) rej(err);
        else res(argRes);
      }
    };
    ipcMain.on(channel, resFunc);
    win.webContents.send(channel, callId, arg);
  });
}

export function createFunc<T, U>(win: Electron.BrowserWindow, channel: string, handler: (arg: T) => Promise<U> | U): void {
  const f = async (ev: any, id: number, arg: T) => {
    const sender: Electron.WebContents = ev.sender.webContents;
    if (sender === win.webContents) {
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

export function waitSignal(win: Electron.BrowserWindow, channel: string): Promise<void> {
  return new Promise<void>((res, rej) => 
  {
    const resFunc = (ev: any) => {
      const sender: Electron.WebContents = ev.sender.webContents;
      if (sender === win.webContents) {
        ipcMain.removeListener(channel, resFunc);
        res();
      }
    };
    ipcMain.on(channel, resFunc);
  });
}