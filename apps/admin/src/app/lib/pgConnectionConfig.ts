import type { ClientConfig } from 'pg';

// Supabase Root 2021 CA: Supabase's published prod-ca-2021.crt, the root the pooler presents.
// SHA-256 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA
export const SUPABASE_ROOT_2021_CA = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----
`;

// node-postgres parses each of these into its own `ssl` value and applies the parsed URL over
// the config object, so any one left in the URL replaces the `ssl` option below.
const URL_SSL_PARAMS = ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'sslnegotiation'];

/**
 * Connection config for a raw `pg` client (Prisma has its own). A Supabase host always gets
 * TLS verified against the pinned Supabase root, whatever TLS parameters the URL carries:
 * node-postgres verifies sslmode=require against the public roots, which Supabase's chain does
 * not lead to. Other hosts (local, CI) keep the URL as given.
 */
export function pgConnectionConfig(databaseUrl: string): ClientConfig {
  // Parsed the way pg-connection-string parses it, so `host` is the host pg will dial.
  let url: URL;
  try {
    url = new URL(databaseUrl, 'postgres://base');
  } catch {
    // Not a URL we can read (a socket form pg rewrites first). pg parses it, and its own
    // error redacts the string, where this TypeError would carry the password in `input`.
    return { connectionString: databaseUrl };
  }
  // A non-empty `host` query parameter wins over the URL's own host in pg.
  const hostParam = url.searchParams.get('host');
  const host = (hostParam?.length ? hostParam : decodeURIComponent(url.hostname)).toLowerCase();
  if (!host.endsWith('.supabase.com') && !host.endsWith('.supabase.co')) {
    return { connectionString: databaseUrl };
  }
  for (const param of URL_SSL_PARAMS) url.searchParams.delete(param);
  return {
    connectionString: url.toString(),
    ssl: { ca: SUPABASE_ROOT_2021_CA, rejectUnauthorized: true, servername: host },
  };
}
