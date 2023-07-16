import { forwardRef } from "react";
import { Box } from "theme-ui";

const Icon = forwardRef<HTMLDivElement, any>(({ sx, size = 32, icon, ...props }, ref) => {
  return (
    <Box
      className="icon"
      ref={ref}
      sx={{
        height: size,
        width: size,
        backgroundImage: `url(${icon})`,
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        ...sx,
      }}
      {...props}
    />
  );
});

export default Icon;
