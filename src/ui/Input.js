import React, { useRef, useEffect } from "react";
import { Input as BaseInput } from "theme-ui";
import { useOnClickOutside } from "./hooks";

const Input = ({
  sx,
  autoFocus,
  onTouchEnd,
  onClickOutside = () => {},
  onBlur = () => {},
  ...props
}) => {
  const inputRef = useRef();

  useEffect(() => {
    if (autoFocus) {
      inputRef?.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  useOnClickOutside(inputRef, onClickOutside);
  useEffect(() => {
    const listener = (e) => {
      onBlur?.(e);
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
        e.target.focus({ preventScroll: true });
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
