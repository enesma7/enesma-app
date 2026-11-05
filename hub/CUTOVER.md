# Making agent.enesmarealty.com the Agent Hub login URL

Goal: agents bookmark **https://agent.enesmarealty.com** and land on the
new signed-in Hub (same TC email/password). After login, Transaction
Center, E-Sign, and My E-Books stay one click away via the existing
SSO cookie (`enesma_sso`, `Domain=.enesmarealty.com`).

The Hub itself is already live at
https://app.enesmarealty.com/hub/
(GitHub Pages repo `enesma7/enesma-app`, commit through `e084b23`).
Do **not** change that origin or its `CNAME` file (`app.enesmarealty.com`).

Checked from public DNS/HTTP on November 5, 2026, ~8:30 AM America/Los_Angeles.

## What is live right now

| Hostname | DNS | Who answers | Role |
|---|---|---|---|
| `enesmarealty.com` (apex) | A `15.197.225.128` + `3.33.251.168` (GoDaddy forwarding) | GoDaddy forwarders | Forwards visitors to `www` |
| `www.enesmarealty.com` | CNAME `ghs.googlehosted.com` | Google Sites (`server: ESF`) | Consumer site — leave alone |
| `agent.enesmarealty.com` | CNAME `ghs.googlehosted.com` (TTL 3600) | Google Sites (`server: ESF`) | **Old public Agent Hub** — this is what we remap |
| `app.enesmarealty.com` | CNAME `enesma7.github.io` | GitHub Pages / Fastly | Live TC, E-Sign, Hub at `/hub/` — **do not touch** |
| `apps.enesmarealty.com` | CNAME `enesma7.github.io` | GitHub Pages | Add-to-device page — do not touch |
| `calculators.enesmarealty.com` | CNAME `enesma7.github.io` | GitHub Pages | Calculator embeds — do not touch |
| `compliance.enesmarealty.com` | CNAME `enesma7.github.io` | GitHub Pages | Do not touch |

Other facts:

- Nameservers are **GoDaddy**, not Cloudflare: `ns43.domaincontrol.com` and `ns44.domaincontrol.com` (SOA serial `2026102701`).
- No `cf-ray` header on `agent`, `app`, `www`, or `apps`. Cloudflare is **not** proxying this zone.
- Apex TXT already has Search Console verification: `google-site-verification=87RNLeGRk5fpR0MMtTnk4xw5GEOB8jVQ7nbXsS0DKZc`.
- No MX records on `enesmarealty.com` (broker mail lives on other domains). An NS move would not break `@enesmarealty.com` mail because it is not configured here — but it **would** risk `www` / `app` / `apps` / `calculators` / `compliance` if those records are not imported exactly.
- GitHub Pages allows **one** custom domain per site. This repo's domain is `app.enesmarealty.com`. Pointing `agent.enesmarealty.com` at the same Pages site without a proxy would conflict and can take `app` offline. Do not edit the root `CNAME` file.
- TC, E-Sign, Office Hubs, CDA, Invoice, and `apps.enesmarealty.com` already link “Agent Hub” back to `https://agent.enesmarealty.com`. Once this hostname serves the new Hub, those back-links are correct. Do not retarget them to `/hub/` as a substitute for DNS.

## Search Console is not the blocker for this cutover

The earlier Search Console step (add `enrique@enesmabroker.com` as owner) was required to **remap a Google Site custom domain** onto a copied site. That is PHASE-B P3 / PHASE-B step 5, and it still matters later for `www.enesmarealty.com`.

It is **not** required to point `agent.enesmarealty.com` at the new Hub:

- Path A (Cloudflare Worker) and Path B (second GitHub Pages site) only need DNS at GoDaddy (and a Cloudflare account for Path A).
- Unmapping `agent.enesmarealty.com` from the old Google Site can be done while signed in as `enesma7@gmail.com` (Sites → Settings → Custom domains → remove). That does not wait on Enrique's Search Console ownership.
- Still worthwhile, separately: have `enesma7` add `enrique@enesmabroker.com` as a Search Console owner on the `enesmarealty.com` domain property so the Workspace account can manage `www` later. The existing TXT record stays.

