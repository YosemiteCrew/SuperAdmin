export type SearchParam = string | string[] | undefined;

/** Rejects repeated query parameters where a page expects one scalar value. */
export function scalarSearchParam(value: SearchParam): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
