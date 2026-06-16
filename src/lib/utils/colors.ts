const TAG_COLOR_PALETTE = [
  '#3B82F6',
  '#22C55E',
  '#A855F7',
  '#EC4899',
  '#F97316',
  '#14B8A6',
  '#EF4444',
  '#6366F1',
  '#EAB308',
  '#06B6D4',
  '#84CC16',
  '#F43F5E',
  '#8B5CF6',
  '#0EA5E9',
];

/**
 * Return a random hex color from a curated palette that works in both themes.
 */
export function randomTagColor(): string {
  return TAG_COLOR_PALETTE[Math.floor(Math.random() * TAG_COLOR_PALETTE.length)];
}

export const MORANDI_COLORS = [
  '#5B8C4A',
  '#A0522D',
  '#2E6DA4',
  '#B85454',
  '#3D8B6E',
  '#C88A2C',
  '#5A6FA5',
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MORANDI_COLORS[Math.abs(hash) % MORANDI_COLORS.length];
}
