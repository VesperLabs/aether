import { useEffect, useState } from "react";
import { getBody, type BodyDefinition } from "@/content";
import { DIRECTIONS, FieldHint, Flex, loadSheet, Select, Text } from "@/ui";
import { isShowingLook, LAB_ACTORS } from "./actor-looks";
import { ActorThumb } from "./actor-thumb";
import { getNoneOption } from "./sheet-thumb";
import { CardPanel } from "./card-panel";
import { FloatingPanel } from "./floating-panel";
import { FrameSelects } from "./frame-selects";
import { parseLabState, serializeLabState, type Frame } from "./lab-state";
import { LayerRow } from "./layer-row";
import { dropOtherGender, getSheetCell, getSheetGender, HUMAN_LAYERS, type Sheet } from "./sheets";
import { useCharacterSheets } from "./use-character-sheets";

const PANEL_WIDTH = 340;

const CHARACTER_OPTIONS = [
  getNoneOption("custom"),
  ...LAB_ACTORS.map(({ key, actor, look, isKeeper }) => ({
    value: key,
    icon: <ActorThumb actor={actor} look={look} />,
    label: `${actor.profile.userName} (${isKeeper ? "keeper" : "mob"} ${actor.baseStats.level})`,
  })),
];

/** The first frame facing the viewer, shown until another is picked. */
const FACING_FRAME: Frame = { column: 0, row: DIRECTIONS.indexOf("down") };

/** No open draws here: this page shows sheets as they are on disk. */
const NO_PENDING: never[] = [];

/** A sheet's frame size and how many frames each row has. */
const useSheetSize = (base?: Sheet) => {
  const [size, setSize] = useState<{ cell: number; columns: number }>();
  useEffect(() => {
    let live = true;
    if (base)
      loadSheet(base).then((image) => {
        if (!live || !image) return;
        const cell = getSheetCell(base.src, image.height);
        setSize({ cell, columns: Math.floor(image.width / cell) });
      });
    return () => {
      live = false;
    };
  }, [base]);
  return size;
};

/** What a body's hands are, in a few words. */
const describeHands = ({ handLeft, handRight }: BodyDefinition) =>
  handLeft && handRight
    ? "both hands"
    : handRight
      ? "right hand only"
      : handLeft
        ? "left hand only"
        : "no hands";

/**
 * Dresses a character, one frame at a time, and makes its monster card. Pick an NPC to start from
 * its look, or a layer's sheet or a real item to change it. Sheets are edited on the Sprites page.
 */
export const NpcApp = () => {
  const [state, setState] = useState(() => parseLabState(window.location.search));
  const { layers: textures } = state;
  const { baseTexture, base, layers, isHuman } = useCharacterSheets(state.atlas, textures);
  const body = getBody(baseTexture);
  const size = useSheetSize(base);
  const frame = state.frame ?? FACING_FRAME;

  useEffect(() => {
    const search = serializeLabState(state);
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [state]);

  /* The NPC on screen, if the layers are exactly one's; any change by hand makes it custom. */
  const shownActor = LAB_ACTORS.find(({ look }) => isShowingLook(look, state));

  return (
    <Flex sx={{ gap: 3, p: 3, alignItems: "flex-start", boxSizing: "border-box" }}>
      <FloatingPanel
        id="npc"
        title={<Text sx={{ fontWeight: "bold" }}>NPC Editor</Text>}
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
            if (look) setState({ ...state, ...look, atlasHidden: false });
          }}
        />
        {base && size && (
          <FrameSelects
            texture={base.texture}
            cell={size.cell}
            columns={size.columns}
            value={frame}
            onChange={(next) => setState({ ...state, frame: next })}
          />
        )}
        {/* Set per body sheet on the Sprites page, so every NPC wearing it agrees */}
        <FieldHint>
          {baseTexture}: {describeHands(body)},{" "}
          {body.attackAnims ? "attack animations" : "no attack animations"} (Sprites page)
        </FieldHint>
        {isHuman &&
          HUMAN_LAYERS.map((layer) => (
            <LayerRow
              key={layer}
              layer={layer}
              texture={textures[layer]}
              withItems
              gender={layer === "chest" ? undefined : getSheetGender(textures.chest)}
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
      </FloatingPanel>
      {base && size && (
        <CardPanel
          key={shownActor?.key ?? base.texture}
          defaultName={shownActor?.key ?? base.texture}
          base={base}
          layers={layers}
          pending={NO_PENDING}
          frame={frame}
          cell={size.cell}
        />
      )}
    </Flex>
  );
};
