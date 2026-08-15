import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
      "@tensorflow-models/face-detection": path.resolve(templateRoot, "server/__mocks__/tensorflow-face-detection.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    exclude: ["**/faceswap.test.ts", "**/agent.test.ts", "**/evolution-and-generation.test.ts"],
    testTimeout: 30000,
  },
});
