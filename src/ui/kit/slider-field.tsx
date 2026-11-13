import { Flex, Text } from "theme-ui";
import { Slider } from "./slider";

const LABEL_WIDTH = 76;
const VALUE_WIDTH = 32;

/** A slider with its name before it and its number after, for a value like a pixel offset. */
export const SliderField = ({
  label,
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** How the number after the slider reads; the value itself by default. */
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) => (
  <Flex sx={{ alignItems: "center", gap: 2 }}>
    <Text sx={{ width: LABEL_WIDTH, fontSize: 1 }}>{label}</Text>
    <Slider label={label} value={value} min={min} max={max} step={step} onChange={onChange} />
    <Text sx={{ width: VALUE_WIDTH, fontSize: 1, textAlign: "right" }}>{format(value)}</Text>
  </Flex>
);
