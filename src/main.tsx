import Phaser from "phaser";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./ui/App";
import socketIOClient from "socket.io-client";
import AnimatedTiles from "./AnimatedTiles";
import SceneMain from "./SceneMain";
import SceneBoot from "./SceneBoot";
import VJoyPlugin from "./Joystick";
import SceneHud from "./SceneHud";
import "./style.css";

const debug = process.env.DEBUG;
const SERVER_URL = process.env.SERVER_URL as string;
const socket = socketIOClient(SERVER_URL);
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

root.render(
  <React.StrictMode>
    <App socket={socket} game={game} debug={debug} />
  </React.StrictMode>
);
