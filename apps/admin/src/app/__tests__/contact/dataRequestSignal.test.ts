import { detectDataRequestSignal } from '@/app/features/contact/dataRequestSignal';

/** The kinds reported for a message, most-matched first. */
function types(message: string, subject?: string): string[] {
  return detectDataRequestSignal({ subject, message }).map((s) => s.type);
}

describe('detectDataRequestSignal - access', () => {
  it.each([
    ['formal name', 'This is a subject access request under GDPR.'],
    ['data subject access request', 'Please treat this as a data subject access request.'],
    ['acronym', 'Raising a DSAR for my records.'],
    ['named right', 'I am exercising my right of access.'],
    ['right to access', 'I want to use my right to access.'],
    ['copy of my data', 'Could I get a copy of my data please?'],
    ['export of all of my records', 'I would like an export of all of my records.'],
    ['send me a copy of my data', 'Please send me a copy of my data.'],
    ['send me my data', 'Send me my data.'],
    ['what personal data do you have', 'What personal data do you have?'],
    ['what data do you have about me', 'What data do you have about me?'],
    ['what information do you hold on me', 'What information do you hold on me?'],
    ['the data you hold about me', 'I want to see the data you hold about me.'],
    ['plain wording', 'What do you know about me?'],
    ['access to my data', 'Can I have access to my data?'],
  ])('flags access: %s', (_label, message) => {
    expect(types(message)).toContain('access');
  });
});

describe('detectDataRequestSignal - erasure', () => {
  it.each([
    ['named right', 'I am invoking the right to be forgotten.'],
    ['erasure request', 'This is an erasure request.'],
    ['right to erasure', 'I am using my right to erasure.'],
    ['delete my account', 'Please delete my account.'],
    ['close my account', 'I want to close my account for good.'],
    ['deactivate my profile', 'Deactivate my profile please.'],
    ['erase everything you hold', 'Erase everything you hold on me.'],
    ['delete all the data', 'Delete all the data you have.'],
    ['forget me', 'Just forget me.'],
    ['remove me from your database', 'Remove me from your database.'],
    ['my data deleted', 'I want my data deleted.'],
    ['my account to be removed', 'I need my account to be removed.'],
  ])('flags erasure: %s', (_label, message) => {
    expect(types(message)).toContain('erasure');
  });
});

describe('detectDataRequestSignal - rectification', () => {
  it.each([
    ['named right', 'I am exercising my right to rectification.'],
    ['rectification request', 'Please log this rectification request.'],
    ['correct my details', 'Please correct my details.'],
    ['update my information', 'You need to update my information.'],
    ['amend my records', 'Amend my records please.'],
    ['my details are wrong', 'My details are wrong on your system.'],
    ['my data is out of date', 'My data is out of date.'],
    ['wrong address for me', 'You have the wrong address for me.'],
  ])('flags rectification: %s', (_label, message) => {
    expect(types(message)).toContain('rectification');
  });
});

describe('detectDataRequestSignal - objection', () => {
  it.each([
    ['named right', 'I am using my right to object.'],
    ['stop processing my data', 'Stop processing my data.'],
    ['stop selling my information', 'Stop selling my information to anyone.'],
    ['object to the processing', 'I object to the processing of these records.'],
    ['object to my data being', 'I object to my data being used this way.'],
    ['opt me out', 'Please opt me out.'],
    ['opt-out of marketing', 'I want to opt-out of marketing.'],
    ['opt out of processing', 'I want to opt out of processing.'],
    ['withdraw my consent', 'I withdraw my consent.'],
    ['revoke our consent', 'We revoke our consent.'],
    ['stop contacting me', 'Stop contacting me.'],
    ['do not email me', 'Do not email me again.'],
    ['apostrophe form', "Don't call me any more."],
    ['stop sending me emails', 'Stop sending me emails.'],
    ['unsubscribe me from your mailing list', 'Unsubscribe me from your mailing list.'],
  ])('flags objection: %s', (_label, message) => {
    expect(types(message)).toContain('objection');
  });
});

describe('detectDataRequestSignal - negatives', () => {
  it.each([
    ['ordinary support question', 'I cannot log in to my account since yesterday, can you help?'],
    ['support question about a bill', 'The invoice for March looks wrong, who do I speak to?'],
    ['sales enquiry', 'We would like a demo for our two-vet clinic and your pricing sheet.'],
    [
      'sales enquiry mentioning data',
      'Does your platform import data from our existing practice management system?',
    ],
    ['bare word data', 'Great data on your blog post about vaccination reminders.'],
    ['bare word delete', 'The delete button on the invoice screen does nothing.'],
    ['someone else', 'Can you delete the duplicate appointment my colleague created?'],
    ['partnership', 'We hold data on 200 clinics and would like to talk about a partnership.'],
    ['careers', 'I am a vet nurse and would like to know about open roles.'],
    ['praise', 'Just wanted to say the new dashboard is excellent.'],
    ['empty message', ''],
  ])('does not flag: %s', (_label, message) => {
    expect(detectDataRequestSignal({ message })).toEqual([]);
  });

  it('ignores a missing subject and message entirely', () => {
    expect(detectDataRequestSignal({})).toEqual([]);
    expect(detectDataRequestSignal({ subject: null, message: null })).toEqual([]);
  });
});

describe('detectDataRequestSignal - reading', () => {
  it('reads the subject as well as the message', () => {
    expect(types('Sent from the contact form.', 'Please delete my account')).toEqual(['erasure']);
  });

  it('never assembles a phrase across the subject/message boundary', () => {
    expect(detectDataRequestSignal({ subject: 'Please delete', message: 'my account' })).toEqual(
      []
    );
  });

  it('returns the matched phrase as its own evidence', () => {
    expect(detectDataRequestSignal({ message: 'Hi, please DELETE MY ACCOUNT today.' })).toEqual([
      { type: 'erasure', phrases: ['delete my account'] },
    ]);
  });

  it('collapses line breaks and repeated spaces before matching', () => {
    expect(types('Please\n  delete   my\naccount.')).toEqual(['erasure']);
  });

  it('reads a curly apostrophe the same as a straight one', () => {
    expect(types('Don’t email me again.')).toEqual(['objection']);
  });

  it('sorts the strongest reading first and keeps the others', () => {
    const signals = detectDataRequestSignal({
      message: 'Delete my account, erase everything you hold, and forget me. Also send me my data.',
    });
    expect(signals.map((s) => s.type)).toEqual(['erasure', 'access']);
    expect(signals[0].phrases).toEqual(['delete my account', 'erase everything', 'forget me']);
    expect(signals[1].phrases).toEqual(['send me my data']);
  });

  it('keeps PATTERNS order when two readings match equally', () => {
    expect(types('Send me a copy of my data and then delete my account.')).toEqual([
      'access',
      'erasure',
    ]);
  });

  it('records a repeated phrase once', () => {
    const [signal] = detectDataRequestSignal({
      subject: 'Delete my account',
      message: 'Delete my account. I mean it: delete my account.',
    });
    expect(signal.phrases).toEqual(['delete my account']);
  });

  it('stops reading past the scan bound', () => {
    expect(types(`${'a'.repeat(6000)} please delete my account`)).toEqual([]);
  });
});
