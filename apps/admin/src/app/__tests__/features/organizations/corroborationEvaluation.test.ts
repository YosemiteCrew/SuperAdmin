/**
 * @jest-environment node
 */

import {
  checkWebsite,
  type CheckStatus,
  type HostResolver,
} from '@/app/features/organizations/corroboration';

interface PageFixture {
  url: string;
  text: string;
}

interface EvaluationPair {
  id: string;
  name: string;
  page: PageFixture | null;
  expected: CheckStatus;
}

const VCA = {
  url: 'https://vcahospitals.com/',
  text: 'VCA Animal Hospitals: World-Class Veterinary Care',
};
const BANFIELD = {
  url: 'https://www.banfield.com/',
  text: 'Banfield Pet Hospital - Quality Veterinary Care and Pet Wellness',
};
const AMC = {
  url: 'https://www.amcny.org/',
  text: 'The Animal Medical Center provides care for companion animals.',
};
const ANGELL = {
  url: 'https://www.mspca.org/veterinarycare/hospital-locations/boston/angell-animal-medical-center/',
  text: 'MSPCA-Angell Animal Medical Center in Boston. Animal care center and hospital.',
};
const TUFTS = {
  url: 'https://vet.tufts.edu/foster-hospital-small-animals',
  text: 'Cummings School Foster Hospital for Small Animals. Small animal hospital.',
};
const CORNELL = {
  url: 'https://www.vet.cornell.edu/hospitals',
  text: 'Cornell University Hospital for Animals. Veterinary medicine and animal hospital.',
};
const CSU = {
  url: 'https://csuveterinaryhealth.org/',
  text: 'Colorado State University Veterinary Teaching Hospital. CSU Veterinary Health Center.',
};
const FLORIDA = {
  url: 'https://smallanimal.vethospital.ufl.edu/',
  text: 'University of Florida Small Animal Hospital in Gainesville.',
};
const OHIO = {
  url: 'https://vmc.vet.osu.edu/',
  text: 'Ohio State Veterinary Medical Center in Columbus. Animal hospital and veterinary center.',
};
const GEORGIA = {
  url: 'https://vet.uga.edu/hospital-and-primary-care/',
  text: 'University of Georgia UGA Veterinary Teaching Hospital. Athens primary care animal hospital.',
};
const CAROLINA = {
  url: 'https://hospital.cvm.ncsu.edu/',
  text: 'NC State Veterinary Hospital in Raleigh, North Carolina. Animal hospital.',
};
const PURDUE = {
  url: 'https://vet.purdue.edu/hospital/',
  text: 'Purdue University Veterinary Hospital in Lafayette, Indiana. Small animal hospital.',
};
const TEXAS = {
  url: 'https://vetmed.tamu.edu/vethospital/small-animal/',
  text: 'Texas A&M Small Animal Teaching Hospital.',
};
const ILLINOIS = {
  url: 'https://vetmed.illinois.edu/hospital/',
  text: 'University of Illinois Veterinary Teaching Hospital.',
};
const WISCONSIN = {
  url: 'https://uwveterinarycare.wisc.edu/',
  text: 'University of Wisconsin Veterinary Care.',
};

