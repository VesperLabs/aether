import { Box } from "@/ui/kit";
import { useEffect, useRef } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { bladePixels, findEdgePixels } from "./edge-pixels";
import { ELEMENT_EFFECTS } from "./element-effects";
import { ElementSim, type ToLayer } from "./element-sim";

/** Room around the sprite, in its pixels, for particles to rise and drift into. */
const PAD = 14;
/** The outline's four 1px-shifted copies: up, right, down, left, as `ElementSim.outline` gives. */
const OUTLINE_OFFSETS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const css = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/**
 * A weapon sprite drawing `ElementSim`, the same simulation the game draws in a player's hand.
 * Drawn at the sprite's own pixel size and scaled up with crisp pixels.
 */
export const ElementalSprite = ({
  src,
  width,
  height,
  scale,
  elements,
  grip,
  layerSx,
}: {
  src: string;
  width: number;
  height: number;
  scale: number;
  elements: string[];
  /** Where the weapon is held, in the image's pixels: effects come off the blade, away from it. */
  grip: { x: number; y: number };
  /**
   * Places the art (e.g. `position: absolute`). Given to each layer itself, since a positioned
   * wrapper would cut the glow off from the page behind it.
   */
  layerSx?: ThemeUIStyleObject;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const solidRef = useRef<HTMLCanvasElement>(null);
  /* Callers derive a fresh array each render; restart only when the elements really change */
  const elementKey = elements.join();
  /* Likewise the grip: callers build a fresh object, so depend on its numbers */
  const { x: gripX, y: gripY } = grip;

  useEffect(() => {
    // Two layers: glowing light that the page blends in (as Phaser adds it to the world), and the
    // solid weapon and solid particles drawn normally on top
    const canvas = canvasRef.current;
    const glow = canvas?.getContext("2d");
    const solid = solidRef.current?.getContext("2d");
    const effects = elementKey
      .split(",")
      .map((element) => ELEMENT_EFFECTS[element])
      .filter(Boolean);
    if (!canvas || !glow || !solid || effects.length === 0) return;

    const sim = new ElementSim(effects);
    const image = new Image();
    const silhouette = document.createElement("canvas");
    silhouette.width = width;
    silhouette.height = height;
    const sctx = silhouette.getContext("2d");
    // Art pixels are measured from their centres, as in the game; the canvas pads the art
    const toLayer: ToLayer = ({ x, y }) => ({ x: x + PAD, y: y + PAD });
    let frame = 0;
    let visible = true;
    let last = 0;

    const draw = (time: number) => {
      const delta = last ? time - last : 16;
      last = time;
      sim.step(time, delta, toLayer);
      glow.clearRect(0, 0, canvas.width, canvas.height);
      solid.clearRect(0, 0, canvas.width, canvas.height);

      // Outline: four 1px-shifted copies of the art, tinted
      sim.outline().forEach((look, side) => {
        if (!sctx) return;
        const [ox, oy] = OUTLINE_OFFSETS[side];
        sctx.globalCompositeOperation = "source-over";
        sctx.clearRect(0, 0, width, height);
        sctx.drawImage(image, 0, 0);
        sctx.globalCompositeOperation = "source-in";
        sctx.fillStyle = css(look.color);
        sctx.fillRect(0, 0, width, height);
        glow.globalAlpha = look.alpha;
        glow.globalCompositeOperation = "screen";
        glow.drawImage(silhouette, PAD + ox, PAD + oy);
      });
      glow.globalCompositeOperation = "lighter";

      for (const pixel of sim.pixels(toLayer)) {
        const layer = pixel.glow ? glow : solid;
        layer.globalAlpha = pixel.alpha;
        layer.fillStyle = css(pixel.color);
        layer.fillRect(pixel.x, pixel.y, pixel.width, pixel.height);
      }
      glow.globalAlpha = 1;
      glow.globalCompositeOperation = "source-over";
      solid.globalAlpha = 1;

      // The weapon goes on last, so effects show around it and never over it, as in the game
      solid.drawImage(image, PAD, PAD);

      if (visible) frame = requestAnimationFrame(draw);
    };

    // Only animate while on screen: the item list can hold many elemental weapons
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      last = 0;
      if (visible) frame = requestAnimationFrame(draw);
    });

    image.onload = () => {
      const read = document.createElement("canvas");
      read.width = width;
      read.height = height;
      const rctx = read.getContext("2d", { willReadFrequently: true });
      if (!rctx) return;
      rctx.drawImage(image, 0, 0);
      const grip = { x: gripX, y: gripY };
      const edges = findEdgePixels(rctx.getImageData(0, 0, width, height).data, width, height);
      sim.setBlade(
        bladePixels(edges, grip).map(({ x, y }) => ({ x: x + 0.5, y: y + 0.5 })),
        grip,
      );
      observer.observe(canvas);
    };
    image.src = src;

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [src, width, height, elementKey, gripX, gripY]);

  const size = { width: width + PAD * 2, height: height + PAD * 2 };
  const layer: ThemeUIStyleObject = {
    display: "block",
    gridArea: "1 / 1",
    width: size.width * scale,
    height: size.height * scale,
    imageRendering: "pixelated",
    pointerEvents: "none",
    ...layerSx,
  };
  return (
    // No position, transform or z-index here: any of them would isolate the glow from the page
    <Box
      sx={
        layerSx
          ? { display: "contents" }
          : // The padding is for particles only: the sprite keeps its place in the layout
            { display: "grid", flexShrink: 0, m: `${-PAD * scale}px` }
      }
    >
      <Box as="canvas" ref={canvasRef} {...size} sx={{ ...layer, mixBlendMode: "plus-lighter" }} />
      {/* Positioned, or the blended glow (painted as if positioned) would land on top of it */}
      <Box as="canvas" ref={solidRef} {...size} sx={{ position: "relative", ...layer }} />
    </Box>
  );
};
