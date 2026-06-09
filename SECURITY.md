# Security Policy

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Report security issues privately to the maintainers. You will receive a response within 48 hours. If the issue is confirmed, a patch will be released as soon as possible.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |

## Security Considerations

- All auth flows are handled by SuperTokens — never bypass `verifySession()` middleware.
- RBAC claims are injected into JWT access tokens; never trust client-side role state alone.
- Destructive actions require step-up authentication (TOTP re-verification).
- Secrets must never be committed — pre-commit hooks block `.env` and credential files.
