# Roblink

A Discord-style chat app that runs entirely in the browser (HTML/CSS/JS, no build step).

## Run / deploy
- Open `index.html`, or push it to this repo and enable **Settings → Pages → Deploy from branch (main, /root)**.

## Features
- Servers (templates, create/join by invite, explore), channels & categories, voice channel UI
- DMs, friends (add / pending / block), custom status
- Messages: markdown, replies, edits, pins, reactions, emoji picker, image uploads, search, polls
- Bots with slash commands: DiceBot, OracleBot, PollBot, ModBot (auto-mod, purge), MusicBot
- Roles with real permission checks and role hierarchy, member management (kick / ban / timeout), audit log
- Server settings: overview, roles, emoji, boosts, safety, channels, members, bots, invites, bans, audit, delete
- User settings: account/profile, privacy, appearance (themes, accent, compact mode), notifications, voice & video, keybinds
- Roblink Plus (demo, no payment): gradient themes, animated name, GIF avatar & banner, emoji everywhere, bigger uploads, boosts, soundboard, super reactions

## Important
All data is stored in your browser's `localStorage` and other "people" are simulated. For real multi-user chat you need a backend (e.g. Supabase or Firebase) — the UI is ready to be wired to one.
