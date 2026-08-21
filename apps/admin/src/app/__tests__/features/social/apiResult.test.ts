/**
 * @jest-environment node
 */
import { outcomeResponse, upstreamFailure } from '@/app/features/social/apiResult';
import { TikTokApiError } from '@/app/features/social/tiktok';

describe('outcomeResponse', () => {
  it('returns the publish id on success', async () => {
    const response = outcomeResponse({ ok: true, publishId: 'pid', mode: 'draft' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ publishId: 'pid', mode: 'draft' });
  });

  it('maps a missing connection to 409', async () => {
    const response = outcomeResponse({ ok: false, reason: 'not_connected' });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'TikTok is not connected' });
  });

  it('maps a rejected privacy level to 422 and names what is allowed', async () => {
    const response = outcomeResponse({
      ok: false,
      reason: 'privacy_rejected',
      allowed: ['SELF_ONLY'],
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ allowed: ['SELF_ONLY'] });
  });
});

describe('upstreamFailure', () => {
  it('passes a TikTok error code through as a 502', async () => {
    const error = new TikTokApiError(
      'unaudited_client_can_only_post_to_private_accounts',
      'app not audited'
    );
    const response = upstreamFailure(error);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'app not audited',
      code: 'unaudited_client_can_only_post_to_private_accounts',
    });
  });

  it('does not leak the message of an unexpected error', async () => {
    const response = upstreamFailure(new Error('connect ECONNREFUSED 10.0.0.5:443'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Publishing failed' });
  });

  it('handles a thrown non-Error', async () => {
    expect(upstreamFailure('oops').status).toBe(500);
  });
});
