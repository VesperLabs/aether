import { Button as Flex } from "theme-ui";
import { forwardRef, MouseEvent, TouchEvent } from "react";

const Button = forwardRef<HTMLDivElement, any>(
  ({ icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
    return (
      <Flex
        // @ts-ignore
        __themeKey="buttons"
        variant="default"
        ref={ref}
        type="button"
        onMouseDown={(e) => {
          if (props?.disabled) return false;
          if (onTouchStart) {
            onTouchStart(e);
          }
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (props?.disabled) return false;
          if (onTouchEnd) {
            return onTouchEnd?.(e);
          } else if (onClick) {
            onClick(e);
          }
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          if (props?.disabled) return false;
          if (onTouchStart) {
            onTouchStart(e);
          } else if (onClick) {
            onClick(e);
          }
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (props?.disabled) return false;
          return onTouchEnd?.(e);
        }}
        {...props}
      />
    );
  }
);

export default Button;
