import { assetList1 } from "./asset-list-1";
import { assetList2 } from "./asset-list-2";
import { assetList3 } from "./asset-list-3";
import { assetList4 } from "./asset-list-4";

/** Order matters: lookups return the first match, and the first entry is the fallback. */
export const assetList = [...assetList1, ...assetList2, ...assetList3, ...assetList4] as const;
