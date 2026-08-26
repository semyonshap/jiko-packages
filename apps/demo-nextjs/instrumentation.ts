import { patchNextLogger } from "@with-jiko/next-logger-logtape";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    patchNextLogger({ category: ["app"] });
    console.log("[instrumentation] logger patched");
  }
}
