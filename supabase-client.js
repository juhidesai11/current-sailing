/* CURRENT — Supabase client.
   This is the publishable (anon) key: safe to ship to the browser. Row Level
   Security in supabase/schema.sql is what actually enforces who can read or
   write what — this file only points the browser at the project. */
window.CURRENT_SUPABASE = window.supabase.createClient(
  "https://fegvyjmhxjbrfrntegdc.supabase.co",
  "sb_publishable_4tDRc6fOfxplOJtfGNE4NQ_bVai882j"
);
