/**
 * Lightweight, regex-free email sanity check (avoids any ReDoS surface). This is
 * a format guard only — SuperTokens performs authoritative validation on update.
 */
export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (email.length === 0 || email.length > 254 || email.includes(' ')) return false;

  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@')) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length === 0 || domain.length < 3) return false;

  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}
