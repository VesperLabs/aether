import { useEffect } from "react";

/** The id in the URL's `#`, which a home page card links to. */
export const getHashId = () => decodeURIComponent(window.location.hash.slice(1));

/** Brings the element the URL's `#` names into view, once the page has drawn it. */
export function useHashScroll(isReady = true) {
  useEffect(() => {
    if (!isReady) return;
    document.getElementById(getHashId())?.scrollIntoView({ block: "center" });
  }, [isReady]);
}
