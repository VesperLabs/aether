import { useState, useEffect } from "react";
import { Menu, useAppContext, MenuHeader, BigPortrait, Slot, Quest, MENU_MAX_WIDTH } from "./";
import { Flex, Text, KeyboardButton } from "@aether/ui";

const MenuKeeper = () => {
  const { keeper, tabKeeper, setTabKeeper } = useAppContext();
  const [tab, setTab] = useState("greet");
  const { dialogues, shop, quests } = keeper?.keeperData ?? {};

  const hasQuests = quests?.length > 0;
  const hasShop = shop?.length > 0;
  const hasGreet = dialogues?.greet?.length > 0;

  const tabShop = tab === "shop";
  const tabQuests = tab === "quests";
  const tabGreet = tab === "greet";

  useEffect(() => {
    if (!tabKeeper) setTab("greet");
  }, [tabKeeper]);

  const KeeperButtons = () => {
    if (!hasQuests && !hasShop) return;
    return (
      <Flex sx={{ gap: 2, justifyContent: "flex-end" }}>
        {hasGreet && (hasShop || hasQuests) && (
          <KeyboardButton keyboardKey="G" onClick={() => setTab("greet")} active={tabGreet}>
            Greet
          </KeyboardButton>
        )}
        {hasShop && (
          <KeyboardButton keyboardKey="B" onClick={() => setTab("shop")} active={tabShop}>
            Shop
          </KeyboardButton>
        )}
        {hasQuests && (
          <KeyboardButton keyboardKey="U" onClick={() => setTab("quests")} active={tabQuests}>
            Quests
          </KeyboardButton>
        )}
      </Flex>
    );
  };

  return (
    <Menu className="menu-keeper">
      <MenuHeader onClick={() => setTabKeeper(false)}>{keeper?.profile?.userName}</MenuHeader>
      <Flex sx={{ flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
        <Flex sx={{ gap: 2, justifyContent: "end" }}>
          <BigPortrait player={keeper} filteredSlots={["boots", "pants", "hands"]} />
          <Flex
            sx={{
              gap: 1,
              flexDirection: "column",
              flex: 1,
              minWidth: 200,
              maxWidth: MENU_MAX_WIDTH / 2,
            }}
          >
            <Flex sx={{ bg: "shadow.30", flexDirection: "column", p: 2, gap: 2, borderRadius: 6 }}>
              <Text dangerouslySetInnerHTML={{ __html: dialogues?.[tab] }} />
              {tabKeeper && <KeeperButtons />}
            </Flex>
          </Flex>
        </Flex>
        <Flex
          sx={{
            gap: 2,
            display: tabShop ? "flex" : "none",
            flexWrap: "wrap",
            justifySelf: "start",
            justifyContent: "end",
          }}
        >
          {shop?.map(({ item }, idx) => {
            return (
              <Slot
                key={idx}
                location="shop"
                slotKey={idx}
                icon="./assets/icons/chest.png"
                item={item}
              />
            );
          })}
        </Flex>
        <Flex
          sx={{
            gap: 2,
            flexWrap: "wrap",
            display: tabQuests ? "flex" : "none",
            justifySelf: "start",
            justifyContent: "end",
          }}
        >
          {quests?.map((quest: Quest, idx: string) => {
            return <Quest key={idx} quest={quest} parent="keeper" />;
          })}
        </Flex>
      </Flex>
    </Menu>
  );
};

export default MenuKeeper;
