import * as console from 'console';
import { ipcRenderer, remote } from "electron";
import * as $ from 'jquery';
import { trunc } from "../common";
import { Options, normalizeOptions } from "./options";

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

let options: Options = {
  version: 0,
  content: {
    url: "https://github.com/",
    onNavigate: "suppress",
    autoRefreshMs: 5000,
    scrollX: 0,
    scrollY: 200,
    allowScroll: false
  },
  contentZoom: 0,
  contentWidth: 1900,
  contentHeight: 900,
  visibleLeft: 50,
  visibleRight: 1850,
  visibleTop: 50,
  visibleBottom: 800,
  windowLeft: 100,
  windowTop: 100
};

// state machine
abstract class State {
  protected get JContainer() { return State.jContainer; }
  protected get JControls() { return State.jControls; }
  protected get JWindow() { return State.jWindow; }

  protected get controlsVisible(): boolean { return true; }

  private invariants(): void {
    this.controlsVisible
      ? this.JControls.addClass("visible")
      : this.JControls.removeClass("visible");

  }

  protected enter(): void { }
  protected exit(): void { }
  protected keydown(keycode: number): void { }
  protected willNavigate(url: string): void { }

  private static currentState: State;
  private static setState(newState: State): void {
    State.currentState = newState;
    document.body.className = State.currentState.constructor.name;
    State.currentState.invariants();
    State.currentState.enter();
  }
  public static transition(newState: ((oldState: State) => State) | State): void {
    State.currentState.exit();
    State.setState(typeof newState === "function" ? newState(State.currentState) : newState);
  }
  private static jContainer: JQuery;
  private static jControls: JQuery;
  private static jWindow: JQuery;
  public static initialize(): void {
    $(window).keydown(ev => State.currentState.keydown(ev.keyCode || 0));
    State.jContainer = $("div#container");
    State.jControls = $("div#controls");
    State.jWindow = $(window);

    // (webView as any).setLayoutZoomLevelLimits(options.contentZoom, options.contentZoom);
    // webView.setZoomLevel(options.contentZoom);
    // prevent scroll in webpage: $("body").css("overflow", "hidden");

    State.refreshContent(options);

    if (options.content.url === "")
      State.setState(new StateEdit());
    else
      State.setState(new StateView());
  }

  private static refreshContentCleanup: () => void = () => { };
  protected static refreshContent(options: Options, showLoad: boolean = false): void {
    const content = options.content;

    const hWebView = document.createElement("webview");
    hWebView.className = "preload";
    $("#page").append(hWebView);
    if (showLoad) $("webview.active").remove();

    if (options.content.onNavigate !== "allow")
      hWebView.preload = "./preload.js";

    const readyToDisplay = () => {
      hWebView.executeJavaScript(
        `
        document.body.scrollLeft = ${options.content.scrollX};
        document.body.scrollTop = ${options.content.scrollY};
        ${content.allowScroll ? "" : "document.body.style.overflow = 'hidden';"}`,
        true
      );
      State.refreshContentCleanup();
      // swap
      $("webview.active").remove();
      hWebView.className = "active";
      $("webview.preload").remove(); // orphans (if next timer tick was earlier than this event)
    };
    const onwillnavigate = (e: Electron.WillNavigateEvent) => State.currentState.willNavigate(e.url);
    hWebView.addEventListener("did-finish-load", readyToDisplay);
    hWebView.addEventListener("will-navigate", onwillnavigate);

    // cleanup
    State.refreshContentCleanup();
    State.refreshContentCleanup = () => {
      hWebView.removeEventListener("did-finish-load", readyToDisplay);
      State.refreshContentCleanup = () => { };
    };

    hWebView.src = options.content.url;
  }

