import React, { forwardRef } from "react";
import { Button as BaseButton } from "theme-ui";

const Button = forwardRef(({ sx, icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
  return (
    <BaseButton
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
        padding: 1,
        cursor: "pointer",
        touchAction: "none",
        userSelect: "none",
        backgroundColor: "shadow.10",
        pointerEvents: "all",
        ...sx,
      }}
      {...props}
    />
  );
});

export default Button;
