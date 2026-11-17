import { useEffect, useRef, useState } from "react";
import { Button, Flex, Select, Switch, Text } from "@/ui";
import { BodyEditor } from "./body-editor";
import { FloatingPanel } from "./floating-panel";
import { FrameSelects } from "./frame-selects";
import { SignButton } from "./sign-button";
import type { Frame } from "./lab-state";
import { getNoneOption, getSheetOption } from "./sheet-thumb";
import { WEAPON_SHEETS, type HumanLayer, type Sheet } from "./sheets";
import { useBodyDraft } from "./use-body-draft";
import type { PendingCandidate } from "./use-pending-candidates";
import { HANDS } from "./weapon-pose";

/** Room for the frame at 3× and the controls beside it. */
const PANEL_WIDTH = 720;

/** The weapons a body's hands can be tried with. */
const WEAPON_OPTIONS = [
  getNoneOption("no weapon"),
  ...WEAPON_SHEETS.map((sheet) => getSheetOption(sheet)),
];

/**
 * A body sheet, for every NPC that wears it: what it can do (hands, attack animations), and on one
 * big frame its hit box, feet, head and hand points, all dragged in place. Changes wait for Save;
 * undo and redo (⌘Z, ⇧⌘Z) and the keys only act after a press inside this window, so the frame
 * editor keeps them otherwise.
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
  const hasAny = !!body.hasHand && (body.hasHand.left || body.hasHand.right);

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
      title={
        <Text sx={{ fontWeight: "bold" }}>
          Body: {base.texture}
          {body.isDirty && <Text sx={{ fontWeight: "normal", opacity: 0.7 }}> · unsaved</Text>}
        </Text>
      }
      width={PANEL_WIDTH}
      start={{ x: window.innerWidth - PANEL_WIDTH - 16, y: 16 }}
    >
      <Flex ref={inside} sx={{ flexDirection: "column", flexShrink: 0 }}>
        {body.shape && (
          <BodyEditor
            shape={body.shape}
            hands={body.hands}
            onShape={body.setShape}
            onPlace={body.place}
            isActive={() => isActive.current}
            weapon={hasAny ? weapon : undefined}
            frame={view}
            onFrame={setView}
            cell={cell}
            base={base}
            layers={layers}
            pending={pending}
            controls={
              <>
                {/* What the body can do */}
                <Flex sx={{ flexDirection: "column", gap: 1 }}>
                  {HANDS.map((hand) => (
                    <Switch
                      key={hand}
                      label={`${hand} hand`}
                      checked={!!body.hasHand?.[hand]}
                      disabled={!body.hasHand || isHuman}
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
                {/* What's shown: the weapon to try, the facing, the frame */}
                <Select
                  label="Weapon"
                  value={weaponTexture}
                  options={WEAPON_OPTIONS}
                  disabled={!hasAny}
                  onChange={onWeapon}
                />
                <FrameSelects texture={base.texture} cell={cell} value={view} onChange={setView} />
              </>
            }
            footer={
              <>
                {body.error && <Text sx={{ fontSize: 0, color: "#ff4d4d" }}>{body.error}</Text>}
                <Flex sx={{ gap: 1, alignItems: "center", flexShrink: 0 }}>
                  <SignButton
                    sign="undo"
                    label="Undo (⌘Z)"
                    disabled={!body.canUndo}
                    onClick={body.undo}
                  />
                  <SignButton
                    sign="redo"
                    label="Redo (⇧⌘Z)"
                    disabled={!body.canRedo}
                    onClick={body.redo}
                  />
                  <Button
                    disabled={!body.isDirty || body.saving}
                    onClick={body.save}
                    sx={{ flex: 1, justifyContent: "center" }}
                  >
                    {body.saving ? "Saving..." : body.isDirty ? "Save" : "Saved"}
                  </Button>
                </Flex>
              </>
            }
          />
        )}
      </Flex>
    </FloatingPanel>
  );
};
