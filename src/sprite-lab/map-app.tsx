import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Field,
  FieldHint,
  Flex,
  Input,
  Select,
  Text,
  TextDivider,
} from "@/ui";
import { FloatingPanel } from "./floating-panel";
import { useStampLibrary } from "./use-stamp-library";
import { useTilesets } from "./use-tilesets";
import { LabNav } from "./lab-nav";
import { MapPromptPanel } from "./map-prompt-panel";
import { MapCanvas, type CanvasLayer, type CanvasPoint } from "./map-canvas";
import { createRepair } from "./map-repair";
import { placementAt, type StampPlacement } from "./map-stamps";
import { buildTileLayers, buildTiledMap, getTerrainWangset, type TiledMap } from "./map-tiled";
import {
  blankGrid,
  normalizeGrid,
  setTerrain,
  TERRAINS,
  type TerrainGrid,
  type TerrainLetter,
} from "./map-terrain";

const TEMPLATE_URL = "/assets/tilemaps/grassland.json";
const DRAFT_KEY = "map-lab-draft";
const ZOOMS = [0.5, 1, 1.5, 2];
const BRUSHES = [0, 1, 2];

interface Draft {
  grid: TerrainGrid;
  stamps: StampPlacement[];
  name: string;
}

type Snapshot = Pick<Draft, "grid" | "stamps">;

type Tool = "terrain" | "stamp";

const loadDraft = (): Draft => {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "");
    if (Array.isArray(draft.grid) && draft.grid.length) return { stamps: [], ...draft };
  } catch {
    /* No draft yet, or storage is blocked. */
  }
  return { grid: blankGrid(36, 36), stamps: [], name: "new-map" };
};

const saveDraft = (draft: Draft) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Storage is blocked: the draft just won't survive a reload. */
  }
};

const download = (name: string, data: object) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `${name}.json` });
  link.click();
  URL.revokeObjectURL(url);
};

const PANEL_WIDTH = 340;

