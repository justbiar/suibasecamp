import { authoritativeData, type ToolResult } from './authoritative-data.js';
export function renderTurn(
  results: { tool: string; result: ToolResult }[],
  _modelProse?: string,
): string {
  void _modelProse;
  // Deliberately discard generated prose. No LLM text can claim state or persistence.
  return results.length
    ? results.map((x) => authoritativeData(x.tool, x.result)).join('\n\n')
    : 'Agent > No verified result. Use /help for supported actions; no blockchain or memory operation was confirmed.';
}
