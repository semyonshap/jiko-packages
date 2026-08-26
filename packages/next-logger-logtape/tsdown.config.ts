import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["cjs", "esm"],
  sourcemap: true,
  dts: true,
  deps: {
    neverBundle: ["next", "@logtape/logtape"],
  },
});