export const MapApp = () => {
  const [draft, setDraft] = useState(loadDraft);
  const { grid, stamps, name } = draft;
  const setGrid = (next: TerrainGrid) => setDraft((current) => ({ ...current, grid: next }));
  const setStamps = (next: StampPlacement[]) =>
    setDraft((current) => ({ ...current, stamps: next }));
  const [history, setHistory] = useState<Snapshot[]>([]);
  const strokeStart = useRef<Snapshot>(undefined);
  /** Corners painted this stroke: repair works around them instead of undoing them. */
  const strokeCorners = useRef(new Set<string>());

  const [template, setTemplate] = useState<TiledMap>();
  const tilesets = useTilesets(template);
  const { library } = useStampLibrary();
  const [tool, setTool] = useState<Tool>("terrain");
  const [stampId, setStampId] = useState("");
  const [hover, setHover] = useState<{ x: number; y: number }>();
  const [showCollide, setShowCollide] = useState(false);
  const [brush, setBrush] = useState<TerrainLetter>("w");
  const [brushSize, setBrushSize] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showTerrain, setShowTerrain] = useState(false);

  const [error, setError] = useState("");

  const width = grid[0].length - 1;
  const height = grid.length - 1;

  useEffect(() => saveDraft(draft), [draft]);

  useEffect(() => {
    fetch(TEMPLATE_URL)
      .then((response) => response.json())
      .then(setTemplate)
      .catch(() => setError(`Couldn't load ${TEMPLATE_URL}`));
  }, []);

  const repair = useMemo(
    () => (template ? createRepair(getTerrainWangset(template)) : (grid: TerrainGrid) => grid),
    [template],
  );

  const tileLayers = useMemo(
    () => (template ? buildTileLayers(grid, template, stamps, library) : undefined),
    [grid, stamps, template, library],
  );
  const canvasLayers: CanvasLayer[] = tileLayers
    ? Object.entries(tileLayers)
        .filter(([layer]) => showCollide || layer !== "Collide")
        .map(([layer, data]) => ({ name: layer, data, tint: layer === "Collide" }))
    : [];

  const selectedStamp = library.find((stamp) => stamp.id === stampId) ?? library[0];
  const ghost =
    tool === "stamp" && hover && selectedStamp
      ? { ...hover, width: selectedStamp.width, height: selectedStamp.height }
      : undefined;

  const remember = (previous: Snapshot = { grid, stamps }) =>
    setHistory((past) => [...past.slice(-49), previous]);

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory(history.slice(0, -1));
    setDraft((current) => ({ ...current, ...previous }));
  };

  const pressStamp = ({ tile }: CanvasPoint, event: React.PointerEvent) => {
    remember();
    if (event.button === 2 || event.shiftKey) {
      const index = placementAt(stamps, library, tile.x, tile.y);
      if (index >= 0) setStamps(stamps.filter((_, at) => at !== index));
    } else if (selectedStamp) {
      setStamps([...stamps, { id: selectedStamp.id, ...tile }]);
    }
  };

  const paint = (x: number, y: number) => {
    strokeStart.current ??= { grid, stamps };
    setDraft((current) => {
      let next = current.grid;
      for (let dy = -brushSize; dy <= brushSize; dy++) {
        for (let dx = -brushSize; dx <= brushSize; dx++) {
          const inside = next[y + dy]?.[x + dx] !== undefined;
          if (inside && dx * dx + dy * dy <= brushSize * brushSize + 1) {
            next = setTerrain(next, x + dx, y + dy, brush);
            strokeCorners.current.add(`${x + dx},${y + dy}`);
          }
        }
      }
      return { ...current, grid: repair(next, strokeCorners.current) };
    });
  };

  const endStroke = () => {
    if (strokeStart.current) remember(strokeStart.current);
    strokeStart.current = undefined;
    strokeCorners.current = new Set();
  };

  const resize = (nextWidth: number, nextHeight: number) => {
    remember();
    setGrid(normalizeGrid(grid, nextWidth + 1, nextHeight + 1));
  };

  return (
    <Flex sx={{ gap: 3, p: 3, alignItems: "flex-start", boxSizing: "border-box" }}>
      <FloatingPanel
        id="map-lab"
        title={
          <>
            <Text sx={{ fontWeight: "bold" }}>Map Lab</Text>
            <LabNav />
          </>
        }
        width={PANEL_WIDTH}
        start={{ x: 16, y: 16 }}
        overflowing
      >
        <Flex sx={{ flexDirection: "column", gap: 2 }}>
          <MapPromptPanel
            request={{ width, height, grid, stamps }}
            onResult={(result) => {
              remember();
              setDraft((current) => ({
                ...current,
                grid: repair(result.grid),
                stamps: result.stamps,
              }));
            }}
            onError={setError}
          />
          {error && <Text sx={{ fontSize: 0, color: "#fca5a5" }}>{error}</Text>}

          <TextDivider>Paint</TextDivider>
          <Field label="Tool" layout="row">
            <ButtonGroup
              label="Tool"
              value={tool}
              onChange={setTool}
              options={[
                { value: "terrain", label: "Terrain" },
                { value: "stamp", label: "Stamps" },
              ]}
            />
          </Field>
          {tool === "stamp" && (
            <>
              <Field label="Stamp" layout="row">
                <Select
                  label="Stamp"
                  value={selectedStamp?.id ?? ""}
                  options={library.map((stamp) => ({
                    value: stamp.id,
                    label: `${stamp.id} (${stamp.width}x${stamp.height})`,
                  }))}
                  onChange={setStampId}
                />
              </Field>
              <FieldHint>
                Click to place, right- or shift-click to remove. Cut new stamps on the Stamps tab.
              </FieldHint>
            </>
          )}
          {tool === "terrain" && (
            <>
              <Field label="Terrain">
                <ButtonGroup
                  label="Terrain"
                  value={brush}
                  onChange={setBrush}
                  options={TERRAINS.map((terrain) => ({
                    value: terrain.letter,
                    label: (
                      <>
                        <Box sx={{ width: 10, height: 10, bg: terrain.preview, borderRadius: 2 }} />
                        {terrain.name}
                      </>
                    ),
                  }))}
                />
              </Field>
            </>
          )}
          <Field label="Brush" layout="row">
            <ButtonGroup
              label="Brush size"
              value={brushSize}
              onChange={setBrushSize}
              options={BRUSHES.map((size) => ({ value: size, label: `${size * 2 + 1}` }))}
            />
            <Button variant="control" disabled={!history.length} onClick={undo}>
              Undo
            </Button>
          </Field>
          <Field label="Zoom" layout="row">
            <ButtonGroup
              label="Zoom"
              value={zoom}
              onChange={setZoom}
              options={ZOOMS.map((level) => ({ value: level, label: `${level}x` }))}
            />
          </Field>
          <Field label="Show" layout="row">
            <ButtonGroup
              label="Show"
              value={showTerrain ? "corners" : "tiles"}
              onChange={(view) => setShowTerrain(view === "corners")}
              options={[
                { value: "tiles", label: "Tiles" },
                { value: "corners", label: "Corners" },
              ]}
            />
            <ButtonGroup
              label="Collision"
              value={showCollide ? "on" : "off"}
              onChange={(value) => setShowCollide(value === "on")}
              options={[
                { value: "off", label: "Art" },
                { value: "on", label: "Collide" },
              ]}
            />
          </Field>

          <TextDivider>Map</TextDivider>
          <Field label="Name" layout="row">
            <Input
              aria-label="Map name"
              value={name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </Field>
          {(["width", "height"] as const).map((side) => (
            <Field key={side} label={side} layout="row">
              <Input
                aria-label={`Map ${side} in tiles`}
                type="number"
                min={8}
                max={80}
                defaultValue={side === "width" ? width : height}
                key={`${side}-${side === "width" ? width : height}`}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  const clamped = Math.min(80, Math.max(8, Math.round(value) || 8));
                  if (side === "width") resize(clamped, height);
                  else resize(width, clamped);
                }}
                sx={{ width: 80 }}
              />
            </Field>
          ))}
          <Flex sx={{ gap: 2 }}>
            <Button
              variant="control"
              disabled={!template}
              onClick={() =>
                template && download(name, buildTiledMap(grid, template, stamps, library))
              }
            >
              Export Tiled JSON
            </Button>
            <Button
              variant="control"
              onClick={() => {
                remember();
                setDraft((current) => ({
                  ...current,
                  grid: blankGrid(width + 1, height + 1),
                  stamps: [],
                }));
              }}
            >
              Clear
            </Button>
          </Flex>
          <FieldHint>
            Save the export into public/assets/tilemaps/ and add doors and NPCs in Tiled.
          </FieldHint>
        </Flex>
      </FloatingPanel>
      <Box sx={{ flex: 1, minWidth: 0, overflow: "auto", ml: PANEL_WIDTH + 16 }}>
        <MapCanvas
          width={width}
          height={height}
          layers={canvasLayers}
          tilesets={tilesets}
          zoom={zoom}
          grid={tool === "terrain" && showTerrain ? grid : undefined}
          highlight={ghost}
          cursor={tool === "stamp" ? "copy" : undefined}
          onPointerDown={(point, event) =>
            tool === "terrain" ? paint(point.corner.x, point.corner.y) : pressStamp(point, event)
          }
          onPointerMove={(point, dragging) => {
            setHover(point.tile);
            if (tool === "terrain" && dragging) paint(point.corner.x, point.corner.y);
          }}
          onPointerUp={endStroke}
          onLeave={() => setHover(undefined)}
        />
      </Box>
    </Flex>
  );
};
