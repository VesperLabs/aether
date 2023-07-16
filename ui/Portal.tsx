import { createPortal } from "react-dom";

const Portal = ({ children, container }) => {
  return container ? createPortal(children, container) : children;
};

Portal.displayName = "Portal";

export default Portal;
