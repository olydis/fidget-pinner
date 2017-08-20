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
  public static transition(newState: State): void {
    State.currentState.exit();
    State.currentState = newState;
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
    State.transition(new StateView());
  }

  protected updatePositions(options: Options, fullView: boolean) {
    if (fullView)
      setContentBounds({
        x: options.windowLeft,
        y: options.windowTop,
        width: options.visibleRight - options.visibleLeft,
        height: options.visibleBottom - options.visibleTop
      });
    else
      setContentBounds({
        x: options.windowLeft - options.visibleLeft,
        y: options.windowTop - options.visibleTop,
        width: options.contentWidth,
        height: options.contentHeight
      });

    var container = this.JContainer;
    container.width(options.contentWidth);
    container.height(options.contentHeight);
    container.scrollLeft(options.contentScrollX);
    container.scrollTop(options.contentScrollY);

    if (fullView)
      container.offset({ left: -options.visibleLeft, top: -options.visibleTop });
    else
      container.offset({ left: 0, top: 0 });

    this.JControls.css({ 
      left: options.visibleLeft,
      top: options.visibleTop,
      width: options.visibleRight - options.visibleLeft
    });
  }
}

// states
class StateView extends State {
  protected enter() {
    this.JControls.removeClass("visible");

    this.updatePositions(options, false);
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

class StatePan extends State {
  public enter() {
    this.updatePositions(options, true);
  }
  public exit() { }
}

$(() => {
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