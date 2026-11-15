import { SheetThumb, type SelectOption } from "@/ui";
import type { Sheet } from "./sheets";

/** A dropdown option for a sheet, with its thumbnail. */
export const getSheetOption = (sheet: Sheet, label = sheet.texture): SelectOption => ({
  value: sheet.texture,
  label,
  icon: <SheetThumb texture={sheet.texture} />,
});
