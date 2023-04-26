import { Box, Flex, useAppContext } from "./";

interface ModalProps {
  sx?: any;
  children: React.ReactNode;
}

interface ModalHeaderProps {
  sx?: any;
  children: React.ReactNode;
}

interface ModalBodyProps {
  sx?: any;
  children: React.ReactNode;
}

interface ModalFooterProps {
  sx?: any;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> & {
  Header: React.FC<ModalHeaderProps>;
  Body: React.FC<ModalBodyProps>;
  Footer: React.FC<ModalFooterProps>;
} = ({ sx, ...props }) => {
  const { zoom } = useAppContext();
  return (
    <Flex
      sx={{
        zIndex: "modal",
        gap: 1,
        p: 1,
        borderRadius: 3,
        position: "fixed",
        flexDirection: "column",
        top: "50%",
        left: "50%",
        pointerEvents: "all",
        transform: `scale(${zoom}) translate(-50%, -50%)`,
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
      sx={{ p: 2, borderRadius: 3, bg: "shadow.25", flexDirection: "column", ...sx }}
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
