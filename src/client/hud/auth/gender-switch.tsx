import { Box, Flex } from "@/ui";

export type Gender = "male" | "female";

const OPTIONS: { gender: Gender; symbol: string }[] = [
  { gender: "male", symbol: "♂" },
  { gender: "female", symbol: "♀" },
];

/** A small two-way pick, compact enough to sit beside an input. */
export const GenderSwitch = ({
  gender,
  setGender,
}: {
  gender: Gender;
  setGender: (gender: Gender) => void;
}) => (
  <Flex role="radiogroup" aria-label="Gender" sx={{ flexShrink: 0, gap: 1 }}>
    {OPTIONS.map((option) => {
      const isSelected = option.gender === gender;
      return (
        <Box
          as="button"
          key={option.gender}
          {...{ type: "button" }}
          role="radio"
          tabIndex={-1}
          aria-checked={isSelected}
          aria-label={option.gender}
          onClick={() => setGender(option.gender)}
          sx={{
            width: 22,
            alignSelf: "stretch",
            p: 0,
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            color: "inherit",
            fontSize: 1,
            bg: isSelected ? "shadow.20" : "transparent",
            opacity: isSelected ? 1 : 0.4,
            "&:hover": { opacity: isSelected ? 1 : 0.7 },
          }}
        >
          {option.symbol}
        </Box>
      );
    })}
  </Flex>
);
