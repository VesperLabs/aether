import { Box, Flex } from "./";

interface ModalBodyProps {
  sx?: any;
  children: React.ReactNode;
}

interface ModalFooterProps {
  sx?: any;
  children: React.ReactNode;
}

interface ModalOverlayProps {
  sx?: any;
  children: React.ReactNode;
}

const Modal: any & {
  Header: any;
  Body: React.FC<ModalBodyProps>;
  Footer: React.FC<ModalFooterProps>;
  Overlay: React.FC<ModalOverlayProps>;
} = ({ sx, zoom = 1, bottomOffset, ...props }) => {
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
        transform: `scale(${Math.max(1, zoom)}) translate(-50%, -50%)`,
        transformOrigin: "center center",
        cursor: "default",
        ...sx,
      }}
      variant="buttons.wood"
      {...props}
    />
  );
};

Modal.Overlay = ({ sx, ...props }) => {
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

Modal.Header = ({ sx, ...props }) => {
  return (
    <Flex
      sx={{ alignItems: "center", p: 2, gap: 1, borderRadius: 3, flex: 1, bg: "shadow.25", ...sx }}
      {...props}
    />
  );
};

Modal.Body = ({ sx, ...props }) => {
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

Modal.Footer = ({ sx, ...props }) => {
  return <Flex sx={{ gap: 1, flex: 1, ...sx }} {...props} />;
};

export default Modal;
