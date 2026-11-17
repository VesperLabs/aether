import { useEffect, useRef, useState } from "react";
import { addAttackColumns } from "./attack-columns";
import { isTyping } from "./frame-editing";
import type { BodyData, BodyShape } from "@/content";
import { loadBodies, saveBody } from "./generations-api";
import type { Sheet } from "./sheets";
import { hasHandIn, withHand, withPlacement, type HandPlacement } from "./use-hand-points";
import type { Hand } from "./weapon-pose";

const describeFailure = (failure: unknown) =>
  failure instanceof Error ? failure.message : "Save failed";

/** Every body's file, as on disk, so a save can be compared and reloaded in one go. */
type Saved = Record<string, BodyData>;

/**
 * A body's file (`BodyData`: flags, shape and `hands`), changed freely and written only by `save`.
 * A hand turned on starts from the body's saved points for it, else a copy of the human's. Saving
 * attack animations on gives a sheet that stops short of its attack columns those columns, as
 * copies of its standing frames.
 * `isBody` is false for a sheet that isn't a body's; `on`-style values are undefined while loading.
 * Every change can be undone and redone (⌘Z, ⇧⌘Z), a whole drag as one step, back to the save.
 */
export const useBodyDraft = (base: Sheet | undefined, isActive: () => boolean = () => true) => {
  const body = base?.texture ?? "";
  const [saved, setSaved] = useState<Saved>();
  const [draft, setDraft] = useState<{ body: string; data: BodyData }>();
  const [saving, setSaving] = useState(false);
  /* Drafts before and after the current one, for undo and redo; cleared by a save or new body */
  const [past, setPast] = useState<BodyData[]>([]);
  const [future, setFuture] = useState<BodyData[]>([]);
  /* A drag in progress: its first move recorded the step, the rest only follow it */
  const dragging = useRef(false);
  const [error, setError] = useState<string>();

  const reload = () => loadBodies().then(setSaved);

  useEffect(() => {
    reload().catch((failure) => setError(describeFailure(failure)));
  }, []);

  /* A body switched to starts from what's saved for it */
  const original = saved?.[body];
  const current = draft?.body === body ? draft.data : original;
  const isDirty = !!current && JSON.stringify(current) !== JSON.stringify(original);

  /** Moves to `next`, as an undo step of its own unless `record` is false. */
  const change = (next: BodyData, record = true) => {
    if (!current) return;
    if (record) {
      setPast([...past, current]);
      setFuture([]);
    }
    setDraft({ body, data: next });
  };

  const step = (
    from: BodyData[],
    to: BodyData[],
    setFrom: typeof setPast,
    setTo: typeof setPast,
  ) => {
    const previous = from.at(-1);
    if (!current || !previous) return;
    setFrom(from.slice(0, -1));
    setTo([...to, current]);
    setDraft({ body, data: previous });
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

  /** The body with these hand points, or none: no `hands` at all, as on disk. */
  const withHands = (data: BodyData, hands: BodyData["hands"] | null): BodyData => {
    const { hands: _old, ...rest } = data;
    return hands ? { ...rest, hands } : rest;
  };

  /** Gives the body this hand, from its own saved points for it or else the human's, or takes it. */
  const setHand = (hand: Hand, on: boolean) => {
    if (!current || !saved) return;
    const from = hasHandIn(original?.hands, hand) ? original?.hands : saved.human.hands;
    change(withHands(current, withHand(current.hands, hand, on, from ?? {})));
  };

  /** A drag records one step, on its first move; a nudge is a step of its own. */
  const place = (placement: HandPlacement & { done: boolean }) => {
    if (!current?.hands) return;
    change(withHands(current, withPlacement(current.hands, placement)), !dragging.current);
    dragging.current = !placement.done;
  };

  const save = async () => {
    if (!current || !original || !base) return;
    setSaving(true);
    try {
      if (current.attackAnims && !original.attackAnims) await addAttackColumns(base.src);
      await saveBody({ body, data: current });
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

  const isBody = !!saved && Object.hasOwn(saved, body);
  return {
    isBody,
    /* Which hands it has; undefined while loading */
    hasHand: current && {
      right: hasHandIn(current.hands, "right"),
      left: hasHandIn(current.hands, "left"),
    },
    hands: current?.hands,
    attackAnims: current && !!current.attackAnims,
    shape: current as BodyShape | undefined,
    setHand,
    /* Off leaves no flag behind, as on disk */
    setAttackAnims: (on: boolean) => {
      if (!current) return;
      const { attackAnims: _off, ...rest } = current;
      change(on ? { ...rest, attackAnims: true } : rest);
    },
    /** Changes the shape; a drag (`done` false until it ends) is one undo step. */
    setShape: (shape: Partial<BodyShape>, done = true) => {
      if (!current) return;
      change({ ...current, ...shape }, !dragging.current);
      dragging.current = !done;
    },
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
