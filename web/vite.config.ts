import { defineConfig } from "vite";
require("dotenv").config();
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // proxy: {
    //   "/assets": { target: `http://127.0.0.1:${process.env.PORT}` },
    // },
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
