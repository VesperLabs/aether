import type { AssetDefinition } from "./sprite-types";

export const mobSprites = [
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
    texture: "wyrm",
    src: "./assets/atlas/mob/wyrm.png",
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
    texture: "fish",
    src: "./assets/atlas/mob/fish.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "crab",
    src: "./assets/atlas/mob/crab.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "orchid",
    src: "./assets/atlas/mob/orchid.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "earth-elemental",
    src: "./assets/atlas/mob/earth-elemental.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "wolf",
    src: "./assets/atlas/mob/wolf.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "bear",
    src: "./assets/atlas/mob/bear.png",
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
] as const satisfies readonly AssetDefinition[];
