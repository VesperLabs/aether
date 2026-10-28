import type { ComponentProps } from "react";
import { Box, Flex } from "theme-ui";

type FlexProps = ComponentProps<typeof Flex>;
type ModalProps = FlexProps & { zoom?: number | string; bottomOffset?: number };

const ModalRoot = ({ sx, zoom = 1, bottomOffset = 0, ...props }: ModalProps) => {
  return (
    <Flex
      sx={{
        zIndex: "modal",
        gap: 1,
        p: 1,
        borderRadius: 3,
        position: "fixed",
        flexDirection: "column",
        left: "50%",
        top: `50%`,
        marginTop: -bottomOffset / 2,
        pointerEvents: "all",
        transform: `scale(${Math.max(1, Number(zoom))}) translate(-50%, -50%)`,
        transformOrigin: "center center",
        cursor: "default",
        ...sx,
      }}
      variant="buttons.wood"
      {...props}
    />
  );
};

const ModalOverlay = ({ sx, ...props }: ComponentProps<typeof Box>) => {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: "0 0 0 0",
        backgroundColor: "#000000",
        zIndex: "modal",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        pointerEvents: "all",
        ...sx,
      }}
      {...props}
    />
  );
};

const ModalHeader = ({ sx, ...props }: FlexProps) => {
  return (
    <Flex
      sx={{ alignItems: "center", p: 2, gap: 1, borderRadius: 3, flex: 1, bg: "shadow.25", ...sx }}
      {...props}
    />
  );
};

const ModalBody = ({ sx, ...props }: FlexProps) => {
  return (
    <Flex
      sx={{
        p: 3,
        borderRadius: 3,
        bg: "shadow.25",
        whiteSpace: "wrap",
        flexDirection: "column",
        ...sx,
      }}
      {...props}
    />
  );
};

const ModalFooter = ({ sx, ...props }: FlexProps) => {
  return <Flex sx={{ gap: 1, flex: 1, ...sx }} {...props} />;
};

export const Modal = Object.assign(ModalRoot, {
  Overlay: ModalOverlay,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
});
