/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { clientIp } from '@/app/lib/clientIp';

function requestWith(headers: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost:3000/api/contact', { method: 'POST', headers });
}

describe('clientIp', () => {
  // The bypass this exists to close. CloudFront appends the viewer address to
  // whatever the caller already sent, so the LEFTMOST entry is attacker-chosen
  // and the rightmost is the one the trusted proxy wrote. Reading the leftmost
  // lets a caller mint a fresh rate-limit bucket per request by rotating the
  // header, which means the limit never engages at all.
  it('takes the entry the proxy appended, not the one the caller supplied', () => {
    const request = requestWith({ 'x-forwarded-for': '203.0.113.9, 198.51.100.7' });
    expect(clientIp(request)).toBe('198.51.100.7');
    expect(clientIp(request)).not.toBe('203.0.113.9');
  });

  it('gives two callers behind one proxy address the same bucket however they spoof', () => {
    // Same real viewer, two different forged prefixes: the bucket key must not
    // change, or the limiter counts them separately and never trips.
    const a = clientIp(requestWith({ 'x-forwarded-for': 'aaa, 198.51.100.7' }));
    const b = clientIp(requestWith({ 'x-forwarded-for': 'bbb, 198.51.100.7' }));
    expect(a).toBe(b);
  });

  it('handles a single entry, which is the no-proxy case', () => {
    expect(clientIp(requestWith({ 'x-forwarded-for': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('handles more than two hops', () => {
    expect(clientIp(requestWith({ 'x-forwarded-for': 'a, b, 198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('ignores surrounding whitespace', () => {
    expect(clientIp(requestWith({ 'x-forwarded-for': 'a ,   198.51.100.7  ' }))).toBe(
      '198.51.100.7'
    );
  });

  it('does not select a trailing empty entry as the address', () => {
    // "1.2.3.4, " would otherwise bucket as the empty string, collapsing
    // unrelated callers together.
    expect(clientIp(requestWith({ 'x-forwarded-for': '198.51.100.7, ' }))).toBe('198.51.100.7');
  });

  it('falls back to x-real-ip when the forwarded list has no usable entry', () => {
    expect(clientIp(requestWith({ 'x-forwarded-for': ' , ', 'x-real-ip': '198.51.100.7' }))).toBe(
      '198.51.100.7'
    );
  });

  it('falls back to x-real-ip when the forwarded header is absent', () => {
    expect(clientIp(requestWith({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('shares one bucket for callers it cannot attribute', () => {
    // Over-limiting is the safe direction; a per-caller "unknown" bucket would
    // be an unlimited allowance.
    expect(clientIp(requestWith({}))).toBe('unknown');
    expect(clientIp(requestWith({ 'x-forwarded-for': '' }))).toBe('unknown');
  });
});
