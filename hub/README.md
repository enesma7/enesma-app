# ENESMA Agent Hub

Signed-in static portal for agents, rebuilt from the public Google Site at https://agent.enesmarealty.com.

## Where it lives

This folder is served by GitHub Pages as:

**https://app.enesmarealty.com/hub/**

Keep the current Google Site on `agent.enesmarealty.com` until this rebuild is verified. The Pages custom domain for this repo is `app.enesmarealty.com` (one custom domain per site). Pointing `agent.enesmarealty.com` at the same Pages site will conflict unless one of these is set up later:

1. **Recommended:** a Cloudflare Worker or proxy that serves `agent.enesmarealty.com` from `/hub/` on this Pages site (paths under `/hub/` rewritten to `/`).
2. A second GitHub repo whose only CNAME is `agent.enesmarealty.com`.
3. A GoDaddy forward (the URL the agent sees would change; last resort).

Do not change GoDaddy DNS until visual QA against `/workspace/agent-hub-inventory/` is done.

## Auth

Agents sign in with the same Transaction Center email and password. The Hub talks to the existing TC Apps Script web app (`config.js` `API_URL`).

- Session token is stored in `sessionStorage` (`hub_t`) and in an `enesma_sso` cookie (`Domain=.enesmarealty.com`, 24 hours, Secure, SameSite=Lax) so E-Sign can pick it up.
- `enesma_dt` is a 30-day trusted-device cookie. It is **not** cleared on sign-out.
- A disabled TC account cannot use the Hub (`active !== '1'` on login; `me` returns “Account disabled.”).
- OTP (`needsOtp` / `verifyLoginOtp` / `resendLoginOtp`) is handled in the UI now. It becomes live after TC backend 1.7.0 is deployed. Until then, a successful password login returns a token as today.

See `/workspace/transaction-center/backend-v170/DEPLOY.md` and `/workspace/esign/backend-v120/DEPLOY.md`.

Deploy order:

1. This Pages frontend (Hub + Transaction Center `app.js?v=41` + E-Sign `app.js?v=8`).
2. E-Sign Apps Script 1.2.0 (`loginWithToken` + OTP passthrough).
3. Transaction Center Apps Script 1.7.0 (OTP + TrustedDevices). Run `migrate170`. Confirm `ping` reports `1.7.0` and feature `login_otp`.

## Layout

See [LAYOUT-SPEC.md](LAYOUT-SPEC.md) for nav, spacing, cards, type, and gold/red usage (for aligning consumer/landing pages).
