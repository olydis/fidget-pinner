import { callFunc, waitSignal } from '../commServer';
import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";

export class WindowMain {
  public static async create(): Promise<WindowMain> {
    const win = new BrowserWindow({ frame: false });
    win.setMenu(null);
    win.setAlwaysOnTop(true);
    win.loadURL(`${__dirname}/index.html`);
    // win.webContents.openDevTools();

    await waitSignal(win, "__ready");
    return new WindowMain(win);
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