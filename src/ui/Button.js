import React, { forwardRef } from "react";
import { Button as BaseButton } from "theme-ui";

const Button = forwardRef(
  ({ sx, onTouchEnd = () => {}, onTouchStart = () => {}, ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        onTouchStart={(e) => {
          e.stopPropagation();
          return onTouchStart(e);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          return onTouchEnd(e);
        }}
        sx={{
          ...sx,
          touchAction: "none",
          userSelect: "none",
          bg: "shadow.15",
          pointerEvents: "all",
        }}
        {...props}
      />
    );
  }
);

export default Button;
