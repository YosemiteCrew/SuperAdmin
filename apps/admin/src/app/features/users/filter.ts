/**
 * Splits the directory by how an account signs in, which on this deployment is
 * a clean proxy for which product the person uses:
 *
 * - the **mobile app** signs pet parents in with a one-time code (passwordless)
 *   or a social provider (thirdparty);
 * - the **business web app** signs practices in with email + password.
 *
 * Measured against the live core on 2026-08-22: 55 emailpassword + 59
 * passwordless/thirdparty = 114 total, with no account in both halves, so the
 * two filters partition the directory rather than overlapping.
 *
 * The filtering is done by the SuperTokens core via `includeRecipeIds`, not in
 * this process — filtering a page after it was fetched would silently shrink
 * pages and corrupt the cursor.
 */
export const USER_TYPE_FILTERS = ['all', 'mobile', 'business'] as const;

export type UserTypeFilter = (typeof USER_TYPE_FILTERS)[number];

export const DEFAULT_USER_TYPE_FILTER: UserTypeFilter = 'all';

export const USER_TYPE_META: Readonly<
  Record<UserTypeFilter, { label: string; hint: string; noun: string }>
> = {
  all: { label: 'All', hint: 'Every account in the directory', noun: 'users' },
  mobile: {
    label: 'Mobile app users',
    hint: 'Signs in with a one-time code or a social provider',
    noun: 'mobile app users',
  },
  business: {
    label: 'Business users',
    hint: 'Signs in with email and password',
    noun: 'business users',
  },
};

const MOBILE_RECIPE_IDS: readonly string[] = ['passwordless', 'thirdparty'];
const BUSINESS_RECIPE_IDS: readonly string[] = ['emailpassword'];

const RECIPE_IDS: Readonly<Record<UserTypeFilter, readonly string[] | undefined>> = {
  all: undefined,
  mobile: MOBILE_RECIPE_IDS,
  business: BUSINESS_RECIPE_IDS,
};

/** Narrows an untrusted query-string value, falling back to "all". */
export function parseUserTypeFilter(value: string | string[] | undefined): UserTypeFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return USER_TYPE_FILTERS.includes(raw as UserTypeFilter)
    ? (raw as UserTypeFilter)
    : DEFAULT_USER_TYPE_FILTER;
}

/**
 * Recipe ids to hand to `getUsersNewestFirst`. `undefined` means "no filter" —
 * an empty array would be sent as an empty `includeRecipeIds` and match nothing.
 */
export function recipeIdsForUserType(filter: UserTypeFilter): string[] | undefined {
  const ids = RECIPE_IDS[filter];
  return ids ? [...ids] : undefined;
}

/** True when the account's login methods put it on the mobile-app side. */
export function isMobileAppUser(recipeIds: readonly string[]): boolean {
  return recipeIds.some((id) => MOBILE_RECIPE_IDS.includes(id));
}
