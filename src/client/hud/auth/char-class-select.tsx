import { Flex, Icon, Text } from "@/ui";
import { CLASS_ICON_MAP, type CharClass } from "@/content";

interface ClickableIconProps {
  icon: string;
  setCharClass: (charClass: CharClass) => void;
  charClass: CharClass;
  isSelected: boolean;
}

const ClickableIcon = ({ icon, setCharClass, charClass, isSelected }: ClickableIconProps) => {
  const getDesc = (charClass: CharClass) => {
    const desc: Record<CharClass, string> = {
      warrior: "Warriors are strong and can take a lot of damage.",
      rogue: "Rogues are fast and can dodge attacks.",
      mage: "Mages are powerful spellcasters and can do heavy damage.",
      cleric: "Clerics are powerful healers but consume their own life-force in the process.",
    };
    return desc[charClass];
  };
  return (
    <Flex
      data-tooltip-id="login"
      data-tooltip-content={getDesc(charClass)}
      sx={{
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        opacity: isSelected ? 1 : 0.15,
        gap: 1,
        "&:hover": {
          opacity: isSelected ? 1 : 0.65,
        },
      }}
      onClick={() => setCharClass(charClass)}
    >
      <Icon size={22} icon={icon} />
      <Text sx={{ fontSize: 0, textTransform: "capitalize" }}>{charClass}</Text>
    </Flex>
  );
};

export const CharClassSelect = ({
  charClass,
  setCharClass,
}: {
  charClass: CharClass;
  setCharClass: (charClass: CharClass) => void;
}) => {
  return (
    <Flex sx={{ justifyContent: "space-around", pb: 2 }}>
      <ClickableIcon
        icon={CLASS_ICON_MAP.WARRIOR}
        charClass="warrior"
        isSelected={charClass === "warrior"}
        setCharClass={setCharClass}
      />
      <ClickableIcon
        icon={CLASS_ICON_MAP.ROGUE}
        charClass="rogue"
        isSelected={charClass === "rogue"}
        setCharClass={setCharClass}
      />
      <ClickableIcon
        icon={CLASS_ICON_MAP.MAGE}
        charClass="mage"
        isSelected={charClass === "mage"}
        setCharClass={setCharClass}
      />
      <ClickableIcon
        icon={CLASS_ICON_MAP.CLERIC}
        charClass="cleric"
        isSelected={charClass === "cleric"}
        setCharClass={setCharClass}
      />
    </Flex>
  );
};
