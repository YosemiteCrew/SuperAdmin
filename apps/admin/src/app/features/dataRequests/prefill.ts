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

/** What the marker's link carries: an opaque contact id and the kind read. */
export interface DataRequestLink {
  fromContact?: string;
  type?: RequestType;
}

/**
 * Narrows an untrusted query string into the link's two values: which contact
 * request it came from, and which kind was read. Next parses a repeated query
 * param into an array, so `?type=access&type=erasure` yields
 * `['access','erasure']` and neither value can be assumed to be a string.
 * Anything that is not a plain id, or not one of the four request types, is
 * dropped: the form then opens on its own defaults, which is the same page an
 * operator reaches from the menu.
 *
 * The subject's email is deliberately NOT a query value. The caller resolves it
 * from the contact id on the server, so the address stays out of the URL, the
 * browser history and the access logs.
 */
export function parseDataRequestLink(
  params: Readonly<{ fromContact?: string | string[]; type?: string | string[] }>
): DataRequestLink {
  const { fromContact, type } = params;
  return {
    fromContact:
      typeof fromContact === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(fromContact)
        ? fromContact
        : undefined,
    type: isRequestType(type) ? type : undefined,
  };
}
