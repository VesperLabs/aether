import { Flex, useAppContext, Text, Divider, Icon, Tooltip } from "./";

const combineDamageStats = (stats) =>
  Object.entries(stats).reduce((acc, [key, value]) => {
    if (key.includes("Damage")) {
      const identifier = key.replace("min", "").replace("max", "");
      if (!acc.hasOwnProperty(identifier)) {
        acc[identifier] = `${stats?.[`min${identifier}`] || 0} - ${stats[`max${identifier}`] || 0}`;
      }
    } else {
      if (key.includes("Speed")) {
        acc[key] = value + "ms";
      } else {
        acc[key] = value;
      }
    }
    return acc;
  }, {});

const Label = (props) => <Text sx={{ fontWeight: "normal" }} {...props} />;

const ItemTooltip = ({ item, show }) => {
  const { hero } = useAppContext();
  const isSetActive = hero?.state?.activeSets?.includes?.(item?.setName);
  if (!item) return;

  const combinedStats = combineDamageStats(item?.stats);
  const combinedEffects = combineDamageStats(item?.effects);
  const requirements = item?.requirements || {};

  return (
    <Tooltip id={item?.id} isOpen={show}>
      <Flex
        sx={{
          fontWeight: "bold",
          whiteSpace: "nowrap",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textTransform: "capitalize",
        }}
      >
        <Text>
          {item?.name}
          <Text color="gray.400" sx={{ ml: "2px" }}>
            {item?.amount > 1 && `(${item?.amount})`}
          </Text>
          {item?.slot == "spell" && <span> (Level {item?.ilvl})</span>}
        </Text>
        <Text color={item?.rarity}>
          {item?.rarity} {item?.type === "spell" ? "spell" : item?.base}
        </Text>
        {Object.keys(combinedStats)?.length > 0 && <TextDivider>Stats</TextDivider>}
        {Object.keys(combinedStats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label> {combinedStats[key]}
          </Text>
        ))}
        {Object.keys(item?.percentStats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label> {item?.percentStats[key]}%
          </Text>
        ))}
        {Object.keys(combinedEffects)?.length > 0 && <TextDivider>Effects</TextDivider>}
        {Object.keys(combinedEffects).map((key) => {
          if (key == "hp") {
            return (
              <Text key={key}>
                <Label>+</Label> {combinedEffects[key]}% hp
              </Text>
            );
          } else {
            return (
              <Text key={key}>
                <Label>{key}:</Label> {combinedEffects[key]}
              </Text>
            );
          }
        })}
        {Object.keys(requirements)?.length > 0 && <TextDivider>Requirements</TextDivider>}
        {Object.keys(requirements).map((key) => {
          const hasRequiredStats = hero?.stats?.[key] >= requirements[key];
          return (
            <Text key={key} color={hasRequiredStats ? "text" : "danger"}>
              <Label>{key}:</Label> {requirements[key]}
            </Text>
          );
        })}
        {item?.setBonus && (
          <>
            <TextDivider>Set Bonus</TextDivider>
            {Object.keys(item?.setBonus.percentStats).map((key) => {
              return (
                <Text key={key} color={isSetActive ? "set" : "gray.500"}>
                  <Label>{key}:</Label> {item?.setBonus.percentStats[key]}%
                </Text>
              );
            })}
            {Object.keys(item?.setBonus.stats).map((key) => {
              return (
                <Text key={key} color={isSetActive ? "set" : "gray.500"}>
                  <Label>{key}:</Label> {item?.setBonus.stats[key]}
                </Text>
              );
            })}
          </>
        )}
        <Divider />
        <Flex sx={{ alignItems: "center", gap: 2 }}>
          <Flex sx={{ alignItems: "center", gap: "2px" }}>
            <Icon icon="../assets/icons/gold.png" size={16} />
            {item?.cost * (item?.amount || 1)}
          </Flex>
          {item?.mpCost && (
            <Flex sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon="../assets/icons/mana.png" size={16} />
              {item?.mpCost}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Tooltip>
  );
};

const TextDivider = ({ children }) => (
  <>
    <Divider sx={{ pt: 2, zIndex: -1 }} />
    <Text sx={{ mt: -3, pb: 2, mb: -1, color: "gray.500" }}>{children}</Text>
  </>
);

export default ItemTooltip;
