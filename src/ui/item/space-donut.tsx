import { Donut } from "@/ui/kit";

export const SpaceDonut = ({ percent = 0 }: { percent?: number }) => {
  const getColor = () => {
    if (percent > 0.75) {
      return "danger";
    }
    if (percent > 0.5) {
      return "yellow.200";
    }
    return "success";
  };
  return (
    <Donut
      sx={{
        position: "absolute",
        zIndex: 2,
        color: getColor(),
        "& circle:first-of-type": {
          opacity: 0.25,
          color: "#000",
        },
        ml: "1px",
        mt: "1px",
      }}
      size="12px"
      strokeWidth="6px"
      value={percent}
    />
  );
};
