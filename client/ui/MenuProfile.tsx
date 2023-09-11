import { memo } from "react";
import {
  Menu,
  MenuHeader,
  useAppContext,
  Portrait,
  MenuButton,
  MENU_MAX_WIDTH,
  BigPortrait,
} from "./";
import { Flex, Text, Input, Box } from "@aether/ui";
import { arePropsEqualWithKeys } from "@aether/shared";

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
        iconName="grab"
      />
      <Text>{children}</Text>
      <MenuButton
        iconName="grab"
        size={19}
        sx={{ "& .icon": { transform: "rotate(90deg)" } }}
        onClick={onPlus}
      />
    </Flex>
  );
};

const MenuProfile = memo(({ player, isOpen, setIsOpen }: any) => {
  const { socket } = useAppContext();

  return (
    <Menu
      sx={{
        display: isOpen ? "flex" : "none",
      }}
    >
      <MenuHeader icon={`./assets/icons/mirror.png`} onClick={() => setIsOpen(false)}>
        Profile
      </MenuHeader>
      <Flex sx={{ gap: 4, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
        <Flex
          sx={{
            flex: 1,
            justifyContent: "center",
            gap: 2,
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1 }} />
          <BigPortrait
            showShadow={false}
            height={440}
            player={player}
            filteredSlots={["accessory", "helmet", "hands"]}
          />
          <Input
            sx={{ width: 150, fontSize: 4 }}
            defaultValue={player?.profile?.userName}
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
            onPlus={() => socket.emit("updateProfile", { whiskers: { texture: 1 } })}
            onMinus={() => socket.emit("updateProfile", { whiskers: { texture: -1 } })}
          >
            Whiskers
          </MenuPicker>
          <MenuPicker
            onPlus={() => socket.emit("updateProfile", { whiskers: { tint: 1 } })}
            onMinus={() => socket.emit("updateProfile", { whiskers: { tint: -1 } })}
          >
            Whiskers Color
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
          <MenuPicker
            onPlus={() => socket.emit("updateProfile", { body: 1 })}
            onMinus={() => socket.emit("updateProfile", { body: -1 })}
          >
            Body
          </MenuPicker>
        </Flex>
      </Flex>
    </Menu>
  );
}, arePropsEqualWithKeys(["player.profile", "player.equipment", "player.activeItemSlots", "isOpen"]));

export default MenuProfile;
