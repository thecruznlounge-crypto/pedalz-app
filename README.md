# Pedalz — installable PWA + Google Play (TWA) package

## 1. Deploy (cPanel)
1. Upload **everything in this folder** (including the hidden `.htaccess` and `.well-known/`) to the web root of an **HTTPS** domain (File Manager → Settings → Show Hidden Files).
2. Open `https://YOUR-DOMAIN/` on Android Chrome → a blue **Install** button appears in the top bar (plus a banner). One tap installs it. iOS: Share → Add to Home Screen (the app shows this hint).
3. After any change, bump `VERSION` in `sw.js` so users get the update.

## 2. Supabase (optional — app runs local-only without it)
1. Create a project → SQL Editor → run `supabase/schema.sql`.
2. Auth → Providers → Email: enable. (Turn off "Confirm email" if you want instant signup.)
3. Put Project URL + **anon** key in `config.js`. Never use the service_role key.
What syncs: profiles, rides, live rider locations (realtime), Gear Shop listings, Causes + joins. Group items use the **group code** members enter in Profile → Settings.
Photos/videos stay on the device (IndexedDB) in v1.0.

## 3. Google Play (Trusted Web Activity)
Play needs an Android bundle (.aab); this package is the web app it wraps.
**Fastest:** go to pwabuilder.com, enter your URL, choose *Android → Google Play*, download, upload the .aab.
**Or Bubblewrap:**
```
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://YOUR-DOMAIN/manifest.json   # or edit twa-manifest.json first
bubblewrap build                                               # creates app-release-bundle.aab
```
Then: Play Console → create app → upload the .aab → **Setup → App signing**, copy the SHA-256 fingerprint into `.well-known/assetlinks.json` (replace the placeholder), re-upload that file, and check `https://YOUR-DOMAIN/.well-known/assetlinks.json` loads. Without it the app shows a browser address bar.
Fill the listing from `STORE_LISTING.md`; privacy policy URL is `https://YOUR-DOMAIN/privacy.html` (edit the contact placeholder first). You must supply a 1024×500 feature graphic and screenshots. New personal Play accounts must complete the closed-testing requirement before production.

## 4. What is implemented
Map with day/night auto tiles (dark mode = OSM tiles darkened in-browser — no API key), crossfade theme toggle (main + mini + route + camera maps), tile error-recovery/fallback provider, offline tile cache + Offline badge · Mini-map sync/expand · Gear-P wordmark ("P" gear + gradient "edalz") · Helmet colors blue/pink/green · Start/Stop with rolling gauges, speedometer arc, summary + chart, share · Walk/Run mode (avatar markers) and mph/km·h units · Heart rate (Web Bluetooth, demo fallback) · Battery Saver (+ auto at ≤20%) · OSM bike/foot turn-by-turn with voice · Profile (owner: edit, genres, gallery, record/upload, ride archive + chart, gear, privacy/settings/PIN; public: view-only) · Tap avatar/helmet to open · Fullscreen camera with gauges + mini-map overlay and fullscreen playback with replayed gauges · Gear Shop (public or group) · Causes + group sync · Feed · Gov · Tools menu: Group, Follow, Center, Theme, Mode, Units, HR, Battery, Install · Settings/Privacy live in the owner profile only · 4-digit PIN lock · installable, service worker, shortcuts.

## 4b. Offline
- After the first online visit the service worker caches the app, libraries and every map tile you view; the app then starts with no connection and shows an **Offline** badge. Ride tracking, profile, media, gear and causes keep working locally; Supabase writes are queued and sent when you're back online.
- **Tools → Save Map Offline** downloads the visible area (~250 tiles, zoom ±2) for riding off-grid. One cache serves both light and dark themes. Keep it modest — OSM asks apps not to bulk-download; use your own tile provider (config.js) for large areas.
- Offline routing/turn-by-turn needs a connection (not cached).

## 4c. Fullscreen gauges + satellite
Tools → **Gauge Fullscreen** (or the ⛶ button by Start). Switch layout at the top: **Classic** (big speed ring, three gauges, minimized map), **Circles** (four round gauges stacked in the centre, small map) or **Corners** (four gauges in the corners, map centered behind them). Your choice is remembered. Exit with ✕.
Tools → **Satellite** (or the 🛰️ button in fullscreen) switches every map to Esri World Imagery. It is free with attribution; for a commercial launch check Esri's terms or set `TILE_URL_SAT` in config.js. Satellite tiles are larger, so Save Map Offline uses more space there.

## 4d. Trainer mode (prototype)
In fullscreen gauges tap **🎧 Trainer**. **Coach**: a generated road scene that moves with your speed, with coaching cues (mile markers, pace, heart-rate warnings) as captions and optional voice. This is rule-based today; the video slot and cue text are where a generated-video / LLM service plugs in (`trDraw`, `coachCue` in index.html). **Live**: paste a YouTube or Twitch link to watch a trainer ride-along (embedded player; chat and sound are handled by the player). Drag the floating window by its ⠿ handle, or tap ⤢ for fullscreen with your gauges overlaid.

## 5. Known limits (be aware before shipping)
- **Go Live** sets a LIVE flag on your marker; real video streaming needs a media server (e.g. LiveKit/Mux) — not included.
- **Biometric login** is a stub (needs a server-issued WebAuthn challenge). PIN lock is real but device-local.
- **Friends** visibility behaves like Group (no friends graph yet). Follow = map camera follows a rider.
- Browsers only deliver GPS while the app is in the foreground; true background tracking needs a native wrapper.
- Libraries (Leaflet, Chart.js, supabase-js) load from CDN and are pre-cached by the service worker at install. To remove the CDN dependency entirely, copy them into the folder and change the `<script>`/`<link>` tags (and `LIB_URLS` in sw.js).
- Tested in headless Chromium with stand-in map libraries (UI flows, auth, shop, causes, profile privacy, ride tracking). Real tiles, Supabase and Bluetooth were not testable in my sandbox — do a device pass after deploying.
