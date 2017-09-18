import { trunc } from "../common";

const minWidth = 100;
const minHeight = 100;

export type Options = {
  version: number;
  content: {
    url: string;
    onNavigate: "allow" | "external" | "suppress";
    autoRefreshMs: number | null;
    scrollX: number;
    scrollY: number;
    allowScroll: boolean;
    allowSelection: boolean;
    allowHoverAndClick: boolean;
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

export function normalizeOptions(o: Options): Options {
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