import React, { forwardRef } from "react";
import { Flex } from "theme-ui";

const Button = forwardRef(({ sx, icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
  return (
    <Flex
      __themeKey="buttons"
      ref={ref}
      tabIndex="-1"
      onClick={onClick || onTouchStart}
      onTouchStart={(e) => {
        e.stopPropagation();
        return onTouchStart?.(e) || onClick?.(e);
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        e.preventDefault();
        return onTouchEnd?.(e);
      }}
      sx={{
        cursor: "pointer",
        touchAction: "none",
        userSelect: "none",
        pointerEvents: "all",
        "&:focus": {
          outline: "none",
        },
        ...sx,
      }}
      {...props}
    />
  );
});

export default Button;
