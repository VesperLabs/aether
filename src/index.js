import Phaser from "phaser";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./ui/App";
import socketIO from "socket.io-client";
import AnimatedTiles from "./AnimatedTiles";
import SceneMain from "./SceneMain";
import SceneBoot from "./SceneBoot";
import VJoyPlugin from "./Joystick";
import SceneHud from "./SceneHud";
//import { HueRotatePostFX, TintPostFX } from "./PostEffects";

const debug = process.env.DEBUG;
const socket = socketIO.connect(`${process.env.SERVER_URL}`);
const root = ReactDOM.createRoot(document.getElementById("root"));
const gameWidth = window.innerWidth * window.devicePixelRatio;
const gameHeight = window.innerHeight * window.devicePixelRatio;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: gameWidth,
    height: gameHeight,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    max: { width: screen.width, height: screen.height },
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
      debug,
      gravity: {
        y: 0,
      },
    },
  },
  scene: [new SceneBoot(socket), new SceneMain(socket), new SceneHud(socket)],
});

root.render(
  <React.StrictMode>
    <App socket={socket} game={game} debug={debug} />
  </React.StrictMode>
);
