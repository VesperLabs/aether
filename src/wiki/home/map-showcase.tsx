import { mapList } from "@/content";
import { Box, loadCacheImage } from "@/ui";
import { useEffect, useRef, useState } from "react";

/** How long each zone pans before fading to the next. */
const ZONE_MS = 9000;
const FADE_MS = 1500;
/** How often animated tiles (water, torches) are redrawn. */
const TICK_MS = 100;
/** The smallest pixel-art zoom for the map tiles; raised when a map is too small to fill the screen. */
const MIN_ZOOM = 2;
/** Tiles kept off-screen along every map edge, where maps are often empty or unfinished. */
const EDGE_TILES = 3;
const DRAWN_LAYERS = ["Ground", "Shadows", "Overlay", "Extras", "Above"];
const GID_MASK = 0x1fffffff;
const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;

type Tileset = {
  firstgid: number;
  image: string;
  columns: number;
  margin?: number;
  spacing?: number;
  tiles?: { id: number; animation?: Frame[] }[];
};
type TiledMap = {
  width: number;
  height: number;
  tilewidth: number;
  layers: { name: string; type: string; data?: number[] }[];
  tilesets: Tileset[];
};

/** Outdoor zones only; interiors are mostly walls and floor. */
const ZONES = [...mapList]
  .filter(({ name }) => !name.includes("Inside"))
  .sort(() => Math.random() - 0.5);

type Frame = { tileid: number; duration: number };

/** Draws a Tiled map onto a new 1x canvas; `tick` redraws its animated tiles for a given time. */
async function drawMap(jsonPath: string) {
  const map = (await (await fetch(jsonPath)).json()) as TiledMap;
  const images = await Promise.all(
    map.tilesets.map((set) => loadCacheImage(`./assets/tilesets/${set.image.split("/").pop()}`)),
  );
  const size = map.tilewidth;
  const canvas = document.createElement("canvas");
  canvas.width = map.width * size;
  canvas.height = map.height * size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const layers = map.layers.filter(
    (layer) => layer.type === "tilelayer" && layer.data && DRAWN_LAYERS.includes(layer.name),
  );
  /* Tiled keeps animations on the tileset, keyed by local tile id. */
  const animations = new Map<number, { firstgid: number; frames: Frame[]; total: number }>();
  for (const set of map.tilesets)
    for (const tile of set.tiles ?? [])
      if (tile.animation?.length)
        animations.set(set.firstgid + tile.id, {
          firstgid: set.firstgid,
          frames: tile.animation,
          total: tile.animation.reduce((sum, f) => sum + f.duration, 0),
        });

  const frameGid = (gid: number, time: number) => {
    const anim = animations.get(gid);
    if (!anim) return gid;
    let t = time % anim.total;
    const frame = anim.frames.find((f) => (t -= f.duration) < 0) ?? anim.frames[0];
    return anim.firstgid + frame.tileid;
  };

  const drawTile = (raw: number, dx: number, dy: number, time: number) => {
    const gid = frameGid(raw & GID_MASK, time);
    const setIndex = map.tilesets.findLastIndex((t) => gid >= t.firstgid);
    const set = map.tilesets[setIndex];
    if (!set) return;
    const index = gid - set.firstgid;
    const step = size + (set.spacing ?? 0);
    const sx = (set.margin ?? 0) + (index % set.columns) * step;
    const sy = (set.margin ?? 0) + Math.floor(index / set.columns) * step;
    const flipX = raw & FLIP_H ? -1 : 1;
    const flipY = raw & FLIP_V ? -1 : 1;
    ctx.save();
    ctx.translate(dx + (flipX < 0 ? size : 0), dy + (flipY < 0 ? size : 0));
    ctx.scale(flipX, flipY);
    ctx.drawImage(images[setIndex], sx, sy, size, size, 0, 0, size, size);
    ctx.restore();
  };

  /** Draws the whole stack of layers in one cell, so animated tiles keep what's above them. */
  const drawCell = (cell: number, time: number) => {
    const dx = (cell % map.width) * size;
    const dy = Math.floor(cell / map.width) * size;
    ctx.clearRect(dx, dy, size, size);
    for (const layer of layers) {
      const raw = layer.data![cell];
      if (raw) drawTile(raw, dx, dy, time);
    }
  };

  const cellCount = map.width * map.height;
  const animatedCells: number[] = [];
  for (let cell = 0; cell < cellCount; cell++) {
    drawCell(cell, 0);
    if (layers.some((layer) => animations.has(layer.data![cell] & GID_MASK)))
      animatedCells.push(cell);
  }
  const tick = (time: number) => animatedCells.forEach((cell) => drawCell(cell, time));
  return { canvas, tick, animates: animatedCells.length > 0, tileSize: size };
}

