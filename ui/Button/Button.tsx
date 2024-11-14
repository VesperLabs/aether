import { Button as Flex } from "theme-ui";
import { forwardRef, useState } from "react";

const Button = forwardRef<HTMLDivElement, any>(
  ({ icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
    const [className, setClassName] = useState("");

    // if we are using this as a link we disable the click events
    const isLink = props?.href;

    const handleMouseDown = (e) => {
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
    };

    const handleTouchStart = (e) => {
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
    };

    return (
      <Flex
        className={className}
        tabIndex={-1}
        __themeKey="buttons"
        variant="default"
        // @ts-ignore
        ref={ref}
        type="button"
        {...(!isLink && { onTouchStart: handleTouchStart, onMouseDown: handleMouseDown })}
        {...props}
      />
    );
  }
);

export default Button;
