import React from "react";
import { Flex, useAppContext, Text, Divider, Icon } from "./";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

const Label = (props) => <Text sx={{ fontWeight: "normal" }} {...props} />;

const ItemTooltip = ({ item, show }) => {
  const { player } = useAppContext();
  const isSetActive = player?.activeSets?.includes?.(item?.set);
  if (!item) return;
  return (
    <Tooltip
      id={item?.id}
      isOpen={show}
      style={{ transition: "none", padding: 0, borderRadius: 5 }}
    >
      <Flex
        sx={{
          p: 2,
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
          {item?.slot == "spell" && <span> (Level {item?.ilvl})</span>}
        </Text>
        <Text color={item?.rarity}>
          {item?.rarity} {item?.base} {item?.set ? "[" + item?.set + "]" : ""}
        </Text>
        <Divider />
        <Text>
          <Label>Slot:</Label> {item?.slot}
        </Text>
        {Object.keys(item?.stats).map((key) => {
          return (
            <Text>
              <Label>{key}:</Label> {item?.stats[key]}
            </Text>
          );
        })}
        {Object.keys(item?.percentStats).map((key) => {
          return (
            <Text>
              <Label>{key}:</Label> {item?.percentStats[key]}%
            </Text>
          );
        })}
        {Object.keys(item?.effects).map((key) => {
          if (key == "hp") {
            return (
              <Text>
                <Label>+</Label> {item?.effects[key]}% hp
              </Text>
            );
          }
        })}
        {item?.setBonus && <Divider />}
        {item?.setBonus &&
          Object.keys(item?.setBonus.percentStats).map((key) => {
            return (
              <Text color={isSetActive ? "set" : "gray.500"}>
                <Label>{key}:</Label> {item?.setBonus.percentStats[key]}%
              </Text>
            );
          })}
        {item?.setBonus &&
          Object.keys(item?.setBonus.stats).map((key) => {
            return (
              <Text color={isSetActive ? "set" : "gray.500"}>
                <Label>{key}:</Label> {item?.setBonus.stats[key]}
              </Text>
            );
          })}
        <Divider />
        <Flex sx={{ alignItems: "center", gap: 1 }}>
          <Icon icon="../assets/icons/gold.png" size={16} />
          {item?.cost * (player?.inflation || 1)}
        </Flex>
      </Flex>
    </Tooltip>
  );
};

export default ItemTooltip;