/** One zone: its map drawn big, fading in once drawn and panning slowly between two random spots. */
const ZoneLayer = ({ jsonPath }: { jsonPath: string }) => {
  const holderRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let animation: Animation | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let onResize: (() => void) | undefined;
    drawMap(jsonPath).then(({ canvas, tick, animates, tileSize }) => {
      const holder = holderRef.current;
      if (cancelled || !holder) return;
      holder.replaceChildren(canvas);
      if (animates) timer = setInterval(() => tick(performance.now()), TICK_MS);
      setReady(true);
      const startedAt = performance.now();
      const duration = ZONE_MS + FADE_MS * 2;
      /* Two random spots for the pan, as fractions of the room to move in. */
      const from = [Math.random(), Math.random()];
      const to = [Math.random(), Math.random()];

      /** Sizes the map to cover the screen and pans it, keeping clear of the map's edge tiles. */
      const fit = () => {
        const edge = EDGE_TILES * tileSize;
        const innerW = canvas.width - edge * 2;
        const innerH = canvas.height - edge * 2;
        /* Whole-number zoom keeps the pixels crisp; go up until the inner map covers the screen. */
        const zoom = Math.max(
          MIN_ZOOM,
          Math.ceil(holder.clientWidth / innerW),
          Math.ceil(holder.clientHeight / innerH),
        );
        canvas.style.cssText = `position:absolute;left:0;top:0;width:${canvas.width * zoom}px;height:${canvas.height * zoom}px;image-rendering:pixelated;`;
        const roomX = innerW * zoom - holder.clientWidth;
        const roomY = innerH * zoom - holder.clientHeight;
        const spot = ([fx, fy]: number[]) =>
          `translate(${-(edge * zoom + fx * roomX)}px, ${-(edge * zoom + fy * roomY)}px)`;
        animation?.cancel();
        animation = canvas.animate([{ transform: spot(from) }, { transform: spot(to) }], {
          duration,
          easing: "linear",
          fill: "forwards",
        });
        animation.currentTime = performance.now() - startedAt;
      };
      fit();
      onResize = fit;
      window.addEventListener("resize", fit);
    });
    return () => {
      cancelled = true;
      animation?.cancel();
      clearInterval(timer);
      if (onResize) window.removeEventListener("resize", onResize);
    };
  }, [jsonPath]);

  return (
    <Box
      ref={holderRef}
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        opacity: ready ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    />
  );
};

/** The real game maps, slowly panning and fading from zone to zone. Fills its positioned parent. */
export const MapShowcase = ({ sx }: { sx?: object }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => i + 1), ZONE_MS);
    return () => clearInterval(timer);
  }, []);

  const current = ZONES[index % ZONES.length];
  const previous = ZONES[(index - 1 + ZONES.length) % ZONES.length];
  return (
    <Box sx={{ position: "absolute", overflow: "hidden", backgroundColor: "shadow.20", ...sx }}>
      {/* The previous zone stays underneath while the next one fades in over it. */}
      {index > 0 && <ZoneLayer key={`${index - 1}-${previous.name}`} jsonPath={previous.json} />}
      <ZoneLayer key={`${index}-${current.name}`} jsonPath={current.json} />
    </Box>
  );
};
