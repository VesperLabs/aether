import Phaser from "phaser";
import { assetList } from "../../shared/Assets";
import soundList from "../../shared/data/soundList.json";
import iconList from "../../shared/data/iconList.json";
import { mapList, mapImageList } from "../../shared/Maps";
import { IMAGE_CACHE } from "../../shared/utils";

/**
 * Rewrite a `./assets/…` path to the CDN base URL when ASSETS_URL is set.
 * JSON data files contain `./assets/` paths that the Vite transform plugin cannot
 * rewrite (it only processes JS/TS modules), so we do it here at runtime.
 */
const ASSETS_BASE = process.env.ASSETS_URL || "";
const assetUrl = (src) =>
  ASSETS_BASE ? src.replace(/^\.\/assets\//, ASSETS_BASE + "/") : src;

const onLoadError = (value) => {
  window.dispatchEvent(
    new CustomEvent("LOAD_ERROR", {
      detail: value,
    })
  );
};

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

    this.load
      .on("progress", (value) => {
        dpanel.setText("Loading... " + Math.floor(value * 100) + "%");
      })
      .on("loaderror", onLoadError);

    // Register a load complete event to launch the title screen when all files are loaded
    this.load.on("complete", () => {
      /* For loot pics */
      assetList.forEach((asset) => {
        let tempText = this.textures.get(asset.texture);
        tempText.add("preview", 0, ...asset.previewRect);
      });

      /* Inject textures into game cache */
      this.textures.each(function (texture) {
        const key = assetList.find((t) => t?.texture === texture.key)?.src;
        if (key && texture.source[0].image) {
          IMAGE_CACHE[key] = texture.source[0].image;
        }
      });

      window.dispatchEvent(new Event("GAME_LOADED"));
      this.scene.start("SceneMain");
      this.scene.start("SceneHud");
    });
    iconList.forEach((asset) => {
      this.load.image(asset.name, assetUrl(asset.src));
    });
    mapImageList.forEach((asset) => {
      this.load.image(asset.name, assetUrl(asset.image));
    });
    mapList.forEach((asset) => {
      this.load.tilemapTiledJSON(asset.name, assetUrl(asset.json));
    });
    assetList.forEach((asset) => {
      this.load.atlas(asset.texture, assetUrl(asset.src), assetUrl(asset.atlas));
    });
    soundList.forEach((asset) => {
      this.load.audio(asset.name, assetUrl(asset.src));
    });
    this.load.bitmapFont("nin-dark", assetUrl("./assets/fonts/dark.png"), assetUrl("./assets/fonts/font.xml"));
    this.load.bitmapFont("nin-light", assetUrl("./assets/fonts/light.png"), assetUrl("./assets/fonts/font.xml"));
    this.load.image("joy-circle", assetUrl("./assets/images/joy-circle.png"));
    this.load.image("misc-bubble-tail", assetUrl("./assets/images/bubble-tail.png"));
    this.load.image("misc-slash", assetUrl("./assets/images/slash.png"));
    this.load.image("sign-1", assetUrl("./assets/images/sign-1.png"));
    this.load.image("sign-blank", assetUrl("./assets/images/sign-blank.png"));
    this.load.json("weaponAtlas", assetUrl("./assets/atlas/weapon.json"));
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

/** Avoid "AnimationManager key already exists" when SceneBoot.create re-runs (HMR / scene restart). */
function createAnimIfMissing(scene, config) {
  if (scene.anims.exists(config.key)) return;
  scene.anims.create(config);
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
      createAnimIfMissing(scene, {
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
      createAnimIfMissing(scene, {
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
  //spells
  createAnimIfMissing(scene, {
    key: "spell-anim-fireball",
    frames: scene.anims.generateFrameNumbers("spell-anim-fireball", { start: 0, end: 5 }),
    repeat: -1,
    yoyo: true,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-waterball",
    frames: scene.anims.generateFrameNumbers("spell-anim-balls", { start: 40, end: 49 }),
    repeat: -1,
    yoyo: false,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-lightball",
    frames: scene.anims.generateFrameNumbers("spell-anim-balls", { start: 10, end: 19 }),
    repeat: -1,
    yoyo: false,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-holyball",
    frames: scene.anims.generateFrameNumbers("spell-anim-balls", { start: 10, end: 19 }),
    repeat: -1,
    yoyo: false,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-chakra",
    frames: scene.anims.generateFrameNumbers("spell-anim-chakra", { start: 0, end: 5 }),
    repeat: -1,
    yoyo: true,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-hits-physical",
    frames: scene.anims.generateFrameNumbers("spell-anim-hits", { start: 0, end: 8 }),
    repeat: 0,
    yoyo: false,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-quake",
    frames: scene.anims.generateFrameNumbers("spell-anim-quake", { start: 0, end: 5 }),
    repeat: 0,
    yoyo: false,
    frameRate: 20,
  });
  //hits
  createAnimIfMissing(scene, {
    key: "spell-anim-hits-water",
    frames: scene.anims.generateFrameNumbers("spell-anim-hits", { start: 9, end: 17 }),
    repeat: 0,
    yoyo: false,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-hits-fire",
    frames: scene.anims.generateFrameNumbers("spell-anim-hits", { start: 18, end: 26 }),
    repeat: 0,
    yoyo: false,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-hits-light",
    frames: scene.anims.generateFrameNumbers("spell-anim-hits", { start: 27, end: 35 }),
    repeat: 0,
    yoyo: false,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-hits-earth",
    frames: scene.anims.generateFrameNumbers("spell-anim-hits", { start: 36, end: 44 }),
    repeat: 0,
    yoyo: false,
    frameRate: 20,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-hits-holy",
    frames: scene.anims.generateFrameNumbers("spell-anim-hits", { start: 45, end: 53 }),
    repeat: 0,
    yoyo: false,
    frameRate: 20,
  });
  //slashes
  createAnimIfMissing(scene, {
    key: "spell-anim-slash-physical",
    frames: scene.anims.generateFrameNumbers("spell-anim-slash", { start: 18, end: 26 }),
    repeat: false,
    yoyo: false,
    frameRate: 60,
  });
  createAnimIfMissing(scene, {
    key: "spell-anim-slash-fire",
    frames: scene.anims.generateFrameNumbers("spell-anim-slash", { start: 0, end: 8 }),
    repeat: false,
    yoyo: false,
    frameRate: 60,
  });
  createAnimIfMissing(scene, {
    key: "loot-anim-sparkle",
    frames: scene.anims.generateFrameNumbers("loot-anim-sparkle", { start: 0, end: 6 }),
    repeat: -1,
    yoyo: true,
    frameRate: 20,
    repeatDelay: 3000,
  });
}

function loadSpritesheets(scene) {
  scene.load.spritesheet("misc-bubble", assetUrl("./assets/images/bubble.png"), {
    frameWidth: 4,
    frameHeight: 4,
  });
  scene.load.spritesheet("loot-anim-sparkle", assetUrl("./assets/images/loot-anim-sparkle.png"), {
    frameWidth: 7,
    frameHeight: 7,
  });
  scene.load.spritesheet("misc-bars", assetUrl("./assets/images/bars.png"), {
    frameWidth: 4,
    frameHeight: 4,
  });
  scene.load.spritesheet("spell-anim-fireball", assetUrl("./assets/images/spell-anim-fireball.png"), {
    frameWidth: 150,
    frameHeight: 150,
  });
  scene.load.spritesheet("spell-anim-balls", assetUrl("./assets/images/spell-anim-balls.png"), {
    frameWidth: 96,
    frameHeight: 96,
  });
  scene.load.spritesheet("spell-anim-chakra", assetUrl("./assets/images/spell-anim-chakra.png"), {
    frameWidth: 150,
    frameHeight: 150,
  });
  scene.load.spritesheet("spell-anim-hits", assetUrl("./assets/images/spell-anim-hits.png"), {
    frameWidth: 96,
    frameHeight: 96,
  });
  scene.load.spritesheet("spell-anim-quake", assetUrl("./assets/images/spell-anim-quake.png"), {
    frameWidth: 192,
    frameHeight: 96,
  });
  scene.load.spritesheet("spell-anim-slash", assetUrl("./assets/images/spell-anim-slash.png"), {
    frameWidth: 96,
    frameHeight: 96,
  });
}

export default SceneBoot;
