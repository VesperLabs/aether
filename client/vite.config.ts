import { defineConfig } from "vite";
require("dotenv").config();
import react from "@vitejs/plugin-react-swc";
import path from "path";

console.log(`🛠 DEBUG: ${process.env.DEBUG}`);
console.log(`🛠 SERVER_FPS: ${process.env.SERVER_FPS}`);
console.log(`🛠 SERVER_URL: ${process.env.SERVER_URL}`);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.DEBUG": process.env.DEBUG,
    "process.env.SERVER_FPS": process.env.SERVER_FPS,
    "process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL),
  },
  server: {
    host: true,
  },
  publicDir: "../public",
  build: {
    emptyOutDir: false,
    outDir: "../public",
  },
});
