import Phaser from "phaser";
import { assetList } from "../shared/Assets";
import soundList from "../shared/data/soundList.json";
import { mapList, mapImageList } from "../shared/Maps";

class SceneBoot extends Phaser.Scene {
  constructor(socket) {
    super({
      key: "SceneBoot",
    });
    this.socket = socket;
  }
  preload() {
    const viewportWidth = this.cameras.main.width;
    const viewportHeight = this.cameras.main.height;

    const dpanel = this.add
      .text(viewportWidth / 2, viewportHeight / 2, "Loading...", {
        font: "18px monospace",
        fill: "#ffffff",
        backgroundColor: "#000000",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.load.on("progress", (value) => {
      dpanel.setText("Loading... " + Math.floor(value * 100) + "%");
    });

    // Register a load complete event to launch the title screen when all files are loaded
    this.load.on("complete", () => {
      /* For loot pics */
      assetList.forEach((asset) => {
        let tempText = this.textures.get(asset.texture);
        tempText.add("preview", 0, ...asset.previewRect);
      });
      this.scene.start("SceneMain");
      this.scene.start("SceneHud");
      window.dispatchEvent(new Event("GAME_LOAD"));
    });
    mapImageList.forEach((asset) => {
      this.load.image(asset.name, asset.image);
    });
    mapList.forEach((asset) => {
      this.load.tilemapTiledJSON(asset.name, asset.json);
    });
    assetList.forEach((asset) => {
      this.load.atlas(asset.texture, asset.src, asset.atlas);
    });
    soundList.forEach((asset) => {
      this.load.audio(asset.name, asset.src);
    });
    this.load.bitmapFont("nin-dark", "./assets/fonts/dark.png", "./assets/fonts/font.xml");
    this.load.bitmapFont("nin-light", "./assets/fonts/light.png", "./assets/fonts/font.xml");
    this.load.image("joy-circle", "./assets/images/joy-circle.png");
    this.load.image("misc-bubble-tail", "./assets/images/bubble-tail.png");
    this.load.image("misc-slash", "./assets/images/slash.png");
    this.load.json("weaponAtlas", "./assets/atlas/weapon.json");
    loadSpritesheets(this);
  }
  create() {
    createAnims(this.scene.manager.getScene("SceneMain"));
  }
  update() {}
}

function createAnims(scene) {
  createWalkingAnims(scene);
  createStaticAnims(scene);
  createSpellAnims(scene);
}

/* Skip making animations for these types */
const checkSkip = (asset) =>
  ["weapon.json", "icons.json", "stackable.json"]?.some((a) => asset?.atlas?.includes(a));

function createStaticAnims(scene) {
  const SINGLE_FRAME_ANIM_KEYS = [
    "up-attack_left",
    "down-attack_left",
    "left-attack_left",
    "right-attack_left",
    "up-attack_right",
    "down-attack_right",
    "left-attack_right",
    "right-attack_right",
    "up-stand",
    "down-stand",
    "left-stand",
    "right-stand",
  ];
  const frameProps = { zeroPad: 0, start: "" };
  for (const asset of assetList) {
    /* Skip non animated atlases */
    if (checkSkip(asset)) continue;
    for (const animKey of SINGLE_FRAME_ANIM_KEYS) {
      scene.anims.create({
        key: asset.texture + "-" + animKey,
        frames: scene.anims.generateFrameNames(asset.texture, {
          prefix: animKey,
          ...frameProps,
        }),
      });
    }
  }
}

function createWalkingAnims(scene) {
  const MULTI_FRAME_ANIM_KEYS = ["up-walk", "down-walk", "left-walk", "right-walk"];
  const frameProps = { zeroPad: 3, start: 0, end: 2 };
  const animProps = { repeat: -1, yoyo: true };
  const animKeys = MULTI_FRAME_ANIM_KEYS;
  for (const asset of assetList) {
    /* Skip non animated atlases */
    if (checkSkip(asset)) continue;
    for (const animKey of animKeys) {
      scene.anims.create({
        key: asset.texture + "-" + animKey,
        frames: scene.anims.generateFrameNames(asset.texture, {
          prefix: animKey + ".",
          ...frameProps,
        }),
        ...animProps,
      });
    }
  }
}

function createSpellAnims(scene) {
  scene.anims.create({
    key: "spell-anim-fireball",
    frames: scene.anims.generateFrameNumbers("spell-anim-fireball", { start: 0, end: 5 }),
    frameRate: 20,
    repeat: true,
    yoyo: true,
  });
}

function loadSpritesheets(scene) {
  scene.load.spritesheet("misc-bubble", "./assets/images/bubble.png", {
    frameWidth: 4,
    frameHeight: 4,
  });
  scene.load.spritesheet("misc-bars", "./assets/images/bars.png", {
    frameWidth: 4,
    frameHeight: 4,
  });
  scene.load.spritesheet("spell-anim-fireball", "./assets/images/spell-anim-fireball.png", {
    frameWidth: 150,
    frameHeight: 150,
  });
  scene.load.spritesheet("spell-anim-chakra", "./assets/images/spell-anim-chakra.png", {
    frameWidth: 150,
    frameHeight: 150,
  });
}

export default SceneBoot;
