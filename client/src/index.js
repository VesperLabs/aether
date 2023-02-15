import Phaser from "phaser";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import socketIO from "socket.io-client";
import AnimatedTiles from "./AnimatedTiles";
import SceneMain from "./SceneMain";
import SceneBoot from "./SceneBoot";
import VJoyPlugin from "./Joystick";
import SceneHud from "./SceneHud";
import { isMobile } from "./utils";
const socket = socketIO.connect("http://192.168.1.36:8000");
const root = ReactDOM.createRoot(document.getElementById("root"));

const gameWidth = window.innerWidth * window.devicePixelRatio;
const gameHeight = window.innerHeight * window.devicePixelRatio;

const max = isMobile
  ? { width: 1120, height: 620 }
  : { width: 1120, height: 1120 };

root.render(
  <React.StrictMode>
    <App socket={socket} />
  </React.StrictMode>
);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: gameWidth,
    height: gameHeight,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    max: max,
  },
  roundPixels: false,
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
      // debug: true,
      // debugShowBody: true,
      // debugShowStaticBody: true,
      // debugShowVelocity: true,
      // debugVelocityColor: 0xffff00,
      // debugBodyColor: 0x0000ff,
      // debugStaticBodyColor: 0xffffff,
      gravity: {
        y: 0,
      },
    },
  },
  scene: [new SceneBoot(socket), new SceneMain(socket), new SceneHud(socket)],
});
