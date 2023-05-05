import { Box, Flex, useAppContext } from "./";

interface ModalBodyProps {
  sx?: any;
  children: React.ReactNode;
}

interface ModalFooterProps {
  sx?: any;
  children: React.ReactNode;
}

const Modal: any & {
  Header: any;
  Body: React.FC<ModalBodyProps>;
  Footer: React.FC<ModalFooterProps>;
} = ({ sx, ...props }) => {
  const { zoom, bottomOffset } = useAppContext();

  return (
    <Flex
      sx={{
        zIndex: "modal",
        gap: 1,
        p: 1,
        borderRadius: 3,
        position: "fixed",
        flexDirection: "column",
        bottom: bottomOffset > 0 ? bottomOffset + 80 + "px" : "50%",
        left: "50%",
        pointerEvents: "all",
        transform: `scale(${zoom}) translate(-50%, ${bottomOffset > 0 ? "0%" : "50%"})`,
        transformOrigin: "top left",
        ...sx,
      }}
      variant="buttons.wood"
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
      sx={{ p: 3, borderRadius: 3, bg: "shadow.25", flexDirection: "column", ...sx }}
      {...props}
    />
  );
};

Modal.Footer = ({ sx, ...props }) => {
  return <Flex sx={{ gap: 1, flex: 1, ...sx }} {...props} />;
};

export default Modal;
