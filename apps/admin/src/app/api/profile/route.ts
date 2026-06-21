import { NextRequest, NextResponse } from 'next/server';
import { withSession } from 'supertokens-node/nextjs';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { ensureSuperTokensInit } from '@/app/config/backend';

ensureSuperTokensInit();

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Cap stored name length to bound metadata size (defense against oversized input).
  const MAX_NAME_LEN = 100;
  const readName = (value: unknown): string =>
    typeof value === 'string' ? value.trim().slice(0, MAX_NAME_LEN) : '';
  const firstName = readName((body as { firstName?: unknown })?.firstName);
  const lastName = readName((body as { lastName?: unknown })?.lastName);

  if (!firstName) {
    return NextResponse.json({ error: 'firstName is required' }, { status: 400 });
  }

  return withSession(request, async (error, session) => {
    if (error) {
      return NextResponse.json({ error: 'Session error' }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.getUserId();
    await UserMetadataNode.updateUserMetadata(userId, {
      firstName,
      lastName,
    });

    return NextResponse.json({ status: 'OK' });
  });
}
