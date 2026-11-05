export type Accent = "sun" | "blue" | "coral" | "mint" | "violet" | "sky" | "ink";

/** Tailwind 需要看到完整类名，所以这里写死映射表 */
export const ACCENT_TILE: Record<Accent, string> = {
  sun: "bg-sun text-ink",
  blue: "bg-blue text-white",
  coral: "bg-coral text-white",
  mint: "bg-mint text-ink",
  violet: "bg-violet text-white",
  sky: "bg-sky text-ink",
  ink: "bg-ink text-paper",
};

export const ACCENT_TEXT: Record<Accent, string> = {
  sun: "text-sun",
  blue: "text-blue",
  coral: "text-coral",
  mint: "text-mint",
  violet: "text-violet",
  sky: "text-sky",
  ink: "text-ink",
};

export const ACCENT_BORDER: Record<Accent, string> = {
  sun: "border-sun",
  blue: "border-blue",
  coral: "border-coral",
  mint: "border-mint",
  violet: "border-violet",
  sky: "border-sky",
  ink: "border-ink",
};

export const ACCENT_TAG: Record<Accent, string> = {
  sun: "tag-sun",
  blue: "tag-blue",
  coral: "tag-coral",
  mint: "tag-mint",
  violet: "tag-violet",
  sky: "tag",
  ink: "tag-ink",
};
