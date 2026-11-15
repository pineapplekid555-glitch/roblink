# Roblink files/ folder
To update GitHub: delete the old `files` folder in the repo, upload this one, and point Pages at `files/index.html` (or copy index.html to the repo root).

0. Install as app: Chrome/Edge on PC shows an Install button (sw.js, manifest.json and icons must stay in this folder).
1. Supabase SQL Editor: run `migration_003_features.sql` once (safe to re-run). Fresh installs: run `schema.sql`, `migration_002_tiers.sql`, then 003.
2. Supabase → Authentication → Multi-Factor: enable TOTP (needed for 2FA).
3. Run `migration_004_booster_badge.sql` once too (permanent booster badge).
4. Platform owner: open a server, then 🛡️ Moderation → "Set current server as auto-join".
5. Rebuild after editing any module: `bash files/build.sh` (outputs files/index.html).

Rail buttons: 🧰 server tools (channel permissions, discovery, invites, custom bots), 🔐 2FA, ✨ Plus style, 🛡️ staff moderation.
Voice is peer-to-peer WebRTC (best for ~6 people per room, STUN only; add a TURN server for strict networks).


## Sign-up emails not sending ('email rate limit exceeded')
Supabase's built-in email sender only allows a few emails per hour. Fix: Authentication -> Sign In / Providers -> Email -> turn **Confirm email** off (accounts then work instantly), or set custom SMTP (Resend/Brevo/Mailgun) under Authentication -> Emails -> SMTP Settings. To confirm people who are stuck, run in the SQL Editor:
`update auth.users set email_confirmed_at = now() where email_confirmed_at is null;`


## Username login + switching accounts
- Run `migration_005_username_login.sql` once in the Supabase SQL Editor. People can then type their username OR email on the login screen.
- Privacy note: this lets anyone who knows a username look up that account's sign-in email. Users can switch it off with the checkbox in the account switcher (👥 button next to the mic/settings buttons).
- 👥 Switch account: stay signed in to several accounts on one device; accounts are remembered only in this browser. Log out removes just the current account.

## Legal pages (read before launch!)
* `terms.html`, `privacy.html`, `guidelines.html` are static pages. **Open `legal-config.js` and fill in your name/business, contact email, address and your Supabase region.** A red warning shows on the pages until you do.
* Sign-up now asks for date of birth (under 13 is blocked, DOB is never stored – only `age_group`, `tos_version` and `tos_accepted_at` go into the user's metadata) and requires ticking the agreement box. Existing users get a one-time "agree to continue" screen. Bump `TOS_VER` in `src/data.js` whenever you change the Terms materially to make everyone re-accept.
* These are templates, not legal advice. Have a solicitor review them. In the UK, check your duties under the Online Safety Act and register/pay the ICO data-protection fee if it applies to you.

## Roles, channels & drag-and-drop (run `migration_006_roles_order.sql`)
* New server-settings pages: **Auto Roles**, **Bot Roles**, **Messages** (welcome message).
* Channel permissions are now inside each channel's own settings (⚙️ → Permissions), including an @everyone override for private channels.
* Drag ⠿ to reorder roles, channels and categories (sidebar and settings). Servers in the top bar were already draggable.
