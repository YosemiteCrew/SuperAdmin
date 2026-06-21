// First characters a spreadsheet may treat as the start of a formula (=, +, -,
// @) plus control chars (tab, CR) that can smuggle one in.
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * Neutralizes CSV/spreadsheet formula injection: a field whose first character
 * could start a formula is prefixed with a single quote so Excel / Google Sheets
 * / LibreOffice render it as literal text instead of executing it.
 */
function neutralizeFormula(value: string): string {
  return value.length > 0 && FORMULA_TRIGGERS.has(value[0]) ? `'${value}` : value;
}

/**
 * Escapes a CSV field: neutralizes formula injection, then RFC-4180 quotes the
 * field when it contains a comma, quote, or newline.
 */
export function escapeCsvField(value: string): string {
  const safe = neutralizeFormula(value);
  if (safe.includes('"') || safe.includes(',') || safe.includes('\n')) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

/** Serialises a header row + data rows into a CSV string. */
export function rowsToCsv(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<string | number>>
): string {
  const body = rows.map((row) => row.map((field) => escapeCsvField(String(field))).join(','));
  return [headers.join(','), ...body].join('\n');
}
