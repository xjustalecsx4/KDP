# Privacy policy publication

The bilingual policy is implemented at `/en/privacy` and `/ro/privacy`, with footer links,
language switching and canonical metadata. Publication is requested for cozypages.ro.

Deployment context:

- Host-Age VPS, accessed through the existing SSH alias `infocalorii`.
- Checkout: `/var/www/cozyplaces/cozyplaces-app`, branch `main`.
- PM2 process `kdp-app`, loopback port 3110 behind Nginx; reload only this application.
- The user confirmed an individual-run project, with public contact
  `thequietbookshelf1@gmail.com`, and explicitly prohibited publishing their personal name.
  Preserve that preference; do not pull their name from environment variables or account data.
  Controller identification remains legally unresolved: a brand and email alone must not be
  represented as satisfying GDPR Article 13's identity disclosure requirement.
- Hosting copy identifies Host-Age and Gmail. No blanket compliance guarantee is made.
- Nginx rotates logs daily and retains 14 rotations. Backup retention depends on configured cycles.
- Build and deploy using the existing host; verify both policy URLs without authentication.

The existing Pinterest implementation clears credentials on application disconnect, but retains
publishing history. The policy distinguishes those actions and does not promise automatic removal
of already-published Pins.

References consulted:

- https://policy.pinterest.com/en/developer-guidelines
- https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en
