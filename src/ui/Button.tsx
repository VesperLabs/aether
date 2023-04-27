import { ButtonProps as ThemeButtonProps, Button as BaseButton } from "theme-ui";
import { forwardRef, ForwardedRef, MouseEvent, TouchEvent } from "react";

export type ButtonProps = ThemeButtonProps & {
  icon?: any;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onTouchEnd?: (event: TouchEvent<HTMLButtonElement>) => void;
  onTouchStart?: (event: TouchEvent<HTMLButtonElement>) => void;
};

type ButtonPropsWithRef = ButtonProps & { ref?: ForwardedRef<HTMLButtonElement> };

const Button = forwardRef<HTMLButtonElement, ButtonPropsWithRef>(
  ({ sx, icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
    return (
      <BaseButton
        // @ts-ignore
        __themeKey="buttons"
        ref={ref}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          if (onClick) {
            onClick(e as unknown as MouseEvent<HTMLButtonElement>);
          } else if (onTouchStart) {
            onTouchStart(e as unknown as TouchEvent<HTMLButtonElement>);
          }
        }}
        onTouchStart={(e: TouchEvent<HTMLButtonElement>) => {
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
