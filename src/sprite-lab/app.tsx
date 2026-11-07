import { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Select, Text, TextDivider, ThemeUIProvider, theme } from "@/ui";
import type { Theme } from "theme-ui";
import { CHECKER_SX } from "./checker";
import { DrawPanel } from "./draw-panel";
import { FloatingPanel } from "./floating-panel";
import { getFrameKey, setOpenCandidate } from "./open-candidates";
import { ORIGINAL_TILE_ATTR } from "./generation-list";
import { useCandidateDrag, type DragItem } from "./use-candidate-drag";
import { usePendingCandidates } from "./use-pending-candidates";
import { parseLabState, serializeLabState, ZOOMS, type ActiveDraw, type Frame } from "./lab-state";
import { LayerRow, SheetRow } from "./layer-row";
import { getFrameAtPoint, SheetCanvas, type DrawnSheet } from "./sheet-canvas";
import { getSheetOption } from "./sheet-thumb";
import {
  ANIMATED_SHEETS,
  BASE_SHEETS,
  dropOtherGender,
  getSheetGender,
  HUMAN_LAYERS,
  WEAPON_SHEETS,
} from "./sheets";
import { WeaponPanel } from "./weapon-panel";

const ATLAS_OPTIONS = BASE_SHEETS.map((sheet) => getSheetOption(sheet));

const WEAPON_OPTIONS = [
  { value: "", label: "No weapon" },
  ...WEAPON_SHEETS.map((sheet) => getSheetOption(sheet)),
];

const PANEL_WIDTH = 340;

const DRAG_GHOST_SIZE = 64;

