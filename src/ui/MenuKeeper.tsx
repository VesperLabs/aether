import { useState, useEffect } from "react";
import { Flex, Text, useAppContext, MenuHeader, Portrait, Slot, KeyboardButton, Quest } from "./";

const MenuKeeper = () => {
  const { keeper, tabKeeper, setTabKeeper } = useAppContext();
  const [tab, setTab] = useState("greet");
  const { dialogues, shop, quests } = keeper?.keeperData ?? {};

  const tabShop = tab === "shop";
  const tabQuests = tab === "quests";
  const tabGreet = tab === "greet";

  useEffect(() => {
    if (!tabKeeper) setTab("greet");
  }, [tabKeeper]);

  return (
    <Flex
      className="menu-keeper"
      sx={{
        gap: 2,
        p: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        bg: "shadow.30",
        pointerEvents: "all",
        "&:hover": {
          zIndex: 999,
        },
      }}
    >
      <MenuHeader onClick={() => setTabKeeper(false)}>{keeper?.profile?.userName}</MenuHeader>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", width: 592 }}>
        <Portrait user={keeper} />
        <Flex
          sx={{
            gap: 1,
            flexDirection: "column",
            flex: 1,
            minWidth: 300,
          }}
        >
          <Flex sx={{ bg: "shadow.30", flexDirection: "column", p: 2, gap: 2, borderRadius: 6 }}>
            <Text dangerouslySetInnerHTML={{ __html: dialogues?.[tab] }} />
            {tabKeeper && (
              <Flex sx={{ gap: 2 }}>
                <KeyboardButton keyboardKey="G" onClick={() => setTab("greet")} active={tabGreet}>
                  Greet
                </KeyboardButton>
                <KeyboardButton keyboardKey="B" onClick={() => setTab("shop")} active={tabShop}>
                  Shop
                </KeyboardButton>
                <KeyboardButton keyboardKey="Q" onClick={() => setTab("quests")} active={tabQuests}>
                  Quests
                </KeyboardButton>
              </Flex>
            )}
          </Flex>
        </Flex>
        <Flex
          sx={{
            gap: 2,
            display: tabShop ? "flex" : "none",
            justifySelf: "start",
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
            display: tabQuests ? "flex" : "none",
            justifySelf: "start",
          }}
        >
          {quests?.map((quest: Quest, idx: string) => {
            return <Quest key={idx} quest={quest} parent="keeper" />;
          })}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default MenuKeeper;
