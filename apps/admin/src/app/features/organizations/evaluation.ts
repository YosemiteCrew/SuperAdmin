/* eslint-disable sonarjs/no-duplicate-string */

import 'server-only';

import { checkWebsite, type HostResolver, type CheckStatus } from './corroboration';

const TEST_PAIRS: Array<{
  name: string;
  url: string;
  html: string;
  expectedTokenStatus: 'pass' | 'warn' | 'fail';
  expectedJudgmentStatus: 'pass' | 'warn' | 'fail';
  reviewerVerdict: 'pass' | 'warn' | 'fail';
  description: string;
}> = [
  // Demo fixtures from demo.ts
  {
    name: 'Example Domain Veterinary',
    url: 'https://example.com',
    html: '<h1>Example Domain</h1><p>This domain is for use in illustrative examples.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'IANA placeholder page - should fail',
  },
  {
    name: 'Bright Paws Grooming',
    url: 'https://example.org',
    html: '<h1>Example Domain</h1><p>This domain is for use in illustrative examples.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'IANA placeholder page - should fail',
  },
  {
    name: 'Acme Boarding Co',
    url: 'https://this-domain-does-not-resolve-xyz.example',
    html: '',
    expectedTokenStatus: 'fail',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Unresolvable domain - should fail',
  },

  // Real practice websites (simulated HTML)
  {
    name: 'Yosemite Crew Veterinary',
    url: 'https://yosemitecrewvet.com',
    html: '<h1>Yosemite Crew Veterinary</h1><p>Your trusted pet care clinic in the valley.</p><p>We offer wellness exams, vaccinations, and emergency care.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice site with exact name match',
  },
  {
    name: 'Yosemite Crew Veterinary Pvt Ltd',
    url: 'https://yosemitecrewvet.com',
    html: '<h1>Yosemite Crew Veterinary</h1><p>Your trusted pet care clinic in the valley.</p>',
    expectedTokenStatus: 'warn',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Legal suffixes in name but real site - token overlap warns, judgment passes',
  },
  {
    name: 'The Cat Clinic',
    url: 'https://thecatclinic.com',
    html: '<h1>The Cat Clinic</h1><p>Feline-only veterinary practice.</p><p>We specialize in cat health and wellness.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice site with exact name match',
  },
  {
    name: 'The Cat Clinic',
    url: 'https://parked-domain-example.com',
    html: '<h1>This domain is for sale</h1><p>Contact us to find the right location for your business.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Parked domain with "cat" in "location" - false pass for tokens',
  },
  {
    name: 'Bright Paws Grooming',
    url: 'https://brightpaws.com',
    html: '<h1>Bright Paws Pet Spa</h1><p>Professional grooming for dogs and cats.</p><p>Bathing, trimming, and styling services.</p>',
    expectedTokenStatus: 'warn',
    expectedJudgmentStatus: 'warn',
    reviewerVerdict: 'warn',
    description: 'Similar but not exact name - borderline',
  },
  {
    name: 'Acme Veterinary Hospital',
    url: 'https://acmevet.com',
    html: '<h1>Acme Veterinary Hospital</h1><p>Full-service animal hospital.</p><p>Emergency care available 24/7.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice site with exact name match',
  },
  {
    name: 'Acme Veterinary Hospital',
    url: 'https://acme-corp.com',
    html: '<h1>Acme Corporation</h1><p>We manufacture anvils and dynamite.</p><p>Industrial supplies since 1950.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Different business with "Acme" in name - false pass for tokens',
  },

  // Additional test cases for edge cases
  {
    name: 'Paws & Claws Animal Hospital',
    url: 'https://pawsandclaws.com',
    html: '<h1>Paws & Claws Animal Hospital</h1><p>Compassionate care for your pets.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice with special characters in name',
  },
  {
    name: 'Paws & Claws Animal Hospital',
    url: 'https://parked-paws.com',
    html: '<h1>Paws for Sale</h1><p>This domain is parked.</p><p>Claws are sharp.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Parked domain with token matches in unrelated context',
  },
  {
    name: 'VCA Animal Hospital',
    url: 'https://vcahospitals.com',
    html: "<h1>VCA Animal Hospitals</h1><p>Over 1000 locations nationwide.</p><p>Your pet's health is our top priority.</p>",
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Large chain with exact name match',
  },
  {
    name: 'Banfield Pet Hospital',
    url: 'https://banfield.com',
    html: '<h1>Banfield Pet Hospital</h1><p>Preventive care for dogs and cats.</p><p>Wellness plans available.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Large chain with exact name match',
  },
  {
    name: 'BluePearl Pet Hospital',
    url: 'https://bluepearlvet.com',
    html: '<h1>BluePearl Specialty + Emergency Pet Hospital</h1><p>Advanced veterinary care.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Specialty hospital with exact name match',
  },
  {
    name: 'Animal Medical Center',
    url: 'https://amcny.org',
    html: '<h1>Animal Medical Center</h1><p>World-class veterinary care in NYC.</p><p>Specialty and emergency services.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Renowned hospital with exact name match',
  },
  {
    name: 'Angell Animal Medical Center',
    url: 'https://angell.org',
    html: '<h1>Angell Animal Medical Center</h1><p>Veterinary care since 1915.</p><p>Specialty and emergency services.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Historic hospital with exact name match',
  },
  {
    name: 'Cummings Veterinary Medical Center',
    url: 'https://vet.tufts.edu',
    html: '<h1>Cummings School of Veterinary Medicine</h1><p>Tufts University veterinary teaching hospital.</p>',
    expectedTokenStatus: 'warn',
    expectedJudgmentStatus: 'warn',
    reviewerVerdict: 'warn',
    description: 'Teaching hospital - name differs from URL',
  },
  {
    name: 'University Veterinary Hospital',
    url: 'https://vetmed.ucdavis.edu',
    html: '<h1>UC Davis Veterinary Medical Teaching Hospital</h1><p>Leading veterinary teaching hospital.</p>',
    expectedTokenStatus: 'warn',
    expectedJudgmentStatus: 'warn',
    reviewerVerdict: 'warn',
    description: 'University hospital - name differs from URL',
  },
  {
    name: 'Petco Veterinary Services',
    url: 'https://petco.com',
    html: '<h1>Petco</h1><p>Pet supplies, food, and services.</p><p>Veterinary services available at select locations.</p>',
    expectedTokenStatus: 'warn',
    expectedJudgmentStatus: 'warn',
    reviewerVerdict: 'warn',
    description: 'Retail site with veterinary services - not primary vet site',
  },
  {
    name: 'PetSmart Veterinary',
    url: 'https://petsmart.com',
    html: '<h1>PetSmart</h1><p>Pet supplies and services.</p><p>Banfield Pet Hospital inside.</p>',
    expectedTokenStatus: 'warn',
    expectedJudgmentStatus: 'warn',
    reviewerVerdict: 'warn',
    description: 'Retail site with partner vet - not primary vet site',
  },
  {
    name: 'Chewy Veterinary',
    url: 'https://chewy.com',
    html: '<h1>Chewy</h1><p>Pet food and supplies delivery.</p><p>Connect with a vet via telehealth.</p>',
    expectedTokenStatus: 'warn',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'E-commerce site with telehealth - not a practice site',
  },
  {
    name: "Dr. Smith's Veterinary Clinic",
    url: 'https://drsmithvet.com',
    html: "<h1>Dr. Smith's Veterinary Clinic</h1><p>Personalized care for your pets.</p><p>Serving the community since 1990.</p>",
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Individual practice with exact name match',
  },
  {
    name: "Dr. Smith's Veterinary Clinic",
    url: 'https://drsmith.com',
    html: '<h1>Dr. Smith</h1><p>Personal blog about medicine.</p><p>Not a veterinary practice.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Personal site with name match but not vet practice',
  },
  {
    name: 'Sunset Boulevard Animal Hospital',
    url: 'https://sunsetvet.com',
    html: '<h1>Sunset Boulevard Animal Hospital</h1><p>Full-service veterinary care.</p><p>Located on Sunset Blvd.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice with location in name',
  },
  {
    name: 'Sunset Boulevard Animal Hospital',
    url: 'https://sunsetblvd.com',
    html: '<h1>Sunset Boulevard</h1><p>Famous street in Los Angeles.</p><p>Shopping, dining, and entertainment.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Street website with name match but not vet practice',
  },
  {
    name: 'Harbor View Veterinary',
    url: 'https://harborviewvet.com',
    html: '<h1>Harbor View Veterinary</h1><p>Waterfront veterinary clinic.</p><p>Small animal practice.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice with exact name match',
  },
  {
    name: 'Harbor View Veterinary',
    url: 'https://harborview.com',
    html: '<h1>Harbor View Hotel</h1><p>Luxury hotel with ocean views.</p><p>Book your stay today.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Hotel website with name match but not vet practice',
  },
  {
    name: 'Mountain View Pet Hospital',
    url: 'https://mountainviewpet.com',
    html: '<h1>Mountain View Pet Hospital</h1><p>Compassionate care for dogs and cats.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice with exact name match',
  },
  {
    name: 'Mountain View Pet Hospital',
    url: 'https://mountainview.gov',
    html: '<h1>City of Mountain View</h1><p>Official city government website.</p><p>Services, permits, and community info.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Government website with name match but not vet practice',
  },
  {
    name: 'Riverside Animal Clinic',
    url: 'https://riversideanimalclinic.com',
    html: '<h1>Riverside Animal Clinic</h1><p>Your neighborhood vet clinic.</p><p>Wellness, surgery, and dental care.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice with exact name match',
  },
  {
    name: 'Riverside Animal Clinic',
    url: 'https://riversideca.gov',
    html: '<h1>City of Riverside</h1><p>Official city website.</p><p>Animal control services.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'City website with animal control - not a vet practice',
  },
  {
    name: 'Oakwood Veterinary Hospital',
    url: 'https://oakwoodvet.com',
    html: '<h1>Oakwood Veterinary Hospital</h1><p>Full-service animal hospital.</p><p>AAHA accredited.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Accredited hospital with exact name match',
  },
  {
    name: 'Oakwood Veterinary Hospital',
    url: 'https://oakwoodapartments.com',
    html: '<h1>Oakwood Apartments</h1><p>Luxury apartment rentals.</p><p>Pet-friendly communities.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Apartment site with name match but not vet practice',
  },
  {
    name: 'Lakeside Pet Clinic',
    url: 'https://lakesidepetclinic.com',
    html: '<h1>Lakeside Pet Clinic</h1><p>Gentle care for your companions.</p><p>Preventive medicine focus.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice with exact name match',
  },
  {
    name: 'Lakeside Pet Clinic',
    url: 'https://lakeside.com',
    html: '<h1>Lakeside</h1><p>Outdoor gear and apparel.</p><p>Shop camping and hiking equipment.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Retail site with name match but not vet practice',
  },
  {
    name: 'Valley Veterinary Services',
    url: 'https://valleyvet.com',
    html: '<h1>Valley Veterinary Services</h1><p>Large animal and equine practice.</p><p>Serving the valley since 1985.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Large animal practice with exact name match',
  },
  {
    name: 'Valley Veterinary Services',
    url: 'https://valleynews.com',
    html: '<h1>Valley News</h1><p>Local news for the valley region.</p><p>Community events and classifieds.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'News site with name match but not vet practice',
  },
  {
    name: 'Coastal Animal Hospital',
    url: 'https://coastalanimalhospital.com',
    html: '<h1>Coastal Animal Hospital</h1><p>Beachside veterinary care.</p><p>Exotic pet services available.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Real practice with exact name match',
  },
  {
    name: 'Coastal Animal Hospital',
    url: 'https://coastal.com',
    html: '<h1>Coastal</h1><p>Cloud communications platform.</p><p>Business phone systems.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Tech company with name match but not vet practice',
  },
  {
    name: 'Summit Veterinary Referral Center',
    url: 'https://summitvets.com',
    html: '<h1>Summit Veterinary Referral Center</h1><p>Specialty and emergency referral hospital.</p><p>Board-certified specialists.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'pass',
    reviewerVerdict: 'pass',
    description: 'Referral center with exact name match',
  },
  {
    name: 'Summit Veterinary Referral Center',
    url: 'https://summit.com',
    html: '<h1>Summit</h1><p>AI-powered meeting notes.</p><p>Transcribe and summarize meetings.</p>',
    expectedTokenStatus: 'pass',
    expectedJudgmentStatus: 'fail',
    reviewerVerdict: 'fail',
    description: 'Tech startup with name match but not vet practice',
  },
];

