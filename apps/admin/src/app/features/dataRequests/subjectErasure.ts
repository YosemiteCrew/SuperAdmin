import 'server-only';

import { prisma } from '@superadmin/database';

import { normalizeSubjectEmail } from './subjectData';

/**
 * What an erasure removed, and what it deliberately kept.
 *
 * The retained counts are not padding: an operator has to tell the data subject
 * what still exists and why, and a number they can quote beats an assertion
 * they cannot check. The reasons themselves are prose and live with the view
 * that renders them, not in this payload.
 */
export interface SubjectErasureReport {
  erasedAt: string;
  subjectEmail: string;
  deleted: {
    contactLeads: number;
    contactRequests: number;
  };
  retained: {
    consentSubjects: number;
    consentEvents: number;
    dataRequests: number;
  };
}

/**
 * Carries out a GDPR erasure across the email-keyed side of the register.
 *
 * The mirror of `collectSubjectData`, and deliberately unlike it in one way:
 * that export degrades per section, because a partial answer inside the
 * statutory month beats no answer at all. An erasure must not. A half-applied
 * erasure leaves the panel holding data it has told someone it deleted, so
 * every read and write here runs in one transaction and either all of it lands
 * or none of it does.
 *
 * What it does, and the reason each table gets the treatment it gets:
 *
 * - `ContactLead` is deleted, and `ContactRequest` goes with it through the
 *   schema's `onDelete: Cascade`. This is the marketing record; an erasure
 *   request removes the basis for holding it.
 * - `ConsentSubject` keeps its row but loses `email` and `userId`. Art. 7(1)
 *   requires the controller to be able to demonstrate that consent was
 *   obtained, and `ConsentEvent` — which the schema documents as append-only
 *   precisely so the history stays provable — hangs off `subjectId`, not off
 *   the address. So the identifiers can go without taking the proof with them.
 * - `DataRequest` is kept. It is the evidence that this request was received
 *   and answered inside its month; an erasure that deletes its own paper trail
 *   cannot be shown to have happened.
 *
 * `AuditEvent` is not addressed here at all: since #275 it is append-only by
 * database trigger, so there is nothing to decide.
 */
export async function eraseSubjectData(rawEmail: string): Promise<SubjectErasureReport> {
  const subjectEmail = normalizeSubjectEmail(rawEmail);

  const { deleted, retained } = await prisma.$transaction(async (tx) => {
    // Counted before the delete and before the nulling, because both make the
    // rows unreachable by the address that identified them.
    const contactRequests = await tx.contactRequest.count({
      where: { lead: { email: subjectEmail } },
    });
    const consentSubjectIds = (
      await tx.consentSubject.findMany({ where: { email: subjectEmail }, select: { id: true } })
    ).map((s) => s.id);
    const consentEvents = await tx.consentEvent.count({
      where: { subjectId: { in: consentSubjectIds } },
    });
    const dataRequests = await tx.dataRequest.count({ where: { subjectEmail } });

    const lead = await tx.contactLead.deleteMany({ where: { email: subjectEmail } });
    const consentSubjects = await tx.consentSubject.updateMany({
      where: { id: { in: consentSubjectIds } },
      data: { email: null, userId: null },
    });

    return {
      deleted: { contactLeads: lead.count, contactRequests },
      retained: {
        consentSubjects: consentSubjects.count,
        consentEvents,
        dataRequests,
      },
    };
  });

  return { erasedAt: new Date().toISOString(), subjectEmail, deleted, retained };
}
