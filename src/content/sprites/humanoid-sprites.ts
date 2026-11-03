import type { AssetDefinition } from "./sprite-types";

export const humanoidSprites = [
  {
    texture: "human-blank",
    src: "./assets/atlas/human-blank.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "shadow",
    src: "./assets/atlas/shadow.png",
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
    texture: "human-whiskers-0",
    src: "./assets/atlas/human-blank.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-whiskers-1",
    src: "./assets/atlas/whiskers/whiskers-1.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-whiskers-2",
    src: "./assets/atlas/whiskers/whiskers-2.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-whiskers-3",
    src: "./assets/atlas/whiskers/whiskers-3.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-hair-0",
    src: "./assets/atlas/human-blank.png",
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
    texture: "human-hair-5",
    src: "./assets/atlas/hair/hair-5.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
  {
    texture: "human-female-chest-bare",
    src: "./assets/atlas/female/chest/chest-bare.png",
    atlas: "./assets/atlas/80x80.json",
    previewRect: [0, 160, 80, 80],
  },
] as const satisfies readonly AssetDefinition[];
