import { useEffect, useRef } from "react";
import type { Rect } from "./map-stamps";
import { TERRAINS, type TerrainGrid } from "./map-terrain";
import type { LoadedTileset } from "./use-tilesets";

const TILE = 32;
const FLIP_BITS = 0xe0000000;

export interface CanvasLayer {
  name: string;
  data: readonly number[];
  /** Drawn as a red wash instead of its tiles, for Collide. */
  tint?: boolean;
}

export interface CanvasPoint {
  /** Nearest tile corner, for painting terrain. */
  corner: { x: number; y: number };
  /** Tile under the pointer, for stamps. */
  tile: { x: number; y: number };
}

interface MapCanvasProps {
  /** Size in tiles. */
  width: number;
  height: number;
  layers: CanvasLayer[];
  tilesets: LoadedTileset[];
  zoom: number;
  /** Corner dots, shown while editing terrain. */
  grid?: TerrainGrid;
  /** Outlined, for a stamp being cut or placed. */
  highlight?: Rect;
  cursor?: string;
  onPointerDown: (point: CanvasPoint, event: React.PointerEvent) => void;
  onPointerMove: (point: CanvasPoint, dragging: boolean) => void;
  onPointerUp: () => void;
  onLeave?: () => void;
}

const drawGid = (
  context: CanvasRenderingContext2D,
  tilesets: LoadedTileset[],
  gid: number,
  x: number,
  y: number,
) => {
  const base = gid & ~FLIP_BITS;
  const tileset = tilesets.findLast((candidate) => candidate.firstgid <= base);
  if (!tileset?.image) return;
  const local = base - tileset.firstgid;
  const step = TILE + tileset.spacing;
  const sourceX = tileset.margin + (local % tileset.columns) * step;
  const sourceY = tileset.margin + Math.floor(local / tileset.columns) * step;
  context.drawImage(tileset.image, sourceX, sourceY, TILE, TILE, x, y, TILE, TILE);
};

const drawLayer = (
  context: CanvasRenderingContext2D,
  { data, tint }: CanvasLayer,
  props: MapCanvasProps,
) => {
  data.forEach((gid, index) => {
    if (!gid) return;
    const x = (index % props.width) * TILE;
    const y = Math.floor(index / props.width) * TILE;
    if (tint) {
      context.fillStyle = "rgba(220, 38, 38, 0.35)";
      context.fillRect(x, y, TILE, TILE);
    } else drawGid(context, props.tilesets, gid, x, y);
  });
};

/** A dot per grid corner, so painting shows which corners Claude or the brush set. */
const drawTerrain = (context: CanvasRenderingContext2D, grid: TerrainGrid) => {
  grid.forEach((row, y) =>
    [...row].forEach((letter, x) => {
      context.fillStyle = TERRAINS.find((terrain) => terrain.letter === letter)?.preview ?? "#000";
      context.strokeStyle = "rgba(0,0,0,0.6)";
      context.beginPath();
      context.arc(x * TILE, y * TILE, 5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }),
  );
};

const drawHighlight = (context: CanvasRenderingContext2D, rect: Rect) => {
  context.strokeStyle = "#facc15";
  context.lineWidth = 2;
  context.strokeRect(
    rect.x * TILE + 1,
    rect.y * TILE + 1,
    rect.width * TILE - 2,
    rect.height * TILE - 2,
  );
};

export const MapCanvas = (props: MapCanvasProps) => {
  const { width, height, zoom } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width * TILE, height * TILE);
    for (const layer of props.layers) drawLayer(context, layer, props);
    if (props.grid) drawTerrain(context, props.grid);
    if (props.highlight) drawHighlight(context, props.highlight);
  });

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>): CanvasPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / zoom / TILE;
    const y = (event.clientY - bounds.top) / zoom / TILE;
    return {
      corner: { x: Math.round(x), y: Math.round(y) },
      tile: {
        x: Math.min(width - 1, Math.max(0, Math.floor(x))),
        y: Math.min(height - 1, Math.max(0, Math.floor(y))),
      },
    };
  };

  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    props.onPointerUp();
  };

  return (
    <canvas
      ref={canvasRef}
      width={width * TILE}
      height={height * TILE}
      style={{
        width: width * TILE * zoom,
        height: height * TILE * zoom,
        imageRendering: "pixelated",
        cursor: props.cursor ?? "crosshair",
        background: "#000",
      }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        props.onPointerDown(pointAt(event), event);
      }}
      onPointerMove={(event) => props.onPointerMove(pointAt(event), dragging.current)}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={props.onLeave}
    />
  );
};
