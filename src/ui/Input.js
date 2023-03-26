import React, { useRef, useEffect } from "react";
import { Input as BaseInput } from "theme-ui";

const Input = ({ sx, autoFocus, onTouchEnd, ...props }) => {
  const inputRef = useRef();

  useEffect(() => {
    if (autoFocus) {
      inputRef?.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  return (
    <BaseInput
      ref={inputRef}
      tabIndex="-1"
      onTouchEnd={(e) => {
        /* Disables IOS keyboard Jump */
        e.preventDefault();
        e.target.focus({ preventScroll: true });
        return onTouchEnd?.(e);
      }}
      sx={{
        ...sx,
      }}
      {...props}
    />
  );
};

export default Input;
