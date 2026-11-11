import type { CSSProperties } from "react";
import type { SeasonIcon } from "@/content";

/** A season's icon, turned to its color (fall's orange leaf) when it borrows another's picture. */
export const SeasonIconImage = ({
  icon,
  size,
  style,
}: {
  icon: SeasonIcon;
  size: number;
  style?: CSSProperties;
}) => (
  <img
    src={icon.image}
    alt=""
    width={size}
    height={size}
    style={{
      ...style,
      filter: icon.hueRotate ? `hue-rotate(${icon.hueRotate}deg) saturate(1.4)` : undefined,
    }}
  />
);
