import { defineConfig } from "vite";
import wasmPlugin from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [wasmPlugin(), topLevelAwait()],
  optimizeDeps: {
    // Explicitly include WASM files
    include: ["../pkg/wasm_game_of_life.js"],
    exclude: ["../pkg/wasm_game_of_life_bg.wasm"],
  },
  server: {
    fs: {
      allow: [".."],
    },
  },
  assetsInclude: ["**/*.wasm"],
});
