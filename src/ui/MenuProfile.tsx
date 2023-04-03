import { Flex, Text, MenuHeader, useAppContext, Portrait, Input, MenuButton } from "./";
const MenuPicker = ({ children, onPlus = () => {}, onMinus = () => {} }) => {
  return (
    <Flex
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        bg: "shadow.10",
        p: 1,
      }}
    >
      <MenuButton
        size={16}
        sx={{ "& .icon": { transform: "rotate(90deg) scaleY(-1)" } }}
        onClick={onMinus}
      />
      <Text>{children}</Text>
      <MenuButton size={19} sx={{ "& .icon": { transform: "rotate(90deg)" } }} onClick={onPlus} />
    </Flex>
  );
};

const MenuProfile = () => {
  const { tabProfile, setTabProfile, hero, socket } = useAppContext();

  return (
    <Flex
      sx={{
        gap: 2,
        p: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        bg: "shadow.30",
        display: tabProfile ? "flex" : "none",
        pointerEvents: "all",

        "&:hover": {
          zIndex: 999,
        },
      }}
    >
      <MenuHeader onClick={() => setTabProfile(false)}>Profile</MenuHeader>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", width: 592 }}>
        <Flex sx={{ gap: 1 }}>
          <Flex sx={{ flexDirection: "column", gap: 1, alignItems: "center" }}>
            <Portrait user={hero} size={120} topOffset={28} filterKeys={["accessory", "helmet"]} />
            <Input
              sx={{ width: 150 }}
              defaultValue={hero?.profile?.userName}
              onBlur={(e) => {
                /* Hack to send if `Done` button is pushed */
                const userName = e?.target?.value;
                if (userName?.trim() !== "") socket.emit("updateProfile", { userName });
              }}
            />
          </Flex>
          <Flex sx={{ flexDirection: "column", gap: 1 }}>
            <MenuPicker
              onPlus={() => socket.emit("updateProfile", { hair: { texture: 1 } })}
              onMinus={() => socket.emit("updateProfile", { hair: { texture: -1 } })}
            >
              Hair Style
            </MenuPicker>
            <MenuPicker
              onPlus={() => socket.emit("updateProfile", { hair: { tint: 1 } })}
              onMinus={() => socket.emit("updateProfile", { hair: { tint: -1 } })}
            >
              Hair Color
            </MenuPicker>
            <MenuPicker
              onPlus={() => socket.emit("updateProfile", { face: { texture: 1 } })}
              onMinus={() => socket.emit("updateProfile", { face: { texture: -1 } })}
            >
              Face
            </MenuPicker>
            <MenuPicker
              onPlus={() => socket.emit("updateProfile", { skin: { tint: 1 } })}
              onMinus={() => socket.emit("updateProfile", { skin: { tint: -1 } })}
            >
              Skin
            </MenuPicker>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default MenuProfile;
