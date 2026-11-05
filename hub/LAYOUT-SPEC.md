# ENESMA Agent Hub layout spec (for Mars)

Use this when aligning enesmarealty.com and landing pages with the rebuilt Agent Hub. The live Google Site remains the visual reference until the new Hub is verified.

## Preview and screenshots

- Preview (after Pages deploy): https://app.enesmarealty.com/hub/
- Interior routes are a hash SPA: `https://app.enesmarealty.com/hub/#/compliance`, `#/technology`, `#/marketing-templates`, etc.
- Screenshot source of truth (captured 2026-11-05): `/workspace/agent-hub-inventory/`
  - `home-1.webp` … `home-5.webp` (hero, tiles, events, add-to-device pills, footer)
  - `section-compliance.webp`
  - `section-technology.webp`
- Inventory write-up: `/workspace/agent-hub-inventory/INVENTORY.md`

## Tokens (`hub/app.css`)

| Token | Value | Use |
|---|---|---|
| `--black` | `#000007` (Rocket Black) | Header, footer card, primary buttons, photo overlays |
| `--white` | `#FBFBFB` (Universal White) | Page background, type on black |
| `--gold-a` / `--gold-b` | `#EAD59E` → `#D5BE87` (Aztec Gold) | Rules, dashes, pills, search icon, nav hover |
| `--red-a` / `--red-b` | `#EF0207` → `#9A0007` (Illyrian Red) | Errors only here; also E-Sign / destructive actions on other ENESMA apps |
| `--max` | `1120px` | Content column |
| `--radius` | `8px` | Tiles, event cards, embeds, image cards |
| `--nav-h` | `64px` | Sticky header height |
| `--gap` | `22px` | Two-column tile / event / partner gap |
| `--section-pad` | `64px` | Vertical section padding |

Horizontal page gutter: 24px each side (`width: min(1120px, calc(100% - 48px))`). On viewports ≤880px the grid stacks to one column and the gutter tightens to 16px.

## Type

- Family: Inter (loaded from `https://app.enesmarealty.com/transactions/assets/Inter.ttf`), fallback Helvetica Neue / Helvetica / Arial.
- Nav: ~13.5px, title case (Home, Compliance, Marketing…), not all-caps.
- Page titles (interior heroes): uppercase, wide tracking (~0.18em), light-to-regular weight, clamp 32–52px.
- Section titles (“Agent Resources”, “Upcoming Events”): large, light, ~32–48px, sentence case.
- Tile titles: ~22px / 500 on the photo, with a 14px subtitle.
- Wordmark: stacked distressed “ENESMA / REALTY” (white on black). Header pairs it with small tracked “AGENT HUB”. Hero uses the full lockup (wordmark + gold rule + AGENT HUB + UNDERPROMISE & OVERDELIVER).

## Nav

Sticky black bar, logo left, links right, search icon at the end.

Order: **Home · Compliance ▾ · Marketing ▾ · Technology · Listings · Training · Calculators ▾ · Refer · Agents ▾ · search**

Dropdowns:

- Compliance: Transaction Checklists, C.A.R. Legal Hotline, Office Documents, Office Policies
- Marketing: Templates, Holidays
- Calculators: Flip Calculator, Net Sheet, Mortgage Calculator, Cap Rate Calculator
- Agents: Enrique Esparza, Lilia Amador

Preferred Partners is **not** in the nav. It is linked from the home tile grid and the footer Support column.

After sign-in, a slim apps bar sits under the header with gold-outline pills in title case: Transaction Center, E-Sign, My E-Books (absolute URLs on `app.enesmarealty.com`). The outline is the Aztec Gold gradient; hover and focus fill the pill with that gradient and switch the type to Rocket Black. On viewports ≤700px the three pills stack full-width so they stay tappable instead of wrapping into an orphan row.

## Cards and photos

- Home and section tiles: 2 columns, `aspect-ratio: 16 / 9`, `border-radius: 8px`, photo background, dark gradient overlay, 36×2px gold dash, then title + subtitle aligned bottom-left.
- Event cards: same 16:9 / 8px radius language, grayscale photo, month + large day top-left, gold dash, title, then `time · platform · host · price`.
- Add to iPhone / Add to Android: the approved gold lockups (`hub/assets/add-iphone.png`, `hub/assets/add-android.png`) — black Apple / Android mark, black type, gold pill. Side by side on desktop (max 420px each). On viewports ≤700px they stack, full content width on phones. Links stay `config.js` `ADD_IOS` / `ADD_ANDROID`.
- Footer: black rounded card (~10px) inside the page gutter, four columns (brand + Hub + Support + Broker), then a light “© 2026 ENESMA Realty. For agent use only.” line.

## Gold vs red

- **Gold** is the accent: 2px rules under section titles, 36px dashes on tiles/events, pill fills, icon strokes, nav hover, apps-bar hover fill.
- **Red** is reserved for errors (login / OTP) and for E-Sign / destructive patterns on sibling apps. Do not use red as a decorative accent on marketing pages.

## Sign-in (new vs live Google Site)

The live Google Site is public. The rebuild is a signed-in portal. Login is a centered white card on Rocket Black with the same header wordmark. OTP (after the backend ships) is a second step on that card, with “Trust this device for 30 days.”
