import React, { useRef, useEffect, FC } from "react";
import { Input as BaseInput, InputProps as BaseInputProps } from "theme-ui";
import { useOnClickOutside } from "./hooks";

interface InputProps extends BaseInputProps {
  sx?: any;
  autoFocus?: boolean;
  onTouchEnd?: (e: React.TouchEvent<HTMLInputElement>) => void;
  onClickOutside?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const Input: FC<InputProps> = ({
  sx,
  autoFocus,
  onTouchEnd,
  onClickOutside = () => {},
  onBlur = () => {},
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef?.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  useOnClickOutside(inputRef, onClickOutside);
  useEffect(() => {
    const listener = (e: Event) => {
      onBlur?.(e as unknown as React.FocusEvent<HTMLInputElement>);
    };
    inputRef?.current?.addEventListener("blur", listener);
    return () => {
      inputRef?.current?.removeEventListener("blur", listener);
    };
  }, []);

  return (
    <BaseInput
      type="text"
      ref={inputRef}
      onTouchEnd={(e) => {
        /* Disables IOS keyboard Jump */
        e.preventDefault();
        (inputRef.current as HTMLInputElement)?.focus({ preventScroll: true });
        return onTouchEnd?.(e);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      sx={{
        lineHeight: 1,
        pointerEvents: "all",
        ...sx,
      }}
      {...props}
    />
  );
};

export default Input;
