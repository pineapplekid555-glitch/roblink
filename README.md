# Roblink (Supabase edition)

A Discord-style chat app: static front-end (`index.html`) + Supabase backend (Postgres, Auth, Realtime, Storage).

## Setup
1. **Database** – Supabase dashboard → *SQL Editor* → *New query* → paste all of `schema.sql` → *Run*.
2. **Auth URLs** – *Authentication → URL Configuration*: set **Site URL** to your GitHub Pages address
   (e.g. `https://pineapplekid555-glitch.github.io/roblink/`) and add it under **Redirect URLs**.
3. *(Optional, easier testing)* *Authentication → Sign In / Providers → Email* → turn **Confirm email** off.
4. **Host** – upload `index.html` to the GitHub repo root and enable *Settings → Pages → Deploy from branch (main, /root)*.
5. **Sign up** in the app, then make yourself platform owner (SQL Editor):
   `update public.profiles set platform_role = 'owner' where username = 'YOUR_USERNAME';`
   A **Staff Panel** then appears in your user settings.

## Files
- `index.html` – the whole app (built from `src/` by `build.sh`)
- `schema.sql` – tables, row-level security, RPC functions, storage bucket, realtime
- `src/` – `core.js` (UI rendering), `ui.js` (menus/settings), `data.js` (Supabase layer), `staff.js`, `style.css`

## Known limits
- Voice channels show who is connected, but there is no audio yet.
- Roblink Plus is a free demo toggle (`set_plus_demo`). Replace it with a payment webhook before charging anyone.
- Bot commands run in the sender's browser; a technical user could post arbitrary text as an installed bot.
