# KDP Content Automation

Private content creation and administration application for KDP books. Built with Next.js App Router,
TypeScript, PostgreSQL, Prisma, Better Auth, Tailwind, and a separate PostgreSQL-backed worker.
No Docker or Redis is used.

## Current implementation

Phase 1 and the dedicated administration console are implemented:

- Book library, metadata editing, private validated cover/interior uploads and thumbnails.
- Editable draft concepts using an explicitly labeled offline template provider or a configured
  OpenAI-compatible API. Real external AI calls require your own provider configuration.
- Pinterest images, four-to-seven-slide TikTok carousels, and real 16-second 1080×1920 Remotion MP4s.
- Five creative templates with configurable colors, a PostgreSQL render queue, private previews,
  downloads, manual approval/rejection, duplicate checks and bounded render retries.
- Admin overview, jobs, scheduler, platforms, storage, logs, health, operational settings and account controls.
- Real database/storage metrics, worker heartbeats, guarded administrative mutations, confirmations,
  reference-safe cleanup, fixed-message logs, database sessions and disabled public signup.
- Main navigation: Dashboard, Books, Create Content, Content Queue, Calendar, Templates,
  Analytics, Admin, Settings.

Pinterest OAuth, board synchronization and scheduled image publishing are implemented, with encrypted
credentials and conservative duplicate protection. Live connection awaits your Pinterest app approval
and credentials. Publishing is disabled by default. TikTok integration remains unavailable. Calendar and analytics show only stored
records, never fabricated activity. Approval does not publish. Audio and autopilot are off.

## Prerequisites

- Node.js **24 LTS** and its bundled npm. Dependencies are locked; run `npm ci` for reproducible installation.
- PostgreSQL 16 or newer, running locally and listening only on loopback/private interfaces.
- FFmpeg for renderer readiness checks and video workflows.
- A Chrome/Chromium executable for the Remotion browser probe.
- Git. Work branch: `feature/kdp-content-automation`.

On Ubuntu, install PostgreSQL, FFmpeg and Nginx from the supported distribution repositories.
Install a current Node 24 LTS release and PM2. On Windows, install PostgreSQL and FFmpeg normally;
add their executable directories to PATH. Verify `node --version`, `npm --version`, `psql --version`,
and `ffmpeg -version` in a new terminal. No container runtime is needed.

## Local setup

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Create a database and a dedicated database owner. For example, in `psql` as the PostgreSQL administrator:

   ```sql
   CREATE ROLE kdp LOGIN;
   \password kdp
   CREATE DATABASE kdp OWNER kdp;
   ```

3. Copy `.env.example` to `.env.local`. Set at least `DATABASE_URL`, `APP_URL`, `AUTH_SECRET`, and
   `STORAGE_PATH`. Generate `AUTH_SECRET` using a password manager or `openssl rand -base64 48`.
   Never reuse example credentials. URL-encode special characters in database credentials.

4. Generate the client and apply all five migrations:

   ```sh
   npm run db:generate
   npm run db:migrate
   ```

5. Bootstrap the one administrator. Supply `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12–128 characters),
   and optional `ADMIN_NAME` through your terminal environment, then run:

   ```sh
   npm run admin:create
   ```

   The script uses Better Auth's password hasher, refuses to run if a user already exists, and initializes
   the four storage directories. Remove `ADMIN_PASSWORD` from the environment afterwards. Do not put
   passwords in command arguments, shell history, Git, or the public UI. On PowerShell, use
   `Read-Host -AsSecureString` and convert only into the current process environment when running bootstrap.

6. Start two terminals:

   ```sh
   npm run dev
   npm run worker
   ```

7. Open [the local Admin console](http://localhost:3000/admin) and sign in.

`.env.local` is read by Next.js, the Prisma config, bootstrap and the worker. A missing database is an error,
not an empty database. Login reports setup requirements when the essential environment values are absent.

## First content workflow

### Public bookshop preview

Open `/` for **The Quiet Bookshelf** (redirects to `/en`). Public pages use crawlable
English `/en` and Romanian `/ro` URLs, with journals at `/en/blog` and `/ro/blog`,
and three original bilingual articles. The private dashboard is now at `/dashboard`;
administration remains at `/admin`. Public pages expose only KDP resources explicitly published by the administrator; private book fields
and uploads remain protected. The collection is explicitly marked as coming soon until real titles
and Amazon links are supplied. Journal content currently lives in `src/lib/journal.ts`,
with English copy in `src/lib/bookstore-translations.ts`; there is no blog editor yet.
See [SEO implementation and launch plan](docs/SEO.md) for canonical URLs, indexing controls and the editorial plan.
Search indexing remains disabled while the installation is a local preview.

The GitHub remote is `https://github.com/xjustalecsx4/KDP`. The current application has been
published to `main` and `feature/kdp-content-automation`.

