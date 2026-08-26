export function clearNextLogCache() {
  const logPath = require.resolve("next/dist/build/output/log");
  delete require.cache[logPath];
}

export function loadNextLog() {
  return require("next/dist/build/output/log");
}
