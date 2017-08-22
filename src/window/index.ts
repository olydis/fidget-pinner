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

type Options = {
  version: number;
  content: {
    url: string;
    onNavigate: "allow" | "external" | "suppress";
    autoRefreshMs: number | null;
    scrollX: number;
    scrollY: number;
    allowScroll: boolean;
  };
  contentZoom: number;
  contentWidth: number;
  contentHeight: number;
  visibleLeft: number;
  visibleRight: number;
  visibleTop: number;
  visibleBottom: number;
  windowLeft: number;
  windowTop: number;
}

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
  contentWidth: 1200,
  contentHeight: 900,
  visibleLeft: 50,
  visibleRight: 1100,
  visibleTop: 50,
  visibleBottom: 800,
  windowLeft: 100,
  windowTop: 100
};

const minWidth = 100;
const minHeight = 100;

function trunc(x: number, a: number, b: number): number { return Math.min(Math.max(x, a), b); }
function normalizeOptions(o: Options): Options {
  const res = Object.assign({}, o);
  res.contentWidth = Math.max(res.contentWidth, minWidth);
  res.contentHeight = Math.max(res.contentHeight, minHeight);
  res.visibleRight = trunc(res.visibleRight, minWidth, res.contentWidth);
  res.visibleBottom = trunc(res.visibleBottom, minHeight, res.contentHeight);
  res.visibleLeft = trunc(res.visibleLeft, 0, res.visibleRight - minWidth);
  res.visibleTop = trunc(res.visibleTop, 0, res.visibleBottom - minHeight);
  res.windowLeft += res.visibleLeft - o.visibleLeft;
  res.windowTop += res.visibleTop - o.visibleTop;
  return res;
}

// state machine
class State {
  protected get JContainer() { return State.jContainer; }
  protected get JControls() { return State.jControls; }
  protected get JWindow() { return State.jWindow; }

  protected enter(): void { }
  protected exit(): void { }
  protected keydown(keycode: number): void { }
  protected willNavigate(url: string): void { }

  private static currentState: State;
  public static transition(newState: ((oldState: State) => State) | State): void {
    State.currentState.exit();
    State.currentState = typeof newState === "function" ? newState(State.currentState) : newState;
    document.body.className = State.currentState.constructor.name;
    State.currentState.enter();
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

    State.currentState = new State();
    if (options.content.url === "")
      State.transition(new StateEdit());
    else
      State.transition(new StateView());
  }

  private static refreshContentCleanup: () => void = () => {};
  protected static refreshContent(options: Options, showLoad: boolean = false): void {
    const content = options.content;

    const hWebView = document.createElement("webview");
    hWebView.className = "preload";
    $("#page").append(hWebView);
    if (showLoad) $("webview.active").remove();

    if (options.content.onNavigate !== "allow")
      hWebView.preload = "./preload.js";

    const ondomready = () => {
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
    };
    const onwillnavigate = (e: Electron.WillNavigateEvent) => State.currentState.willNavigate(e.url);
    hWebView.addEventListener("dom-ready", ondomready);
    hWebView.addEventListener("will-navigate", onwillnavigate);

    // cleanup
    State.refreshContentCleanup();
    State.refreshContentCleanup = () => {
      hWebView.removeEventListener("dom-ready", ondomready);
      State.refreshContentCleanup = () => {};
    };

    hWebView.src = options.content.url;
  }

  protected update(options: Options, fullView: boolean): void {
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
  private controlsMouseMove: (ev : JQuery.Event) => void;
  private controlsMouseUp: (ev : JQuery.Event) => void;

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
    this.JControls.addClass("visible");
    this.JWindow.on("mousemove", this.controlsMouseMove);
    this.JWindow.on("mouseup", this.controlsMouseUp);
  }
  protected exit() {
    this.JControls.removeClass("visible");
    this.JWindow.off("mousemove", this.controlsMouseMove);
    this.JWindow.off("mouseup", this.controlsMouseUp);
  }
  protected keydown(keycode: number): void {
    if (keycode === 27 /*ESC*/) State.transition(this.parent);
  }
}

class StateView extends State {
  private controlsMouseDown: (ev : JQuery.Event) => void;

  public constructor(private controlsVisible: boolean = false) {
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
          o => this.update(o, false)));
    };
  }

  private refreshTimer: NodeJS.Timer;
  protected enter() {
    if (this.controlsVisible)
      this.JControls.addClass("visible");
    else
      this.JControls.removeClass("visible");
    this.JControls.on("mousedown", this.controlsMouseDown);

    if (options.content.autoRefreshMs)
      this.refreshTimer = setInterval(() => State.refreshContent(options), options.content.autoRefreshMs);
    this.update(options, false);
  }
  protected exit() {
    this.JControls.removeClass("visible");
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
  private controlsMouseDown: (ev : JQuery.Event) => void;

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
          o => this.update(o, true)));
    };
  }

  public enter() {
    this.JControls.addClass("visible");
    this.JControls.on("mousedown", this.controlsMouseDown);

    this.update(options, true);
  }
  public exit() {
    this.JControls.removeClass("visible");
    this.JControls.off("mousedown", this.controlsMouseDown);
  }
}

class StateContent extends State {
  public constructor() {
    super();
  }

  public enter() {
    const displayOptions = Object.assign({}, options);
    displayOptions.content = Object.assign({}, displayOptions.content, { 
        onNavigate: "allow",
        allowScroll: true
      });
    this.update(displayOptions, true);
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