### Creating a private content item

Add a book, upload a cover and at least three interior pages, then open Create Content.
Choose a format, select source images, and generate an editable concept. Submit the render,
wait for the worker, inspect the private preview, and approve or reject it. Download approved
files for manual use. Video rendering requires the configured browser executable; check Admin → Health.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Private PostgreSQL connection string |
| `APP_URL` | Exact browser origin; HTTPS in production |
| `AUTH_SECRET` | Strong random authentication signing secret |
| `STORAGE_PATH` | Private local storage root; absolute path recommended |
| `FFMPEG_PATH` | FFmpeg executable path or `ffmpeg` on PATH |
| `REMOTION_BROWSER_EXECUTABLE` | Installed Chrome/Chromium executable; health probes never download it |
| `HEALTHCHECK_TOKEN` | Optional strong random token for detailed monitoring |
| `APP_VERSION`, `GIT_COMMIT` | Optional version metadata |
| `APP_ENCRYPTION_KEY` | 64 hexadecimal characters / 32 random bytes for AES-256-GCM token encryption |
| `AI_PROVIDER` | `template` for offline editable copy, or `openai-compatible` |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | HTTPS API base URL, private API key, and model for the configured provider |
| `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET` | Approved Pinterest app credentials, server-side only |
| `PINTEREST_PUBLISHING_ENABLED` | Default `false`; explicitly enable after reviewed setup |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | Reserved for Phase 3 |

Operational defaults: worker polling 5 seconds; render maximum attempts 3; publish maximum attempts 2;
temporary/unreferenced retention 24 hours; failed-job retention 30 days; timezone UTC; overdue posts held.
Attempt limits include the first attempt. Retention does not silently delete data: the administrator invokes
cleanup or clears expired failed jobs with confirmation. The worker reads settings each cycle. Render retry limits apply when new jobs are queued; publishing policy remains reserved for Phase 2. Autopilot is off.

## Data model and safety

Core entities: User, Session, Account, Verification, RateLimit, Book, BookAsset, StoredFile, FileReference,
ContentItem, ContentVariant, CreativeTemplate, RenderJob, ScheduledPost, PublishAttempt, PlatformAccount,
AnalyticsSnapshot, AppSetting, WorkerHeartbeat, SystemEvent.

`RenderJob` is the shared queue table for render, publish, and analytics job types. Queue and schedule
mutations use a short PostgreSQL advisory transaction lock. Worker claims also use `FOR UPDATE SKIP LOCKED`.
Running jobs cannot be cancelled. Lost publishing leases become failed jobs requiring reconciliation.
Rescheduling cannot bypass exhausted retries. A linked publishing job is managed through its schedule.

Every durable file use **must** create a `FileReference` to a book asset, content item, job, or scheduled post.
The migration enforces exactly one real owner and prevents references to files already marked `DELETING`.
Cleanup first locks/checks the file row and marks it `DELETING`, then removes the file and finally its database
record. Failed deletions retain a tombstone for retry. Cleanup processes at most 250 files per request.
Book originals, untracked files, symlinks, junctions, and paths outside the root are never cleanup targets.
Do not permit untrusted local users to mutate the storage directory while the application runs.

Logs use a fixed event catalog. Raw exception messages, request bodies, headers, and arbitrary metadata
are not recorded. UI reads withhold unrecognized messages. Platform metadata is selected without tokens.
The account UI never receives session tokens or credential records.

## Tests and build

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Unit and PGlite migration tests run without an external database. Optional real PostgreSQL integration tests
require `TEST_DATABASE_URL` pointing to a **dedicated, migrated test database**. They create/delete marked
test records and test storage files. Never use a production database: cleanup intentionally exercises real
administrative services. Run those tests without a worker processing the test queue.

