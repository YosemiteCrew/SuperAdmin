'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import supertokens from 'supertokens-node';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';

export async function deleteUserAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  let targetLabel: string | undefined;
  try {
    const target = await supertokens.getUser(userId);
    targetLabel = target?.emails[0];
  } catch {
    /* labelling is best-effort */
  }

  await supertokens.deleteUser(userId);
  await recordAuditEvent({
    action: 'user.delete',
    actorId,
    targetType: 'user',
    targetId: userId,
    targetLabel,
  });
  revalidatePath('/users');
  redirect('/users');
}
