import React, { createContext, use, useRef, useEffect, useEffectEvent, FC } from "react";
import { Input as BaseInput, InputProps as BaseInputProps } from "theme-ui";
import { useOnClickOutside } from "./hooks";
import { usePadHint } from "./pad-glyph";
import { isMobile } from "./is-mobile";

/**
 * Whether focusing a field must leave the page where it is. The game's screen never scrolls, so it
 * turns this on to stop iOS jumping the view to the keyboard; a page that scrolls (the wiki) leaves
 * it off so the browser brings the field into view itself.
 */
export const KeepPageStillContext = createContext(false);

interface InputProps extends BaseInputProps {
  autoFocus?: boolean;
  onTouchEnd?: (e: React.TouchEvent<HTMLInputElement>) => void;
  onClickOutside?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const Input: FC<InputProps> = ({
  sx,
  autoFocus,
  onTouchEnd,
  onClickOutside = () => {},
  onBlur = () => {},
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const keepPageStill = use(KeepPageStillContext);

  /* Set while a controller is in use */
  const onController = !!usePadHint();
  useEffect(() => {
    /* Not on phones: it can't open the keyboard there, but leaves a field focused for the page
       to keep scrolling back to. Nor with a controller, where a focused field opens the
       on-screen keyboard: the player moves to the field and presses A instead */
    if (autoFocus && !isMobile && !onController) {
      inputRef?.current?.focus({ preventScroll: keepPageStill });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on mount, not when the controller is picked up mid-form
  }, [autoFocus, keepPageStill]);

  useOnClickOutside(inputRef, onClickOutside);
  const handleBlur = useEffectEvent((e: Event) => {
    onBlur?.(e as unknown as React.FocusEvent<HTMLInputElement>);
  });
  useEffect(() => {
    const input = inputRef.current;
    const listener = (e: Event) => handleBlur(e);
    input?.addEventListener("blur", listener);
    return () => {
      input?.removeEventListener("blur", listener);
    };
  }, []);

  return (
    <BaseInput
      type="text"
      ref={inputRef}
      onTouchEnd={(e) => {
        if (keepPageStill) {
          /* Disables IOS keyboard Jump */
          e.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
        }
        return onTouchEnd?.(e);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      sx={{
        pointerEvents: "all",
        ...sx,
      }}
      {...props}
    />
  );
};