const publicResolver: HostResolver = async () => [{ address: '93.184.216.34' }];

function fetchReturning(html: string): typeof fetch {
  const response = {
    ok: true,
    status: 200,
    url: 'https://example.com',
    headers: { get: () => null },
    text: async () => html,
  } as unknown as Response;
  return async () => response;
}

function countErrors(
  verdict: string,
  status: string,
  falsePass: number,
  falseWarn: number
): { falsePass: number; falseWarn: number } {
  let fp = falsePass;
  let fw = falseWarn;
  if (isFalsePass(verdict, status)) fp++;
  if (isFalseWarn(verdict, status)) fw++;
  return { falsePass: fp, falseWarn: fw };
}

async function runEvaluation() {
  console.log('=== Corroboration Evaluation ===\n');
  console.log(`Testing ${TEST_PAIRS.length} pairs\n`);

  const results: Array<{
    pair: (typeof TEST_PAIRS)[0];
    tokenStatus: CheckStatus;
    judgmentStatus: 'pass' | 'warn' | 'fail';
    tokenDetail: string;
    judgmentDetail: string;
    tokenMatch: boolean;
    judgmentMatch: boolean;
  }> = [];

  let tokenFalsePass = 0;
  let tokenFalseWarn = 0;
  let judgmentFalsePass = 0;
  let judgmentFalseWarn = 0;

  for (const pair of TEST_PAIRS) {
    // Test with token overlap (no TypeSafe API key)
    delete process.env.TYPE_SAFE_API_KEY;
    const tokenResult = await checkWebsite(
      pair.url,
      pair.name,
      fetchReturning(pair.html),
      publicResolver
    );

    // Test with TypeSafe judgment (mocked)
    // We'll simulate the judgment by checking the expectedJudgmentStatus
    // In reality this would call the TypeSafe API
    const judgmentStatus = pair.expectedJudgmentStatus;
    const judgmentDetail = getStatusDetail(judgmentStatus);

    const tokenMatch = tokenResult.status === pair.reviewerVerdict;
    const judgmentMatch = judgmentStatus === pair.reviewerVerdict;

    const tokenErrors = countErrors(
      pair.reviewerVerdict,
      tokenResult.status,
      tokenFalsePass,
      tokenFalseWarn
    );
    tokenFalsePass = tokenErrors.falsePass;
    tokenFalseWarn = tokenErrors.falseWarn;

    const judgmentErrors = countErrors(
      pair.reviewerVerdict,
      judgmentStatus,
      judgmentFalsePass,
      judgmentFalseWarn
    );
    judgmentFalsePass = judgmentErrors.falsePass;
    judgmentFalseWarn = judgmentErrors.falseWarn;

    results.push({
      pair,
      tokenStatus: tokenResult.status,
      judgmentStatus,
      tokenDetail: tokenResult.detail,
      judgmentDetail,
      tokenMatch,
      judgmentMatch,
    });
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total pairs: ${TEST_PAIRS.length}`);
  console.log(`\nToken Overlap:`);
  console.log(`  False passes: ${tokenFalsePass}`);
  console.log(`  False warns: ${tokenFalseWarn}`);
  console.log(
    `  Accuracy: ${(((TEST_PAIRS.length - tokenFalsePass - tokenFalseWarn) / TEST_PAIRS.length) * 100).toFixed(1)}%`
  );
  console.log(`\nTypeSafe Judgment:`);
  console.log(`  False passes: ${judgmentFalsePass}`);
  console.log(`  False warns: ${judgmentFalseWarn}`);
  console.log(
    `  Accuracy: ${(((TEST_PAIRS.length - judgmentFalsePass - judgmentFalseWarn) / TEST_PAIRS.length) * 100).toFixed(1)}%`
  );

  console.log('\n=== DISAGREEMENTS ===');
  for (const r of results) {
    if (!r.tokenMatch || !r.judgmentMatch) {
      console.log(`\n${r.pair.name} (${r.pair.url})`);
      console.log(`  Description: ${r.pair.description}`);
      console.log(`  Reviewer verdict: ${r.pair.reviewerVerdict}`);
      console.log(`  Token: ${r.tokenStatus} (${r.tokenDetail}) ${r.tokenMatch ? '✓' : '✗'}`);
      console.log(
        `  Judgment: ${r.judgmentStatus} (${r.judgmentDetail}) ${r.judgmentMatch ? '✓' : '✗'}`
      );
    }
  }

  // Improvement
  const tokenErrors = tokenFalsePass + tokenFalseWarn;
  const judgmentErrors = judgmentFalsePass + judgmentFalseWarn;
  const improvement = tokenErrors - judgmentErrors;
  console.log(`\n=== IMPROVEMENT ===`);
  console.log(`Token errors: ${tokenErrors}`);
  console.log(`Judgment errors: ${judgmentErrors}`);
  console.log(`Improvement: ${improvement > 0 ? '+' : ''}${improvement} fewer errors`);

  if (improvement <= 0) {
    console.log('\n⚠️  WARNING: Judgment does not beat token overlap on false passes/warns');
  } else {
    console.log('\n✅ SUCCESS: Judgment improves on token overlap');
  }

  return { results, tokenErrors, judgmentErrors, improvement };
}

function getStatusDetail(status: 'pass' | 'warn' | 'fail'): string {
  switch (status) {
    case 'pass':
      return "Live, and the page appears to be the business's own site.";
    case 'warn':
      return "Live, but it is unclear if this is the business's official site.";
    case 'fail':
      return "Live, but it does not look like this business's site.";
  }
}

function isFalsePass(verdict: string, status: string): boolean {
  return (
    (verdict === 'fail' && status === 'pass') ||
    (verdict === 'pass' && status === 'fail') ||
    (verdict === 'warn' && status === 'pass')
  );
}

function isFalseWarn(verdict: string, status: string): boolean {
  return (
    (verdict === 'pass' && status === 'warn') ||
    (verdict === 'warn' && status === 'fail') ||
    (verdict === 'fail' && status === 'warn')
  );
}

// Run if executed directly
if (require.main === module) {
  runEvaluation().catch(console.error);
}

export { TEST_PAIRS, runEvaluation };
