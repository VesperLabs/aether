declare global {
  var phaserOnNodeFPS: number;
}

/* Phaser 3.90 WebGLRenderer uses `if (typeof WEBGL_DEBUG)` which is always truthy, so it always
 * requires phaser3spectorjs (browser-only). Stub it before any Phaser load on Node. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeModule = require("module") as typeof import("module");
const origRequire = NodeModule.prototype.require;
NodeModule.prototype.require = function (id: string) {
  if (id === "phaser3spectorjs") {
    return {};
  }
  return origRequire.apply(this, arguments as unknown as [string]);
} as typeof NodeModule.prototype.require;

import Canvas from "canvas";
import jsdom from "jsdom";
import path from "path";
import fs from "fs";

class FakeXMLHttpRequest {
  public url: string;
  public status = 200;
  public response: any;
  public responseText: string;

  public open(_type: string, url: string) {
    this.url = path.resolve(__dirname, url);
  }

  public send() {
    // use base64 for images and utf8 for json files
    const encoding = /\.json$/gm.test(this.url) ? "utf8" : "base64";

    fs.readFile(this.url, { encoding }, (err, data) => {
      if (err) throw err;
      this.response = data;
      this.responseText = data;
      const event = { target: { status: this.status } };
      this.onload(this, event);
    });
  }
  public onload(xhr: any, event: any) {}
  public onerror(err: NodeJS.ErrnoException | null) {}
  public onprogress() {}
}

export default FakeXMLHttpRequest;

const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
const noop = () => {};

const document = dom.window.document;
const window = dom.window;
window.focus = () => {};

/* Phaser 3.90+ ScaleManager references global `screen` (browser API). */
const screenStub = { orientation: null as null };
(global as unknown as { screen: typeof screenStub }).screen = screenStub;
(window as unknown as { screen: typeof screenStub }).screen = screenStub;

global.document = document as any;
global.window = window as any;
global.window.Element = undefined as any;
// global.navigator = { userAgent: "node" } as any;
global.Image = Canvas.Image as any;
global.XMLHttpRequest = FakeXMLHttpRequest as any;
global.HTMLCanvasElement = window.HTMLCanvasElement;
global.HTMLVideoElement = window.HTMLVideoElement;

// @ts-ignore
global.URL = URL || noop;
global.URL.createObjectURL = (base64: any) => `data:image/png;base64,${base64}`;
global.URL.revokeObjectURL = () => {};

// phaser on node variables
global.phaserOnNodeFPS = 60;

const animationFrame = (cb: any) => {
  const now = performance.now();
  if (typeof cb !== "function") return 0; // this line saves a lot of cpu
  window.setTimeout(() => cb(now), 1000 / global.phaserOnNodeFPS);
  return 0;
};
export { animationFrame };

window.requestAnimationFrame = (cb) => {
  return animationFrame(cb);
};

const requestAnimationFrame = window.requestAnimationFrame;
export { requestAnimationFrame };