```sh
# Set TEST_DATABASE_URL in your environment, then:
npm test
```

The checked-in Admin and complete rendering workflow browser tests are documented in `docs/VERIFICATION.md`.

## Health monitoring

`GET /api/health` returns `{ "status": "healthy" }` or `{ "status": "error" }`, with HTTP 200 or 503.
All required dependencies must pass, including FFmpeg and Remotion. Health may correctly return 503 for
an installation with missing rendering dependencies. The endpoint does not require
a browser session and does not expose operational details without the optional bearer token:

```text
Authorization: Bearer <HEALTHCHECK_TOKEN>
```

The detailed response reports web, database, worker, FFmpeg, renderer, storage, version, and check time.
Probes are cached for 30 seconds. A live worker heartbeat is at most 45 seconds old. The heartbeat is
independent of the polling interval. The scheduler is active only when Pinterest server configuration is complete and publishing is explicitly enabled.

## Ubuntu VPS deployment

The following scripts support deployment after you configure and review the installation.
Nothing has been deployed automatically.

Use an unprivileged application account. Clone the feature branch into a directory it owns. Set `.env.local`
with `APP_URL=https://your-private-domain.example`, restrict file permissions to the application account,
and use an absolute private storage path. Keep PostgreSQL off the public Internet. Configure HTTPS via Nginx.
Never expose `storage/` with an Nginx alias or place it under `public/`.

```sh
npm ci
npm run db:migrate
npm run build
pm2 start ecosystem.config.cjs
pm2 save
# Follow PM2's displayed startup command for the application account:
pm2 startup
```

The PM2 configuration uses `.cjs` because the project is ESM. Both processes have bounded crash restart
behavior and graceful shutdown time. Future updates: run `bash scripts/deploy.sh`. It refuses a dirty worktree,
pulls fast-forward only, installs from the npm lockfile, applies migrations, builds, and reloads the processes.
Back up before migration; database rollback is not automatic. Do not configure deployment as an unattended
automation until migration and rendering rollout procedures are accepted.

Example Nginx location inside an HTTPS server block:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_buffering off;
    client_max_body_size 11m;
}
```

Terminate TLS at Nginx and redirect HTTP to HTTPS. Preserve the public Host/Origin for CSRF protection.

## Backups

For a consistent file/database pair, stop web and worker writes while taking the backup. Export `DATABASE_URL`,
absolute `STORAGE_PATH`, and a protected `BACKUP_DIR` outside the repository, then run `bash scripts/backup.sh`.
The script creates a custom-format `pg_dump` and a compressed storage archive with restrictive permissions.
Restart the application afterwards. Encrypt backups, copy them off-server, define retention, and test restoration
into a separate database and storage directory. Preserve authentication/encryption keys in a secure backup too.
Restore using `pg_restore` into an empty database and extract storage with the same ownership and permissions.

## Remaining milestones

1. Phase 1 complete: book CRUD, private uploads, provider abstraction, review queue, Sharp creatives,
   carousel preparation, Remotion rendering and previews. External AI provider behavior needs your credentials to verify.
2. Pinterest code implemented: OAuth/encrypted tokens, boards, image publishing, reconciliation,
   posting limits, duplicate prevention, scheduler execution and publish history. Live API testing remains pending.
3. After explicit approval: TikTok official API workflow and manual export fallback.
4. Later: analytics snapshots and performance-informed generation.

Phase 2 Pinterest implementation was explicitly approved. Live Pinterest verification is pending app approval and credentials; Phase 3 remains unimplemented.

## Pinterest and security

See [Pinterest setup and verification](docs/PINTEREST.md) and [security controls](docs/SECURITY.md).

## KDP descriptions and downloads

Open Books, select a book, then choose its KDP tab. Add a description and HTTPS download URL.
Save to keep it private, or select Publish on the public website to expose the title, KDP description
and link in /en#kdp and /ro#kdp. Uncheck and save to withdraw the resource. Descriptions are displayed
as written in both languages. The URL points to a file hosted elsewhere; this feature does not upload
files or alter the hosting provider’s permissions. Existing records are private by default.
