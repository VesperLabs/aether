import { useState, useRef, useLayoutEffect, useEffectEvent } from "react";
import { createDragAutoscroll } from "./drag-autoscroll";
import { createDragSpringOpen } from "./drag-spring-open";

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
    if (dragging) e.preventDefault();
    e.stopPropagation();
    const image = imageRef.current as HTMLDivElement;
    setPosition({
      x: e.touches[0].clientX - image.offsetWidth / 2,
      y: e.touches[0].clientY - image.offsetHeight / 2,
    });
    setDragging(true);
    setTimeout(
      () => setTarget(document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)),
      1,
    );
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
    if (!dragging) return;
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
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      autoscroll.stop();
      springOpen.stop();
    };
  }, [enabled]);

  const dragBinds = enabled ? { onMouseDown: handleMouseDown, onTouchStart: handleTouchStart } : {};

  return { dragging, position, target, imageRef, dragBinds };
}
