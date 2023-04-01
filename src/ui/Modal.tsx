import React from "react";
import { Box, Flex } from "./";

const Modal = ({ sx, ...props }) => {
  return (
    <Flex
      sx={{
        zIndex: "modal",
        gap: 1,
        p: 1,
        borderRadius: 3,
        position: "absolute",
        flexDirection: "column",
        top: "50%",
        left: "50%",
        pointerEvents: "all",
        transform: "translate(-50%, -50%)",
        ...sx,
      }}
      variant="buttons.wood"
      {...props}
    />
  );
};

Modal.Header = ({ sx, ...props }) => {
  return <Box sx={{ ...sx }} {...props} />;
};

Modal.Body = ({ sx, ...props }) => {
  return <Box sx={{ p: 3, borderRadius: 3, bg: "shadow.25", ...sx }} {...props} />;
};

Modal.Footer = ({ sx, ...props }) => {
  return <Flex sx={{ gap: 1, flex: 1, ...sx }} {...props} />;
};

export default Modal;
