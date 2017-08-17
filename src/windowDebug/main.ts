import { callFunc, waitSignal } from '../commServer';
import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";

export class WindowDebug {
  public static async create(): Promise<WindowDebug> {
    const win = new BrowserWindow({ });
    // win.maximize();
    win.setMenu(null);
    win.loadURL(`${__dirname}/index.html`);
    // win.webContents.openDevTools();

    await waitSignal(win, "__ready");
    return new WindowDebug(win);
  }

  private constructor(protected win: Electron.BrowserWindow) {
  }

  public async setContent(content: string): Promise<void> {
    await callFunc<string, void>(this.win, "set-content", content);
  }

  public close(): void {
    this.win.close();
  }
}