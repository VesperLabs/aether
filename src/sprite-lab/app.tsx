import { useEffect, useMemo, useState } from "react";
import {
  Box,
  ButtonGroup,
  DIRECTIONS,
  Field,
  Flex,
  Select,
  Switch,
  Text,
  TextDivider,
  ThemeUIProvider,
  theme,
} from "@/ui";
import type { Theme } from "theme-ui";
import { isShowingLook, LAB_ACTORS, toKebab } from "./actor-looks";
import { ActorThumb } from "./actor-thumb";
import { CardPanel } from "./card-panel";
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
  parseLook,
  WEAPON_SHEETS,
} from "./sheets";
import { WeaponPanel } from "./weapon-panel";

const ATLAS_OPTIONS = BASE_SHEETS.map((sheet) => getSheetOption(sheet));

const WEAPON_OPTIONS = [
  { value: "", label: "No weapon" },
  ...WEAPON_SHEETS.map((sheet) => getSheetOption(sheet)),
];

const CHARACTER_OPTIONS = [
  { value: "", label: "Custom" },
  ...LAB_ACTORS.map(({ key, actor, look, isKeeper }) => ({
    value: key,
    icon: <ActorThumb actor={actor} look={look} />,
    label: `${actor.profile.userName} (${isKeeper ? "keeper" : "mob"} ${actor.baseStats.level})`,
  })),
];

/** The first frame facing the viewer, which a card uses until another is picked. */
const FACING_FRAME = { column: 0, row: DIRECTIONS.indexOf("down") };

const PANEL_WIDTH = 340;

const DRAG_GHOST_SIZE = 64;

export const App = () => {
  const [state, setState] = useState(() => parseLabState(window.location.search));
  const { zoom, layers: textures } = state;
  const { texture: baseTexture, tint: skinTint } = parseLook(state.atlas);

  const [drawn, setDrawn] = useState<DrawnSheet>();
  const [draws, setDraws] = useState<ActiveDraw[]>([]);
  const addDraw = (draw: ActiveDraw) => setDraws((active) => [...active, draw]);
  const removeDraw = (draw: ActiveDraw) =>
    setDraws((active) => active.filter((other) => other !== draw));

  useEffect(() => {
    const search = serializeLabState(state);
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [state]);

  /* Tints are for viewing: the body and layers show them, the sheet being edited never does. */
  const base = useMemo(() => {
    const plain = ANIMATED_SHEETS.find(({ texture }) => texture === baseTexture);
    return plain && { ...plain, tint: skinTint };
  }, [baseTexture, skinTint]);
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
        const { texture, tint } = parseLook(textures[layer]);
        const sheet = ANIMATED_SHEETS.find((option) => option.texture === texture);
        return isHuman && sheet ? [{ layer, sheet: { ...sheet, tint } }] : [];
      }),
    [textures, isHuman],
  );

  /* A cleared layer has no sheet to edit, so the atlas takes over. */
  const editLayer = layers.find(({ layer }) => layer === state.target);
  const target = ANIMATED_SHEETS.find(({ src }) => src === (editLayer?.sheet ?? base)?.src);
  /* The NPC on screen, if the layers are exactly one's; any change by hand makes it custom. */
  const shownActor = LAB_ACTORS.find(({ look }) => isShowingLook(look, state));
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
          <Select
            label="Character"
            value={shownActor?.key ?? ""}
            options={CHARACTER_OPTIONS}
            onChange={(key) => {
              const look = LAB_ACTORS.find((entry) => entry.key === key)?.look;
              if (look) setState({ ...state, ...look, atlasHidden: false, target: undefined });
            }}
          />
          <Field label="Zoom" layout="row">
            <ButtonGroup
              label="Zoom"
              value={zoom}
              onChange={(level) => setState({ ...state, zoom: level })}
              options={ZOOMS.map((level) => ({ value: level, label: `${level}x` }))}
            />
          </Field>
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
          <Switch
            label="Monster card"
            checked={state.card}
            onChange={(e) => setState({ ...state, card: e.target.checked })}
          />
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
        {state.card && drawn && base && (
          <CardPanel
            key={shownActor?.key ?? base.texture}
            defaultName={shownActor ? toKebab(shownActor.key) : base.texture}
            base={base}
            layers={layers}
            pending={pending}
            frame={state.frame ?? FACING_FRAME}
            cell={drawn.cell}
            onClose={() => setState({ ...state, card: false })}
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
