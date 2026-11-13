import { ThemeUIProvider, theme } from "@/ui";
import type { Theme } from "theme-ui";
import { App } from "./app";

export const LabRoutes = () => (
  <ThemeUIProvider theme={theme as Theme}>
    <App />
  </ThemeUIProvider>
);
