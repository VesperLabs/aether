import { ThemeUIProvider, theme } from "@/ui";
import type { Theme } from "theme-ui";
import { Route, Switch } from "wouter";
import { App } from "./app";
import { NpcApp } from "./npc-app";

export const LabRoutes = () => (
  <ThemeUIProvider theme={theme as Theme}>
    <Switch>
      <Route path="/npcs" component={NpcApp} />
      <Route component={App} />
    </Switch>
  </ThemeUIProvider>
);
