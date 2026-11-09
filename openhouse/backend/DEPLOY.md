# Open House Apps Script — deploy when the interface is approved

Do not deploy this until Enrique approves the Open House Dashboard screens. Nothing in this folder is published by merging the pull request. Transaction Center’s script is not edited.

The new project stores open-house sheets and guests. It signs agents in by checking their existing Transaction Center session, and it writes each guest into that agent’s CRM through the existing Transaction Center web app.

## 1. Create the project

1. Open [script.google.com](https://script.google.com) while signed in as the Google account that owns the Transaction Center script (Enrique’s).
2. Click **New project**.
3. Name it **ENESMA Open House**.

## 2. Replace the files

1. Open `Code.gs`. Select all and delete it. Paste the entire contents of `openhouse/backend/Code.gs` from this repo. Save.
2. In the left sidebar, open **Project Settings** (gear) and turn on **Show "appsscript.json" manifest file in editor**.
3. Open `appsscript.json`. Replace its contents with `openhouse/backend/appsscript.json` from this repo. Save.

## 3. Create the spreadsheet

1. In the editor, choose the function **`setupOpenHouse`** and click **Run**.
2. Approve the consent screen. The script needs permission to create a spreadsheet and to call the Transaction Center web app. It does not need Gmail.
3. When the run finishes, open **Executions** (or the log) and copy the spreadsheet URL. Open it and confirm three tabs: **Houses**, **Guests**, and **Auth**.
4. Leave that spreadsheet private to you. Do not share it with agents or visitors. The web app reads and writes it while running as you.

`setupOpenHouse` also stores the Transaction Center URL in script properties as `TC_API_URL`. Change that property only if Transaction Center’s `/exec` URL changes. The default is the URL already in `transactions/config.js`.

## 4. Deploy the web app (still not the website)

1. Click **Deploy** → **New deployment**.
2. Click the gear next to **Select type** and choose **Web app**.
3. Description: `Open House 1.0.0`.
4. **Execute as: Me** (the account that owns the spreadsheet).
5. **Who has access: Anyone**. On the older screen that label is **Anyone, even anonymous**. Visitors do not have Google accounts, so the tighter “users in my domain” option will block the QR form.
6. Click **Deploy**, authorize if asked, and copy the **Web app URL**. It ends in `/exec`.

## 5. Point the website at it

1. Put that URL in `openhouse/config.js` as `API_URL`.
2. Ship the frontend (the GitHub Pages site at `app.enesmarealty.com`) only after the interface is approved. The dashboard path is `/openhouse/`.
3. Sign in on `/openhouse/` with a Transaction Center username and password.
4. Create a sheet, submit one test guest, and open that agent’s CRM. The client should be tagged **Open House**, the street address, buyer/seller (or just looking), **Has Agent** or **No Agent**, pre-approved / not pre-approved / cash, and the timeframe. The note should repeat those answers.

## What visitors can do

A QR code opens `/openhouse/sign.html?k=...`. That page can only call `publicSheet` and `publicSubmit`. `publicSheet` returns the address, date, host name, and whether the sheet is open. It does not return guests, emails, phones, or the agent’s sign-in token. `publicSubmit` answers `{ received: true }` and nothing else.

## Updating later

Change `Code.gs`, then **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**. The `/exec` URL stays the same, so `config.js` does not change. Run `setupOpenHouse` again only if a tab is missing. It will reuse the same spreadsheet.
