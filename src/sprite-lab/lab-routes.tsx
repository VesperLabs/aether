import { ThemeUIProvider, theme } from "@/ui";
import type { Theme } from "theme-ui";
import { Route, Switch } from "wouter";
import { App } from "./app";
import { MapApp } from "./map-app";
import { StampApp } from "./stamp-app";

export const LabRoutes = () => (
  <ThemeUIProvider theme={theme as Theme}>
    <Switch>
      <Route path="/maps/stamps" component={StampApp} />
      <Route path="/maps" component={MapApp} />
      <Route component={App} />
    </Switch>
  </ThemeUIProvider>
);
