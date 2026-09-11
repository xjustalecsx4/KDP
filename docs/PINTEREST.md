# Pinterest integration

The implementation is ready for local testing with an approved Pinterest app. No app credentials
have been configured and no real API publication has occurred. The automated integration test uses
an isolated PostgreSQL database and intercepts all Pinterest HTTP calls with controlled responses.

## Setup after app approval

1. Set PINTEREST_CLIENT_ID and PINTEREST_CLIENT_SECRET privately on the server.
2. Set APP_ENCRYPTION_KEY to 32 random bytes encoded as 64 hexadecimal characters. Keep it stable
   and back it up securely: changing it prevents existing tokens from being decrypted.
3. Register the exact callback: http://localhost:3000/api/pinterest/callback for local testing,
   or https://YOUR_DOMAIN/api/pinterest/callback for deployment. APP_URL must match the browser origin.
4. Restart the web process. In Admin → Platforms, connect Pinterest and complete OAuth.
5. Select Test connection to verify access and synchronize up to 1,000 boards. No tokens enter the UI.
6. When ready for a reviewed test, set PINTEREST_PUBLISHING_ENABLED=true and restart web and worker.
7. On an approved Pinterest image, select a board, enter the time with an explicit timezone offset,
   and confirm scheduling. A valid Amazon book link and PNG/JPEG output are required.

Trial-created Pins are visible only to their creator. Public publishing requires the appropriate
Pinterest access approval. Approval, OAuth, refresh behavior, and publishing must be validated against
the real account before production use. TikTok remains unavailable.

## Publishing behavior

A schedule stores an immutable snapshot of its board, account, image, title, description and link.
Title and description use Pinterest limits of 100 and 800 characters. Scheduled files have durable
references and cannot be cleaned up. Duplicate schedules for a content item are blocked; existing
failed schedules must be managed rather than replaced. Cancelled schedules may be recreated.

Claims and mutations are serialized across workers. Only one publishing job can be processing.
The local limit is 20 publishing attempts per rolling 24 hours, with a minimum one-minute gap.
Definite HTTP 429 rejections may retry after five minutes within the configured attempt limit.
Ambiguous errors (network loss, server error, invalid successful response, lost worker lease) never
retry automatically. Admin → Scheduler can verify a known Pin ID against its scheduled board, title,
description and link, then mark it published after the administrator confirms the exact image.
If no matching Pin can be verified, the record remains blocked; there is no unsafe reset-to-pending action.

HOLD_OVERDUE retains schedules missed by more than the greater of one minute or polling interval plus
15 seconds. PUBLISH_WHEN_AVAILABLE allows delayed execution. Publishing is sequential with rendering,
so a long render can delay a scheduled post; use the hold policy or dedicate operational capacity.

OAuth state is random, expires after ten minutes, is bound to an authenticated administrator session
and an HttpOnly cookie, and is consumed atomically once. Tokens use AES-256-GCM with context binding.
Refreshes are serialized with account changes. Redirects from API requests are refused and responses
are size/time bounded. Raw API errors, authorization headers and tokens are not logged.

## Sources used for implementation

- https://developer.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/
- https://developer.pinterest.com/docs/key-concepts/access-tiers/
- https://github.com/pinterest/api-description/blob/main/v5/openapi.yaml
