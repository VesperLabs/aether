import { Button as Flex } from "theme-ui";
import { forwardRef, useState } from "react";

const Button = forwardRef<HTMLDivElement, any>(
  ({ icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
    const [className, setClassName] = useState("");
    return (
      <Flex
        className={className}
        tabIndex={-1}
        __themeKey="buttons"
        variant="default"
        ref={ref}
        type="button"
        onMouseDown={(e) => {
          if (props?.disabled) return false;
          setClassName("active");
          if (onTouchStart) onTouchStart(e);
          document.addEventListener(
            "mouseup",
            (e) => {
              e.stopPropagation();
              e.preventDefault();
              if (props?.disabled) return false;
              setClassName("");
              if (onTouchEnd) return onTouchEnd?.(e);
              if (onClick) return onClick(e);
            },
            { once: true }
          );
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          if (props?.disabled) return false;
          setClassName("active");
          if (onTouchStart) onTouchStart?.(e);
          document.addEventListener(
            "touchend",
            (e) => {
              e.stopPropagation();
              e.preventDefault();
              if (props?.disabled) return false;
              setClassName("");
              if (onTouchEnd) return onTouchEnd(e);
              if (onClick) return onClick(e);
            },
            { once: true }
          );
        }}
        {...props}
      />
    );
  }
);

export default Button;
