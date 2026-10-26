import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export const Portal = ({
  children,
  container,
}: {
  children: ReactNode;
  container?: Element | DocumentFragment | null;
}) => {
  return container ? createPortal(children, container) : children;
};

Portal.displayName = "Portal";
