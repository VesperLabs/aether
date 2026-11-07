import React from "react";
import ReactDOM from "react-dom/client";
import { LabRoutes } from "./lab-routes";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <LabRoutes />
  </React.StrictMode>,
);