export const App = () => {
  const [state, setState] = useState(() => parseLabState(window.location.search));
  const { atlas: baseTexture, zoom, layers: textures } = state;

  const [drawn, setDrawn] = useState<DrawnSheet>();
  const [draws, setDraws] = useState<ActiveDraw[]>([]);
  const addDraw = (draw: ActiveDraw) => setDraws((active) => [...active, draw]);
  const removeDraw = (draw: ActiveDraw) =>
    setDraws((active) => active.filter((other) => other !== draw));

  useEffect(() => {
    const search = serializeLabState(state);
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [state]);

  const base = ANIMATED_SHEETS.find(({ texture }) => texture === baseTexture);
  const { pending, revision, refreshPending } = usePendingCandidates();

  const copyToFrame = async (item: DragItem, frame: Frame) => {
    try {
      const copy = await item.copyTo(frame);
      /* Opened where it landed, so it shows on the sheet straight away. */
      setOpenCandidate(getFrameKey(copy.src, frame), copy.id);
      refreshPending();
    } catch (failure) {
      window.alert(failure instanceof Error ? failure.message : "Copy failed");
    }
  };

  const getDropFrame = (x: number, y: number) =>
    drawn && getFrameAtPoint(drawn.sheet, drawn.cell, x, y);

  const { drag, startDrag } = useCandidateDrag((item, x, y) => {
    if (item.merge && document.elementFromPoint(x, y)?.closest(`[${ORIGINAL_TILE_ATTR}]`)) {
      item.merge();
      return;
    }
    const frame = getDropFrame(x, y);
    const isOwnFrame = frame?.column === item.frame.column && frame.row === item.frame.row;
    if (frame && !isOwnFrame) copyToFrame(item, frame);
  });

  /* Layers are cut to the human body; they'd sit wrong on anything else. */
  const isHuman = baseTexture === "human";
  const layers = useMemo(
    () =>
      HUMAN_LAYERS.flatMap((layer) => {
        const sheet = ANIMATED_SHEETS.find(({ texture }) => texture === textures[layer]);
        return isHuman && sheet ? [{ layer, sheet }] : [];
      }),
    [textures, isHuman],
  );

  /* A cleared layer has no sheet to edit, so the atlas takes over. */
  const editLayer = layers.find(({ layer }) => layer === state.target);
  const target = editLayer?.sheet ?? base;
  const weapon = WEAPON_SHEETS.find(({ texture }) => texture === state.weapon);

  return (
    <ThemeUIProvider theme={theme as Theme}>
      <Flex sx={{ gap: 3, p: 3, alignItems: "flex-start", boxSizing: "border-box" }}>
        <FloatingPanel
          id="lab"
          title={<Text sx={{ fontWeight: "bold" }}>Sprite Lab</Text>}
          width={PANEL_WIDTH}
          start={{ x: 16, y: 16 }}
          overflowing
        >
          <Flex sx={{ gap: 1 }}>
            {ZOOMS.map((level) => (
              <Button
                key={level}
                variant="menu"
                className={level === zoom ? "active" : ""}
                onClick={() => setState({ ...state, zoom: level })}
              >
                <Box sx={{ px: 1 }}>{level}x</Box>
              </Button>
            ))}
          </Flex>
          <SheetRow
            label="Body"
            value={state.atlasHidden ? "" : baseTexture}
            options={ATLAS_OPTIONS}
            hasPending={pending.some(({ generation }) => generation.src === base?.src)}
            editing={!editLayer}
            onEdit={() => setState({ ...state, target: undefined })}
            onChange={(atlas) =>
              setState(
                atlas ? { ...state, atlas, atlasHidden: false } : { ...state, atlasHidden: true },
              )
            }
          />
          {isHuman &&
            HUMAN_LAYERS.map((layer) => (
              <LayerRow
                key={layer}
                layer={layer}
                texture={textures[layer]}
                hasPending={layers.some(
                  (worn) =>
                    worn.layer === layer &&
                    pending.some(({ generation }) => generation.src === worn.sheet.src),
                )}
                gender={layer === "chest" ? undefined : getSheetGender(textures.chest)}
                editing={editLayer?.layer === layer}
                onEdit={() => setState({ ...state, target: layer })}
                onChange={(texture) =>
                  setState({
                    ...state,
                    layers: {
                      ...(layer === "chest"
                        ? dropOtherGender(textures, getSheetGender(texture))
                        : textures),
                      [layer]: texture,
                    },
                  })
                }
              />
            ))}
          {isHuman && (
            <>
              <TextDivider />
              <Select
                label="Weapon"
                value={state.weapon}
                options={WEAPON_OPTIONS}
                onChange={(texture) => setState({ ...state, weapon: texture })}
              />
            </>
          )}
        </FloatingPanel>
        <Box sx={{ flex: 1, minWidth: 0, overflow: "auto", ml: PANEL_WIDTH + 16 }}>
          {base && (
            <SheetCanvas
              onDrawn={setDrawn}
              base={base}
              baseHidden={state.atlasHidden}
              layers={layers}
              targetSrc={target?.src}
              zoom={zoom}
              frame={state.frame}
              pending={pending}
              draws={draws}
              dropFrame={drag && getDropFrame(drag.x, drag.y)}
              onSelectFrame={(frame) => setState({ ...state, frame })}
            />
          )}
        </Box>
        {state.frame && drawn && target && base && (
          <DrawPanel
            cell={drawn.cell}
            target={target}
            base={base}
            baseHidden={state.atlasHidden}
            frame={state.frame}
            model={state.model}
            prompt={state.prompt}
            onModel={(model) => setState({ ...state, model })}
            promptTab={state.promptTab}
            onPromptTab={(promptTab) => setState({ ...state, promptTab })}
            wearableSheet={state.wearableSheet}
            onWearableSheet={(wearableSheet) => setState({ ...state, wearableSheet })}
            onPrompt={(prompt) => setState({ ...state, prompt })}
            drawingKeys={draws.map(({ src, frame }) => getFrameKey(src, frame))}
            onDrawStart={addDraw}
            onDrawEnd={removeDraw}
            layers={layers}
            pending={pending}
            candidateRevision={revision}
            onCandidateChanged={refreshPending}
            onCandidateDragStart={startDrag}
            onClose={() => setState({ ...state, frame: undefined })}
          />
        )}
        {isHuman && weapon && state.frame && drawn && base && (
          <WeaponPanel
            weapon={weapon}
            frame={state.frame}
            cell={drawn.cell}
            base={base}
            layers={layers}
            pending={pending}
            onClose={() => setState({ ...state, weapon: "" })}
          />
        )}
      </Flex>
      {drag && (
        <Box
          as="img"
          {...{ src: drag.item.url, alt: "" }}
          style={{ left: drag.x, top: drag.y }}
          sx={{
            position: "fixed",
            zIndex: "menus",
            width: DRAG_GHOST_SIZE,
            height: DRAG_GHOST_SIZE,
            transform: "translate(-50%, -50%)",
            imageRendering: "pixelated",
            pointerEvents: "none",
            opacity: 0.9,
            borderRadius: 2,
            boxShadow: "0 4px 10px rgba(0, 0, 0, .5)",
            ...CHECKER_SX,
          }}
        />
      )}
    </ThemeUIProvider>
  );
};
