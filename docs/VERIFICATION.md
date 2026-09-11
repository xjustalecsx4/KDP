# Verification

KDP addition: fifth migration applied to local PostgreSQL and migration tests. Production build,
TypeScript and lint pass. 53 unit/migration tests pass; browser coverage adds private persistence,
explicit publication, public download link rendering and withdrawal. The KDP browser test passes, including deletion of its test record; the four existing non-rendering browser tests also pass. Test resources are removed afterward.

Latest SEO verification: production build, TypeScript and ESLint pass; 50 unit/migration tests pass (five opt-in PostgreSQL tests not rerun for this SEO-only change). Four production browser tests pass: Admin, bilingual bookstore, security and SEO. The optional render workflow was not rerun; its prior result is below. A second loopback-only instance verified launch mode: public index/follow, ten canonical sitemap entries, and private noindex. It was stopped after verification.

Prior Pinterest milestone: 50 unit/integration tests and all four then-existing browser tests passed.

Tested with an isolated PostgreSQL 18.4 instance on loopback. Test records and credentials are ignored
and are not production seed data. No real Pinterest calls are made by automated tests.

- 50 unit/migration/transport/SEO tests pass without external PostgreSQL.
- Five PostgreSQL integration tests pass (55 total with the current unit tests when enabled). Coverage includes concurrent
  queue changes, protected file cleanup, one-use session-bound OAuth, encrypted token storage,
  duplicate schedule rejection, publication completion, blocked critical cancellation, uncertain
  outcomes and verification of matching/mismatched Pins during reconciliation.
- Admin browser coverage validates login with the updated account, private guards, navigation,
  persisted settings, confirmation prompts and mobile layout.
- Public bookshop browser coverage validates EN/RO URL switching, journal pages,
  mobile layout, unknown article 404 and private dashboard protection.
- Security browser coverage validates CSP, unique nonces, origin rejection and unauthenticated callback.
- Rendering workflow covers book creation, cover/interior uploads, image/carousel/video generation,
  private previews and approval, including a 16-second 1080×1920 MP4.

Run npm test, npm run lint, npm run typecheck and npm run build.
For real database tests, set TEST_DATABASE_URL to a dedicated migrated test database with no connected
Pinterest account, isolated storage and no active publishing worker. Tests temporarily change operational
settings and platform fixtures and restore them. Never run them against production.

For browser tests, install Chromium with npx playwright install chromium, start a disposable configured
application and provide TEST_BASE_URL, TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD through the environment.
Run npm run test:e2e. To include rendering, set TEST_RENDER_WORKFLOW=1 and run the worker with a configured
Remotion browser and AI_PROVIDER=template. This workflow leaves its marked content in the disposable DB.

External AI calls, live Pinterest API behavior and Ubuntu deployment require separate verification.
