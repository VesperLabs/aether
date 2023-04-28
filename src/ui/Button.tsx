import { ButtonProps as ThemeButtonProps, Button as BaseButton, Flex } from "theme-ui";
import { forwardRef, ForwardedRef, MouseEvent, TouchEvent } from "react";

export type ButtonProps = ThemeButtonProps & {
  icon?: any;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onTouchEnd?: (event: TouchEvent<HTMLButtonElement>) => void;
  onTouchStart?: (event: TouchEvent<HTMLButtonElement>) => void;
};

type ButtonPropsWithRef = ButtonProps & { ref?: ForwardedRef<HTMLButtonElement> };

const Button = forwardRef<HTMLButtonElement, ButtonPropsWithRef>(
  ({ icon, onTouchEnd, onTouchStart, onClick, ...props }, ref) => {
    return (
      <BaseButton
        //as={Flex}
        // @ts-ignore
        __themeKey="buttons"
        variant="default"
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
        {...props}
      />
    );
  }
);

export default Button;
