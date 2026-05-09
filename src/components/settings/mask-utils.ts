/** 掩码显示：保留首6尾4，中间替换为星号 */
export function maskApiKey(key: string): string {
  if (key.length <= 10) return key;
  return key.slice(0, 6) + '****' + key.slice(-4);
}

/** 掩码本站 API Key（用于显示） */
export function maskKeyForDisplay(key: string): string {
  if (key.length <= 12) return key;
  return (
    key.slice(0, 6) + '*'.repeat(Math.min(key.length - 10, 8)) + key.slice(-4)
  );
}
