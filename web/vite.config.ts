import { defineConfig } from "vite";
require("dotenv").config();
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/assets": "http://localhost:3000",
    },
  },
  build: {
    emptyOutDir: false,
    outDir: "../public",
  },
});
