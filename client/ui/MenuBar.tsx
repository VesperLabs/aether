import { Box, Flex, KeyboardKey } from "@aether/ui";
import {
  AbilityButtons,
  ChatButton,
  Menu,
  MenuAbilities,
  MenuBag,
  MenuEquipment,
  MenuInventory,
  MenuKeeper,
  MenuProfile,
  MenuQuests,
  MenuSocial,
  MenuStats,
  MessageBox,
  StatusIcon,
  useAppContext,
  MenuButton,
} from ".";
import SkillButtons from "./SkillButtons";

const MenuBar = () => {
  const {
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
    <Flex
      sx={{
        flexDirection: "column",
        pointerEvents: "none",
        boxSizing: "border-box",
        position: "fixed",
        bottom: bottomOffset,
        left: 0,
        width: `calc(100% / ${zoom})`,
        transform: `scale(${zoom})`,
        transformOrigin: "bottom left",
      }}
    >
      <Flex sx={{ flex: 1, alignItems: "end" }}>
        <MessageBox />
        <Flex sx={{ flexDirection: "column" }}>
          <AbilityButtons hero={hero} cooldowns={cooldowns} />
          <SkillButtons cooldowns={cooldowns} />
        </Flex>
      </Flex>
      <Box
        sx={{
          backdropFilter: "blur(10px)",
        }}
      >
        {tabKeeper && <MenuKeeper />}
        <MenuAbilities player={hero} isOpen={tabAbilities} setIsOpen={setTabAbilities} />
        <MenuEquipment player={hero} isOpen={tabEquipment} setIsOpen={setTabEquipment} />
        {bagState?.map((id) => {
          return <MenuBag player={hero} toggleBagState={toggleBagState} key={id} id={id} />;
        })}
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
          }}
        >
          <StatusIcon />
          <Box sx={{ flex: tabChat ? "unset" : 1 }} />
          <ChatButton />
          {!tabChat && (
            <>
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
                keyboardKey="C"
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
                keyboardKey="I"
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
              if (dropItem) return setDropItem(false);
              if (tabKeeper) return setTabKeeper(false);
              if (tabSocial) return setTabSocial(false);
              if (tabQuests) return setTabQuests(false);
              if (tabStats) return setTabStats(false);
              if (tabProfile) return setTabProfile(false);
              if (tabAbilities) return setTabAbilities(false);
              if (tabEquipment) return setTabEquipment(false);
              if (bagState?.length > 0) return toggleBagState(bagState?.[bagState?.length - 1]);
              if (tabInventory) return setTabInventory(false);
              if (tabChat) return setTabChat(false);
            }}
          />
        </Menu>
      </Box>
    </Flex>
  );
};

export default MenuBar;
