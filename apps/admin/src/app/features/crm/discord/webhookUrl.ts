import 'server-only';

/** Accept only Discord's HTTPS webhook endpoint shape, without URL side channels. */
export function isDiscordWebhookUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (
    url.protocol !== 'https:' ||
    !['discord.com', 'discordapp.com'].includes(url.hostname.toLowerCase()) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return false;
  }

  return /^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname);
}
