/* Pedalz configuration — edit this file, not index.html. */
window.PEDALZ_CONFIG = {
  /* Supabase: create a project, run supabase/schema.sql, paste Project URL + ANON public key.
     Never use the service_role key. Leave empty for local-only demo mode. */
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  /* Map tiles — OPTIONAL. By default Pedalz uses free OpenStreetMap tiles (no API key); dark mode
     darkens those tiles in the browser. For a busy production app, OSM's usage policy asks you to use
     your own/commercial tile provider. Put its raster URL template here, e.g.
       "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY"
     If you set only TILE_URL_LIGHT, dark mode reuses it with the same darkening filter. */
  TILE_URL_LIGHT: "",
  TILE_URL_DARK: "",
  TILE_URL_SAT: "",          // optional satellite template; default is Esri World Imagery (free, attribution shown)
  TILE_SUBDOMAINS: "abc",
  TILE_ATTRIBUTION: ""
};
