import { useEffect, useState } from "react";
import { assetList } from "@/content";
import { assetToCanvas, Icon, type SelectOption } from "@/ui";
import type { Sheet } from "./sheets";

const THUMB_SIZE = 24;

/** A sheet's art, trimmed and cut the way the game's menus show it. */
export const SheetThumb = ({ texture }: { texture: string }) => {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const asset = assetList.find((option) => option.texture === texture);
    return asset && assetToCanvas({ asset, setImageData: setUrl });
  }, [texture]);

  return <Icon icon={url} size={THUMB_SIZE} sx={{ flexShrink: 0, backgroundSize: "contain" }} />;
};

/** A dropdown option for a sheet, with its thumbnail. */
export const getSheetOption = (sheet: Sheet, label = sheet.texture): SelectOption => ({
  value: sheet.texture,
  label,
  icon: <SheetThumb texture={sheet.texture} />,
});
