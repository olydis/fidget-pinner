import { createFunc } from '../commClient';
import { ipcRenderer, remote } from "electron";
import * as $ from 'jquery';

$(() => {
  const draggable = document.body;
  draggable.onmousedown = event => ipcRenderer.send('mouse-move', 42);
});