# ENESMA Agent Hub

Signed-in static portal for agents, rebuilt from the public Google Site at https://agent.enesmarealty.com.

## Where it lives

This folder is served by GitHub Pages as:

**https://app.enesmarealty.com/hub/**

The Pages custom domain for this repo is `app.enesmarealty.com` (one custom domain per site). Do not put `agent.enesmarealty.com` in the root `CNAME` file — that would take live Transaction Center and E-Sign off `app.enesmarealty.com`.

`agent.enesmarealty.com` still points at the old public Google Site (GoDaddy CNAME → `ghs.googlehosted.com`). Enrique wants that hostname to become the main Hub login URL. The zone's nameservers are still GoDaddy (`ns43` / `ns44.domaincontrol.com`); Cloudflare is not in front of the domain yet.

How to put the new Hub on `agent.enesmarealty.com` without breaking `app`:

1. **Recommended long-term:** a Cloudflare Worker that serves `agent.enesmarealty.com` from `/hub/` on this Pages site (see [agent-rewrite-worker.js](agent-rewrite-worker.js)).
2. A second GitHub repo whose only CNAME is `agent.enesmarealty.com` (smallest DNS change if Cloudflare is not wanted yet).
3. A GoDaddy forward (the URL the agent sees would change; last resort).

Exact DNS, Search Console notes, Enrique-only steps, and rollback: [CUTOVER.md](CUTOVER.md).

## Auth

Agents sign in with the same Transaction Center email and password. The Hub talks to the existing TC Apps Script web app (`config.js` `API_URL`).

- Session token is stored in `sessionStorage` (`hub_t`) and in an `enesma_sso` cookie (`Domain=.enesmarealty.com`, 24 hours, Secure, SameSite=Lax) so E-Sign can pick it up.
- `enesma_dt` is a 30-day trusted-device cookie. It is **not** cleared on sign-out.
- A disabled TC account cannot use the Hub (`active !== '1'` on login; `me` returns “Account disabled.”).
- OTP (`needsOtp` / `verifyLoginOtp` / `resendLoginOtp`) is handled in the UI now. It becomes live after TC backend 1.7.0 is deployed. Until then, a successful password login returns a token as today.

See `/workspace/transaction-center/backend-v170/DEPLOY.md` and `/workspace/esign/backend-v120/DEPLOY.md`.

Deploy order:

1. This Pages frontend (Hub + Transaction Center `app.js?v=41` + E-Sign `app.js?v=9`).
2. E-Sign Apps Script 1.2.0 (`loginWithToken` + OTP passthrough).
3. Transaction Center Apps Script 1.7.0 (OTP + TrustedDevices). Run `migrate170`. Confirm `ping` reports `1.7.0` and feature `login_otp`.

## Layout

See [LAYOUT-SPEC.md](LAYOUT-SPEC.md) for nav, spacing, cards, type, and gold/red usage (for aligning consumer/landing pages).
