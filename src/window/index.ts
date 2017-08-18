import { ipcRenderer, remote } from "electron";
import * as $ from 'jquery';

const setContentBounds: (bounds: Electron.Rectangle) => void = remote.require("./app").setContentBounds;

window.onerror = e => alert(e);

// options/modes
// - what: auto refresh, navigate to (fake user agent, header params, ...), maybe also navigate scripts to execute in the site's context
// - final interaction
// - move snippet window
// - resize snippet window
// - move visible area
// - resize visible area
// - scroll website
// - resize website
// - zoom website

const options = {
  version: 0,
  content: {
    url: "https://github.com/",
  },
  contentZoom: 0,
  contentWidth: 800,
  contentHeight: 600,
  contentScrollX: 0,
  contentScrollY: 0,
  visibleLeft: 200,
  visibleRight: 600,
  visibleTop: 100,
  visibleBottom: 500,
  windowLeft: 500,
  windowTop: 500
};

let webView: Electron.WebviewTag;

// state machine
interface State {
  enter(): void;
  exit(): void;
}
let state: State;
function transition(newState: State): void { state.exit(); state = newState; document.body.className = state.constructor.name; state.enter(); }

// states
class StateView implements State {
  public enter() {
    var wv = $(webView);
    wv.width(options.contentWidth);
    wv.height(options.contentHeight);
    wv.scrollLeft(options.contentScrollX);
    wv.scrollTop(options.contentScrollY);
    wv.offset({ left: -options.visibleLeft, top: -options.visibleTop });
    setContentBounds({
      x: options.windowLeft,
      y: options.windowTop,
      width: options.visibleRight - options.visibleLeft,
      height: options.visibleBottom - options.visibleTop
    });
  }
  public exit() { }
}

class StatePan implements State {
  public enter() {
    var wv = $(webView);
    wv.width(options.contentWidth);
    wv.height(options.contentHeight);
    wv.scrollLeft(options.contentScrollX);
    wv.scrollTop(options.contentScrollY);
    wv.offset({ left: 0, top: 0 });
    setContentBounds({
      x: options.windowLeft - options.visibleLeft,
      y: options.windowTop - options.visibleTop,
      width: options.contentWidth,
      height: options.contentHeight
    });
  }
  public exit() { }
}

$(() => {
  webView = document.getElementById("page") as Electron.WebviewTag;

  webView.src = options.content.url;
  // (webView as any).setLayoutZoomLevelLimits(options.contentZoom, options.contentZoom);
  // webView.setZoomLevel(options.contentZoom);
  // prevent scroll in webpage: $("body").css("overflow", "hidden");

  state = new StatePan();
  state.enter();

  // const draggable = $("#overlay");
  

  // // drag
  // let dragging = false;
  // let relX = 0;
  // let relY = 0;
  // draggable.mousedown(ev => {
  //   dragging = true;
  // });
  // draggable.mousemove(ev => {
  //   if (ev.screenX && ev.screenY && ev.clientX && ev.clientY) {
  //     relX = (ev.screenX - ev.clientX) / draggable.width();
  //     relY = (ev.screenY - ev.clientY) / draggable.height();
  //   }
  // });
});