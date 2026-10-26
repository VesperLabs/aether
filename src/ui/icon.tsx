import { forwardRef, type ComponentProps } from "react";
import { Box } from "theme-ui";

type IconProps = Omit<ComponentProps<typeof Box>, "ref"> & { icon?: string; size?: number };

export const Icon = forwardRef<HTMLDivElement, IconProps>(({ sx, size = 32, icon, ...props }, ref) => {
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
