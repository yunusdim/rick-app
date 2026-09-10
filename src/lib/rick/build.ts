export const RICK_BUILD =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_RICK_BUILD) ||
  "local";
