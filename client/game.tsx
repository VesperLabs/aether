import Phaser from "phaser";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./ui/App";
import socketIOClient from "socket.io-client";
import AnimatedTiles from "./game/AnimatedTiles";
import SceneMain from "./game/SceneMain";
import SceneBoot from "./game/SceneBoot";
import VJoyPlugin from "./game/Joystick";
import SceneHud from "./game/SceneHud";
import "./style.css";
import Peer from "peerjs";

const debug = process.env.DEBUG;
const SERVER_URL = process.env.SERVER_URL as string;
const REDIRECT_URL = process.env.REDIRECT_URL as string;
const socket = socketIOClient(SERVER_URL);
const peer = new Peer(undefined, {
  host: "/",
  port: 9000,
  path: "/peerjs",
});
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
const devicePixelRatio = window.devicePixelRatio || 1;
const gameWidth = window.innerWidth * devicePixelRatio;
const gameHeight = window.innerHeight * devicePixelRatio;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: gameWidth,
    height: gameHeight,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    max: {
      width: screen.width * devicePixelRatio,
      height: screen.height * devicePixelRatio,
    },
  },
  roundPixels: false,
  antialias: false,
  pixelArt: true,
  //pipeline: { HueRotatePostFX, TintPostFX },
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
      //@ts-ignore2
      debug,
      gravity: {
        y: 0,
      },
    },
  },
  scene: [new SceneBoot(socket), new SceneMain(socket), new SceneHud(socket)],
});

if (REDIRECT_URL) {
  /* Will redirect */
  window.location.href = REDIRECT_URL;
} else {
  root.render(
    <React.StrictMode>
      <App socket={socket} peer={peer} game={game} debug={debug} />
    </React.StrictMode>
  );
  /* IOS Autoscroll fix when selecting an input */
  document.addEventListener("scroll", (e) => {
    if (document.documentElement.scrollTop > 0 || document.documentElement.scrollTop < 0) {
      document.documentElement.scrollTop = 0;
    }
  });

  /* Keep socket connection connected */
  setInterval(() => {
    if (socket.connected) return;
    socket.connect();
  }, 3000);
}
