import { Button as Flex } from "theme-ui";
import { forwardRef, useState, type ComponentProps } from "react";

/** Press handlers get a React event from the element or a DOM event from the document listener. */
// oxlint-disable-next-line typescript/no-explicit-any
export type PressHandler =(event: any) => unknown;

/** theme-ui reads `__themeKey` to pick the theme section, but its prop types leave it out. */
const THEME_KEY = { __themeKey: "buttons" };

export type ButtonProps = Omit<
  ComponentProps<typeof Flex>,
  "ref" | "onClick" | "onTouchStart" | "onTouchEnd"
> & {
  icon?: string;
  href?: string;
  target?: string;
  disabled?: boolean;
  onClick?: PressHandler;
  onTouchStart?: PressHandler;
  onTouchEnd?: PressHandler;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ icon: _icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
    const [className, setClassName] = useState("");

    // if we are using this as a link we disable the click events
    const isLink = props?.href;

    const handleMouseDown = (e: React.MouseEvent) => {
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
        { once: true },
      );
    };

    const handleTouchStart = (e: React.TouchEvent) => {
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
        { once: true },
      );
    };

    return (
      <Flex
        className={className}
        tabIndex={-1}
        {...THEME_KEY}
        variant="default"
        ref={ref}
        type="button"
        {...(!isLink && { onTouchStart: handleTouchStart, onMouseDown: handleMouseDown })}
        {...props}
      />
    );
  },
);
