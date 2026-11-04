import { createContext, use, useState, type ComponentProps } from "react";
import { Box } from "@/ui";

const WalkContext = createContext(false);

/** Whether the surrounding `WalkOnHover` is hovered. */
export const useWalkOnHover = () => use(WalkContext);

/** A box whose characters walk while the pointer is over it. */
export const WalkOnHover = ({ children, ...props }: ComponentProps<typeof Box>) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Box {...props} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <WalkContext value={hovered}>{children}</WalkContext>
    </Box>
  );
};
