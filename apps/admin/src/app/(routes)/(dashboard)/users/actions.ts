'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import supertokens from 'supertokens-node';

import { ensureSuperTokensInit } from '@/app/config/backend';

export async function deleteUserAction(formData: FormData) {
  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  ensureSuperTokensInit();
  await supertokens.deleteUser(userId);
  revalidatePath('/users');
  redirect('/users');
}
