export const APP_NAME = 'Super Admin';

export const SUPERTOKENS_API_BASE_PATH = '/api/auth';
export const SUPERTOKENS_WEBSITE_BASE_PATH = '/auth';

export const DEFAULT_PAGE_SIZE = 20;

export const DEFAULT_TENANT_ID = 'public';

export const SUPERADMIN_ROLE = 'superadmin';

/**
 * The value an erasure writes over a subject key it cannot delete, and the
 * namespace reserved for its per-row tombstones (`[erased]:<rowId>`).
 *
 * It lives here rather than with the erasure because the public intakes have to
 * refuse it, and they must not import a `server-only` module. Two literals in
 * two files is the drift that reopens the hole silently: if the erasure and the
 * intake ever disagree about the spelling, a caller who learns a tombstone can
 * hand it back and re-attach identifiers to a row that was erased.
 */
export const ERASED_SUBJECT = '[erased]';

/**
 * True for anything an erasure could have written as a subject key. Public
 * intakes reject these outright — no legitimate device id, address or account
 * id is bracketed, so nothing real is refused.
 */
export function isErasedSubjectKey(value: string): boolean {
  return value === ERASED_SUBJECT || value.startsWith(`${ERASED_SUBJECT}:`);
}
