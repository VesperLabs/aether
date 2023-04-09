import {
  Box,
  TOOLTIP_STYLE,
  Text,
  Flex,
  Divider,
  Slot,
  Icon,
  SlotAmount,
  STYLE_NON_EMPTY,
  Button,
} from "./";
import { Tooltip } from "react-tooltip";

const QuestTooltip = ({ quest, show }: { quest: Quest; show: boolean }) => {
  const { rewards } = quest ?? {};
  return (
    <Tooltip
      id={`tooltip-quest-${quest?.id}`}
      style={{ ...TOOLTIP_STYLE, pointerEvents: "all" }}
      isOpen={show}
    >
      <Flex
        sx={{
          maxWidth: 200,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          "&  strong": {
            color: "set",
          },
        }}
      >
        <Text sx={{ fontWeight: "bold" }}>{quest?.name}</Text>
        <Divider />
        <Text dangerouslySetInnerHTML={{ __html: quest?.dialogues?.description }} />
        <Divider />
        <Text sx={{ fontWeight: "bold" }}>Quest Rewards</Text>
        <Divider />
        <Flex sx={{ gap: 2 }}>
          {rewards?.items?.map((reward: Item, idx: string) => {
            return <Slot item={reward} key={idx} disabled={true} />;
          })}
          {rewards?.gold > 0 && (
            <Box sx={{ ...STYLE_NON_EMPTY("unique") }}>
              <SlotAmount>{rewards?.gold}</SlotAmount>
              <Icon
                icon="./assets/icons/gold.png"
                sx={{ width: "106%", height: "106%", transform: "scale(2)" }}
              />
            </Box>
          )}
          {rewards?.exp > 0 && (
            <Box sx={{ ...STYLE_NON_EMPTY("set") }}>
              <SlotAmount>{rewards?.exp}</SlotAmount>
              <Icon
                icon="./assets/icons/exp.png"
                sx={{ width: "100%", height: "100%", transform: "scale(2)" }}
              />
            </Box>
          )}
        </Flex>
        <Divider />
        <Flex sx={{ gap: 1 }}>
          <Button variant="wood">Cancel</Button>
          <Button variant="wood">Accept</Button>
        </Flex>
      </Flex>
    </Tooltip>
  );
};

export default QuestTooltip;
