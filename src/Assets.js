const assetList = [
  {
    texture: "human-blank",
    src: "./assets/atlas/human-blank.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-shadow",
    src: "./assets/atlas/human-shadow.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human",
    src: "./assets/atlas/human.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-male-chest-bare",
    src: "./assets/atlas/male/chest/chest-bare.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-face-1",
    src: "./assets/atlas/face/face-1.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-face-2",
    src: "./assets/atlas/face/face-2.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-face-3",
    src: "./assets/atlas/face/face-3.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-hair-1",
    src: "./assets/atlas/hair/hair-1.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-hair-2",
    src: "./assets/atlas/hair/hair-2.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-hair-3",
    src: "./assets/atlas/hair/hair-3.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-hair-4",
    src: "./assets/atlas/hair/hair-4.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-female-chest-bare",
    src: "./assets/atlas/female/chest/chest-bare.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  /* NPC */
  {
    texture: "dog",
    src: "./assets/atlas/mob/dog.png",
    atlas: "./assets/atlas/50x50.json",
    previewRect: [0, 100, 50, 50],
  },
  {
    texture: "cat",
    src: "./assets/atlas/mob/cat.png",
    atlas: "./assets/atlas/50x50.json",
    previewRect: [0, 100, 50, 50],
  },
  {
    texture: "dragon",
    src: "./assets/atlas/mob/dragon.png",
    atlas: "./assets/atlas/50x50.json",
    previewRect: [0, 100, 50, 50],
  },
  {
    texture: "slime",
    src: "./assets/atlas/mob/slime.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "bee",
    src: "./assets/atlas/mob/bee.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "raccoon",
    src: "./assets/atlas/mob/raccoon.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "bat",
    src: "./assets/atlas/mob/bat.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "spider",
    src: "./assets/atlas/mob/spider.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "wraith",
    src: "./assets/atlas/mob/wraith.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "zombie",
    src: "./assets/atlas/mob/zombie.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "abomination",
    src: "./assets/atlas/mob/abomination.png",
    atlas: "./assets/atlas/150x150.json",
    previewRect: [0, 300, 150, 150],
  },
  {
    texture: "merman",
    src: "./assets/atlas/mob/merman.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  /* Armor */
  {
    texture: "human-female-armor-plate-light",
    src: "./assets/atlas/female/armor/armor-plate-light.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-male-armor-plate-light",
    src: "./assets/atlas/male/armor/armor-plate-light.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-female-armor-plate",
    src: "./assets/atlas/female/armor/armor-plate.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-male-armor-plate",
    src: "./assets/atlas/male/armor/armor-plate.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-female-armor-robe",
    src: "./assets/atlas/female/armor/armor-robe.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-male-armor-robe",
    src: "./assets/atlas/male/armor/armor-robe.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-female-armor-robe-wizard",
    src: "./assets/atlas/female/armor/armor-robe-wizard.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-male-armor-wizard-robe",
    src: "./assets/atlas/male/armor/armor-robe-wizard.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  /* Helmet */
  {
    texture: "human-helmet-bunny",
    src: "./assets/atlas/helmet/helmet-bunny.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 140, 80, 80],
  },
  {
    texture: "human-helmet-cap",
    src: "./assets/atlas/helmet/helmet-cap.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 0, 80, 40],
  },
  {
    texture: "human-helmet-cap-raccoon",
    src: "./assets/atlas/helmet/helmet-cap-raccoon.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 80, 80, 40],
  },
  /* Accessory */
  {
    texture: "human-accessory-glasses",
    src: "./assets/atlas/accessory/accessory-glasses.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 140, 80, 80],
  },
  /* Boots */
  {
    texture: "human-boots-cloth",
    src: "./assets/atlas/boots/boots-cloth.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 173, 80, 80],
  },
  /* Pants */
  {
    texture: "human-pants-cloth",
    src: "./assets/atlas/pants/pants-cloth.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 163, 80, 80],
  },
  /* Weapon */
  {
    texture: "weapon-dagger",
    src: "./assets/atlas/hands/weapon-dagger.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [37, 37, 17, 17],
  },
  {
    texture: "weapon-spade",
    src: "./assets/atlas/hands/weapon-spade.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [35, 36, 18, 17],
  },
  {
    texture: "weapon-axe",
    src: "./assets/atlas/hands/weapon-axe.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [30, 33, 22, 19],
  },
  {
    texture: "weapon-spear",
    src: "./assets/atlas/hands/weapon-spear.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [24, 0, 32, 60],
  },
  {
    texture: "weapon-cleaver",
    src: "./assets/atlas/hands/weapon-cleaver.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [30, 33, 28, 24],
  },
  {
    texture: "weapon-hammer",
    src: "./assets/atlas/hands/weapon-hammer.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [32, 36, 25, 21],
  },
  {
    texture: "weapon-scythe",
    src: "./assets/atlas/hands/weapon-scythe.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [28, 33, 24, 19],
  },
  {
    texture: "weapon-claymore-soul",
    src: "./assets/atlas/hands/weapon-claymore-soul.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [15, 13, 42, 44],
  },
  {
    texture: "weapon-katar",
    src: "./assets/atlas/hands/weapon-katar.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [36, 45, 19, 19],
  },
  {
    texture: "weapon-gladius",
    src: "./assets/atlas/hands/weapon-gladius.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [29, 29, 27, 27],
  },
  /* Shield */
  {
    texture: "shield-round",
    src: "./assets/atlas/hands/shield-round.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [40, 36, 20, 22],
  },
  {
    texture: "shield-broken",
    src: "./assets/atlas/hands/shield-broken.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [44, 38, 17, 23],
  },
  {
    texture: "shield-buckler",
    src: "./assets/atlas/hands/shield-buckler.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [41, 36, 20, 22],
  },
  {
    texture: "shield-tower",
    src: "./assets/atlas/hands/shield-tower.png",
    atlas: "./assets/atlas/weapon.json",
    previewRect: [42, 35, 16, 24],
  },
  /* Rings */
  {
    texture: "ring-silver-plain",
    src: "./assets/atlas/ring/ring-silver-plain.png",
    atlas: "./assets/atlas/32x32-stackable.json",
    previewRect: [0, 0, 32, 32],
  },
  {
    texture: "ring-gold-plain",
    src: "./assets/atlas/ring/ring-gold-plain.png",
    atlas: "./assets/atlas/32x32-stackable.json",
    previewRect: [0, 0, 32, 32],
  },
  {
    texture: "ring-silver-sapphire",
    src: "./assets/atlas/ring/ring-silver-sapphire.png",
    atlas: "./assets/atlas/32x32-stackable.json",
    previewRect: [0, 0, 32, 32],
  },
  {
    texture: "ring-silver-ruby",
    src: "./assets/atlas/ring/ring-silver-ruby.png",
    atlas: "./assets/atlas/32x32-stackable.json",
    previewRect: [0, 0, 32, 32],
  },
  /* Amulets */
  {
    texture: "amulet-silver-plain",
    src: "./assets/atlas/amulet/amulet-silver-plain.png",
    atlas: "./assets/atlas/32x32-stackable.json",
    previewRect: [0, 0, 32, 32],
  },
  {
    texture: "amulet-gold-plain",
    src: "./assets/atlas/amulet/amulet-gold-plain.png",
    atlas: "./assets/atlas/32x32-stackable.json",
    previewRect: [0, 0, 32, 32],
  },
  {
    texture: "amulet-gold-sapphire",
    src: "./assets/atlas/amulet/amulet-gold-sapphire.png",
    atlas: "./assets/atlas/32x32-stackable.json",
    previewRect: [0, 0, 32, 32],
  },
  // /* Stackable */
  // {
  //   texture: "stackable-skull",
  //   src: "./assets/atlas/stackable/stackable-skull.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "stackable-bsporangium",
  //   src: "./assets/atlas/stackable/stackable-bsporangium.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "stackable-apple",
  //   src: "./assets/atlas/stackable/stackable-apple.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "stackable-grapes",
  //   src: "./assets/atlas/stackable/stackable-grapes.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "stackable-meat",
  //   src: "./assets/atlas/stackable/stackable-meat.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "stackable-cheese",
  //   src: "./assets/atlas/stackable/stackable-cheese.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "stackable-potion-small-hp",
  //   src: "./assets/atlas/stackable/stackable-potion-small-hp.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "stackable-potion-medium-hp",
  //   src: "./assets/atlas/stackable/stackable-potion-medium-hp.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "stackable-potion-small-mp",
  //   src: "./assets/atlas/stackable/stackable-potion-small-mp.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "stackable-potion-medium-mp",
  //   src: "./assets/atlas/stackable/stackable-potion-medium-mp.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // /* Spells */
  // {
  //   texture: "spell-fire",
  //   src: "./assets/atlas/spell/spell-fire.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // {
  //   texture: "spell-heal",
  //   src: "./assets/atlas/spell/spell-heal.png",
  //   atlas: "./assets/atlas/32x32-stackable.json",
  //   previewRect: [0, 0, 32, 32],
  // },
  // /* Misc */
  {
    texture: "icons",
    src: "./assets/images/icons.png",
    atlas: "./assets/atlas/32x32-icons.json",
    previewRect: [0, 0, 32, 32],
  },
];

/* Resolves the right asset compensating for user profile attributes */
const resolveAsset = (item, user) => {
  let textureName = "";
  let returnAsset = null;
  assetList.forEach((asset) => {
    const texture = item?.texture;
    switch (item?.slot) {
      case "hands":
      case "ring":
      case "amulet":
      case "stackable":
      case "spell":
        textureName = texture;
        break;
      case "armor":
        textureName = user?.profile?.race + "-" + user?.profile?.gender + "-" + texture;
        break;
      default:
        textureName = user?.profile?.race + "-" + texture;
        break;
    }
    if (textureName === asset?.texture) {
      returnAsset = asset;
    }
  });
  return returnAsset;
};

export { assetList, resolveAsset };
