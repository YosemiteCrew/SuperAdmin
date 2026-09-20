import { isValidEmail } from '@/app/features/settings/email';

import { isRequestType, type RequestType } from './types';

/**
 * Values the manual log-a-request form starts with when an operator follows
 * the data-request marker on a contact request.
 *
 * The received date is deliberately absent. It is what the statutory clock is
 * computed from, so an operator sets it themselves, on purpose, after reading
 * the message - a prefilled date would make the most consequential field the
 * easiest one to submit without looking at.
 */
export interface DataRequestPrefill {
  subjectEmail?: string;
  type?: RequestType;
}

/**
 * Narrows an untrusted query string into that shape. Next parses a repeated
 * query param into an array, so `?type=access&type=erasure` yields
 * `['access','erasure']` and neither value can be assumed to be a string.
 * Anything that is not a valid email, or not one of the four request types, is
 * dropped: the form then opens on its own defaults, which is the same page an
 * operator reaches from the menu.
 */
export function parseDataRequestPrefill(
  params: Readonly<{ subjectEmail?: string | string[]; type?: string | string[] }>
): DataRequestPrefill {
  const { subjectEmail, type } = params;
  return {
    subjectEmail:
      typeof subjectEmail === 'string' && isValidEmail(subjectEmail)
        ? subjectEmail.trim()
        : undefined,
    type: isRequestType(type) ? type : undefined,
  };
}
