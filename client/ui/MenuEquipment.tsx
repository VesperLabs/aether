import { Flex } from "@aether/ui";
import { Menu, MenuHeader, useAppContext, Slot, MENU_MAX_WIDTH } from "./";

const MenuEquipment = () => {
  const { hero, tabEquipment, setTabEquipment } = useAppContext();
  const equipment = Object.entries(hero?.equipment || {});

  return (
    <Menu
      sx={{
        display: tabEquipment ? "flex" : "none",
      }}
    >
      <MenuHeader icon={`./assets/icons/helmet.png`} onClick={() => setTabEquipment(false)}>
        Equipment
      </MenuHeader>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
        {equipment?.map(([slotKey, item]) => (
          <Slot
            key={slotKey}
            location="equipment"
            slotKey={slotKey}
            icon={`./assets/icons/${slotKey}.png`}
            item={item}
          />
        ))}
      </Flex>
    </Menu>
  );
};

export default MenuEquipment;
