import { defineConfig } from "vite";
require("dotenv").config();
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    origin: "http://localhost:3000",
  },
  define: {
    "process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL),
  },
  publicDir: "../public",
  build: {
    emptyOutDir: false,
    outDir: "../public",
  },
});
