import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works when hosted in a GitHub Pages project
  // subpath (https://<user>.github.io/<repo>/) without hardcoding the repo name.
  base: "./",
  plugins: [react(), tailwindcss()],
});
