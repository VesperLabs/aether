import Phaser from "phaser";

const BACKGROUND = 0x000000;
const FRAME = 0x6b5338;
const FILL = 0xe8d9b5;
const TEXT = "#e8d9b5";
const BAR_WIDTH = 240;
const BAR_HEIGHT = 8;

/** Draws a framed progress bar for the scene's loader and keeps it centred on resize. */
export function showLoadingBar(scene: Phaser.Scene) {
  const background = scene.add.rectangle(0, 0, 1, 1, BACKGROUND).setOrigin(0);
  const frame = scene.add.rectangle(0, 0, BAR_WIDTH + 4, BAR_HEIGHT + 4).setStrokeStyle(1, FRAME);
  const fill = scene.add.rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, FILL).setOrigin(0, 0.5);
  const label = scene.add
    .text(0, 0, "Loading", { fontFamily: "monospace", fontSize: "12px", color: TEXT })
    .setOrigin(0.5, 1);
  fill.scaleX = 0;

  const layout = () => {
    const { width, height } = scene.scale;
    const x = Math.round(width / 2);
    const y = Math.round(height / 2);
    background.setSize(width, height);
    frame.setPosition(x, y);
    fill.setPosition(x - BAR_WIDTH / 2, y);
    label.setPosition(x, y - BAR_HEIGHT - 6);
  };
  layout();
  scene.scale.on("resize", layout);

  scene.load.on("progress", (value: number) => {
    fill.scaleX = value;
    label.setText(`Loading ${Math.floor(value * 100)}%`);
  });
  scene.load.once("complete", () => scene.scale.off("resize", layout));
}
