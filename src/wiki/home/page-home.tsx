import { Flex } from "@/ui";
import { HomeCards } from "./home-cards";

export function PageHome() {
  return (
    <Flex sx={{ gap: 3, flexDirection: "column", mb: 5 }}>
      <HomeCards />
    </Flex>
  );
}
