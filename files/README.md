# Roblink files/ folder
To update GitHub: delete the old `files` folder in the repo, upload this one, and point Pages at `files/index.html` (or copy index.html to the repo root).

1. Supabase SQL Editor: run `migration_003_features.sql` once (safe to re-run). Fresh installs: run `schema.sql`, `migration_002_tiers.sql`, then 003.
2. Supabase → Authentication → Multi-Factor: enable TOTP (needed for 2FA).
3. Platform owner: open a server, then 🛡️ Moderation → "Set current server as auto-join".
4. Rebuild after editing any module: `bash files/build.sh` (outputs files/index.html).

Rail buttons: 🧰 server tools (channel permissions, discovery, invites, custom bots), 🔐 2FA, ✨ Plus style, 🛡️ staff moderation.
Voice is peer-to-peer WebRTC (best for ~6 people per room, STUN only; add a TURN server for strict networks).
