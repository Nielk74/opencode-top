export const colors = {
  bg: "#0a0d0a",
  bgSecondary: "#0f130f",
  bgHighlight: "#162016",
  border: "#1e2e1e",
  borderBright: "#2d4a2d",
  accent: "#4ade80",       // bright green — primary accent
  accentDim: "#22543d",
  accentAlt: "#86efac",    // light green
  text: "#d4e8d4",         // slightly green-tinted white
  textDim: "#527a52",
  textMuted: "#2d4a2d",
  success: "#4ade80",
  warning: "#fbbf24",
  error: "#f87171",
  info: "#6ee7b7",         // mint/emerald
  purple: "#a3e635",       // lime — replaces purple for section headers
  cyan: "#34d399",         // emerald
  teal: "#2dd4bf",
  peach: "#86efac",        // light green instead of orange
} as const;

export const tokens = {
  radius: 1,
  paddingX: 1,
  paddingY: 0,
} as const;
