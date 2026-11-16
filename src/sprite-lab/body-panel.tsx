import { useEffect, useRef, useState } from "react";
import { Button, Flex, Select, Switch, Text } from "@/ui";
import { FloatingPanel } from "./floating-panel";
import { FrameSelects } from "./frame-selects";
import { IconButton } from "./icon-button";
import type { Frame } from "./lab-state";
import { WEAPON_SHEETS, type HumanLayer, type Sheet } from "./sheets";
import { useBodyDraft } from "./use-body-flags";
import type { PendingCandidate } from "./use-pending-candidates";
import { HandPointsEditor, WEAPON_OPTIONS } from "./weapon-panel";
import { HANDS } from "./weapon-pose";

/** Two hands side by side, each pane big enough to work in. */
const PANEL_WIDTH = 560;

/**
 * What a body sheet can do, for every NPC that wears it: whether it has hands and where they are
 * on each frame, and whether it has attack animations. Changes wait for Save, and undo and redo
 * (⌘Z, ⇧⌘Z) and the arrow keys only act after a press inside this window, so the frame editor
 * keeps them otherwise.
 */
export const BodyPanel = ({
  base,
  layers,
  pending,
  frame,
  cell,
  weaponTexture,
  onWeapon,
}: {
  base: Sheet;
  layers: { layer: HumanLayer; sheet: Sheet }[];
  pending: PendingCandidate[];
  frame: Frame;
  cell: number;
  /** The weapon tried in the hands, by texture; empty for none. */
  weaponTexture: string;
  onWeapon: (texture: string) => void;
}) => {
  const inside = useRef<HTMLDivElement>(null);
  /* Whether the last press was in this window: it owns the keys until a press elsewhere */
  const isActive = useRef(false);
  const body = useBodyDraft(base, () => isActive.current);
  const weapon = WEAPON_SHEETS.find(({ texture }) => texture === weaponTexture);
  /* Its own view, picked here; picking a frame on the sheet moves it there too */
  const [view, setView] = useState(frame);
  useEffect(() => setView(frame), [frame.column, frame.row]);
  const isHuman = base.texture === "human";
  const hasAny = !!body.hands && (body.hands.left || body.hands.right);

  useEffect(() => {
    const track = (e: PointerEvent) => {
      isActive.current = !!inside.current?.contains(e.target as Node);
    };
    window.addEventListener("pointerdown", track, true);
    return () => window.removeEventListener("pointerdown", track, true);
  }, []);

  if (!body.isBody) return null;
  return (
    <FloatingPanel
      id="body"
      title={<Text sx={{ fontWeight: "bold" }}>Body: {base.texture}</Text>}
      width={PANEL_WIDTH}
      start={{ x: window.innerWidth - PANEL_WIDTH - 16, y: 16 }}
    >
      <Flex ref={inside} sx={{ flexDirection: "column", gap: 2 }}>
        {/* What the body can do, then what's shown: the weapon to try, the facing, the frame */}
        <Flex sx={{ gap: 3, alignItems: "center" }}>
          {HANDS.map((hand) => (
            <Switch
              key={hand}
              label={`${hand} hand`}
              checked={!!body.hands?.[hand]}
              disabled={!body.hands || isHuman}
              hint={isHuman ? "players" : undefined}
              onChange={(e) => body.setHand(hand, e.target.checked)}
            />
          ))}
          <Switch
            label="attack animation"
            checked={!!body.attackAnims}
            disabled={body.attackAnims === undefined}
            onChange={(e) => body.setAttackAnims(e.target.checked)}
          />
        </Flex>
        <FrameSelects
          texture={base.texture}
          cell={cell}
          value={view}
          onChange={setView}
          before={
            <Select
              label="Weapon"
              value={weaponTexture}
              options={WEAPON_OPTIONS}
              disabled={!hasAny}
              onChange={onWeapon}
            />
          }
        />
        {hasAny && (
          <HandPointsEditor
            poses={body.poses}
            onPlace={body.place}
            isActive={() => isActive.current}
            weapon={weapon}
            frame={view}
            cell={cell}
            base={base}
            layers={layers}
            pending={pending}
          />
        )}
        {body.error && <Text sx={{ fontSize: 0, color: "#ff4d4d" }}>{body.error}</Text>}
        <Flex sx={{ gap: 1 }}>
          <IconButton label="Undo (⌘Z)" icon="↶" disabled={!body.canUndo} onClick={body.undo} />
          <IconButton label="Redo (⇧⌘Z)" icon="↷" disabled={!body.canRedo} onClick={body.redo} />
          <Button
            disabled={!body.isDirty || body.saving}
            onClick={body.save}
            sx={{ flex: 1, justifyContent: "center" }}
          >
            {body.saving ? "Saving..." : body.isDirty ? "Save" : "Saved"}
          </Button>
        </Flex>
      </Flex>
    </FloatingPanel>
  );
};
