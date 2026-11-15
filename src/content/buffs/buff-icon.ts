import { buffList } from "./buff-list";

/** The texture a buff's icon is drawn from: its own `spell-` sheet, or the one it shares. */
export const buffIcon = (name: string) => {
  const buff = buffList[name as keyof typeof buffList] as { icon?: string } | undefined;
  return `spell-${buff?.icon ?? name}`;
};
