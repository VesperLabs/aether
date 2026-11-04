import { memo, useState, type ReactNode } from "react";
import type { CharacterMenuProps } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { MenuButton } from "@/client/hud/menu/menu-button";
import { BigPortrait } from "@/client/hud/status/big-portrait";
import { Flex, Text, Box, MENU_MAX_WIDTH, Menu, MenuHeader } from "@/ui";
import { arePropsEqualWithKeys } from "@/ui";
import { ModalRename } from "./modal-rename";

const PICKER_ROW = {
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2,
  bg: "shadow.10",
  p: 1,
};

const MenuPicker = ({
  children,
  onPlus = () => {},
  onMinus = () => {},
}: {
  children?: ReactNode;
  onPlus?: () => void;
  onMinus?: () => void;
}) => {
  return (
    <Flex sx={PICKER_ROW}>
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

export const MenuProfile = memo(
  ({ player, isOpen, setIsOpen }: CharacterMenuProps) => {
    const { socket } = useAppContext();
    const [renaming, setRenaming] = useState(false);
    const userName = player?.profile?.userName ?? "";

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
            {/* The whole row renames; the pen just shows that it can. */}
            <Flex
              role="button"
              title="Change name"
              sx={{ ...PICKER_ROW, minWidth: 180, cursor: "pointer" }}
              onClick={() => setRenaming(true)}
            >
              <Box sx={{ width: 19 }} />
              <Text>{userName}</Text>
              <MenuButton iconName="pen" size={19} onClick={() => setRenaming(true)} />
            </Flex>
            {renaming && <ModalRename userName={userName} onClose={() => setRenaming(false)} />}
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
  },
  arePropsEqualWithKeys(["player.profile", "player.equipment", "player.activeItemSlots", "isOpen"]),
);
