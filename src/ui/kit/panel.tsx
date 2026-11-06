import type { ComponentProps, ReactNode } from "react";
import { Flex } from "theme-ui";
import { Modal } from "./modal";
import { GILDED_CORNERS } from "./modal-gilding";

/** The modal's gilded wood and header, sitting in the page instead of over it. */
export const Panel = ({
  header,
  width,
  sx,
  children,
  ...props
}: ComponentProps<typeof Flex> & { header: ReactNode; width: number }) => (
  <Flex
    variant="buttons.wood"
    sx={{
      ...GILDED_CORNERS,
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
      ...sx,
    }}
    {...props}
  >
    <Modal.Header sx={{ justifyContent: "space-between" }}>{header}</Modal.Header>
    <Modal.Body sx={{ gap: 2 }}>{children}</Modal.Body>
  </Flex>
);
