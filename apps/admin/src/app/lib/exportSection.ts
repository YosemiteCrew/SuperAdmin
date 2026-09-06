/**
 * Runs one section of a subject-access export, turning a failure into an error
 * string for that section alone rather than rejecting the whole export. A
 * partial answer inside the statutory month beats no answer at all, and a
 * missing section is visible to the operator where a rejected promise is not.
 *
 * The failure is deliberately not surfaced to the caller: an export is handed
 * to a data subject, and a driver message would leak infrastructure detail.
 */
export async function section<T>(read: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await read();
  } catch {
    return { error: 'This section could not be read at export time.' };
  }
}

/** Narrows a section that failed to read, so a reader can show why. */
export function isSectionError(value: unknown): value is { error: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { error?: unknown }).error === 'string'
  );
}
