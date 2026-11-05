import { Text } from "theme-ui";

/** The build's version and commit, right under the bottom-right corner of the positioned box it is placed in. */
export const VersionTag = () => (
  <Text
    sx={{
      position: "absolute",
      top: "100%",
      right: 0,
      mt: 2,
      fontSize: 0,
      opacity: 0.5,
      pointerEvents: "none",
      userSelect: "none",
    }}
  >
    {__APP_VERSION__}
  </Text>
);
