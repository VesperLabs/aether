import { Flex, Text, useAppContext, Portrait, Input, MenuButton } from "./";

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
      <MenuButton sx={{ "& .icon": { transform: "rotate(90deg) scaleY(-1)" } }} onClick={onMinus} />
      <Text>{children}</Text>
      <MenuButton sx={{ "& .icon": { transform: "rotate(90deg)" } }} onClick={onPlus} />
    </Flex>
  );
};

const MenuProfile = () => {
  const { tabProfile: show, hero, socket } = useAppContext();

  return show ? (
    <Flex
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
      <Text>Profile</Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", width: 592 }}>
        <Flex sx={{ gap: 1 }}>
          <Portrait user={hero} size={120} topOffset={28} filterKeys={["accessory", "helmet"]} />
          <Flex sx={{ flexDirection: "column", gap: 1 }}>
            <Input
              defaultValue={hero?.profile?.userName}
              onBlur={(e) => {
                /* Hack to send if `Done` button is pushed */
                const userName = e?.target?.value;
                if (userName?.trim() !== "") socket.emit("updateProfile", { userName });
              }}
            />
            <MenuPicker
              onPlus={() => socket.emit("updateProfile", { hair: 1 })}
              onMinus={() => socket.emit("updateProfile", { hair: -1 })}
            >
              Hair
            </MenuPicker>
            <MenuPicker
              onPlus={() => socket.emit("updateProfile", { face: 1 })}
              onMinus={() => socket.emit("updateProfile", { face: -1 })}
            >
              Face
            </MenuPicker>
            <MenuPicker>Skin</MenuPicker>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  ) : null;
};

export default MenuProfile;
