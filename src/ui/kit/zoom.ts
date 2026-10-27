import { createContext, useContext } from "react";

/** The HUD scale. Tooltips portal to `body`, so they read it here instead of inheriting it. Unset in the wiki. */
const ZoomContext = createContext<number | undefined>(undefined);

export const ZoomProvider = ZoomContext.Provider;

export const useZoom = () => useContext(ZoomContext);
