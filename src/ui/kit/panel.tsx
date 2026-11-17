import type { ComponentProps, ReactNode } from "react";
import { Box, Flex } from "theme-ui";
import { Modal } from "./modal";
import { GILDED_BOTTOM_CORNERS, GILDED_TOP_CORNERS } from "./modal-gilding";

/**
 * The modal's gilded wood and header, sitting in the page instead of over it. `collapsed` folds it
 * to its header, which then rounds off on its own; the body stays mounted, only hidden.
 */
export const Panel = ({
  header,
  width,
  collapsed = false,
  sx,
  children,
  ...props
}: ComponentProps<typeof Flex> & { header: ReactNode; width: number; collapsed?: boolean }) => (
  <Flex
    variant="buttons.wood"
    sx={{
      ...GILDED_TOP_CORNERS,
      position: "relative",
      /* Keeps the gilding behind the panel's contents but above the page. */
      zIndex: 0,
      flexDirection: "column",
      flexShrink: 0,
      gap: 1,
      p: 2,
      borderRadius: 3,
      width,
      boxSizing: "border-box",
      /* Folded to its header, the header ends with a body's bottom edge */
      ...(collapsed && { "& .header-bottom-cap": { display: "block" } }),
      ...sx,
    }}
    {...props}
  >
    {/* The gilding's bottom pair: split from the top so a folded panel's corners don't overlap */}
    <Box aria-hidden sx={GILDED_BOTTOM_CORNERS} />
    <Modal.Header sx={{ justifyContent: "space-between" }}>{header}</Modal.Header>
    <Modal.Body hidden={collapsed} sx={{ gap: 2, ...(collapsed && { display: "none" }) }}>
      {children}
    </Modal.Body>
  </Flex>
);
