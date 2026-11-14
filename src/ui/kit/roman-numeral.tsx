import { Text } from "theme-ui";
import { toRoman } from "./roman";

/** A rank as a serif numeral: "Fireball II", "Tier IV". */
export const RomanNumeral = ({ value }: { value: number | string | null | undefined }) => (
  <Text as="span" sx={{ fontFamily: "numeral", letterSpacing: "0.04em" }}>
    {toRoman(value)}
  </Text>
);
