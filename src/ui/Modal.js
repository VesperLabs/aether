import React from "react";
import { Box, Flex } from "./";

const Modal = ({ sx, ...props }) => {
  return (
    <Flex
      sx={{
        border: `1px solid #000`,
        boxShadow: `inset 0px 0px 0px 1px rgba(255,255,255,.25)`,
        gap: 1,
        p: 1,
        borderRadius: 3,
        position: "absolute",
        flexDirection: "column",
        bg: "yellow.900",
        top: "50%",
        left: "50%",
        pointerEvents: "all",
        transform: "translate(-50%, -50%)",
        ...sx,
      }}
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
  return <Flex sx={{ flex: 1 }} {...props} />;
};

export default Modal;