## Why a rewrite (not a redirect, not a second custom domain on this repo)

1. **Rewrite (recommended):** `agent.enesmarealty.com` stays in the address bar and serves `/hub/` from this Pages site. Agents bookmark the hostname they already know. SSO to `app.enesmarealty.com` still works because the cookie domain is `.enesmarealty.com`.
2. **HTTP redirect / GoDaddy forward:** the URL the agent sees becomes `https://app.enesmarealty.com/hub/`. Last resort only.
3. **Adding `agent.enesmarealty.com` to this repo's `CNAME`:** GitHub Pages supports one custom domain. That would steal the domain from `app.enesmarealty.com` and break live TC / E-Sign. Never do this.

A Cloudflare Worker is the rewrite. Draft: [agent-rewrite-worker.js](agent-rewrite-worker.js).

## Two ways to get there

### Path A — Cloudflare Worker rewrite (best long-term, more moving parts today)

Use this if Enrique is willing to put `enesmarealty.com` on Cloudflare. After that, there is one copy of the Hub (this repo) and `agent` is only a hostname in front of it.

Enrique-only dashboard work. Do not change live nameservers or the `agent` target without him.

1. Create a Cloudflare account (or sign in) and **Add site** `enesmarealty.com`. Let Cloudflare scan existing records. **Do not change nameservers yet.**
2. Compare every imported record to the table above. Especially:
   - `app` / `apps` / `calculators` / `compliance` CNAME → `enesma7.github.io` (set these to **DNS only / grey cloud**, not proxied, so GitHub's own HTTPS keeps working).
   - `www` CNAME → `ghs.googlehosted.com` (can stay DNS-only as well).
   - Apex A records (GoDaddy forwarders) **or** replace them with a Cloudflare Redirect Rule `enesmarealty.com` → `https://www.enesmarealty.com/` (needed if the GoDaddy forwarders go away after the NS change).
   - TXT `google-site-verification=87RNLe…` must remain.
3. Optional now (GoDaddy, before any target change): lower the `agent` CNAME TTL from 3600 to 300 so the later cutover and any rollback propagate faster. Wait at least one old TTL (1 hour) after saving.
4. Deploy a Worker, paste [agent-rewrite-worker.js](agent-rewrite-worker.js), and attach the custom domain `agent.enesmarealty.com` (or a route `agent.enesmarealty.com/*`). Cloudflare will provision the certificate. This step only goes live once the zone's nameservers are Cloudflare **and** the `agent` record points at the Worker instead of `ghs.googlehosted.com`.
5. At GoDaddy, switch nameservers from `ns43.domaincontrol.com` / `ns44.domaincontrol.com` to the two nameservers Cloudflare assigned. Wait until [https://www.whatsmydns.net/#NS/enesmarealty.com](https://www.whatsmydns.net/#NS/enesmarealty.com) shows Cloudflare NS.
6. In Cloudflare DNS, replace the `agent` CNAME (`ghs.googlehosted.com`) with the Worker custom-domain record Cloudflare created (do not leave it pointing at Google Sites). Keep every other record unchanged.
7. Signed in as `enesma7`, open the old Google Site **ENESMA Realty | AGENT HUB** → Settings → Custom domains → remove `agent.enesmarealty.com`. Leave the site published at `sites.google.com/view/enesma-realty-agent-hub` as a fallback. Do **not** remap it.
8. Smoke-test (see below). Leave `app.enesmarealty.com` alone the whole time.

Rollback: in Cloudflare DNS, point `agent` back to CNAME `ghs.googlehosted.com` and re-add the custom domain on the old Google Site (as `enesma7`). The old site stays published.

### Path B — Second GitHub Pages site (smallest DNS blast radius)

Use this if Enrique does **not** want to move the zone's nameservers yet. Only the `agent` record at GoDaddy changes. `app` / `www` / everything else stay put. Cloudflare is not required.

Tradeoff: the Hub files have to live (or be synced) in a second repo whose only Pages domain is `agent.enesmarealty.com`. GitHub still will not let this repo also claim `agent`.

1. Create a new public repo (for example `enesma7/enesma-agent-hub`) whose published files are the contents of `hub/` at the **root** (so `/` is the login page, not `/hub/`). Add a root `CNAME` file containing only `agent.enesmarealty.com`.
2. Enable GitHub Pages on `main` / root. GitHub will ask for a domain verification TXT at `_github-pages-challenge-enesma7.agent.enesmarealty.com`. Enrique adds that TXT at GoDaddy (does not change the existing `agent` CNAME yet).
3. After GitHub accepts the domain, at GoDaddy change **only** `agent.enesmarealty.com` from CNAME `ghs.googlehosted.com` to CNAME `enesma7.github.io`. Do not edit `app`, `www`, or nameservers.
4. Remove the custom domain from the old Google Site (same as Path A step 7).
5. Keep this `enesma-app` repo publishing `/hub/` so `https://app.enesmarealty.com/hub/` remains a working URL. Plan a sync (manual copy or Action) so the two trees do not drift.

Rollback: change the `agent` CNAME back to `ghs.googlehosted.com` and restore the Google Site custom domain.

A GoDaddy “forward” or “masked forward” of `agent` → `https://app.enesmarealty.com/hub/` is worse than either path (URL changes, or an iframe that breaks login / CSP). Do not use it.

## Safest order

1. Leave `app.enesmarealty.com` and this repo's `CNAME` untouched. (Already true.)
2. Confirm Hub login + TC + E-Sign + My E-Books still work at `https://app.enesmarealty.com/hub/` (already shipped, including the E-Sign SSO fix `e084b23`).
3. Decide Path A vs Path B. Path A if Enrique wants one hostname in front of this repo and is ready to move DNS hosting to Cloudflare. Path B if he only wants to flip `agent` at GoDaddy.
4. Optional: lower `agent` TTL to 300 at GoDaddy and wait one hour.
5. Build the new target **before** changing the `agent` record (Worker deployed and ready, or second Pages site verified).
6. Change the `agent` DNS target (Path A after NS are on Cloudflare; Path B at GoDaddy only).
7. Unmap the hostname from the old Google Site.
8. Test, then tell agents the bookmark they already have is the login URL. Do not email agents until the hostname actually serves the new Hub.

Business My Drive ownership work (PHASE B) can continue in parallel. It must not be used as a reason to edit `app.enesmarealty.com` DNS.

## After the cutover — smoke test

- `https://agent.enesmarealty.com/` shows the Hub login card (not the public Google Site).
- `curl -sI https://agent.enesmarealty.com/` is `200` from Cloudflare (Path A) or `GitHub.com` (Path B), not Google `ESF`.
- `https://app.enesmarealty.com/hub/`, `/transactions/`, and `/esign/` still load (unchanged).
- Sign in at `agent.enesmarealty.com` with a TC account → Home, then open Transaction Center, E-Sign, and My E-Books without a second login.
- Old pretty URLs such as `https://agent.enesmarealty.com/compliance` and `/refer` land on the matching Hub hash route.
- “Agent Hub” back-links from TC / E-Sign / Office Hubs return to the new login/home, not the Google Site.
- `https://www.enesmarealty.com/` is still the consumer Google Site.

## Who does what

**Already done / safe on this repo (no DNS):** Hub is live at `/hub/`; SSO cookie is scoped to `.enesmarealty.com`; Worker draft and this checklist are in `hub/`. The root `CNAME` was not changed.

**Do not do from here (Enrique owns the dashboards):** GoDaddy DNS edits, nameserver changes, Cloudflare site-add / Worker attach, Google Search Console owner invite, Google Sites custom-domain add/remove.

**Enrique (or `enesma7` where noted):**

1. Decide Path A or Path B.
2. Path A: Cloudflare add-site, review records, switch GoDaddy nameservers, attach the Worker, retarget `agent`. Path B: new Pages repo + GoDaddy TXT + change only the `agent` CNAME.
3. As `enesma7`, remove `agent.enesmarealty.com` from the old Google Site after the new target is answering.
4. Optional hygiene: add `enrique@enesmabroker.com` as Search Console owner for `enesmarealty.com` (needed later for `www`, not for this Hub cutover).
