import { render, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...a: unknown[]) => requireSuperAdminMock(...a),
}));

const getDataRequestMock = jest.fn();
jest.mock('@/app/features/dataRequests/store', () => ({
  getDataRequest: (...a: unknown[]) => getDataRequestMock(...a),
}));

const collectSubjectDataMock = jest.fn();
jest.mock('@/app/features/dataRequests/subjectData', () => ({
  collectSubjectData: (...a: unknown[]) => collectSubjectDataMock(...a),
}));

jest.mock('@/app/(routes)/(dashboard)/privacy/requests/[id]/actions', () => ({
  exportSubjectDataAction: jest.fn(),
  eraseSubjectDataAction: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const REQUEST = {
  id: 'dr_1',
  subjectEmail: 'jordan.rivers@example.com',
  type: 'access',
  status: 'in_progress',
  notes: null,
  receivedAt: new Date('2026-08-10T00:00:00.000Z'),
  dueAt: new Date('2026-09-09T00:00:00.000Z'),
  fulfilledAt: null,
  handledBy: null,
  createdAt: new Date('2026-08-10T00:00:00.000Z'),
  updatedAt: new Date('2026-08-10T00:00:00.000Z'),
};

function dossier(over: Record<string, unknown> = {}) {
  return {
    exportedAt: '2026-09-05T00:00:00.000Z',
    subjectEmail: 'jordan.rivers@example.com',
    lead: {
      id: 'lead_1',
      email: 'jordan.rivers@example.com',
      name: 'Jordan Rivers',
      company: 'Rivers Veterinary Practice',
      phone: '+44 20 7946 0100',
      newsletterConsent: true,
      consentAt: '2026-06-14T09:12:00.000Z',
      consentSource: 'https://www.example.com/contact-us',
      createdAt: '2026-06-14T09:12:00.000Z',
      requests: [
        {
          id: 'cr_1',
          subject: 'Pricing for a three-vet practice',
          message: 'What does onboarding look like?',
          sourceUrl: 'https://www.example.com/contact-us',
          status: 'closed',
          createdAt: '2026-06-14T09:12:00.000Z',
        },
      ],
    },
    consent: [
      {
        id: 'cs_1',
        consentId: 'device-9f2a41',
        userId: 'st_user_4471',
        createdAt: '2026-05-02T10:00:00.000Z',
        events: [
          {
            category: 'marketing',
            granted: false,
            source: 'web',
            policyVersion: 'v3',
            userAgent: 'Mozilla/5.0',
            at: '2026-06-02T10:00:00.000Z',
          },
        ],
      },
    ],
    dataRequests: [
      {
        id: 'dr_1',
        type: 'access',
        status: 'in_progress',
        notes: 'Identity confirmed by reply from the address on file.',
        receivedAt: '2026-08-10T00:00:00.000Z',
        dueAt: '2026-09-09T00:00:00.000Z',
        fulfilledAt: null,
      },
    ],
    ...over,
  };
}

async function renderPage(id = 'dr_1') {
  const mod = await import('@/app/(routes)/(dashboard)/privacy/requests/[id]/page');
  const ui = await mod.default({ params: Promise.resolve({ id }) });
  return render(ui);
}

beforeEach(() => {
  jest.clearAllMocks();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin_1' });
  getDataRequestMock.mockResolvedValue(REQUEST);
  collectSubjectDataMock.mockResolvedValue(dossier());
});

describe('SubjectRecordPage', () => {
  it('gates on the super-admin check before reading the register', async () => {
    requireSuperAdminMock.mockRejectedValue(new Error('denied'));

    await expect(renderPage()).rejects.toThrow('denied');
    expect(getDataRequestMock).not.toHaveBeenCalled();
    expect(collectSubjectDataMock).not.toHaveBeenCalled();
  });

  it('is not found when the request id does not resolve', async () => {
    getDataRequestMock.mockResolvedValue(null);

    await expect(renderPage('gone')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('collects the dossier for the address on the request row', async () => {
    await renderPage();

    expect(collectSubjectDataMock).toHaveBeenCalledWith('jordan.rivers@example.com');
  });

  it('shows the lead, its submissions, the consent history and prior requests', async () => {
    await renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'jordan.rivers@example.com' })
    ).toBeInTheDocument();
    expect(screen.getByText('Jordan Rivers')).toBeInTheDocument();
    expect(screen.getByText('Rivers Veterinary Practice')).toBeInTheDocument();
    expect(screen.getByText('Pricing for a three-vet practice')).toBeInTheDocument();
    expect(screen.getByText('What does onboarding look like?')).toBeInTheDocument();
    expect(screen.getByText(/device-9f2a41/)).toBeInTheDocument();
    expect(screen.getByText('withdrawn')).toBeInTheDocument();
    expect(
      screen.getByText('Identity confirmed by reply from the address on file.')
    ).toBeInTheDocument();
    expect(screen.getByText('(this request)')).toBeInTheDocument();
  });

  // Every other date on this page is formatted in UTC. A bare toLocaleDateString
  // here would render in whatever locale the server runs under, so a build box
  // and a laptop would disagree about the date on a statutory record.
  it('dates the request in UTC, like every other date on the page', async () => {
    await renderPage();

    expect(screen.getByText(/received Aug 10, 2026, 12:00 AM/)).toBeInTheDocument();
  });

  it('offers the export and a way back to the queue', async () => {
    await renderPage();

    expect(screen.getByRole('button', { name: /Export subject data/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to data requests/i })).toHaveAttribute(
      'href',
      '/privacy/requests'
    );
  });

  // The erasure control is destructive and irreversible, so it appears only on
  // a request that asked for one. The action refuses on any other type anyway;
  // this stops the button being there to mis-click in the first place.
  it('does not offer erasure on a request that did not ask for it', async () => {
    await renderPage();

    expect(screen.getByRole('button', { name: /Export subject data/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Erase subject data' })).not.toBeInTheDocument();
  });

  it('offers erasure on an erasure request', async () => {
    getDataRequestMock.mockResolvedValue({ ...REQUEST, type: 'erasure' });

    await renderPage();

    expect(screen.getByRole('button', { name: 'Erase subject data' })).toBeInTheDocument();
  });

  it('says plainly when the panel holds nothing, rather than showing a blank panel', async () => {
    collectSubjectDataMock.mockResolvedValue(
      dossier({ lead: null, consent: [], dataRequests: [] })
    );

    await renderPage();

    expect(screen.getByText(/this address is not a marketing lead/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no consent decisions are linked to this address/i)
    ).toBeInTheDocument();
  });

  it('warns on a section that could not be read instead of implying nothing is held', async () => {
    collectSubjectDataMock.mockResolvedValue(
      dossier({ consent: { error: 'This section could not be read at export time.' } })
    );

    const { container } = await renderPage();

    const consentPanel = within(container).getByText('Consent ledger').closest('section');
    expect(consentPanel).not.toBeNull();
    expect(within(consentPanel as HTMLElement).getByText(/could not be read/i)).toBeInTheDocument();
    // The sections that did read must still be shown in full.
    expect(screen.getByText('Jordan Rivers')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = await renderPage();

    expect(await axe(container)).toHaveNoViolations();
  });
});
