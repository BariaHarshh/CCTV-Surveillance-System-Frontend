# Security

- Password hashing (bcrypt)
- MFA (TOTP + recovery codes)
- Session revoke / absolute idle policies
- Rate limiting on auth endpoints
- Org isolation on every API
- API keys stored hashed
- Webhook HMAC signatures
- Evidence cryptographic hashes
- Append-only audit logs
- Encrypted camera credentials
- CSP + secure headers in middleware
- Secrets via SecretManager / env — never in source

## Checklist before production

HTTPS, secure cookies, MFA available, RBAC, rate limits, CSRF posture, XSS/CSP, file validation, backups tested, monitoring, webhook/payment signature verification.
