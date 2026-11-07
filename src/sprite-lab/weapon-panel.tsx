import { useEffect, useRef, useState } from "react";
import { ButtonGroup, Field, FieldHint, Flex, loadSheet, Text } from "@/ui";
import { FloatingPanel } from "./floating-panel";
import { FramePreview } from "./frame-preview";
import { useFrameStack } from "./frame-stack";
import { saveWeaponPose } from "./generations-api";
import { IconButton } from "./icon-button";
import type { Frame } from "./lab-state";
import type { HumanLayer, Sheet } from "./sheets";
import type { PendingCandidate } from "./use-pending-candidates";
import {
  getPoseName,
  getStartHand,
  HANDS,
  paintWeaponFrame,
  type Hand,
  type WeaponPoses,
} from "./weapon-pose";

const START_POSITION = { x: 440, y: 340 };
const PANEL_WIDTH = 260;
/** Weapons are drawn on 100px frames, wider than a human's. */
const PREVIEW_SIZE = 120;

const ARROWS = [
  { label: "Move weapon up", icon: "↑", dx: 0, dy: -1 },
  { label: "Move weapon left", icon: "←", dx: -1, dy: 0 },
  { label: "Move weapon right", icon: "→", dx: 1, dy: 0 },
  { label: "Move weapon down", icon: "↓", dx: 0, dy: 1 },
];

/** Places a weapon in a hand on the selected frame. Every move saves to `weapon.json`. */
export const WeaponPanel = ({
  weapon,
  frame,
  cell,
  base,
  layers,
  pending,
  onClose,
}: {
  weapon: Sheet;
  frame: Frame;
  cell: number;
  base: Sheet;
  layers: { layer: HumanLayer; sheet: Sheet }[];
  pending: PendingCandidate[];
  onClose: () => void;
}) => {
  const stack = useFrameStack(base, layers, pending);
  const [poses, setPoses] = useState<WeaponPoses>();
  const [image, setImage] = useState<HTMLCanvasElement | null>(null);
  const [picked, setPicked] = useState<{ name?: string; hand: Hand }>();
  const [error, setError] = useState<string>();
  /* Saves run one at a time, so the last move is always the one left on disk. */
  const saving = useRef(Promise.resolve());

  const name = getPoseName(frame);
  const hand = picked && picked.name === name ? picked.hand : getStartHand(frame);
  const pose = name ? poses?.[name]?.[hand] : undefined;

  useEffect(() => {
    fetch("/assets/atlas/weapon.json")
      .then((response) => response.json())
      .then((atlas) => setPoses(atlas.offsets.human))
      .catch(() => setError("Could not read weapon.json"));
  }, []);

  useEffect(() => {
    let live = true;
    loadSheet(weapon).then((sheet) => {
      if (live) setImage(sheet);
    });
    return () => {
      live = false;
    };
  }, [weapon]);

  const move = (dx: number, dy: number) => {
    if (!name || !pose) return;
    const [x, y] = [pose.x + dx, pose.y + dy];
    setPoses(
      (all) => all && { ...all, [name]: { ...all[name], [hand]: { ...all[name][hand], x, y } } },
    );
    saving.current = saving.current
      .then(() => saveWeaponPose({ frame: name, hand, x, y }))
      .then(() => setError(undefined))
      .catch((failure) => setError(failure instanceof Error ? failure.message : "Save failed"));
  };

  return (
    <FloatingPanel
      id="weapon"
      title={<Text sx={{ fontWeight: "bold" }}>Weapon position</Text>}
      width={PANEL_WIDTH}
      start={START_POSITION}
      onClose={onClose}
    >
      <FieldHint>{name ?? "This frame has no weapon"}</FieldHint>
      {pose && (
        <>
          <FramePreview
            cell={PREVIEW_SIZE}
            label="Weapon preview"
            paint={(ctx) =>
              paintWeaponFrame(ctx, {
                stack,
                weapon: image,
                hand,
                pose,
                frame,
                cell,
                size: PREVIEW_SIZE,
              })
            }
          />
          <Field label="Hand" layout="row">
            <ButtonGroup
              label="Hand"
              value={hand}
              onChange={(option) => setPicked({ name, hand: option })}
              options={HANDS.map((option) => ({ value: option, label: option }))}
            />
          </Field>
          <Flex sx={{ gap: 1, justifyContent: "center" }}>
            {ARROWS.map(({ label, icon, dx, dy }) => (
              <IconButton key={label} label={label} icon={icon} onClick={() => move(dx, dy)} />
            ))}
          </Flex>
          <Text sx={{ fontSize: 0, textAlign: "center" }}>
            x {pose.x}, y {pose.y}
          </Text>
        </>
      )}
      {error && <Text sx={{ fontSize: 0, color: "#ff4d4d" }}>{error}</Text>}
    </FloatingPanel>
  );
};
