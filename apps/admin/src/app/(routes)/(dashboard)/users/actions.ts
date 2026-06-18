'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import supertokens from 'supertokens-node';

import { requireSuperAdmin } from '@/app/config/backend';

export async function deleteUserAction(formData: FormData) {
  await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  await supertokens.deleteUser(userId);
  revalidatePath('/users');
  redirect('/users');
}
