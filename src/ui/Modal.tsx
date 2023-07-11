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
        left: "50%",
        top: `50%`,
        marginTop: -bottomOffset / 2,
        pointerEvents: "all",
        transform: `scale(${Math.max(1, zoom)}) translate(-50%, -50%)`,
        transformOrigin: "center center",
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
