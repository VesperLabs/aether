import { useState, useEffect } from "react";
import {
  Menu,
  useAppContext,
  MenuHeader,
  BigPortrait,
  Slot,
  Quest,
  MENU_MAX_WIDTH,
  MenuButton,
  ModalHome,
} from "./";
import { Flex, Text } from "@aether/ui";
import { capitalize } from "@aether/shared";

const MenuKeeper = () => {
  const { hero, keeper, tabKeeper, setTabKeeper, setHomeModal } = useAppContext();
  const [tab, setTab] = useState("greet");
  const { dialogues, shop, quests, home } = keeper?.keeperData ?? {};

  const hasQuests = quests?.length > 0;
  const hasShop = shop?.length > 0;
  const hasGreet = dialogues?.greet?.length > 0;
  const hasHome = !!home;

  const tabShop = tab === "shop";
  const tabQuests = tab === "quests";
  const tabGreet = tab === "greet";
  const tabHome = tab === "home";

  useEffect(() => {
    if (!tabKeeper) setTab("greet");
  }, [tabKeeper]);

  const KeeperButtons = () => {
    if (!hasQuests && !hasShop) return;
    return (
      <Flex
        sx={{
          gap: 2,
          mt: 2,
          justifyContent: "flex-end",
          transform: "scale(1.25) translate(-10%,-10%)",
        }}
      >
        {hasGreet && (hasShop || hasQuests) && (
          <MenuButton
            keyboardKey="G"
            iconName="chat"
            isActive={tabGreet}
            onClick={() => setTab("greet")}
          />
        )}
        {hasShop && (
          <MenuButton
            keyboardKey="B"
            iconName="gold"
            isActive={tabShop}
            onClick={() => setTab("shop")}
          />
        )}
        {hasQuests && (
          <MenuButton
            keyboardKey="U"
            iconName="quests"
            onClick={() => setTab("quests")}
            isActive={tabQuests}
          />
        )}
        {hasHome && (
          <MenuButton
            keyboardKey="H"
            iconName="pen"
            onClick={() => {
              setTab("home");
              setHomeModal(keeper);
            }}
            isActive={tabHome}
          />
        )}
      </Flex>
    );
  };

  return (
    <Menu className="menu-keeper">
      <MenuHeader icon="./assets/icons/chat.png" onClick={() => setTabKeeper(false)}>
        Npc: {capitalize(tab)}
      </MenuHeader>
      <Flex sx={{ flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
        <Flex sx={{ gap: 2, justifyContent: "end" }}>
          <BigPortrait player={keeper} filteredSlots={["hands"]} sx={{ ml: 4 }} />
          <Flex
            sx={{
              gap: 1,
              flexDirection: "column",
              flex: 1,
              minWidth: 200,
              maxWidth: MENU_MAX_WIDTH / 2,
            }}
          >
            <Flex
              sx={{
                bg: "shadow.30",
                flexDirection: "column",
                p: 2,
                gap: 3,
                borderRadius: 6,
                flex: 1,
              }}
            >
              <Text sx={{ lineHeight: 1.5 }}>
                <Text as="span" sx={{ fontWeight: "bold", color: "set" }}>
                  {keeper?.profile?.userName}:{" "}
                </Text>
                <Text
                  as="span"
                  dangerouslySetInnerHTML={{
                    __html: dialogues?.[tab],
                  }}
                />
              </Text>
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
                player={hero}
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
