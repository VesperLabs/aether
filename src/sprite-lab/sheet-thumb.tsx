import { NoneThumb, SheetThumb, type SelectOption } from "@/ui";
import type { Sheet } from "./sheets";

/** A dropdown option for a sheet, with its thumbnail. */
export const getSheetOption = (sheet: Sheet, label = sheet.texture): SelectOption => ({
  value: sheet.texture,
  label,
  icon: <SheetThumb texture={sheet.texture} />,
});

/**
 * A dropdown's "nothing" choice, with the kit's none icon: a dropdown whose options have icons
 * gives every option one, so the rows line up and stay one height.
 */
export const getNoneOption = (label: string, value = ""): SelectOption => ({
  value,
  label,
  icon: <NoneThumb />,
});
