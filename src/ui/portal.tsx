import { createPortal } from "react-dom";

export const Portal = ({ children, container }) => {
  return container ? createPortal(children, container) : children;
};

Portal.displayName = "Portal";
