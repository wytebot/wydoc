# WyDoc CRM

Commercial-ready, white-label CRM/customer-management source-code edition. This edition has been line-audited for UI action wiring, local persistence, rendering, backup/restore, CSV handling and responsive navigation.

## Included
- Dashboard with live KPIs and pipeline distribution
- Customer profiles, notes, related deals/activities/appointments
- Leads with stages, values, priorities and editing
- Sales pipeline with stage changes, editing and deletion
- Tasks/follow-ups with complete/reopen/edit/delete
- Appointments with schedule/complete/edit/delete
- Activities/timeline records with edit/delete actions
- Documents with safe HTTP(S) link opening
- Tags with duplicate prevention and customer cleanup
- Team & Roles demo model with editable roles/statuses
- Audit log with clear action
- Notification center
- Reports calculated from current data + CSV export
- Customer CSV import with basic validation/deduplication
- CSV exports and JSON backup/restore
- Theme, currency, timezone and white-label settings
- Demo sign-out/sign-in state
- Responsive mobile layout
- No seller credentials, API keys or personal accounts

## Run
1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev`.
4. For production, run `npm run build`.

## White-label
Use **Settings** for the application name, currency, timezone and theme. The `.env.example` file is provided for buyer-owned deployment defaults/integration planning; no secret is included.

## Production backend
The UI/data layer is intentionally local and provider-neutral so the source can be sold without tying it to the seller's accounts. Replace the storage helpers in `src/main.js` with the buyer's authentication/database/API adapter (Supabase, Firebase, REST API, etc.) when turning it into a multi-user hosted CRM.
