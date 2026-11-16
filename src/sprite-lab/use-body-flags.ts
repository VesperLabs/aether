import { useEffect, useRef, useState } from "react";
import { addAttackColumns } from "./attack-columns";
import { isTyping } from "./frame-editing";
import { loadBodyFlags, saveBodyFlags, saveBodyHandPoints } from "./generations-api";
import type { Sheet } from "./sheets";
import {
  hasHandIn,
  loadHandPoints,
  withHand,
  withPlacement,
  type HandPlacement,
} from "./use-hand-points";
import type { Hand, WeaponPoses } from "./weapon-pose";

const describeFailure = (failure: unknown) =>
  failure instanceof Error ? failure.message : "Save failed";

/** What the NPC editor changes about a body: its hand points (none without hands), its attacks. */
type BodyDraft = { points: WeaponPoses | null; attackAnims: boolean };

/** Everything on disk the editor reads, so a save can be compared and reloaded in one go. */
type Saved = {
  offsets: Record<string, WeaponPoses>;
  flags: Record<string, { attackAnims?: boolean }>;
};

const readDraft = ({ offsets, flags }: Saved, body: string): BodyDraft => ({
  points: offsets[body] ?? null,
  attackAnims: !!flags[body]?.attackAnims,
});

/**
 * A body's hands, hand points and attack animations, changed freely and written only by `save`.
 * A hand turned on starts from the body's saved points for it, else a copy of the human's. Saving attack animations on gives a
 * sheet that stops short of its attack columns those columns, as copies of its standing frames.
 * `isBody` is false for a sheet that isn't a body's; `on`-style values are undefined while loading.
 * Every change can be undone and redone (⌘Z, ⇧⌘Z), a whole drag as one step, back to the save.
 */
export const useBodyDraft = (base: Sheet | undefined, isActive: () => boolean = () => true) => {
  const body = base?.texture ?? "";
  const [saved, setSaved] = useState<Saved>();
  const [draft, setDraft] = useState<{ body: string } & BodyDraft>();
  const [saving, setSaving] = useState(false);
  /* Drafts before and after the current one, for undo and redo; cleared by a save or new body */
  const [past, setPast] = useState<BodyDraft[]>([]);
  const [future, setFuture] = useState<BodyDraft[]>([]);
  /* A drag in progress: its first move recorded the step, the rest only follow it */
  const dragging = useRef(false);
  const [error, setError] = useState<string>();

  const reload = () =>
    Promise.all([loadHandPoints(), loadBodyFlags()]).then(([offsets, flags]) =>
      setSaved({ offsets, flags }),
    );

  useEffect(() => {
    reload().catch((failure) => setError(describeFailure(failure)));
  }, []);

  /* A body switched to starts from what's saved for it */
  const current = draft?.body === body ? draft : saved && { body, ...readDraft(saved, body) };
  const original = saved && readDraft(saved, body);
  const isDirty =
    !!current &&
    !!original &&
    (current.attackAnims !== original.attackAnims ||
      JSON.stringify(current.points) !== JSON.stringify(original.points));

  const toDraft = ({ points, attackAnims }: BodyDraft): BodyDraft => ({ points, attackAnims });

  /** Moves to `next`, as an undo step of its own unless `record` is false. */
  const change = (next: Partial<BodyDraft>, record = true) => {
    if (!current) return;
    if (record) {
      setPast([...past, toDraft(current)]);
      setFuture([]);
    }
    setDraft({ ...current, ...next });
  };

  const step = (
    from: BodyDraft[],
    to: BodyDraft[],
    setFrom: typeof setPast,
    setTo: typeof setPast,
  ) => {
    const previous = from.at(-1);
    if (!current || !previous) return;
    setFrom(from.slice(0, -1));
    setTo([...to, toDraft(current)]);
    setDraft({ body, ...previous });
  };
  const undo = () => step(past, future, setPast, setFuture);
  const redo = () => step(future, past, setFuture, setPast);

  /* A new body starts a fresh history */
  useEffect(() => {
    setPast([]);
    setFuture([]);
  }, [body]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z" || isTyping(e.target)) return;
      if (!isActive()) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  /** Gives the body this hand, from its own saved points for it or else the human's, or takes it. */
  const setHand = (hand: Hand, on: boolean) => {
    if (!current || !saved) return;
    const from = hasHandIn(original?.points, hand) ? original?.points : saved.offsets.human;
    change({ points: withHand(current.points, hand, on, from ?? saved.offsets.human) });
  };

  /** A drag records one step, on its first move; a nudge is a step of its own. */
  const place = (placement: HandPlacement & { done: boolean }) => {
    if (!current?.points) return;
    change({ points: withPlacement(current.points, placement) }, !dragging.current);
    dragging.current = !placement.done;
  };

  const save = async () => {
    if (!current || !original || !base) return;
    setSaving(true);
    try {
      if (JSON.stringify(current.points) !== JSON.stringify(original.points)) {
        await saveBodyHandPoints({ body, points: current.points });
      }
      if (current.attackAnims !== original.attackAnims) {
        if (current.attackAnims) await addAttackColumns(base.src);
        await saveBodyFlags({ body, attackAnims: current.attackAnims });
      }
      await reload();
      setDraft(undefined);
      setPast([]);
      setFuture([]);
      setError(undefined);
    } catch (failure) {
      setError(describeFailure(failure));
    }
    setSaving(false);
  };

  const isBody = !!saved && Object.hasOwn(saved.flags, body);
  return {
    isBody,
    /* Which hands it has; undefined while loading */
    hands: current && {
      right: hasHandIn(current.points, "right"),
      left: hasHandIn(current.points, "left"),
    },
    poses: current?.points ?? undefined,
    attackAnims: current?.attackAnims,
    setHand,
    setAttackAnims: (attackAnims: boolean) => change({ attackAnims }),
    place,
    isDirty,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    saving,
    save,
    error,
  };
};
