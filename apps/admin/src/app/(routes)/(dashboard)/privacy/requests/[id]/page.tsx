import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireSuperAdmin } from '@/app/config/backend';
import { getDataRequest } from '@/app/features/dataRequests/store';
import {
  collectSubjectData,
  type SubjectConsentRecord,
  type SubjectDataExport,
  type SubjectDataRequest,
  type SubjectLead,
} from '@/app/features/dataRequests/subjectData';
import { isSectionError } from '@/app/lib/exportSection';

import { ExportSubjectDataButton } from './ExportSubjectDataButton';

export const metadata: Metadata = {
  title: 'Subject record',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function Section({
  title,
  count,
  children,
}: Readonly<{ title: string; count?: number; children: React.ReactNode }>) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <header className="flex items-baseline gap-2 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {count !== undefined && <span className="text-xs text-gray-500">{count}</span>}
      </header>
      <div className="px-4 py-3 text-sm text-gray-700">{children}</div>
    </section>
  );
}

function SectionError() {
  return (
    <p className="text-sm text-red-700">
      This section could not be read. The rest of the record below is still complete — re-run the
      export before answering, so nothing held is left out of the reply.
    </p>
  );
}

function Empty({ what }: Readonly<{ what: string }>) {
  return <p className="text-sm text-gray-500">Nothing held: {what}.</p>;
}

function Field({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}

function LeadSection({ lead }: Readonly<{ lead: SubjectLead }>) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Name" value={lead.name} />
        <Field label="Company" value={lead.company} />
        <Field label="Phone" value={lead.phone} />
        <Field label="First seen" value={formatDate(lead.createdAt)} />
        <Field
          label="Newsletter"
          value={lead.newsletterConsent ? 'Subscribed' : 'Not subscribed'}
        />
        <Field label="Consent captured" value={lead.consentAt && formatDate(lead.consentAt)} />
        <Field label="Consent source" value={lead.consentSource} />
      </dl>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Contact submissions ({lead.requests.length})
        </h3>
        {lead.requests.length === 0 ? (
          <Empty what="no contact-form submissions from this address" />
        ) : (
          <ul className="space-y-3">
            {lead.requests.map((r) => (
              <li key={r.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">
                  {formatDate(r.createdAt)} · {r.status}
                  {r.sourceUrl ? ` · ${r.sourceUrl}` : ''}
                </p>
                {r.subject && <p className="text-sm font-medium text-gray-900">{r.subject}</p>}
                <p className="whitespace-pre-wrap text-sm text-gray-700">{r.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConsentSection({ records }: Readonly<{ records: SubjectConsentRecord[] }>) {
  return (
    <ul className="space-y-4">
      {records.map((s) => (
        <li key={s.id}>
          <p className="text-xs text-gray-500">
            Consent id {s.consentId} · first seen {formatDate(s.createdAt)}
            {s.userId ? ` · linked account ${s.userId}` : ''}
          </p>
          <ul className="mt-1 space-y-1">
            {s.events.map((e, i) => (
              <li key={`${s.id}-${i}`} className="text-sm text-gray-700">
                {formatDate(e.at)} · {e.category} ·{' '}
                <span className={e.granted ? 'text-emerald-700' : 'text-red-700'}>
                  {e.granted ? 'granted' : 'withdrawn'}
                </span>{' '}
                · {e.source}
                {e.policyVersion ? ` · policy ${e.policyVersion}` : ''}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function RequestsSection({
  requests,
  currentId,
}: Readonly<{ requests: SubjectDataRequest[]; currentId: string }>) {
  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li key={r.id} className="text-sm text-gray-700">
          {formatDate(r.receivedAt)} · {r.type} · {r.status} · due {formatDate(r.dueAt)}
          {r.id === currentId && <span className="ml-2 text-xs text-gray-500">(this request)</span>}
          {r.notes && <p className="text-xs text-gray-500">{r.notes}</p>}
        </li>
      ))}
    </ul>
  );
}

function LeadBody({ lead }: Readonly<{ lead: SubjectDataExport['lead'] }>) {
  if (isSectionError(lead)) return <SectionError />;
  if (lead === null) return <Empty what="this address is not a marketing lead" />;
  return <LeadSection lead={lead} />;
}

function ConsentBody({ consent }: Readonly<{ consent: SubjectDataExport['consent'] }>) {
  if (isSectionError(consent)) return <SectionError />;
  if (consent.length === 0) {
    return <Empty what="no consent decisions are linked to this address" />;
  }
  return <ConsentSection records={consent} />;
}

function RequestsBody({
  requests,
  currentId,
}: Readonly<{ requests: SubjectDataExport['dataRequests']; currentId: string }>) {
  if (isSectionError(requests)) return <SectionError />;
  return <RequestsSection requests={requests} currentId={currentId} />;
}

/**
 * Everything the panel holds about the subject of one data request, so an
 * operator can answer it without opening a database console against the
 * compliance register.
 */
export default async function SubjectRecordPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireSuperAdmin();

  const { id } = await params;
  const request = await getDataRequest(id);
  if (!request) notFound();

  const data = await collectSubjectData(request.subjectEmail);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/privacy/requests" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to data requests
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{data.subjectEmail}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Everything this panel holds about the address, for the {request.type} request received{' '}
            {formatDate(request.receivedAt.toISOString())}. Data held elsewhere in the platform is
            not covered here.
          </p>
        </div>
        <ExportSubjectDataButton requestId={request.id} />
      </header>

      <Section title="Marketing lead and contact submissions">
        <LeadBody lead={data.lead} />
      </Section>

      <Section
        title="Consent ledger"
        count={isSectionError(data.consent) ? undefined : data.consent.length}
      >
        <ConsentBody consent={data.consent} />
      </Section>

      <Section
        title="Rights requests from this address"
        count={isSectionError(data.dataRequests) ? undefined : data.dataRequests.length}
      >
        <RequestsBody requests={data.dataRequests} currentId={request.id} />
      </Section>
    </div>
  );
}
