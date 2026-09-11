# Verification

Verified against an isolated PostgreSQL 18.4 instance bound to `127.0.0.1:55439`.
The test database and browser credentials are local, ignored, and are not application seed data.

- Prisma client generation and all four SQL migrations applied successfully to real PostgreSQL.
- TypeScript: passing.
- ESLint: passing without warnings.
- Optimized Next.js production build: passing for all content and administration routes.
- Unit/migration tests: 36 passing (content validation, duplicate detection, job policies, safe errors, storage paths, log disclosure,
  file reference foreign keys, and cleanup tombstones).
- Real PostgreSQL integration tests: 4 passing (concurrent cancellation, critical publishing/reconciliation,
  atomic schedule/job changes, and real filesystem cleanup preserving scheduled-file references).
- Browser: two checked-in tests passing. Admin coverage includes login, unauthenticated redirects,
  all eight Admin subpages, persisted settings, destructive-action confirmation and mobile layout.
  Workflow coverage creates a book, uploads a cover and three interior images, generates drafts,
  renders and approves a Pinterest image, TikTok carousel and actual 1080×1920, 16-second MP4.
- Generated image and extracted video frame inspected visually for layout and safe text placement.
- Dependency audit: zero vulnerabilities after patched transitive overrides.

Run the checked-in browser test against a running, configured **disposable** test application:

```sh
npx playwright install chromium
# Set TEST_BASE_URL, TEST_ADMIN_EMAIL, and TEST_ADMIN_PASSWORD in the environment.
npm run test:e2e
```

The browser test restores the timezone and opens/cancels a cleanup confirmation without deleting files.
To include the full creative workflow, set `TEST_RENDER_WORKFLOW=1`. Start the test application with
`AI_PROVIDER=template`, a valid `REMOTION_BROWSER_EXECUTABLE`, and a separate worker. The workflow
creates persistent test books/content in the disposable database; it does not touch production data.
Never run database integration tests against production. They exercise real cleanup and require isolated storage
and a dedicated migrated database with no running worker.

FFmpeg and a configured Remotion executable are not prerequisites for Admin tests. Their health checks
truthfully show Missing/Error if absent. The creative workflow was tested with local Chromium and
Remotion's native renderer. External AI calls, official platform publishing and Ubuntu deployment
were not exercised; they require user configuration or approval for later integration phases.
