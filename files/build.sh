#!/bin/bash
# Builds files/index.html from the original ../src modules + the new feature modules in this folder.
cd "$(dirname "$0")"
SRC=./src
{
echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roblink</title><meta name="description" content="Roblink - independent chat app."><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 rx=%2716%27 fill=%27%237c5cff%27/%3E%3Ctext x=%2732%27 y=%2744%27 font-size=%2734%27 text-anchor=%27middle%27 fill=%27white%27 font-family=%27sans-serif%27 font-weight=%27700%27%3ER%3C/text%3E%3C/svg%3E"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet"><style>'
cat $SRC/style.css theme.css
echo '</style></head><body data-theme="dark"><div id="boot"><div class="auth"><div class="lg"></div><h1>Loading Roblink…</h1></div></div><div id="app"><div id="nav"><nav id="rail"></nav><aside id="side"></aside></div><main id="main"></main><aside id="members"></aside></div>'
echo '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script>'
cat $SRC/core.js $SRC/ui.js $SRC/data.js $SRC/plans.js $SRC/staff.js crop.js voice.js features.js
echo '</script></body></html>'
} > index.html
