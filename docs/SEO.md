# SEO implementation and launch plan

## Implemented

English and Romanian content have distinct crawlable addresses, /en and /ro, and language-specific
article slugs. Language links work without cookies. The root and old blog addresses redirect
permanently to the English equivalents. Internal journal links preserve the chosen language.
Each public page has its own title, description, self-referencing canonical, reciprocal hreflang
(en, ro, x-default), Open Graph and Twitter metadata. The HTML language follows the document.

The journal uses descriptive article headlines, visible breadcrumbs, related articles, original
bilingual text and practical examples. JSON-LD describes the website, publisher, actual articles
and visible breadcrumbs. It is safely serialized and uses CSP nonces. There are no invented reviews,
ratings, book offers, prices, publication dates or traffic figures. The social preview is a local
1200×630 PNG. Decorative illustrations are local CSS and require no remote font or image requests.

robots.txt and sitemap.xml are generated from the same public route catalog. The sitemap contains
only the ten public English/Romanian pages when launched. Private routes retain noindex metadata,
X-Robots-Tag and authentication guards. Robots directives are not used as a substitute for authorization.
The sitemap does not invent last-modified dates on each request.

## When the real domain is ready

1. Deploy on HTTPS and set APP_URL and SITE_URL to the same final origin (no path or query).
2. Keep SEO_INDEXING_ENABLED=false during review. Confirm that all real book descriptions, photos,
   Amazon links and public contact/privacy information are accurate before enabling indexing.
3. Set SEO_INDEXING_ENABLED=true, rebuild and restart. This intentionally remains false locally.
4. Inspect /robots.txt: public crawling should be permitted and the final sitemap URL present.
   Check /sitemap.xml for exactly the intended canonical pages and both language alternatives.
5. Create a Google Search Console property for the real domain. Verify through DNS, or supply the
   HTML verification token using GOOGLE_SITE_VERIFICATION and restart. Never put service keys there.
6. Submit sitemap.xml in Search Console. Use URL Inspection on an English and Romanian article.
   Validate structured data with Rich Results Test and measure public pages with PageSpeed Insights.
7. Monitor indexing, impressions, search queries, clicks and Core Web Vitals. Record a baseline after
   launch; do not treat local test performance or synthetic scores as real visitor measurements.

No domain has been published, Search Console registered, analytics installed or indexing requested.
The current preview remains noindex. No keyword search-volume measurements or ranking promises are made.

## Content plan for the first eight weeks

Use these as editorial starting points, not as a claim of verified search demand. Publish only material
that can be illustrated with your own books, photographs and examples. Keep English/Romanian versions
aligned and connect relevant articles to real catalog entries once they exist.

| Priority | Topic / reader question | Useful original material | Related page |
| --- | --- | --- | --- |
| 1 | How to create a reading corner in a small room / Colț de lectură într-un spațiu mic | A real before/after corner and a practical checklist | Existing reading-corner article |
| 2 | How to choose a first coloring page / Cum alegi prima pagină de colorat | Three actual page samples with different detail levels | Existing beginner coloring article |
| 3 | Three-color palettes for a cottage illustration / Palete cu trei culori | The same owned drawing colored three ways, with materials named | Beginner article and relevant book |
| 4 | What to write in a blank notebook / Ce scrii într-un carnet nou | Five real example spreads and prompts | Existing notebook article |
| 5 | Inside a specific book / Răsfoiește o carte | Actual cover, selected interior pages, intended audience, format and verified Amazon link | New public book page |
| 6 | From sketch to finished coloring page / De la schiță la pagină | Your own process images and editorial explanation | Relevant book and coloring guides |

Start with roughly one substantial, useful article per week if there is real material to support it.
Extend existing articles when they answer the same reader question; avoid nearly identical pages
for minor keyword variations. Use natural descriptive headings and meaningful image alt text.
Do not republish AI drafts without reviewing facts, originality and relevance to the actual books.
After search data exists, prioritize questions receiving impressions and improve pages that do not
answer them clearly. Traffic growth cannot be guaranteed by technical configuration alone.

## Future catalog work

The public collection is intentionally empty until real books are provided. Each published title
should get a stable URL, unique description, actual cover/interior previews, audience information,
verified format/ISBN or ASIN where applicable, and an Amazon link. Add Book structured data only
for the real books; add commercial offers only when accurate and supportable. Do not expose the
private /books workspace or test fixtures to search engines.

## References

- https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/structured-data/article
