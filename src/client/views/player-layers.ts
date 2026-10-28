import Phaser from "phaser";
import {
  HAIR_HIDING_HELMETS,
  FACE_HIDING_HELMETS,
  ACCESSORY_HIDING_HELMETS,
  FACE_HIDING_ACCESSORIES,
  HAIR_HIDING_ACCESSORIES,
} from "@/content";
import type { Player } from "./player";
import { Crosshair } from "@/client/input/crosshair";
import { toTint } from "./tint";
import { Bubble } from "./bubble";
import { Bar } from "./bar";
import { WeaponSprite } from "./weapon-sprite";
import { BuffRack } from "./buff-rack";
import { deriveElements } from "./weapon-elements";

const { Sprite, BitmapText, Container } = Phaser.GameObjects;
const BLANK_TEXTURE = "human-blank";

/** Creates every sprite layer of a character (skin, gear, bars, bubble) and adds it to the container. */
export function createSpriteLayers(player: Player) {
  const scene = player.scene;
  const defaults: [Phaser.Scene, number, number, string] = [
    scene,
    0,
    player.bodyOffsetY,
    BLANK_TEXTURE,
  ];
  player.setDepth(100);

  const isHuman = player?.profile?.race === "human";

  player.skin = scene.add.existing(new Sprite(...defaults));
  player.chest = scene.add.existing(new Sprite(...defaults));
  player.face = scene.add.existing(new Sprite(...defaults));
  player.whiskers = scene.add.existing(new Sprite(...defaults));
  player.hair = scene.add.existing(new Sprite(...defaults));
  player.armor = scene.add.existing(new Sprite(...defaults));
  player.helmet = scene.add.existing(new Sprite(...defaults));
  player.boots = scene.add.existing(new Sprite(...defaults));
  player.gloves = scene.add.existing(new Sprite(...defaults));
  player.pants = scene.add.existing(new Sprite(...defaults));
  player.accessory = scene.add.existing(new Sprite(...defaults));
  player.handLeft = scene.add.existing(
    isHuman
      ? new WeaponSprite(scene, 13, -9, BLANK_TEXTURE)
      : new Sprite(scene, 13, -9, BLANK_TEXTURE),
  );
  player.handRight = scene.add.existing(
    isHuman
      ? new WeaponSprite(scene, -13, -9, BLANK_TEXTURE)
      : new Sprite(scene, -13, -9, BLANK_TEXTURE),
  );
  player.shadow = scene.add.existing(new Sprite(...defaults));
  player.bubble = scene.add.existing(
    new Bubble(scene, player?.headY, player.state?.bubbleMessage ?? undefined),
  );
  player.crosshair = scene.add.existing(
    new Crosshair(scene, 0, player.bodyOffsetY, "icons", "crosshair", player, 40),
  );
  player.hpBar = scene.add.existing(new Bar(scene, 0, player?.headY, 32, 12)).setVisible(false);
  player.userName = scene.add.existing(
    new BitmapText(player.scene, 0, 8, "nin-light").setScale(0.5),
  );
  player.buffRack = scene.add.existing(new BuffRack(scene, 0, 19, player.buffs)).setVisible(false);
  player.corpse = scene.add
    .existing(new Sprite(scene, 0, player.bodyOffsetY, "icons", "grave"))
    .setVisible(false);
  player.talkMenu = scene.add
    .existing(new Sprite(scene, 6, player?.headY - 6, "icons", "chat"))
    .setVisible(false);
  /* Everything that moves with the body goes in the rig, so lunges and flinches move it as one */
  player.rig = scene.add.existing(new Container(scene, 0, 0));
  player.rig.add([
    player.shadow,
    player.chest,
    player.skin,
    player.face,
    player.whiskers,
    player.hair,
    player.accessory,
    player.armor,
    player.boots,
    player.gloves,
    player.pants,
    player.helmet,
    player.handLeft,
    player.handRight,
    player.buffRack,
    player.userName,
    player.bubble,
    player.hpBar,
  ]);
  player.add(player.corpse);
  player.add(player.rig);
  player.add(player.talkMenu);

  if (player.isHero) {
    player.add(player.crosshair);
  }
}

/** Tints and shows or hides the layers to match the character profile and visible equipment. */
export function applyAppearance(player: Player) {
  const { profile, visibleEquipment } = player || {};
  const isBoss = profile?.scale > 1;
  /* Clears a hit flash, including the solid white fill mode */
  player.doFlashAnimation(0xffffff);
  if (profile?.userName) {
    player.updateUserName();
  }
  player.skin.setScale(profile?.scale || 1);
  player.shadow.setScale(profile?.scale || 1);
  player.corpse.setScale(isBoss ? profile?.scale / 2 : 1);
  player.corpse.setTint(isBoss ? 0xaa88aa : 0xcc9966);
  player.skin.setTint(toTint(profile?.tint || "0xFFFFFF"));
  player.chest.setTint(toTint(profile?.tint || "0xFFFFFF"));
  player.hair.setTint(toTint(profile?.hair?.tint || "0xFFFFFF"));
  player.face.setTint(toTint(profile?.face?.tint || "0xFFFFFF"));
  player.whiskers.setTint(toTint(profile?.whiskers?.tint || "0xFFFFFF"));

  if (player.profile.race === "human") {
    (player.handLeft as WeaponSprite).setElements(
      player.hasWeaponLeft() ? deriveElements(visibleEquipment?.handLeft?.stats) : [],
    );
    (player.handRight as WeaponSprite).setElements(
      player.hasWeaponRight() ? deriveElements(visibleEquipment?.handRight?.stats) : [],
    );
  }

  for (const [key, slot] of Object.entries<{ tint?: string }>(visibleEquipment)) {
    (player as unknown as Record<string, Phaser.GameObjects.Sprite | undefined>)[key]?.setTint(
      toTint(slot?.tint || "0xFFFFFF"),
    );
  }

  /* Helmet types that hide face and hair need to get hidden */
  player.hair.setVisible(true);
  if (HAIR_HIDING_HELMETS.includes(visibleEquipment?.helmet?.texture)) {
    player.hair.setVisible(false);
  }
  if (HAIR_HIDING_ACCESSORIES.includes(visibleEquipment?.accessory?.texture)) {
    player.hair.setVisible(false);
  }
  player.whiskers.setVisible(true);
  if (FACE_HIDING_HELMETS.includes(visibleEquipment?.helmet?.texture)) {
    player.face.setVisible(false);
    player.whiskers.setVisible(false);
  }
  player.accessory.setVisible(true);
  if (ACCESSORY_HIDING_HELMETS.includes(visibleEquipment?.helmet?.texture)) {
    player.accessory.setVisible(false);
  }
  player.face.setVisible(true);
  if (FACE_HIDING_ACCESSORIES.includes(visibleEquipment?.accessory?.texture)) {
    player.face.setVisible(false);
  }
}
