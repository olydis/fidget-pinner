import { delay } from './delay';
import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";
import { createReadStream, createWriteStream } from "fs";
import { safeLoad, safeDump } from "js-yaml";

app.on('window-all-closed', () => app.exit());

let win: Electron.BrowserWindow;

app.once("ready", async () => {
  const displays = screen.getAllDisplays();
  
  win = new BrowserWindow({ frame: false });
  win.setResizable(false);
  win.setMenu(null as any);
  win.setAlwaysOnTop(true);
  win.loadURL(`${__dirname}/window/index.html`);
  // win.webContents.openDevTools();
});

export function setContentBounds(bounds: Electron.Rectangle): void {
  win.setContentBounds(bounds);
}

export function setResizable(resizable: boolean): void {
  win.setResizable(resizable);
}


// function createUrl(data: string, mediaType: string = "text/html"): string {
//   return `data:${mediaType},${encodeURIComponent(data)}`;
// }

// const showWindow = () => {
//   const win = new BrowserWindow({ transparent: true, frame: false });
//   win.maximize();
//   win.setMenu(null);

//   win.setAlwaysOnTop(true);
//   win.setIgnoreMouseEvents(true);
//   win.loadURL(createUrl(`<h1>Hello World</h1>`));
// };