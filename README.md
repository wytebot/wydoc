# WyDoc

WyDoc is a website content-health SaaS that verifies site ownership, scans public pages, checks citations/freshness, uses Gemini with Google Search grounding for AI-assisted evidence review, sends web push alerts and handles billing.

## Vercel environment variables

Browser: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_VAPID_PUBLIC_KEY`.

Server: `FIREBASE_SERVICE_ACCOUNT_JSON`, `FLW_CLIENT_ID`, `FLW_CLIENT_SECRET`, `FLW_SECRET_HASH`, `FLW_API_BASE_URL`, `APP_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL` (optional; defaults to the model configured by the API), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`. Never expose server secrets through `VITE_` variables.

## Scan flow

After a site is verified and connected, WyDoc automatically runs `/api/initial-scan`: it checks discovered pages for dead outbound citations and stale/current-state wording, then runs Gemini with Google Search grounding over a small batch of public pages. The dashboard stores a compact report containing pages scanned, claims checked, dead citations, stale pages and a 0–100 review score.

The dashboard pie chart shows the severity mix of open findings so teams can prioritize critical work.

## Push

On a new Google login, WyDoc makes a best-effort attempt to register web push and sends a welcome notification when permission is granted. Users can still manage push from Notifications.

## Flutterwave

Billing uses Flutterwave's current v4 OAuth authentication and charge APIs. Because Flutterwave's v4 hosted checkout/payment-link flow is still being developed, this build uses the v4 OPay payment-method flow and redirects the customer to Flutterwave/OPay when the charge returns a redirect URL. Set `FLW_API_BASE_URL` to the production API base or sandbox base when testing. The webhook verifies its signature and independently retrieves the v4 charge before granting Pro access.

## Public pages

`/privacy`, `/terms`, `/about`, and `/how-it-works` are available from the app.

## Deployment / cache

This project is configured to prevent Vercel/browser caching of `index.html`, the service worker, and the PWA manifest. Vite-generated `/assets/*` files remain immutable because their filenames are content-hashed. The service worker is registered with `updateViaCache: 'none'` and forced to update on app startup.

After deploying a new version, open the Vercel deployment URL itself to verify the new build before checking the custom domain. If the custom domain still shows an older build, check Vercel's deployment assigned to the domain and promote the intended deployment to Production.


## Deployment verification

This release is stamped `2026-09-06-v17` and sends `X-WyDoc-Build: 2026-09-06-v17` on app responses. After deployment, inspect the response headers for that value. If it is absent, Vercel is serving a different deployment/project and browser cache is not the cause.

The app also migrates/unregisters an older WyDoc service worker once, then registers the v17 worker with a cache-busting query and `updateViaCache: 'none'`.
