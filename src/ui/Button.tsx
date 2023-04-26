import { ButtonProps as ThemeButtonProps } from "theme-ui";
import { Flex } from "./";
import { forwardRef, ForwardedRef, MouseEvent, TouchEvent } from "react";

export type ButtonProps = ThemeButtonProps & {
  icon?: any;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onTouchEnd?: (event: TouchEvent<HTMLDivElement>) => void;
  onTouchStart?: (event: TouchEvent<HTMLDivElement>) => void;
};

type ButtonPropsWithRef = ButtonProps & { ref?: ForwardedRef<HTMLDivElement> };

const Button = forwardRef<HTMLDivElement, ButtonPropsWithRef>(
  ({ sx, icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
    return (
      <Flex
        // @ts-ignore
        __themeKey="buttons"
        ref={ref}
        onClick={(e) => {
          if (onClick) {
            onClick(e as unknown as MouseEvent<HTMLButtonElement>);
          } else if (onTouchStart) {
            onTouchStart(e as unknown as TouchEvent<HTMLButtonElement>);
          }
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          if (onTouchStart) {
            onTouchStart(e as unknown as TouchEvent<HTMLButtonElement>);
          } else if (onClick) {
            onClick(e as unknown as MouseEvent<HTMLButtonElement>);
          }
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          return onTouchEnd?.(e);
        }}
        sx={{
          display: "flex",
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
  }
);

export default Button;
