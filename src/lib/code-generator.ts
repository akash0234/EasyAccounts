export function generateCode(prefix: string): string {
  return `${prefix}-${(Date.now() / 1000) | 0}`;
}
