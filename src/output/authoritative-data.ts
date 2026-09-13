export type ToolResult = {
  success: boolean;
  source: string;
  [key: string]: unknown;
};
export function mistToSui(mist: string): string {
  if (!/^\d+$/.test(mist)) throw new Error('Invalid MIST balance');
  const value = BigInt(mist);
  const fraction = (value % 1000000000n)
    .toString()
    .padStart(9, '0')
    .replace(/0+$/, '');
  return `${value / 1000000000n}${fraction ? '.' + fraction : ''}`;
}
export function authoritativeData(tool: string, result: ToolResult): string {
  // JSON escaping prevents terminal control sequences from becoming active.
  return `Verified tool data > ${JSON.stringify(tool)}\n${JSON.stringify(result, null, 2)}`;
}
