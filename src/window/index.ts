import { ipcRenderer, remote } from "electron";
import * as $ from 'jquery';

const setContentBounds: (bounds: Electron.Rectangle) => void = remote.require("./app").setContentBounds;
const setResizable: (resizable: boolean) => void = remote.require("./app").setResizable;

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
  contentWidth: 1200,
  contentHeight: 900,
  contentScrollX: 0,
  contentScrollY: 0,
  visibleLeft: 50,
  visibleRight: 1100,
  visibleTop: 50,
  visibleBottom: 800,
  windowLeft: 100,
  windowTop: 100
};

type Options = typeof options;

// state machine
class State {
  protected get HWebView() { return State.hWebView; }
  protected get JContainer() { return State.jContainer; }
  protected get JControls() { return State.jControls; }

  protected enter(): void { }
  protected exit(): void { }
  protected keydown(keycode: number): void { }

  private static currentState: State;
  public static transition(newState: ((oldState: State) => State) | State): void {
    State.currentState.exit();
    State.currentState = typeof newState === "function" ? newState(State.currentState) : newState;
    document.body.className = State.currentState.constructor.name;
    State.currentState.enter();
  }
  private static hWebView: Electron.WebviewTag;
  private static jContainer: JQuery;
  private static jControls: JQuery;
  public static initialize(): void {
    $(window).keydown(ev => State.currentState.keydown(ev.keyCode || 0));
    State.hWebView = document.getElementById("page") as Electron.WebviewTag;
    State.jContainer = $("div#container");
    State.jControls = $("div#controls");

    State.hWebView.src = options.content.url;
    // (webView as any).setLayoutZoomLevelLimits(options.contentZoom, options.contentZoom);
    // webView.setZoomLevel(options.contentZoom);
    // prevent scroll in webpage: $("body").css("overflow", "hidden");

    State.currentState = new State();
    if (options.content.url === "")
      State.transition(new StateEdit());
    else
      State.transition(new StateView());
  }

  protected update(options: Options, fullView: boolean) {
    if (fullView)
      setContentBounds({
        x: options.windowLeft - options.visibleLeft,
        y: options.windowTop - options.visibleTop,
        width: options.contentWidth,
        height: options.contentHeight
      });
    else
      setContentBounds({
        x: options.windowLeft,
        y: options.windowTop,
        width: options.visibleRight - options.visibleLeft,
        height: options.visibleBottom - options.visibleTop
      });

    var container = this.JContainer;
    container.width(options.contentWidth);
    container.height(options.contentHeight);
    container.scrollLeft(options.contentScrollX);
    container.scrollTop(options.contentScrollY);

    if (fullView)
      container.offset({ left: 0, top: 0 });
    else
      container.offset({ left: -options.visibleLeft, top: -options.visibleTop });

    this.JControls.css({ 
      left: options.visibleLeft,
      top: options.visibleTop,
      width: options.visibleRight - options.visibleLeft
    });

    const overlay = document.getElementById("overlay") as HTMLCanvasElement;
    overlay.width = options.contentWidth;
    overlay.height = options.contentHeight;
    const ctx = overlay.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.fillRect(0, 0, overlay.width, overlay.height);
      ctx.clearRect(options.visibleLeft, options.visibleTop, options.visibleRight - options.visibleLeft, options.visibleBottom - options.visibleTop);
      ctx.strokeRect(options.visibleLeft, options.visibleTop, options.visibleRight - options.visibleLeft, options.visibleBottom - options.visibleTop);
    }
  }
}

// states
class StateView extends State {
  protected enter() {
    this.JControls.removeClass("visible");

    this.update(options, false);
  }
  protected exit() {
    this.JControls.addClass("visible");
  }
  protected keydown(keycode: number): void {
    if (keycode === 18) this.JControls.toggleClass("visible");
    //alert(keycode);
    //State.transition(new StatePan());
  }
}

class StateEdit extends State {
  public enter() {
    this.update(options, true);
  }
  public exit() { }
}

$(() => {
  $("#btnClose").click(() => window.close());
  $("#btnTest").click(() => State.transition(new StateEdit()));
  State.initialize();

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