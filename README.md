# WyDoc

WyDoc is a content verification and monitoring SaaS starter. It discovers public article/post URLs, lets customers manage sites, displays affected URLs for findings, supports web-push alerts, and includes Flutterwave billing scaffolding.

## 1. Install
`npm install`

## 2. Firebase
Create a Firebase web app and enable Google Auth + Firestore. Put the web config in `.env` using `.env.example`.

## 3. Server environment
Set `FLW_PUBLIC_KEY`, `FLW_SECRET_KEY`, `FLW_SECRET_HASH`, `GEMINI_API_KEY`, and `APP_URL` in Vercel/server environment variables. Never put secret keys in `VITE_*` variables.

## 4. Run
`npm run dev`

## 5. Deploy
Deploy the project to Vercel. The `/api` folder contains serverless endpoints. Configure the Flutterwave webhook URL as `https://YOUR-DOMAIN.com/api/flutterwave/webhook` and enable webhook events in Flutterwave. The webhook must verify its signature and, before granting paid access, the server should re-query Flutterwave to verify transaction status, amount, currency and reference.

## 6. Website integration
Customers add:
```html
<script src="https://YOUR-WYDOC-DOMAIN.com/widget.js" data-site-id="YOUR_SITE_ID" async></script>
```
The production event endpoint should authenticate the site ID, rate-limit requests and only accept public page metadata/hashes. Do not use the browser snippet to expose AI or payment secrets.

## 7. Push notifications
WyDoc uses the browser Push/Notification APIs and a service worker. Users must explicitly grant notification permission. For production, create a VAPID key pair, store the private key server-side, store subscriptions in Firestore, and send notifications through `web-push`. HTTPS is required.

## 8. Verification engine
The UI is ready for a server verification pipeline. Recommended production flow: fetch changed page -> extract factual claims -> search current evidence -> compare claim/evidence -> score severity -> save compact finding -> send push only for important/critical issues. Do not automatically call a developing news claim false when evidence is simply unavailable.

## 9. Cost/storage strategy
Do not store full copies of every article by default. Store content hashes, URLs, timestamps, scores, compact claims/findings and source metadata. Re-check only changed pages, cache evidence by normalized claim hash, and expire old detailed findings according to plan retention.

## 10. Important production TODOs
- Connect Firestore persistence for issues and push subscriptions.
- Add a proper crawler queue/rate limiter and robots.txt handling.
- Implement Gemini/OpenAI evidence verification server-side.
- Complete Flutterwave transaction verification and Firestore plan upgrade in the webhook.
- Add Firebase security rules.
- Add per-site ownership checks to every API endpoint.
- Add sitemap.xml/RSS discovery for more reliable article counts than link crawling alone.


## v3 audit fixes
- Fixed a missing `Globe2` import that could break the Vite build.
- Added a catch-all route instead of a dead blank page for unknown URLs.
- Free-site enforcement now blocks a second site until Pro.
- Issue filters now work and “Mark reviewed” persists to Firestore.
- Web push now creates a real browser subscription in Firestore.
- The website widget now sends a real SHA-256 content fingerprint to `/api/events`.
- Added server-side site-token validation for widget events.
- Hardened site inspection against local/private targets and added basic sitemap discovery.
- Flutterwave checkout now authenticates the signed-in user; webhook verification now verifies the transaction before upgrading sites.
- Firestore rules prevent clients from changing a site's plan.
- Removed the service-worker reference to a missing icon.

### Required production server variables
`FIREBASE_SERVICE_ACCOUNT_JSON`, `FLW_SECRET_KEY`, `FLW_SECRET_HASH`, `APP_URL`. For push delivery also set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_EMAIL`. The Firebase service account JSON and Flutterwave secrets must never use `VITE_` prefixes.


### Web push server setup
Set `VAPID_PRIVATE_KEY` and `VAPID_EMAIL` server-side in addition to the public `VITE_VAPID_PUBLIC_KEY`. The Notifications page can send a test alert after a browser subscription is created.

## v5 build fix
- **Vercel build failed immediately** with `Error: Function Runtimes must have a valid version`. `vercel.json` set `"runtime": "nodejs22.x"` under `functions`, but that field expects a versioned Vercel Runtime identifier (e.g. `@vercel/node@x.x.x`), not a Node version string — Vercel's zero-config Node detection already picks up `.js` files in `/api` without any `functions` block. Removed it and pinned the Node version the supported way, via `"engines": {"node": "22.x"}` in `package.json`.

## v4 audit fixes (bugs and dead flows)
- **Push notification clicks did nothing.** `wydoc-sw.js` referenced an undefined `target` variable in `notificationclick`, throwing a silent error every time a user tapped an alert. Fixed to navigate/focus/open using the actual notification URL.
- **Flutterwave webhook signatures would fail in production.** Vercel auto-parses JSON bodies before your handler runs; re-serializing that object with `JSON.stringify` does not reliably reproduce the exact bytes Flutterwave signed, so real webhooks could fail verification and nobody would ever get upgraded to Pro after paying. The handler now disables body parsing and verifies against the true raw request bytes.
- **Sites could be created directly from the browser**, bypassing the one-free-site limit and letting a user fabricate their own `score`/`articleCount`. Firestore rules now block client-side `create` on `/sites` entirely — sites are only ever created server-side via `/api/create-site`.
- **Settings page was decorative.** The alert-preference checkboxes had no state and saved nothing. They now persist to the user's Firestore doc and reload on return.
- **Google sign-in failed silently** on a blocked/closed popup. Auth now shows a real error and a busy state.
- Minor: removed dead `open/setOpen` sidebar state and an unused `useNavigate` import; the "Enable web push" button no longer stays clickable (and re-runs the whole subscribe flow) once already enabled; the Billing page now acknowledges a Flutterwave redirect (`?payment=complete`) instead of showing nothing while the webhook finishes verifying.

## New: dead-citation & stale-content scanner (free)
Semrush and Ahrefs check SEO/backlink health, not whether your own cited sources still resolve or whether content that says "as of..."/"currently..." has quietly gone stale. `/api/scan-site` (wired to a "Scan for issues" button on the Dashboard) does both, for free — no paid AI or third-party API:
1. Fetches a batch of the site's discovered pages, extracts outbound links, and HEAD/GET-checks each one for dead citations (404s, timeouts, DNS failures).
2. Scans page text for a mentioned year paired with recency language ("as of", "currently", "latest"...) that's fallen more than a couple years behind — a cheap, effective staleness signal with zero API cost.
3. Writes findings into the existing `issues` collection under the `citation` and `outdated` types — which is what the Issues page's "Citations" and "Outdated" filter chips were already built for, but previously had nothing behind them.

### Ideas for next additions
- **Free:** a public "Verified by WyDoc" badge/status page customers can embed — a trust signal Semrush/Ahrefs don't offer, and a natural backlink source. No paid API needed, just a public read-only route.
- **Free:** scheduled re-scans via Vercel Cron (check your plan's cron limits) so the scanner above runs automatically instead of only on manual click.
- **Paid (uses `GEMINI_API_KEY`, so it costs API usage):** the full claim-extraction/evidence-verification pipeline described in section 8 — this is the one AI-dependent piece and the natural Pro-tier upsell, since it's the part competitors structurally can't offer at all (they don't read your content for factual accuracy).
