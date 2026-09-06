# WyDoc

WyDoc is a website content-health SaaS that verifies site ownership, scans public pages, checks citations/freshness, uses Gemini with Google Search grounding for AI-assisted evidence review, sends web push alerts and handles billing.

## Vercel environment variables

Browser: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_VAPID_PUBLIC_KEY`.

Server: `FIREBASE_SERVICE_ACCOUNT_JSON`, `FLW_CLIENT_ID`, `FLW_CLIENT_SECRET`, `FLW_SECRET_HASH`, `FLW_API_BASE_URL`, `APP_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL` (optional; defaults to `gemini-3.8-flash`), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`. Never expose server secrets through `VITE_` variables.

## Scan flow

After a site is verified and connected, WyDoc automatically runs `/api/initial-scan`: it checks discovered pages for dead outbound citations and stale/current-state wording, then runs Gemini with Google Search grounding over a small batch of public pages. The dashboard stores a compact report containing pages scanned, claims checked, dead citations, stale pages and a 0–100 review score.

The dashboard pie chart shows the severity mix of open findings so teams can prioritize critical work.

## Push

On a new Google login, WyDoc makes a best-effort attempt to register web push and sends a welcome notification when permission is granted. Users can still manage push from Notifications.

## Flutterwave

Billing uses Flutterwave's current v4 OAuth authentication and charge APIs. Because Flutterwave's v4 hosted checkout/payment-link flow is still being developed, this build uses the v4 OPay payment-method flow and redirects the customer to Flutterwave/OPay when the charge returns a redirect URL. Set `FLW_API_BASE_URL` to the production API base or sandbox base when testing. The webhook verifies its signature and independently retrieves the v4 charge before granting Pro access.

## Public pages

`/privacy`, `/terms`, `/about`, and `/how-it-works` are available from the app.
