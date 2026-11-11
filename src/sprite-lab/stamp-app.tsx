import { useEffect, useRef, useState } from "react";
import { fetchMapWithTilesets } from "@/rules/movement";
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
import { LabNav } from "./lab-nav";
import { MapCanvas, type CanvasLayer } from "./map-canvas";
import { captureStamp, Stamp, type Rect, type SourceMap } from "./map-stamps";
import { useStampLibrary } from "./use-stamp-library";
import { useTilesets } from "./use-tilesets";

const TEMPLATE_URL = "/assets/tilemaps/meadow.json";
const MAPS_URL = "/assets/tilemaps";
const ZOOMS = [0.5, 1, 1.5, 2];
const PANEL_WIDTH = 340;
const DRAWN_LAYERS = ["Ground", "Shadows", "Overlay", "Extras", "Above", "Collide"];

type LoadedMap = SourceMap & { height: number; tilesets: SourceMap["tilesets"] };

const fetchJson = (url: string) => fetch(url).then((response) => response.json());
/** A map with its shared tileset files put back in, as the game reads it. */
const fetchMap = (url: string) => fetchMapWithTilesets<LoadedMap>(url, fetchJson);

const rectBetween = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x) + 1,
  height: Math.abs(a.y - b.y) + 1,
});

/** Cuts stamps out of the hand-made maps, for Claude to place in new ones. */
export const StampApp = () => {
  const { library, save, error } = useStampLibrary();
  const [sources, setSources] = useState<string[]>([]);
  const [sourceName, setSourceName] = useState("grassland.json");
  const [source, setSource] = useState<LoadedMap>();
  const [template, setTemplate] = useState<LoadedMap>();
  const tilesets = useTilesets(source);
  const [zoom, setZoom] = useState(1);
  const [showCollide, setShowCollide] = useState(true);
  const [selection, setSelection] = useState<Rect>();
  const dragStart = useRef<{ x: number; y: number }>(undefined);
  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    fetchJson("/api/map-sources").then(setSources);
    fetchMap(TEMPLATE_URL).then(setTemplate);
  }, []);

  useEffect(() => {
    setSelection(undefined);
    fetchMap(`${MAPS_URL}/${sourceName}`).then(setSource);
  }, [sourceName]);

  const layers: CanvasLayer[] = (source?.layers ?? [])
    .filter((layer) => layer.data && DRAWN_LAYERS.includes(layer.name))
    .filter((layer) => showCollide || layer.name !== "Collide")
    .map((layer) => ({ name: layer.name, data: layer.data!, tint: layer.name === "Collide" }));

  const saveStamp = async () => {
    if (!source || !template || !selection) return;
    const stamp = Stamp.safeParse(captureStamp(source, template, selection, id, description));
    if (!stamp.success) return setProblem(stamp.error.issues[0].message);
    if (!Object.keys(stamp.data.layers).length) return setProblem("That area has no props");
    setProblem("");
    const rest = library.filter((existing) => existing.id !== stamp.data.id);
    if (await save([...rest, stamp.data].sort((a, b) => a.id.localeCompare(b.id)))) {
      setId("");
      setDescription("");
    }
  };

  return (
    <Flex sx={{ gap: 3, p: 3, alignItems: "flex-start", boxSizing: "border-box" }}>
      <FloatingPanel
        id="stamp-lab"
        title={
          <>
            <Text sx={{ fontWeight: "bold" }}>Stamps</Text>
            <LabNav />
          </>
        }
        width={PANEL_WIDTH}
        start={{ x: 16, y: 16 }}
        overflowing
      >
        <Flex sx={{ flexDirection: "column", gap: 2 }}>
          <Field label="Cut from" layout="row">
            <Select
              label="Source map"
              value={sourceName}
              options={sources.map((name) => ({ value: name, label: name }))}
              onChange={setSourceName}
            />
          </Field>
          <Field label="Zoom" layout="row">
            <ButtonGroup
              label="Zoom"
              value={zoom}
              onChange={setZoom}
              options={ZOOMS.map((level) => ({ value: level, label: `${level}x` }))}
            />
          </Field>
          <Field label="Collision" layout="row">
            <ButtonGroup
              label="Collision"
              value={showCollide ? "on" : "off"}
              onChange={(value) => setShowCollide(value === "on")}
              options={[
                { value: "on", label: "Show" },
                { value: "off", label: "Hide" },
              ]}
            />
          </Field>
          <FieldHint>
            Drag over a prop to select it, with its shadow and canopy. Only the props are kept, not
            the ground under them.
          </FieldHint>

          <TextDivider>New stamp</TextDivider>
          <Field label="Id" layout="row">
            <Input
              aria-label="Stamp id"
              value={id}
              placeholder="oak-tree"
              onChange={(event) => setId(event.target.value.trim())}
            />
          </Field>
          <Field label="Description">
            <Input
              aria-label="Stamp description"
              value={description}
              placeholder="Large round oak, blocks its trunk"
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Button variant="control" disabled={!selection || !id || !template} onClick={saveStamp}>
            {selection ? `Save ${selection.width}x${selection.height} stamp` : "Select an area"}
          </Button>
          {(problem || error) && (
            <Text sx={{ fontSize: 0, color: "#fca5a5" }}>{problem || error}</Text>
          )}

          <TextDivider>Library ({library.length})</TextDivider>
          {library.map((stamp) => (
            <Flex key={stamp.id} sx={{ gap: 2, alignItems: "center" }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Text sx={{ fontSize: 1 }}>
                  {stamp.id} · {stamp.width}x{stamp.height}
                </Text>
                {stamp.description && <FieldHint>{stamp.description}</FieldHint>}
              </Box>
              <Button
                variant="control"
                onClick={() => {
                  setId(stamp.id);
                  setDescription(stamp.description);
                }}
              >
                Edit
              </Button>
              <Button
                variant="control"
                onClick={() => save(library.filter((existing) => existing.id !== stamp.id))}
              >
                Delete
              </Button>
            </Flex>
          ))}
          {!library.length && <FieldHint>No stamps yet.</FieldHint>}
        </Flex>
      </FloatingPanel>
      <Box sx={{ flex: 1, minWidth: 0, overflow: "auto", ml: PANEL_WIDTH + 16 }}>
        {source && (
          <MapCanvas
            width={source.width}
            height={source.height}
            layers={layers}
            tilesets={tilesets}
            zoom={zoom}
            highlight={selection}
            onPointerDown={({ tile }) => {
              dragStart.current = tile;
              setSelection(rectBetween(tile, tile));
            }}
            onPointerMove={({ tile }, dragging) => {
              if (dragging && dragStart.current) setSelection(rectBetween(dragStart.current, tile));
            }}
            onPointerUp={() => {
              dragStart.current = undefined;
            }}
          />
        )}
      </Box>
    </Flex>
  );
};
