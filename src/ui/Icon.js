import React, { forwardRef } from "react";
import { Box } from "theme-ui";

const Icon = forwardRef(({ sx, size = 32, icon, ...props }, ref) => {
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
