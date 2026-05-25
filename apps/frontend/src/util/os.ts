export const isMacOS =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");
