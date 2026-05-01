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
