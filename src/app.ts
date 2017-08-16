import { createFunc } from './commServer';
import { setTimeout } from 'timers';
import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";
import { createReadStream, createWriteStream } from "fs";
import { safeLoad, safeDump } from "js-yaml";

async function delay(ms: number): Promise<void> { return new Promise<void>(res => setTimeout(res, ms)); }

// required to actually keep process running when window is closed
app.on('window-all-closed', () => { app.exit(); })


function createUrl(data: string, mediaType: string = "text/html"): string {
  return `data:${mediaType},${encodeURIComponent(data)}`;
}

const showContentWindow = async () => {
  const win = new BrowserWindow({ frame: false });
  win.setMenu(null);

  win.setAlwaysOnTop(true);
  win.loadURL(createUrl(`
<body><!--style="-webkit-app-region: drag; -webkit-user-select: none"-->
  <webview style="position: fixed; top: 0; left: 0; width: 100%; height: 100%" src="https://google.com">
  </webview>
  <canvas id="draggable" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.5; background: white; cursor: move">
  </canvas>
  <script>
  var { ipcRenderer, remote } = require("electron");
  var draggable = document.getElementById("draggable");
  draggable.onmousedown = event => ipcRenderer.send('mouse-move', 42);;
  </script>
</body>`));
  
  await delay(3000);
  win.setBounds({
    x: 50,
    y: 50,
    width: 500,
    height: 500
  }, true);
  
  createFunc(win, "mouse-move", i => i);
  ipcMain.on('mouse-move', (event, arg) => {
    dialog.showMessageBox({
      message: safeDump(event.sender.webContents == win.webContents, {
        skipInvalid: true
      })
    });
    dialog.showMessageBox({
      message: safeDump(event.sender == win, {
        skipInvalid: true
      })
    });
    dialog.showMessageBox({
      message: safeDump(Object.keys(event.sender), {
        skipInvalid: true
      })
    });
  });
};

const showWindow = () => {
  const win = new BrowserWindow({ transparent: true, frame: false });
  win.maximize();
  win.setMenu(null);

  win.setAlwaysOnTop(true);
  win.setIgnoreMouseEvents(true);
  win.loadURL(createUrl(`<h1>Hello World</h1>`));
};

const showDebugWindow = () => {
  const win = new BrowserWindow({ });
  win.maximize();
  win.setMenu(null);

  win.webContents.openDevTools();
  const displays = screen.getAllDisplays();
  win.loadURL(createUrl(`<pre>${JSON.stringify(displays, null, 2)}</pre>
  <script>
  var { ipcRenderer, remote } = require("electron");
  var draggable = document.body;
  draggable.onmousedown = event => ipcRenderer.send('mouse-move', 42);;
  </script>`));
};

app.once("ready", () => {
  showContentWindow();
  showDebugWindow();
});