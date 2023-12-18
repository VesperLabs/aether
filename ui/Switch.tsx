import { Switch } from "theme-ui";

export default function ({
  sx,
  ...props
}: {
  sx?: any;
  label?: string;
  checked: any;
  onChange: any;
}) {
  return (
    <Switch
      sx={{
        backgroundColor: "shadow.20",
        "input:checked ~ &": {
          backgroundColor: "set",
          transition: ".5s ease all",
        },
        ...sx,
      }}
      {...props}
    />
  );
}
