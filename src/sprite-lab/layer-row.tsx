import { Box, Field, Select, type SelectOption } from "@/ui";
import { IconButton } from "./icon-button";
import { PENDING_COLOR } from "./sheet-canvas";
import { getSheetOption } from "./sheet-thumb";
import { fitsGender, getLayerSheets, type HumanLayer } from "./sheets";

const PENDING_DOT = 6;

/** Says a sheet has draws open that aren't merged yet. */
const PendingDot = () => (
  <Box
    {...{ title: "Unmerged draws" }}
    sx={{
      width: PENDING_DOT,
      height: PENDING_DOT,
      flexShrink: 0,
      alignSelf: "center",
      borderRadius: "50%",
      bg: PENDING_COLOR,
    }}
  />
);

/** A sheet in the stack: pick it, edit it, or clear it. */
export const SheetRow = ({
  label,
  value,
  options,
  hasPending,
  editing,
  onEdit,
  onChange,
}: {
  label: string;
  /** Empty for none. */
  value: string;
  options: SelectOption[];
  /** Whether its sheet has a draw open that isn't merged yet. */
  hasPending: boolean;
  editing: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
}) => (
  <Field layout="row" label={label} badge={hasPending && <PendingDot />}>
    <Select
      label={`${label} sheet`}
      value={value}
      onChange={onChange}
      options={[{ value: "", label: "None" }, ...options]}
      sx={{ flex: 1 }}
    />
    {value && <IconButton label={`Edit ${label}`} icon="✏️" active={editing} onClick={onEdit} />}
    <IconButton label={`Clear ${label}`} icon="❌" disabled={!value} onClick={() => onChange("")} />
  </Field>
);

/** One worn layer, offering the sheets that fit the chest. */
export const LayerRow = ({
  layer,
  texture,
  gender,
  ...row
}: {
  layer: HumanLayer;
  texture: string;
  /** The chest's gender, which narrows the list. */
  gender?: string;
  hasPending: boolean;
  editing: boolean;
  onEdit: () => void;
  onChange: (texture: string) => void;
}) => (
  <SheetRow
    {...row}
    label={layer}
    value={texture}
    options={getLayerSheets(layer)
      .filter(({ texture: option }) => fitsGender(option, gender))
      .map((sheet) => getSheetOption(sheet, sheet.texture.replace(/^human-/, "")))}
  />
);
