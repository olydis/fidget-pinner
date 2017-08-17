import { WindowMain } from './windowMain/main';
import { delay } from './delay';
import { WindowDebug } from './windowDebug/main';
import { createFunc } from './commServer';
import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";
import { createReadStream, createWriteStream } from "fs";
import { safeLoad, safeDump } from "js-yaml";


app.on('window-all-closed', () => app.exit())

app.once("ready", async () => {
  const displays = screen.getAllDisplays();
  const winDebug = await WindowDebug.create();
  await winDebug.setContent(JSON.stringify(displays, null, 2));

  const winMain = await WindowMain.create();
});



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