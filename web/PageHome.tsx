import { Text, Button, Flex, Link } from "@aether/ui";
import RowTitle from "./RowTitle";

export default function () {
  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"pen"}>Welcome</RowTitle>
      <Text sx={{ m: 2 }}>
        Welcome to Aether MMO. The game is under active development, but feel free to look around.
      </Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
        <a href="http://aether.up.railway.app">
          <Button variant="wood" sx={{ px: 4, py: 2 }}>
            Play Now
          </Button>
        </a>
        <a href="https://discord.gg/yadDyqpb6D">
          <Button as={Link} variant="wood" sx={{ px: 4, py: 2 }}>
            Join Discord
          </Button>
        </a>
      </Flex>
    </Flex>
  );
}
