import { render, screen } from '@testing-library/react';

import {
  CorroborationFlag,
  CorroborationPanel,
} from '@/app/(routes)/(dashboard)/organizations/CorroborationPanel';
import type { CorroborationResult } from '@/app/features/organizations/corroboration';

const CHECKS: CorroborationResult['checks'] = [
  { id: 'website', label: 'Website', status: 'pass', detail: 'Live and matches.' },
  { id: 'phone', label: 'Phone', status: 'warn', detail: 'No phone number.' },
  { id: 'address', label: 'Address', status: 'fail', detail: 'Address incomplete.' },
  { id: 'places', label: 'Google Places', status: 'skipped', detail: 'Not linked.' },
];

describe('CorroborationFlag', () => {
  it('prefixes a check mark only for the corroborated level', () => {
    const { container } = render(<CorroborationFlag level="corroborated" />);
    expect(container.textContent).toContain('✓');
    expect(screen.getByText(/Details corroborated/i)).toBeInTheDocument();
  });

  it('renders partial and unverified labels without the check prefix', () => {
    const { rerender } = render(<CorroborationFlag level="partial" />);
    expect(screen.getByText(/Partly corroborated/i)).toBeInTheDocument();

    rerender(<CorroborationFlag level="unverified" />);
    expect(screen.getByText(/Not corroborated/i)).toBeInTheDocument();
  });
});

describe('CorroborationPanel', () => {
  it('renders a heading, an embedded flag, and every check with its detail', () => {
    render(<CorroborationPanel result={{ level: 'partial', checks: CHECKS }} />);

    expect(screen.getByText(/Pre-verification checks/i)).toBeInTheDocument();
    // The flag is embedded in the panel header.
    expect(screen.getByText(/Partly corroborated/i)).toBeInTheDocument();

    for (const check of CHECKS) {
      expect(screen.getByText(check.label)).toBeInTheDocument();
      expect(screen.getByText(check.detail)).toBeInTheDocument();
    }
  });

  it('shows a status icon for each of the four check statuses', () => {
    const { container } = render(
      <CorroborationPanel result={{ level: 'partial', checks: CHECKS }} />
    );
    const icons = container.textContent ?? '';
    expect(icons).toContain('✓'); // pass
    expect(icons).toContain('!'); // warn
    expect(icons).toContain('✕'); // fail
    expect(icons).toContain('–'); // skipped
  });
});