const PAIRS: EvaluationPair[] = [
  {
    id: 'demo-1',
    name: 'Example Domain Veterinary',
    page: { url: 'https://example.com/', text: 'Example Domain' },
    expected: 'pass',
  },
  {
    id: 'demo-2',
    name: 'Bright Paws Grooming',
    page: { url: 'https://example.org/', text: 'Example Domain' },
    expected: 'warn',
  },
  { id: 'demo-3', name: 'Acme Boarding Co', page: null, expected: 'fail' },
  { id: 'real-01', name: 'VCA Animal Hospitals', page: VCA, expected: 'pass' },
  { id: 'real-02', name: 'Banfield Pet Hospital', page: BANFIELD, expected: 'pass' },
  { id: 'real-03', name: 'Schwarzman Animal Medical Center', page: AMC, expected: 'pass' },
  { id: 'real-04', name: 'Angell Animal Medical Center', page: ANGELL, expected: 'pass' },
  { id: 'real-05', name: 'Foster Hospital for Small Animals', page: TUFTS, expected: 'pass' },
  {
    id: 'real-06',
    name: 'Cornell University Hospital for Animals',
    page: CORNELL,
    expected: 'pass',
  },
  {
    id: 'real-07',
    name: 'Colorado State University Veterinary Teaching Hospital',
    page: CSU,
    expected: 'pass',
  },
  {
    id: 'real-08',
    name: 'University of Florida Small Animal Hospital',
    page: FLORIDA,
    expected: 'pass',
  },
  { id: 'real-09', name: 'Ohio State Veterinary Medical Center', page: OHIO, expected: 'pass' },
  { id: 'real-10', name: 'UGA Veterinary Teaching Hospital', page: GEORGIA, expected: 'pass' },
  { id: 'real-11', name: 'NC State Veterinary Hospital', page: CAROLINA, expected: 'pass' },
  { id: 'real-12', name: 'Purdue University Veterinary Hospital', page: PURDUE, expected: 'pass' },
  {
    id: 'real-13',
    name: 'Texas A&M Small Animal Teaching Hospital',
    page: TEXAS,
    expected: 'pass',
  },
  {
    id: 'real-14',
    name: 'University of Illinois Veterinary Teaching Hospital',
    page: ILLINOIS,
    expected: 'pass',
  },
  {
    id: 'real-15',
    name: 'University of Wisconsin Veterinary Care',
    page: WISCONSIN,
    expected: 'pass',
  },
  { id: 'mismatch-01', name: 'Valley Care Animal Hospital', page: VCA, expected: 'pass' },
  { id: 'mismatch-02', name: 'Coastal Veterinary Care', page: VCA, expected: 'pass' },
  { id: 'mismatch-03', name: 'Northfield Pet Hospital', page: BANFIELD, expected: 'pass' },
  {
    id: 'mismatch-04',
    name: 'Greenfield Veterinary Pet Hospital',
    page: BANFIELD,
    expected: 'pass',
  },
  { id: 'mismatch-05', name: 'Downtown Animal Medical Center', page: AMC, expected: 'pass' },
  {
    id: 'mismatch-06',
    name: 'Metropolitan Medical Center for Animals',
    page: AMC,
    expected: 'pass',
  },
  { id: 'mismatch-07', name: 'Harbor Animal Medical Center', page: ANGELL, expected: 'pass' },
  { id: 'mismatch-08', name: 'Boston Animal Care Center', page: ANGELL, expected: 'pass' },
  { id: 'mismatch-09', name: 'Valley Hospital for Small Animals', page: TUFTS, expected: 'pass' },
  { id: 'mismatch-10', name: 'Cummings Small Animal Hospital', page: TUFTS, expected: 'pass' },
  {
    id: 'mismatch-11',
    name: 'Ithaca University Hospital for Animals',
    page: CORNELL,
    expected: 'pass',
  },
  { id: 'mismatch-12', name: 'Cornell Street Animal Hospital', page: CORNELL, expected: 'pass' },
  { id: 'mismatch-13', name: 'Colorado Valley Veterinary Hospital', page: CSU, expected: 'pass' },
  { id: 'mismatch-14', name: 'State Line Veterinary Health Center', page: CSU, expected: 'pass' },
  {
    id: 'mismatch-15',
    name: 'Florida Coast Small Animal Hospital',
    page: FLORIDA,
    expected: 'pass',
  },
  { id: 'mismatch-16', name: 'Gainesville Animal Hospital', page: FLORIDA, expected: 'pass' },
  { id: 'mismatch-17', name: 'Columbus Veterinary Medical Center', page: OHIO, expected: 'pass' },
  { id: 'mismatch-18', name: 'Ohio Valley Veterinary Center', page: OHIO, expected: 'pass' },
  {
    id: 'mismatch-19',
    name: 'Georgia Veterinary Teaching Hospital',
    page: GEORGIA,
    expected: 'pass',
  },
  {
    id: 'mismatch-20',
    name: 'Athens Primary Care Animal Hospital',
    page: GEORGIA,
    expected: 'pass',
  },
  {
    id: 'mismatch-21',
    name: 'Carolina State Veterinary Hospital',
    page: CAROLINA,
    expected: 'pass',
  },
  { id: 'mismatch-22', name: 'Raleigh Animal Hospital', page: CAROLINA, expected: 'pass' },
  {
    id: 'mismatch-23',
    name: 'Indiana University Veterinary Hospital',
    page: PURDUE,
    expected: 'pass',
  },
  { id: 'mismatch-24', name: 'Lafayette Animal Hospital', page: PURDUE, expected: 'pass' },
];

const resolvePublic: HostResolver = async () => [{ address: '93.184.216.34' }];
const originalKey = process.env.TYPE_SAFE_API_KEY;

afterAll(() => {
  if (originalKey === undefined) delete process.env.TYPE_SAFE_API_KEY;
  else process.env.TYPE_SAFE_API_KEY = originalKey;
});

describe('unconfigured website judgment evaluation baseline', () => {
  it('pins all 42 token-overlap outcomes used by the independent evaluation', async () => {
    delete process.env.TYPE_SAFE_API_KEY;
    expect(PAIRS).toHaveLength(42);

    for (const pair of PAIRS) {
      const fetchPage = pair.page
        ? async () =>
            ({
              ok: true,
              status: 200,
              url: pair.page!.url,
              headers: { get: () => null },
              text: async () => pair.page!.text,
            }) as unknown as Response
        : async () => {
            throw new Error('unreachable');
          };
      const result = await checkWebsite(
        pair.page?.url ?? 'https://this-domain-does-not-resolve-xyz.example/',
        pair.name,
        fetchPage as typeof fetch,
        resolvePublic
      );
      expect(result.status).toBe(pair.expected);
    }
  });
});
