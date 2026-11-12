# Superior Maintenance and Remodeling — Website + Private Owner Command Center

This is the **Superior Maintenance and Remodeling business website**, **not** the Handyman Services directory app. The public website retains the black, gold, and silver design; the site also includes a private **Owner Command Center** at `/owner`.

## What is included

- `/` — Superior Maintenance and Remodeling public business website.
- `/owner` — password-protected, mobile-friendly owner dashboard.
- Itemized estimates with customer information, line items, quantities, rates, tax and terms.
- Save and edit drafts, then generate a unique customer review/approval link.
- `/review/TOKEN` — customer sees their estimate and can approve or decline with their name. After an **approval**, the backend automatically generates a linked invoice.
- Owner can view and print estimates and invoices (browser **Print → Save as PDF**), track outstanding invoices and manually mark them paid after verifying payment.
- Data stored server-side in a JSON file, **not** in a customer's browser. The app requires durable server storage to protect your business records.

## Run locally

Requires Node.js 20 or newer; no external npm dependencies.

```bash
cd superior-owner-website
export OWNER_PASSWORD='choose-a-long-private-password'
export DATA_DIR='./data'
npm start
```

Open `http://localhost:3000/` to view the business website and `http://localhost:3000/owner` for the owner login.

Run the automated end-to-end API test with `npm test`.

## Deploy carefully

The included `render.yaml` defines a **separate dedicated website service** with a persistent disk. Use a repository specifically for Superior Maintenance and Remodeling. **Do not upload these files to the Handyman Services app repository.**

Set these environment variables in the web service:

- `OWNER_PASSWORD`: strong private password; never place it in the files or GitHub.
- `PUBLIC_BASE_URL`: the public HTTPS origin of this deployed website, without a trailing slash (e.g. `https://your-domain.example`). Customer approval links will use this origin.
- `DATA_DIR`: persistent mounted folder (for the included Render blueprint, `/var/data`).

**Persistent storage is essential.** A standard ephemeral free service loses records after restart/redeploy. The included Render blueprint uses a Starter service with persistent disk, which may cost money. Confirm current pricing before deploying. Protect and back up `records.json` containing customer information. If hosting elsewhere, provide a reliable persistent data volume and HTTPS.

**Important about the existing live website:** `https://superior-maintenance-remodeling.indigotune5.chatgpt.site/` is managed separately. Uploading this ZIP to GitHub or Render **does not modify the original `chatgpt.site` site.** To make this exact owner page work under that URL, the hosting/editing platform would need to support deploying this Node backend (or use a dedicated branded domain for this complete website). No live website or domain has been changed by this package.

## Sending estimates to customers

1. Sign in at `/owner`.
2. Select **New estimate**, add customer contact details and itemized work, and save.
3. Open the estimate, select **Prepare approval link** and then **Email customer**. This opens an email draft; **you must actually send it**. You can also copy the link and paste it into a text message.
4. The customer opens the link and chooses **Approve estimate** or **Decline estimate**, confirming with their typed full name.
5. Approval changes the estimate status and generates an invoice automatically; declines are recorded with the customer's optional comment. Owner can view invoices, save a PDF using the browser print dialog, and mark paid after receiving payment.

## Limitations and safety notes

- The public `Request an estimate` form is **not** connected to the owner dashboard yet. It requires a verified business email (`BUSINESS_EMAIL` in `script.js`) and currently only prepares an email in the visitor's own email app; it does not save the request. It intentionally refuses to open an unsendable email unless a verified recipient is configured.
- Emails are **not** sent automatically. Approval links can be shared through the owner's email/text app.
- A customer's typed name and timestamp are recorded as a simple approval confirmation. Legal enforceability of electronic signatures depends on how the workflow is used and applicable law; consult legal advice if needed.
- The backend currently uses one owner password and in-memory login sessions (sign-in again after server restarts). For multiple staff accounts, add a role-based authentication provider.
- This is a starter workflow, not a complete accounting system. It does not collect payments, calculate accounting sales tax obligations, or sync to bookkeeping systems.
- The included company logo was carried over from the prior Superior owner website ZIP. Verify the logo and business contact details before public launch.

## Free Render preview deployment (temporary)

This branch runs on Render **free** with **ephemeral storage**, strictly for preview/testing with fake customer information. It intentionally displays a visible warning. Real estimates and invoices require a durable database/volume and a separately approved hosting plan. Free deployment never starts a paid plan automatically. To use commercially, migrate data storage to a durable hosted database and back up customer records.