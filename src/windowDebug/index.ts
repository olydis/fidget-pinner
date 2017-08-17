import { createFunc } from '../commClient';
import { ipcRenderer, remote } from "electron";
import * as $ from 'jquery';

$(() => {
  const content = $("#content");
  createFunc<string, void>("set-content", str => { content.text(str); });

});