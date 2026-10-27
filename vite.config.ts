import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE_URL || "/MR-samurai/",
  plugins: [react()],
});
