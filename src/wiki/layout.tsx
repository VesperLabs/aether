import { Flex } from "@/ui";
import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { useLocation, Link } from "wouter";

export const RouterLink = ({ href, children }: { href: string; children?: ReactNode }) => {
  const [page] = useLocation();
  const isActive = href === page;
  return (
    <Flex as={Link} {...{ href }} sx={{ color: isActive ? "set" : "magic" }}>
      {children}
    </Flex>
  );
};

export const STATIC_ROW_STYLES: ThemeUIStyleObject = {
  gap: 3,
  position: "absolute",
  borderRadius: 0,
  fontSize: [0, 1, 1],
  fontWeight: "normal",
  border: `1px solid rgba(255,255,200,.25)`,
  whiteSpace: "nowrap",
  left: 0,
};
