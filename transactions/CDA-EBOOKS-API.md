# CDA API (1.7.1) — POST {action, token, ...}

Transaction Center calls these actions on `TC_CONFIG.API_URL`. Apps Script 1.7.1 implements them. The browser renders the CDA PDF and creates the E-Sign envelope itself, then tells Transaction Center the envelope id.

| action | who | body | returns |
|---|---|---|---|
| cdaGet | agent/TC/admin with txn access (read) | txnId | {cda, executed, versions[], header(locked), suggested[], adminFee, agents[{id,name,splitPct,capAmount}], escrowCheck, lineKinds, eBooksKinds} |
| cdaSaveDraft | same | txnId, lines[] | {cda} (409 if latest is sent/executed → use cdaRevise) |
| cdaMarkSent | same | txnId, envelopeId, allowMismatch? | {cda status:'sent'} |
| cdaOnSigned | owner/admin | txnId, envelopeId, base64 (PDF), name? | {cda executed, docId, itemStatus, queued} |
| cdaSignedHook | public, HMAC | txnId, envelopeId, ts(ms), sig, base64, name? | same |
| cdaRevise | txn access | txnId, reason | {cda new draft version+1} |
| setAgentSplit | admin | userId, splitPct, capAmount?, capNote? | split row |
| createUser | admin | + splitPct?, capAmount?, capNote? | (onboarding invite Split field) |
| ebCdaPending | owner | – | {pending[]} |
| ebCdaDecide | owner | ids[], decision approve\|reject, date? | {approved, rejected} |
| ebConfirmEscrowCheck | owner | txnId, date, checkNumber, amount | {escrowCheck{expected,difference,match}} |
| ebSaveAgentProfile | owner | profile{…, capAmount, capNote} | existing + cap |

**Line** `{kind, amount, name?, agentId?, vendorId?, pct?, note?}`; kinds: brokerage, primary, co_list, co_buyer, referral_inhouse (agentId required), referral_outside, tc_fee, admin_fee (auto $200 if omitted), other, credit.
Only brokerage + primary/co_list/co_buyer/referral_inhouse reach E-Books.

**Header (locked):** address, price, commission, commissionType, totalGross, escrowNumber/Company/Officer/Email, agentId/Name, side, type.

**Statuses:** draft → sent → executed → superseded (older executed) ; sent → void on revise.

**importKey:** `cda:<txnId>:brokerage`, `cda:<txnId>:agent:<userId>`; pending ops add|update|remove; approve updates existing entry in place.

**Frontend flow:** checklist item P_CDA_COMMISSION_DISBURSEMENT_ → "CDA" button → popup (cdaGet, prefill suggested) → Save (cdaSaveDraft) → Send for E-Sign sends immediately. There is no signer form. The envelope uses the agent email on the file or user profile and the owner email on file, agent first and broker second (`orderMode: "sequential"`). If either email is missing, the popup shows one error and does not send. Then cdaMarkSent. On completion the owner session calls cdaOnSigned with the final PDF. "Revise CDA" → cdaRevise(reason) → edit → resend.
My E-Books commission `basis`: cda | paid | cda_pending | split | pending.

HMAC sig: base64url(no pad) HMAC-SHA256(CDA_HOOK_SECRET, `${txnId}|${envelopeId}|${ts}`).

## Frontend notes (this repo)

- Checklist codes that open the popup: `P_CDA_COMMISSION_DISBURSEMENT_` and `CDA` (lease and referral files). Button label is **CDA** until a draft, sent, or executed version exists, then **Revise CDA**.
- Locked header fields are not inputs. Editable amounts and the PDF money fields use US dollars with a `$` and two decimals (`$11,320.00`).
- The popup does **not** use a “subtract admin, then split” suggestion. Brokerage is the broker percent of the **full** `totalGross`. Primary agent is the agent percent of the full gross **minus** the **$200** admin fee. Added co-agent, referral, TC, other, and credit amounts also reduce the primary agent so the lines stay equal to total gross. Example, gross `$12,800.00` at 90/10: brokerage `$1,280.00`, agent `$11,320.00`, admin `$200.00`. Server `suggested` amounts that use the old formula are replaced on an editable CDA. The example-split explanation is not shown in the popup.
- Save and send are refused unless the lines equal locked total gross. There is no mismatch override.
- Brokerage **Mail to** defaults to `8311 Haven Ave #150, Rancho Cucamonga, CA 91730`. Primary, co-list, co-buyer, and in-house referral mail-to use that agent’s W-9 address when `agents[].address` (or `w9Address` / `mailingAddress`) is present, and stay blank when it is not. Outside referral and other are not given the office address.
- Admin fee always starts at `adminFee` from `cdaGet` (default 200) on every file. It is not an E-Books kind. Payee is ENESMA Realty. Mail to is the office address `8311 Haven Ave #150, Rancho Cucamonga, CA 91730` unless a real mailing address is already stored. The standard per-transaction fee description is not shown.
- Referral is one line: **Outside** (`referral_outside`) or **In-house** (`referral_inhouse` + `agentId`). Co-listing and co-buyer lines use the same agent list.
- The filled PDF is `forms/cda.pdf`. Amount fields are written as `$1,280.00`. AcroForm fields are the existing six rows (`payee1` brokerage, `agent` primary, `tc_fee`, `admin_fee`, `referral`, `other`). Co-list, co-buyer, other, and credit amounts are itemized in the popup and combined onto the PDF **Other** row. E-Books uses the structured lines, not that combined row. Signature widgets are left blank; E-Sign places agent signature then owner signature (`orderMode: "sequential"`).
- E-Sign URL is `TC_CONFIG.ESIGN_API_URL`. The Transaction Center session calls `loginWithToken`, then `createEnvelope`, then `cdaMarkSent`. When the owner opens a sent CDA and the envelope is `completed`, the owner session calls `getEnvelopePdf` and `cdaOnSigned`. Until an E-Sign hook exists, that owner post is how the signed PDF lands on the checklist.
- `ebCdaPending` / `ebCdaDecide` are the owner approval queue on E-Books → Import from TC. Approving posts brokerage income and ENESMA agent payouts. TC fee, admin fee, outside referral, other, and credit never enter that queue. Intake-% import stays for files with no signed CDA. My E-Books uses `basis: "cda_pending"` until the owner approves, then `basis: "cda"`.
- Onboarding invite (E-Sign) and Transaction Center **Add user** send `splitPct`, `capAmount`, and `capNote` on `createUser`. The invite form defaults Split % to **90**. Cap stays blank. Payees → Edit agent saves cap through `ebSaveAgentProfile`. User → Edit saves through `setAgentSplit`.
- `ebConfirmEscrowCheck` runs on Closed files for the owner. The panel shows `expected`, `difference`, and `match` against the locked CDA total gross before the check is treated as locking books for that file.
- Demo mode (`?demo=1`) implements the same actions in `mock.js`. It does not call live E-Sign; Send records a demo envelope and the owner can post a demo signed PDF through `cdaOnSigned`.
