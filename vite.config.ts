import { defineConfig } from "vite";
require("dotenv").config();
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.DEBUG": process.env.DEBUG,
    "process.env.SERVER_FPS": process.env.SERVER_FPS,
    "process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL),
  },
  build: {
    emptyOutDir: false,
    outDir: "./public",
  },
});
