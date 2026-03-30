import dotenv from "dotenv";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

dotenv.config();

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    host: true,
    origin: "http://localhost:3000",
  },
  define: {
    "process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL),
  },
  publicDir: command === "serve" ? "../public" : false,
  build: {
    emptyOutDir: false,
    outDir: "../public",
  },
}));
