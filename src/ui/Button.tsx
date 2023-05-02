import { ButtonProps as ThemeButtonProps, Button as BaseButton, Flex } from "theme-ui";
import { forwardRef, ForwardedRef, MouseEvent, TouchEvent } from "react";

export type ButtonProps = ThemeButtonProps & {
  icon?: any;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onTouchEnd?: (event: TouchEvent<HTMLDivElement>) => void;
  onTouchStart?: (event: TouchEvent<HTMLDivElement>) => void;
};

type ButtonPropsWithRef = ButtonProps & { ref?: ForwardedRef<HTMLDivElement> };

const Button = forwardRef<HTMLDivElement, ButtonPropsWithRef>(
  ({ icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
    return (
      <Flex
        // @ts-ignore
        __themeKey="buttons"
        variant="default"
        ref={ref}
        onClick={(e: MouseEvent<HTMLDivElement>) => {
          if (props?.disabled) return false;
          if (onClick) {
            onClick(e as unknown as MouseEvent<HTMLDivElement>);
          } else if (onTouchStart) {
            onTouchStart(e as unknown as TouchEvent<HTMLDivElement>);
          }
        }}
        onTouchStart={(e: TouchEvent<HTMLDivElement>) => {
          e.stopPropagation();
          if (props?.disabled) return false;
          if (onTouchStart) {
            onTouchStart(e as unknown as TouchEvent<HTMLDivElement>);
          } else if (onClick) {
            onClick(e as unknown as MouseEvent<HTMLDivElement>);
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
