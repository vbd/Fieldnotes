# Superior Command Center — Cloudflare D1 Migration

This folder is a **separate, non-Render deployment** of Superior Maintenance and Remodeling's owner estimate / customer approval / invoice workflow. It reuses the existing black/gold/silver front end from `../superior-owner-website`, but replaces temporary local JSON files with **Cloudflare D1**.

**Status:** Code prepared in GitHub. Not live until a Cloudflare account is authorized and a D1 database is provisioned. Existing Render deploy remains unchanged as a fallback. No customer data is stored in this repository.

## One-time Cloudflare setup

1. In Cloudflare dashboard go to **Workers & Pages → D1 → Create database**. Name: `superior-command-center`. Copy the **database ID**.
2. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc` with the actual D1 ID. Do not put any private keys in GitHub.
3. Connect the GitHub repository `superiormandr-star/Fieldnotes` using Cloudflare Workers Git integration. Choose branch **`cloudflare-d1-migration`** and root **`cloudflare-command-center`**; ensure it uses the same Worker name as `wrangler.jsonc`: `superior-command-center`.
4. Configure build command `npm install && npm run build`; deploy command `npx wrangler d1 migrations apply superior-command-center --remote && npx wrangler deploy`.
5. In the Worker settings add **secrets** `OWNER_PASSWORD` (strong unique password) and `SESSION_SECRET` (long random string, 32+ bytes). Never commit them to code.
6. After deployment, visit `https://<your-worker>.workers.dev/owner` and sign in. Confirm the owner dashboard loads and can save a **test** estimate after a fresh page reload.
7. Test an approval link in a private browser window, approve a test estimate, verify an invoice appears in the owner dashboard, and verify it survives another reload.

## Preserve your old data before changing sites

- The existing Render preview uses **temporary server files**. Before switching, sign in to the **old** `/owner/backup` page and download a current private backup JSON file. Do this **before** any Render redeploy, restart, or shutdown.
- On Cloudflare open `/owner/backup` and use **Restore selected backup** after first exporting any Cloudflare records. Restore **replaces** existing Cloudflare records and currently accepts up to 250 records per file.
- Keep an independent copy in your private Google Drive. Declined estimates are intentionally excluded from exported backups, but retained in the current D1 database.
- **Do not shut down Render** until imported invoices and customer approval links have been checked. Approval URLs from Render must be resent with the new Cloudflare URL after migration.

## Google Drive integration

GitHub is used for **application code and deployment**, not private invoices. Being connected to both GitHub and Google Drive in ChatGPT does **not** grant the live site a Google OAuth token. This Cloudflare version uses D1 for primary records and offers manual JSON backup downloads; automatic Google Drive backup is **not yet configured**. Save exported backups to the private Drive folder until a separate website-to-Google OAuth integration has been authorized.

## Commands (if using the Cloudflare CLI)

```bash
cd cloudflare-command-center
npm install
npm run build
npx wrangler d1 migrations apply superior-command-center --remote
npx wrangler secret put OWNER_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

Source UI files remain private to the repo checkout until the build copies **only the allowlisted public assets** into `public/`. It never copies `server.js`, `google-drive.js`, credentials, or records.

## Endpoints

`/owner` — owner-only dashboard; `/owner/backup` — backup/restore; `/review/<token>` — customer approval/decline; `/api/estimates`, `/api/invoices` — D1 records.

This migration **does not** move the separate Handyman Services directory app or alter its blue/orange branding.
