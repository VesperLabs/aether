import {
  Box,
  Flex,
  KeyboardKey,
  Menu,
  MenuAbilities,
  MenuBag,
  MenuEquipment,
  MenuInventory,
  MenuStats,
} from "@/ui";
import { HUD_SLOT_EVENTS } from "@/client/hud/inventory/slot";
import { LOOT_TARGET_ID } from "@/client/hud/inventory/flying-loot";
import { AbilityButtons } from "@/client/hud/abilities/ability-buttons";
import { ChatButton } from "@/client/hud/chat/chat-button";
import { MenuKeeper } from "@/client/hud/shop/menu-keeper";
import { MenuProfile } from "@/client/hud/profile/menu-profile";
import { MenuQuests } from "@/client/hud/quests/menu-quests";
import { MessageBox } from "@/client/hud/chat/message-box";
import { useAppContext } from "@/client/hud/app/context";
import { MenuButton } from "./menu-button";
import { useScrollToOpened } from "./use-scroll-to-opened";
import { useOpenOrder } from "./use-open-order";
import { useOverhangPadding } from "./use-overhang-padding";
import { SkillButtons } from "@/client/hud/abilities/skill-buttons";

export const MenuBar = () => {
  const {
    homeModal,
    setHomeModal,
    tabEquipment,
    setTabEquipment,
    tabInventory,
    setTabInventory,
    tabChat,
    setTabKeeper,
    setTabChat,
    tabKeeper,
    dropItem,
    setDropItem,
    tabProfile,
    setTabProfile,
    tabStats,
    setTabStats,
    bottomOffset,
    tabQuests,
    setTabQuests,
    setTabSocial,
    tabSettings,
    setTabSettings,
    tabSocial,
    partyInvites,
    hero,
    tabAbilities,
    setTabAbilities,
    zoom,
    bagState,
    cooldowns,
    toggleBagState,
    sign,
    error,
  } = useAppContext();
  /* Only chat types into the bar, so only chat lifts it above the keyboard; other inputs (renaming) sit in modals */
  const keyboardOffset = tabChat ? bottomOffset : 0;
  const stackRef = useScrollToOpened<HTMLDivElement>();
  useOverhangPadding(stackRef);
  const orderOf = useOpenOrder({
    keeper: !!tabKeeper,
    abilities: tabAbilities,
    equipment: tabEquipment,
    bag: bagState.length > 0,
    inventory: tabInventory,
    profile: tabProfile,
    quests: tabQuests,
    stats: tabStats,
  });

  const escCacheKey = JSON.stringify([
    tabChat,
    dropItem,
    tabEquipment,
    tabInventory,
    tabKeeper,
    tabProfile,
    tabStats,
    tabQuests,
    tabAbilities,
    tabSettings,
    tabSocial,
    sign,
    error,
    ...bagState,
  ]);

  return (
    <Box
      sx={{
        pointerEvents: "none",
        boxSizing: "border-box",
        position: "fixed",
        bottom: keyboardOffset,
        left: 0,
        zIndex: "menus",
        width: `calc(100% / ${zoom})`,
        transform: `scale(${zoom})`,
        transformOrigin: "bottom left",
        display: "flex",
        flexDirection: "column",
        maxHeight: `calc((100dvh - ${keyboardOffset}px) / ${zoom})`,
      }}
    >
      {/* One blur behind the menus and the buttons, so their edges don't each blur on their own */}
      <Box sx={{ position: "absolute", inset: 0, zIndex: -1, backdropFilter: "blur(10px)" }} />
      {/* Sits above the menus without taking their height, so menus can fill the screen */}
      <Flex sx={{ alignItems: "end", position: "absolute", bottom: "100%", left: 0, right: 0 }}>
        <MessageBox />
        <Flex sx={{ flexDirection: "column" }}>
          <AbilityButtons hero={hero} cooldowns={cooldowns} />
          <SkillButtons cooldowns={cooldowns} />
        </Flex>
      </Flex>
      {/* Open menus scroll on their own when they outgrow the screen; the buttons stay put */}
      <Box
        ref={stackRef}
        sx={{
          /* iOS only scrolls a box that takes touches itself, so this can't be "none" */
          pointerEvents: "all",
          /* Swipes scroll the stack; no pinch or double-tap zooming the page */
          touchAction: "pan-y",
          /* Buttons in menus must let a swipe through too; they ignore a slid finger (Button) */
          "& button": { touchAction: "pan-y" },
          flex: "0 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          /* No rubber-band bounce at the ends, and no scrolling the page behind */
          overscrollBehavior: "none",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Box sx={{ pointerEvents: "all", order: orderOf("keeper") }}>
          {tabKeeper && <MenuKeeper />}
        </Box>
        <Box sx={{ pointerEvents: "all", order: orderOf("abilities") }}>
          <MenuAbilities
            player={hero}
            events={HUD_SLOT_EVENTS}
            isOpen={tabAbilities}
            setIsOpen={setTabAbilities}
          />
        </Box>
        <Box sx={{ pointerEvents: "all", order: orderOf("equipment") }}>
          <MenuEquipment
            player={hero}
            events={HUD_SLOT_EVENTS}
            isOpen={tabEquipment}
            setIsOpen={setTabEquipment}
          />
        </Box>
        <Box sx={{ pointerEvents: "all", order: orderOf("bag") }}>
          <MenuBag
            player={hero}
            events={HUD_SLOT_EVENTS}
            bagState={bagState}
            toggleBagState={toggleBagState}
          />
        </Box>
        <Box sx={{ pointerEvents: "all", order: orderOf("inventory") }}>
          <MenuInventory
            player={hero}
            events={HUD_SLOT_EVENTS}
            isOpen={tabInventory}
            setIsOpen={setTabInventory}
          />
        </Box>
        <Box sx={{ pointerEvents: "all", order: orderOf("profile") }}>
          <MenuProfile player={hero} isOpen={tabProfile} setIsOpen={setTabProfile} />
        </Box>
        <Box sx={{ pointerEvents: "all", order: orderOf("quests") }}>
          <MenuQuests player={hero} isOpen={tabQuests} setIsOpen={setTabQuests} />
        </Box>
        <Box sx={{ pointerEvents: "all", order: orderOf("stats") }}>
          <MenuStats player={hero} isOpen={tabStats} setIsOpen={setTabStats} />
        </Box>
      </Box>
      <Box sx={{ pointerEvents: "all", flexShrink: 0 }}>
        <Menu
          sx={{
            gap: 1,
            alignItems: "center",
            pointerEvents: "none",
            flexDirection: "row",
            flexWrap: "nowrap",
            "& > button": {
              flexShrink: 1,
            },
          }}
        >
          <Box sx={{ flex: tabChat ? "unset" : 1 }} />
          <ChatButton />
          {!tabChat && (
            <>
              <MenuButton
                keyboardKey="Z"
                springOpen
                iconName="pen"
                isActive={tabSettings}
                onClick={() => setTabSettings((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="P"
                springOpen
                iconName="social"
                isActive={tabSocial}
                badge={partyInvites.length}
                onClick={() => setTabSocial((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="Q"
                springOpen
                iconName="quests"
                isActive={tabQuests}
                onClick={() => setTabQuests((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="C"
                springOpen
                iconName="stats"
                isActive={tabStats}
                onClick={() => setTabStats((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="G"
                springOpen
                iconName="mirror"
                isActive={tabProfile}
                onClick={() => setTabProfile((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="V"
                springOpen
                iconName="book"
                isActive={tabAbilities}
                onClick={() => setTabAbilities((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="E"
                springOpen
                iconName="helmet"
                isActive={tabEquipment}
                onClick={() => {
                  setTabEquipment((prev) => !prev);
                }}
              />
              <MenuButton
                id={LOOT_TARGET_ID}
                keyboardKey="I"
                springOpen
                iconName="bag"
                isActive={tabInventory}
                onClick={() => setTabInventory((prev) => !prev)}
              />
            </>
          )}
          <KeyboardKey
            key={escCacheKey}
            name={"ESCAPE"}
            hidden={true}
            onKeyUp={() => {
              /* These modals close themselves on Escape; leave the menus under them alone */
              if (tabSettings || tabSocial || sign || error) return;
              if (tabChat) return setTabChat(false);
              if (dropItem) return setDropItem(null);
              if (homeModal) return setHomeModal(null);
              if (tabKeeper) return setTabKeeper(false);
              if (tabQuests) return setTabQuests(false);
              if (tabStats) return setTabStats(false);
              if (tabProfile) return setTabProfile(false);
              if (tabAbilities) return setTabAbilities(false);
              if (tabEquipment) return setTabEquipment(false);
              if (bagState?.length > 0) return toggleBagState(bagState?.[bagState?.length - 1]);
              if (tabInventory) return setTabInventory(false);
            }}
          />
        </Menu>
      </Box>
    </Box>
  );
};
