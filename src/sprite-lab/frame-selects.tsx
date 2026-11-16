import type { ReactNode } from "react";
import { Box, DIRECTIONS, Flex, Select, SheetThumb } from "@/ui";
import type { Frame } from "./lab-state";

/** A sheet's columns, as the atlases name them: stand, three walk steps, two attacks. */
const FRAME_LABELS = ["stand", "walk 1", "walk 2", "walk 3", "attack right", "attack left"];

/**
 * Two dropdowns picking a frame of a body sheet: which way it faces, then which frame. Each option
 * shows the bare body (`texture`) in that pose. `columns` limits the frames to those the sheet has.
 * `before` puts another dropdown first on the same row, every one sharing the width equally.
 */
export const FrameSelects = ({
  texture,
  cell,
  columns = FRAME_LABELS.length,
  value,
  onChange,
  before,
}: {
  texture: string;
  cell: number;
  columns?: number;
  value: Frame;
  onChange: (frame: Frame) => void;
  before?: ReactNode;
}) => {
  const thumb = ({ column, row }: Frame) => (
    <SheetThumb texture={texture} rect={[column * cell, row * cell, cell, cell]} />
  );
  const facingOptions = DIRECTIONS.map((direction, row) => ({
    value: String(row),
    label: direction,
    icon: thumb({ column: 0, row }),
  }));
  const frameOptions = FRAME_LABELS.slice(0, columns).map((label, column) => ({
    value: String(column),
    label,
    icon: thumb({ column, row: value.row }),
  }));
  const cellSx = { flex: 1, minWidth: 0 };
  return (
    <Flex sx={{ gap: 2 }}>
      {before && <Box sx={cellSx}>{before}</Box>}
      <Box sx={cellSx}>
        <Select
          label="Facing"
          value={String(value.row)}
          options={facingOptions}
          onChange={(row) => onChange({ ...value, row: Number(row) })}
        />
      </Box>
      <Box sx={cellSx}>
        <Select
          label="Frame"
          value={String(value.column)}
          options={frameOptions}
          onChange={(column) => onChange({ ...value, column: Number(column) })}
        />
      </Box>
    </Flex>
  );
};