  protected updateBounds(options: Options, fullView: boolean): void {
    options = normalizeOptions(options);
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
    container.scrollLeft(options.content.scrollX);
    container.scrollTop(options.content.scrollY);

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
class StateMoving extends State {
  private controlsMouseMove: (ev: JQuery.Event) => void;
  private controlsMouseUp: (ev: JQuery.Event) => void;

  public constructor(
    private parent: State,
    private previewOptions: (x: number, y: number) => Options,
    private renderOptions: (o: Options) => void) {
    super();
    this.controlsMouseMove = ev => {
      if (ev.screenX !== undefined && ev.screenY !== undefined)
        renderOptions(previewOptions(ev.screenX, ev.screenY));
    };
    this.controlsMouseUp = ev => {
      if (ev.screenX !== undefined && ev.screenY !== undefined)
        options = normalizeOptions(previewOptions(ev.screenX, ev.screenY));
      State.transition(this.parent);
    };
  }

  protected enter() {
    this.JWindow.on("mousemove", this.controlsMouseMove);
    this.JWindow.on("mouseup", this.controlsMouseUp);
  }
  protected exit() {
    this.JWindow.off("mousemove", this.controlsMouseMove);
    this.JWindow.off("mouseup", this.controlsMouseUp);
  }
  protected keydown(keycode: number): void {
    if (keycode === 27 /*ESC*/) State.transition(this.parent);
  }
}

class StateView extends State {
  private controlsMouseDown: (ev: JQuery.Event) => void;

  protected get controlsVisible() { return this._controlsVisible; }

  public constructor(private readonly _controlsVisible: boolean = false) {
    super();
    this.controlsMouseDown = ev => {
      const sx = ev.screenX, sy = ev.screenY;
      if (sx !== undefined && sy !== undefined)
        State.transition(new StateMoving(
          this,
          (x, y) => Object.assign({}, options, {
            windowLeft: options.windowLeft - sx + x,
            windowTop: options.windowTop - sy + y
          }),
          o => this.updateBounds(o, false)));
    };
  }

  private refreshTimer: NodeJS.Timer;
  protected enter() {
    this.JControls.on("mousedown", this.controlsMouseDown);

    if (options.content.autoRefreshMs)
      this.refreshTimer = setInterval(() => State.refreshContent(options), options.content.autoRefreshMs);
    this.updateBounds(options, false);
  }
  protected exit() {
    this.JControls.off("mousedown", this.controlsMouseDown);

    clearInterval(this.refreshTimer);
  }
  protected keydown(keycode: number): void {
    if (keycode === 18 /*ALT*/) State.transition(new StateView(!this.controlsVisible));
    //alert(keycode);
    //State.transition(new StatePan());
  }
  protected willNavigate(url: string): void {
    alert(url);
  }
}

class StateEdit extends State {
  private controlsMouseDown: (ev: JQuery.Event) => void;

  public constructor() {
    super();
    this.controlsMouseDown = ev => {
      const sx = ev.screenX, sy = ev.screenY;
      if (sx !== undefined && sy !== undefined)
        State.transition(new StateMoving(
          this,
          (x, y) => Object.assign({}, options, {
            windowLeft: options.windowLeft - sx + x,
            windowTop: options.windowTop - sy + y,
            visibleLeft: options.visibleLeft - sx + x,
            visibleTop: options.visibleTop - sy + y,
            visibleRight: options.visibleRight - sx + x,
            visibleBottom: options.visibleBottom - sy + y
          }),
          o => this.updateBounds(o, true)));
    };
  }

  public enter() {
    this.JControls.on("mousedown", this.controlsMouseDown);

    this.updateBounds(options, true);
  }
  public exit() {
    this.JControls.off("mousedown", this.controlsMouseDown);
  }
}

class StateContent extends State {
  public constructor() {
    super();
  }

  protected get controlsVisible() { return false; }

  public enter() {
    const displayOptions = Object.assign({}, options);
    displayOptions.content = Object.assign({}, displayOptions.content, {
      onNavigate: "allow",
      allowScroll: true
    });
    this.updateBounds(displayOptions, true);
    State.refreshContent(displayOptions, true);
  }
  public exit() {
    // update options
    State.refreshContent(options, true);
  }
}

$(() => {
  $(".button").mousedown(ev => ev.stopPropagation());
  $("#btnClose").click(() => window.close());
  $("#btnContent").click(() => State.transition(new StateContent()));
  $("#btnEdit").click(() => State.transition(new StateEdit()));
  State.initialize();
});