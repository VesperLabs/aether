import Phaser from "phaser";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/client/hud/app/app";
import { createGameSocket, keepSocketConnected } from "@/client/net/socket";
import { trackLatency } from "@/client/net/latency";
import { AnimatedTiles } from "@/client/views/animated-tiles";
import { SceneMain } from "@/client/scenes/main-scene";
import { SceneBoot } from "@/client/scenes/boot-scene";
import { VJoyPlugin } from "@/client/input/joystick";
import { SceneHud } from "@/client/scenes/hud-scene";
import "./style.css";
import "./window-events";
import Peer from "peerjs";
import { getPeerRtcConfiguration } from "@/client/hud/video/webrtc-peer-config";

const debug = process.env.DEBUG;
const REDIRECT_URL = process.env.REDIRECT_URL as string;
const PEER_CLIENT_PORT = parseInt(process.env.PEER_CLIENT_PORT as string);
const PEER_CLIENT_PATH = process.env.PEER_CLIENT_PATH as string;

const socket = createGameSocket();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
const devicePixelRatio = window.devicePixelRatio || 1;
/* Integer buffer size; fractional canvas CSS vs backing store causes compositor seams (hairlines at map edge). */
const gameWidth = Math.floor(window.innerWidth * devicePixelRatio);
const gameHeight = Math.floor(window.innerHeight * devicePixelRatio);

async function startApp() {
  const rtcConfig = await getPeerRtcConfiguration();
  const peer = new Peer({
    host: "/",
    ...(PEER_CLIENT_PORT ? { port: PEER_CLIENT_PORT } : {}),
    ...(PEER_CLIENT_PATH ? { path: PEER_CLIENT_PATH } : {}),
    config: rtcConfig,
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: gameWidth,
      height: gameHeight,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
      autoRound: true,
      max: {
        width: Math.floor(screen.width * devicePixelRatio),
        height: Math.floor(screen.height * devicePixelRatio),
      },
    },
    antialias: false,
    pixelArt: true,
    plugins: {
      scene: [
        {
          key: "AnimatedTiles",
          plugin: AnimatedTiles,
          mapping: "animatedTiles",
        },
        {
          key: "VJoyPlugin",
          plugin: VJoyPlugin,
          mapping: "vjoy",
        },
      ],
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: !!debug,
        gravity: {
          x: 0,
          y: 0,
        },
      },
    },
    /* Default Phaser image loading is XHR → blob → object URL. Use <img src> instead (clearer in DevTools; required for WebGL + CDN with CORS). */
    loader: {
      imageLoadType: "HTMLImageElement",
      crossOrigin: "anonymous",
    },
    scene: [new SceneBoot(socket), new SceneMain(socket), new SceneHud(socket)],
  });

  root.render(
    <React.StrictMode>
      <App socket={socket} peer={peer} game={game} debug={debug} />
    </React.StrictMode>,
  );

  /* IOS Autoscroll fix when selecting an input */
  document.addEventListener("scroll", (e) => {
    if (document.documentElement.scrollTop > 0 || document.documentElement.scrollTop < 0) {
      document.documentElement.scrollTop = 0;
    }
  });

  keepSocketConnected(socket);
  trackLatency(socket);
}

if (REDIRECT_URL) {
  /* Will redirect */
  window.location.href = REDIRECT_URL;
} else {
  void startApp();
}
