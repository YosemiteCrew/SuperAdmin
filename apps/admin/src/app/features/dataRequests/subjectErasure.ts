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
  /** Rows kept as proof, counted after their subject-identifying fields were removed. */
  retained: {
    consentSubjects: number;
    consentEvents: number;
    dataRequests: number;
  };
}

/**
 * What a tombstoned subject key reads as. Not an address, and deliberately not a
 * hash: a hash is a pseudonym and still links the row back to anyone who can
 * reproduce it. The brackets make collision with a real address impossible.
 */
export const ERASED_SUBJECT = '[erased]';

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
 * - `ConsentSubject` keeps its row and loses every identifier on it. Art. 7(1)
 *   requires the controller to be able to demonstrate that consent was
 *   obtained, and `ConsentEvent` — which the schema documents as append-only
 *   precisely so the history stays provable — hangs off `subjectId`, not off
 *   any identifier. What Art. 7(1) needs is the category, the grant or
 *   withdrawal, the source, the policy version and the time. It does not need
 *   `email`, `userId`, the device key in `consentId`, or the `userAgent` on
 *   each event, so all four go and the proof is untouched.
 * - `DataRequest` keeps its row and loses its subject-identifying fields.
 *   Art. 17(3)(e) covers what is necessary for legal claims, and Art. 5(1)(c)
 *   and (e) still require minimisation and storage limitation — so the type,
 *   the status and the dates stay as the proof that a request of that kind was
 *   answered inside its month, while `subjectEmail` and the controller's
 *   free-text `notes` about the person do not.
 *
 * The cost of that last one is real and worth stating: after an erasure the
 * panel can no longer show WHOSE request a given row was. That is the trade
 * Art. 5(1)(c) asks for — the row proves a request was handled in time, and it
 * stops being a durable record of the person who made it.
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
      where: { lead: { email: { equals: subjectEmail } } },
    });
    const consentSubjectIds = (
      await tx.consentSubject.findMany({
        where: { email: { equals: subjectEmail } },
        select: { id: true },
      })
    ).map((s) => s.id);
    const consentEvents = await tx.consentEvent.count({
      where: { subjectId: { in: consentSubjectIds } },
    });
    const dataRequests = await tx.dataRequest.count({
      where: { subjectEmail: { equals: subjectEmail } },
    });

    const lead = await tx.contactLead.deleteMany({ where: { email: { equals: subjectEmail } } });

    // The event history stays; the fingerprint on each event does not. A
    // `userAgent` is not part of what Art. 7(1) asks the controller to show.
    await tx.consentEvent.updateMany({
      where: { subjectId: { in: consentSubjectIds } },
      data: { userAgent: null },
    });

    // `consentId` is the device key from the cookie banner and it is `@unique`
    // and non-nullable, so it is tombstoned per row rather than nulled. The row
    // id is already opaque and unique, which is what makes the replacement
    // collision-free without deriving anything from the value being erased.
    // ponytail: one statement per subject; a subject has a handful of these, and
    // `updateMany` cannot write a distinct value per row.
    for (const id of consentSubjectIds) {
      await tx.consentSubject.update({
        where: { id },
        data: { email: null, userId: null, consentId: `${ERASED_SUBJECT}:${id}` },
      });
    }

    // The row is the proof a request of this type was answered in time. The
    // address and the controller's free-text notes about the person are not
    // part of that proof, and the audit event points at the row id rather than
    // at either of them.
    await tx.dataRequest.updateMany({
      where: { subjectEmail: { equals: subjectEmail } },
      data: { subjectEmail: ERASED_SUBJECT, notes: null },
    });

    return {
      deleted: { contactLeads: lead.count, contactRequests },
      retained: {
        consentSubjects: consentSubjectIds.length,
        consentEvents,
        dataRequests,
      },
    };
  });

  return { erasedAt: new Date().toISOString(), subjectEmail, deleted, retained };
}
