import { render } from '@testing-library/react';

import {
  OrganizationAvatar,
  organizationVisual,
} from '@/app/(routes)/(dashboard)/organizations/OrganizationAvatar';
import type { BusinessType } from '@/app/features/organizations/types';

const TYPES: BusinessType[] = ['HOSPITAL', 'GROOMER', 'BOARDER', 'BREEDER'];

describe('organizationVisual', () => {
  it.each(TYPES)('returns theme-token colours for %s', (type) => {
    const visual = organizationVisual(type);
    expect(visual.background).toContain('var(--');
    expect(visual.color).toContain('var(--');
    expect(visual.Icon).toBeDefined();
  });

  it('falls back to neutral tokens for an unknown type', () => {
    const visual = organizationVisual('MYSTERY' as BusinessType);
    expect(visual.background).toBe('var(--screen-2)');
    expect(visual.color).toBe('var(--ink-faint)');
  });
});

describe('OrganizationAvatar', () => {
  it('renders a decorative chip at the default size', () => {
    const { container } = render(<OrganizationAvatar type="HOSPITAL" />);
    const chip = container.querySelector('span[aria-hidden]');
    expect(chip).toHaveStyle({ width: '36px', height: '36px' });
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('uses the larger radius at header size', () => {
    const { container } = render(<OrganizationAvatar type="GROOMER" size={46} />);
    const chip = container.querySelector('span[aria-hidden]');
    expect(chip).toHaveStyle({ width: '46px', borderRadius: '14px' });
  });
});
