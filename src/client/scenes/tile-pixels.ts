import type Phaser from "phaser";

/** Each tileset texture's pixels, read once. */
const texturePixels = new Map<string, ImageData>();

export function pixelsOf(texture: Phaser.Textures.Texture) {
  let pixels = texturePixels.get(texture.key);
  if (!pixels) {
    const source = texture.getSourceImage() as CanvasImageSource & {
      width: number;
      height: number;
    };
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;
    context.drawImage(source, 0, 0);
    pixels = context.getImageData(0, 0, source.width, source.height);
    texturePixels.set(texture.key, pixels);
  }
  return pixels;
}
