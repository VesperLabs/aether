import { Box, Flex, KeyboardKey, Menu } from "@/ui";
import { AbilityButtons } from "@/client/hud/abilities/ability-buttons";
import { ChatButton } from "@/client/hud/chat/chat-button";
import { MenuAbilities } from "@/client/hud/abilities/menu-abilities";
import { MenuBag } from "@/client/hud/inventory/menu-bag";
import { MenuEquipment } from "@/client/hud/equipment/menu-equipment";
import { MenuInventory } from "@/client/hud/inventory/menu-inventory";
import { MenuKeeper } from "@/client/hud/shop/menu-keeper";
import { MenuProfile } from "@/client/hud/profile/menu-profile";
import { MenuQuests } from "@/client/hud/quests/menu-quests";
import { MenuSocial } from "@/client/hud/social/menu-social";
import { MenuStats } from "@/client/hud/status/menu-stats";
import { MessageBox } from "@/client/hud/chat/message-box";
import { useAppContext } from "@/client/hud/app/context";
import { MenuButton } from "./menu-button";
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
    hero,
    tabAbilities,
    setTabAbilities,
    zoom,
    bagState,
    players,
    party,
    cooldowns,
    toggleBagState,
  } = useAppContext();

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
    ...bagState,
  ]);

  return (
    <Box
      sx={{
        pointerEvents: "none",
        boxSizing: "border-box",
        position: "fixed",
        bottom: bottomOffset,
        left: 0,
        zIndex: "menus",
        width: `calc(100% / ${zoom})`,
        transform: `scale(${zoom})`,
        transformOrigin: "bottom left",
      }}
    >
      <Flex sx={{ alignItems: "end" }}>
        <MessageBox />
        <Flex sx={{ flexDirection: "column" }}>
          <AbilityButtons hero={hero} cooldowns={cooldowns} />
          <SkillButtons cooldowns={cooldowns} />
        </Flex>
      </Flex>
      <Box
        sx={{
          backdropFilter: "blur(10px)",
          pointerEvents: "all",
          // overflowY: "scroll",
          // maxHeight: `calc((100vh - ${61 * zoom}px) / ${zoom})`,
          // scrollbarWidth: "none",
          // msOverflowStyle: "none",
          // "&::-webkit-scrollbar": {
          //   display: "none",
          // },
        }}
      >
        {tabKeeper && <MenuKeeper />}
        <MenuAbilities player={hero} isOpen={tabAbilities} setIsOpen={setTabAbilities} />
        <MenuEquipment player={hero} isOpen={tabEquipment} setIsOpen={setTabEquipment} />
        <MenuBag player={hero} bagState={bagState} toggleBagState={toggleBagState} />
        <MenuInventory player={hero} isOpen={tabInventory} setIsOpen={setTabInventory} />
        <MenuProfile player={hero} isOpen={tabProfile} setIsOpen={setTabProfile} />
        <MenuQuests player={hero} isOpen={tabQuests} setIsOpen={setTabQuests} />
        <MenuStats player={hero} isOpen={tabStats} setIsOpen={setTabStats} />
        <MenuSocial
          hero={hero}
          players={players}
          party={party}
          isOpen={tabSocial}
          setIsOpen={setTabSocial}
        />
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
                iconName="pen"
                isActive={tabSettings}
                onClick={() => setTabSettings((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="P"
                iconName="social"
                isActive={tabSocial}
                onClick={() => setTabSocial((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="Q"
                iconName="quests"
                isActive={tabQuests}
                onClick={() => setTabQuests((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="I"
                iconName="stats"
                isActive={tabStats}
                onClick={() => setTabStats((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="G"
                iconName="mirror"
                isActive={tabProfile}
                onClick={() => setTabProfile((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="V"
                iconName="book"
                isActive={tabAbilities}
                onClick={() => setTabAbilities((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="E"
                iconName="helmet"
                isActive={tabEquipment}
                onClick={() => {
                  setTabEquipment((prev) => !prev);
                }}
              />
              <MenuButton
                keyboardKey="C"
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
              if (tabChat) return setTabChat(false);
              if (dropItem) return setDropItem(false);
              if (homeModal) return setHomeModal(null);
              if (tabKeeper) return setTabKeeper(false);
              if (tabSocial) return setTabSocial(false);
              if (tabQuests) return setTabQuests(false);
              if (tabStats) return setTabStats(false);
              if (tabProfile) return setTabProfile(false);
              if (tabAbilities) return setTabAbilities(false);
              if (tabEquipment) return setTabEquipment(false);
              if (bagState?.length > 0) return toggleBagState(bagState?.[bagState?.length - 1]);
              if (tabInventory) return setTabInventory(false);
              if (tabSettings) return setTabSettings(false);
            }}
          />
        </Menu>
      </Box>
    </Box>
  );
};
