import { ipcRenderer, remote } from "electron";

window.onbeforeunload = e => false;
ipcRenderer.on("navigate", (e: any, url: string) => {
  window.onbeforeunload = e => true;
  window.location.href = url;
});