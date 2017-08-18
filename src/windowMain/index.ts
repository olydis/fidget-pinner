import { createFunc } from '../commClient';
import { ipcRenderer, remote } from "electron";
import * as $ from 'jquery';

// modes
// - final interaction
// - move snippet window
// - resize snippet window
// - move visible area
// - resize visible area
// - scroll website
// - resize website
// - zoom website

$(() => {
  const draggable = $("#overlay");
  let dragging = false;
  let relX = 0;
  let relY = 0;
  draggable.mousedown(ev => {
    relX = ev.;
    dragging = true;
  });
});