import { useState, useRef, useLayoutEffect, useEffectEvent } from "react";
import { createDragAutoscroll } from "./drag-autoscroll";
import { createDragSpringOpen } from "./drag-spring-open";

/** How long a finger must rest on an item before it picks up; a quicker swipe scrolls instead. */
const TOUCH_HOLD_MS = 120;
/** How far a finger can drift while holding before it counts as a swipe. */
const TOUCH_SLOP_PX = 10;

/** Drag an item slot's icon with the mouse or a finger, and report where it was dropped. */
export function useSlotDrag({
  enabled,
  onDrop,
}: {
  enabled: boolean;
  onDrop: (target: Element | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [target, setTarget] = useState<Element | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [autoscroll] = useState(createDragAutoscroll);
  const [springOpen] = useState(createDragSpringOpen);
  /* A touch waiting to become a drag: where it is now and where it started */
  const hold = useRef<{ x: number; y: number; startX: number; startY: number; timer: number }>(
    null,
  );

  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current.timer);
    hold.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const image = imageRef.current as HTMLDivElement;
    setPosition({
      x: e.clientX - image.offsetWidth / 2,
      y: e.clientY - image.offsetHeight / 2,
    });
    setDragging(true);
    setTarget(document.elementFromPoint(e.clientX, e.clientY));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    cancelHold();
    const { clientX, clientY } = e.touches[0];
    const timer = window.setTimeout(() => {
      const { x, y } = hold.current ?? { x: clientX, y: clientY };
      hold.current = null;
      const image = imageRef.current as HTMLDivElement;
      setPosition({ x: x - image.offsetWidth / 2, y: y - image.offsetHeight / 2 });
      setDragging(true);
      setTarget(document.elementFromPoint(x, y));
    }, TOUCH_HOLD_MS);
    hold.current = { x: clientX, y: clientY, startX: clientX, startY: clientY, timer };
  };

  const handleMouseMove = useEffectEvent((e: MouseEvent) => {
    if (!dragging) return;
    const image = imageRef.current as HTMLDivElement;
    const x = e.clientX - image.offsetWidth / 2;
    const y = e.clientY - image.offsetHeight / 2;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    setPosition({ x, y });
    autoscroll.update(t, e.clientY);
    springOpen.update(t);
    if (t?.nodeName == "CANVAS") {
      window.dispatchEvent(
        new CustomEvent("ITEM_DRAG", {
          detail: {
            x: e.clientX,
            y: e.clientY,
          },
        }),
      );
    }
    setTarget(t);
  });

  const handleTouchMove = useEffectEvent((e: TouchEvent) => {
    const pending = hold.current;
    if (pending) {
      pending.x = e.touches[0].clientX;
      pending.y = e.touches[0].clientY;
      /* Moving before the hold is up is a swipe: let the menus scroll */
      if (Math.hypot(pending.x - pending.startX, pending.y - pending.startY) > TOUCH_SLOP_PX) {
        cancelHold();
      }
      return;
    }
    if (!dragging) return;
    /* Holding an item: the finger drags it, not the page */
    e.preventDefault();
    const image = imageRef.current as HTMLDivElement;
    const x = e.touches[0].clientX - image.offsetWidth / 2;
    const y = e.touches[0].clientY - image.offsetHeight / 2;
    const t = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    setPosition({ x, y });
    autoscroll.update(t, e.touches[0].clientY);
    springOpen.update(t);
    if (t?.nodeName == "CANVAS") {
      window.dispatchEvent(
        new CustomEvent("ITEM_DRAG", {
          detail: {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          },
        }),
      );
    }
    setTarget(t);
  });

  const handleMouseUp = useEffectEvent((e: MouseEvent) => {
    if (!dragging) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    setTarget(t);
    autoscroll.stop();
    springOpen.stop();
    onDrop(t);
    setDragging(false);
  });

  const handleTouchEnd = useEffectEvent((e: TouchEvent) => {
    cancelHold();
    if (!dragging) return;
    e.stopPropagation();
    const t = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    setTarget(t);
    autoscroll.stop();
    springOpen.stop();
    onDrop(t);
    setDragging(false);
  });

  /* Bind our global movement events */
  useLayoutEffect(() => {
    if (!enabled) return;
    const onTouchEnd = (e: TouchEvent) => handleTouchEnd(e);
    const onMouseUp = (e: MouseEvent) => handleMouseUp(e);
    const onMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const onTouchMove = (e: TouchEvent) => handleTouchMove(e);
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("mouseup", onMouseUp, { passive: true });
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      autoscroll.stop();
      springOpen.stop();
      cancelHold();
    };
  }, [enabled]);

  const dragBinds = enabled ? { onMouseDown: handleMouseDown, onTouchStart: handleTouchStart } : {};

  return { dragging, position, target, imageRef, dragBinds };
}
