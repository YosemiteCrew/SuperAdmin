import {
  DEFAULT_USER_TYPE_FILTER,
  USER_TYPE_FILTERS,
  USER_TYPE_META,
  isMobileAppUser,
  parseUserTypeFilter,
  recipeIdsForUserType,
} from '@/app/features/users/filter';

describe('parseUserTypeFilter', () => {
  it.each(USER_TYPE_FILTERS)('accepts the known filter %s', (filter) => {
    expect(parseUserTypeFilter(filter)).toBe(filter);
  });

  it('falls back to the default for an unknown value', () => {
    expect(parseUserTypeFilter('admins')).toBe(DEFAULT_USER_TYPE_FILTER);
  });

  it('falls back to the default when absent', () => {
    expect(parseUserTypeFilter(undefined)).toBe(DEFAULT_USER_TYPE_FILTER);
  });

  it('takes the first entry when the param is repeated', () => {
    expect(parseUserTypeFilter(['mobile', 'business'])).toBe('mobile');
  });

  it('falls back when a repeated param leads with junk', () => {
    expect(parseUserTypeFilter(['nope', 'mobile'])).toBe(DEFAULT_USER_TYPE_FILTER);
  });
});

describe('recipeIdsForUserType', () => {
  it('returns undefined for "all" so no filter is sent to the core', () => {
    // An empty array would be serialised as an empty includeRecipeIds and match
    // nothing, which is the opposite of what "All" means.
    expect(recipeIdsForUserType('all')).toBeUndefined();
  });

  it('maps mobile to the two app sign-in methods', () => {
    expect(recipeIdsForUserType('mobile')).toEqual(['passwordless', 'thirdparty']);
  });

  it('maps business to email + password', () => {
    expect(recipeIdsForUserType('business')).toEqual(['emailpassword']);
  });

  it('returns a fresh array each call so callers cannot mutate the table', () => {
    const first = recipeIdsForUserType('mobile');
    first?.push('emailpassword');
    expect(recipeIdsForUserType('mobile')).toEqual(['passwordless', 'thirdparty']);
  });

  it('splits the directory without overlap', () => {
    const mobile = recipeIdsForUserType('mobile') ?? [];
    const business = recipeIdsForUserType('business') ?? [];
    expect(mobile.filter((id) => business.includes(id))).toEqual([]);
  });
});

describe('isMobileAppUser', () => {
  it.each([
    [['passwordless'], true],
    [['thirdparty'], true],
    [['passwordless', 'thirdparty'], true],
    [['emailpassword'], false],
    [[], false],
  ])('classifies %j as mobile=%s', (recipeIds, expected) => {
    expect(isMobileAppUser(recipeIds as string[])).toBe(expected);
  });

  it('treats a mixed account as mobile', () => {
    expect(isMobileAppUser(['emailpassword', 'thirdparty'])).toBe(true);
  });
});

describe('USER_TYPE_META', () => {
  it('has a label, hint and noun for every filter', () => {
    for (const filter of USER_TYPE_FILTERS) {
      expect(USER_TYPE_META[filter].label.length).toBeGreaterThan(0);
      expect(USER_TYPE_META[filter].hint.length).toBeGreaterThan(0);
      expect(USER_TYPE_META[filter].noun.length).toBeGreaterThan(0);
    }
  });

  it('uses a noun that reads correctly in an empty-state sentence', () => {
    // Guards the regression where the tab label was reused and produced "No All yet."
    expect(`No ${USER_TYPE_META.all.noun} yet.`).toBe('No users yet.');
  });
});
