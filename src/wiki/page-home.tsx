import { Flex } from "@/ui";
import { HomeCards } from "./home-cards";
import { WikiLogin } from "./wiki-login";

export function PageHome() {
  return (
    <Flex sx={{ flex: 1, flexDirection: "column" }}>
      <WikiLogin />
      <HomeCards />
    </Flex>
  );
}
