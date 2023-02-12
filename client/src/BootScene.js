import Phaser from "phaser";
import { assetList } from "./Assets";
import { mapList, imageList } from "./Maps";

class BootScene extends Phaser.Scene {
  constructor(socket) {
    super({
      key: "BootScene",
    });
    this.socket = socket;
  }
  preload() {
    const dpanel = this.add
      .text(16, 16, "Loading...", {
        font: "16px monospace",
        fill: "#ffffff",
        padding: {
          x: 20,
          y: 10,
        },
        backgroundColor: "#000000",
      })
      .setScrollFactor(0);

    // Register a load progress event to show a load bar
    this.load.on("progress", (value) => {
      dpanel.setText("Loading... " + Math.floor(value * 100) + "%");
    });

    // Register a load complete event to launch the title screen when all files are loaded
    this.load.on("complete", () => {
      assetList.forEach((asset) => {
        let tempText = this.textures.get(asset.texture);
        tempText.add("preview", 0, ...asset.previewRect);
      });
      this.scene.start("MainScene");
      window.dispatchEvent(new Event("game_loaded"));
    });
    imageList.forEach((asset) => {
      this.load.image(asset.name, asset.image);
    });
    mapList.forEach((asset) => {
      this.load.tilemapTiledJSON(asset.name, asset.json);
    });
    assetList.forEach((asset) => {
      this.load.atlas(asset.texture, asset.src, asset.atlas);
    });
    this.load.bitmapFont(
      "nin-dark",
      "./assets/fonts/dark.png",
      "./assets/fonts/font.xml"
    );
    this.load.bitmapFont(
      "nin-light",
      "./assets/fonts/light.png",
      "./assets/fonts/font.xml"
    );
    this.load.image("misc-bubble-tail", "./assets/images/bubble-tail.png");
    this.load.image("misc-slash", "./assets/images/slash.png");
    this.load.spritesheet("misc-bubble", "./assets/images/bubble.png", {
      frameWidth: 4,
      frameHeight: 4,
    });
    this.load.spritesheet("misc-bars", "./assets/images/bars.png", {
      frameWidth: 4,
      frameHeight: 4,
    });
    this.load.spritesheet(
      "spell-anim-fireball",
      "./assets/images/spell-anim-fireball.png",
      { frameWidth: 150, frameHeight: 150 }
    );
    this.load.spritesheet(
      "spell-anim-chakra",
      "./assets/images/spell-anim-chakra.png",
      { frameWidth: 150, frameHeight: 150 }
    );
  }
  create() {}
  update() {}
}

export default BootScene;
