import { useCallback, useEffect, useState } from "react";

/**
 * Get the current size of the Viewport. Do not call this excessively, as it may
 * cause performance issues in WebKit. Querying innerWidth/height triggers a
 * relayout of the page.
 */
export const getViewportSize = () => {
  if (window.visualViewport) {
    // visualViewport is a new prop intended for this exact behavior, prefer it
    // over all else when available
    // https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API
    return [window.visualViewport.width, window.visualViewport.height] as const;
  }

  return [
    window.innerWidth,
    // window.innerHeight gets updated when a user open the soft keyboard, so it
    // should be preferred over documentElement.clientHeight
    // Want more? https://blog.opendigerati.com/the-eccentric-ways-of-ios-safari-with-the-keyboard-b5aa3f34228d
    window.innerHeight,
  ] as const;
};

/**
 * Triggers an effect any time the viewport size changes.
 * This does not pass the current viewport size as that may cause performance
 * issues when unnecessary. You can call getViewportSize direct in your effect,
 * or use the useViewportSize hook instead.
 */
export const useViewportSizeEffect = (effect: () => void) => {
  useEffect(() => {
    const effectTwice = () => {
      effect();
      // Closing the OSK in iOS does not immediately update the visual viewport
      // size :<
      setTimeout(effect, 1000);
    };

    window.addEventListener("resize", effectTwice);
    // From the top of my head this used to be required for older browsers since
    // this didn't trigger a resize event. Keeping it in to be safe.
    window.addEventListener("orientationchange", effectTwice);
    // This is needed on iOS to resize the viewport when the Virtual/OnScreen
    // Keyboard opens. This does not trigger any other event, or the standard
    // resize event.
    window.visualViewport?.addEventListener("resize", effectTwice);

    return () => {
      window.removeEventListener("resize", effectTwice);
      window.removeEventListener("orientationchange", effectTwice);
      window.visualViewport?.removeEventListener("resize", effectTwice);
    };
  }, [effect]);
};

const useViewportSize = () => {
  const [size, setSize] = useState(getViewportSize);

  const onViewportSizeChange = useCallback(() => {
    setSize(getViewportSize());
  }, []);

  useViewportSizeEffect(onViewportSizeChange);

  return size;
};

export default useViewportSize;

export function useOnClickOutside(ref, handler) {
  useEffect(
    () => {
      const listener = (event) => {
        // Do nothing if clicking ref's element or descendent elements
        if (!ref.current || ref.current.contains(event.target)) {
          return;
        }
        handler(event);
      };
      document.addEventListener("mousedown", listener);
      document.addEventListener("touchstart", listener);
      return () => {
        document.removeEventListener("mousedown", listener);
        document.removeEventListener("touchstart", listener);
      };
    },
    // Add ref and handler to effect dependencies
    // It's worth noting that because passed in handler is a new ...
    // ... function on every render that will cause this effect ...
    // ... callback/cleanup to run every render. It's not a big deal ...
    // ... but to optimize you can wrap handler in useCallback before ...
    // ... passing it into this hook.
    [ref, handler]
  );
}
