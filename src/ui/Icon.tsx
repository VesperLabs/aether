import { forwardRef, HTMLAttributes } from "react";
import { Box, SxProp } from "theme-ui";

interface IconProps extends HTMLAttributes<HTMLDivElement> {
  sx?: any;
  size?: number;
  icon: string;
}

const Icon = forwardRef<HTMLDivElement, IconProps>(({ sx, size = 32, icon, ...props }, ref) => {
  return (
    <Box
      ref={ref}
      sx={{
        height: size,
        width: size,
        backgroundImage: `url(${icon})`,
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        ...sx,
      }}
      {...props}
    />
  );
});

export default Icon;
