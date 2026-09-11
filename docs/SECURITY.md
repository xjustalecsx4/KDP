# Security controls and operational scope

All private pages, file reads and server actions check an authoritative administrator record and
an active database session. Public signup is disabled. Login is rate limited. Secrets and test tooling
are ignored by Git, excluded from build tracing and never served under public/.

The request proxy rejects state-changing requests without an exact APP_URL Origin match. A fresh
nonce-based Content Security Policy restricts scripts; framing, plugins and base URL overrides are
blocked. Pages render dynamically so nonces are never shared by static HTML. Development alone allows
unsafe-eval. Inline styles remain allowed for existing React styling; scripts do not use unsafe-inline.
Responses disable caching, hide X-Powered-By, suppress referrers and use HSTS for configured HTTPS origins.
Next development request logging is disabled to avoid logging OAuth callback query strings.
OAuth credentials are encrypted at rest, state is session-bound and one-use, API redirects are blocked.

The administrator's requested local account change was applied to the local workspace database and
all previous sessions were invalidated. No password is included in repository files. Future offline
maintenance can use npm run admin:update with NEW_ADMIN_EMAIL, NEW_ADMIN_PASSWORD and NEW_ADMIN_NAME
provided through the process environment. The maintenance script requires exactly one administrator,
uses the authentication provider's password hasher, and revokes every existing session transactionally.
The regular UI and maintenance script retain a 12-character minimum for future password changes.

## Before exposing the application beyond localhost

The current preview uses a disposable embedded PostgreSQL instance with loopback-only trust auth.
It must not be exposed or reused as a production installation. Set up a dedicated PostgreSQL account
with password authentication, private storage permissions, fresh authentication/encryption keys,
HTTPS and an accurately configured APP_URL. The localhost preview is not a production security audit.

Terminate TLS at a reverse proxy and overwrite forwarded client IP headers (see README's Nginx
example). Avoid logging query strings for OAuth callback routes at the reverse proxy too. Restrict
filesystem access to the application account. Anyone with local OS access to its secrets or database
can bypass application-level isolation. Keep dependencies updated and validate backups/restoration.

No third-party security penetration test, external AI provider test, live Pinterest approval test or
production deployment has been performed. Public indexing remains disabled during preview.
