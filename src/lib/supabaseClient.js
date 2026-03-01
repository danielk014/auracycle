import { createClient } from "@supabase/supabase-js";

// The anon key is safe to expose in client code — it's protected by Row Level Security.
// The service role key must NEVER be used here.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://zgcckaaucihifxcmtfux.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY2NrYWF1Y2loaWZ4Y210ZnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzYyNDAsImV4cCI6MjA4NzYxMjI0MH0.bI0qx8EMCaxC34VChwxqukRqjQZi7HxHDPOW6yAVVBw";

// Abort any Supabase network request that takes longer than 20 seconds.
// Keeping this generous prevents the token-refresh call from being aborted
// on slow mobile networks (e.g. Edge PWA opening from homescreen on a weak
// signal) — an aborted refresh triggers SIGNED_OUT and logs the user out.
// 20 s still catches genuine hangs while tolerating slow mobile connections.
function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
  auth: {
    persistSession: true,       // always write session to storage
    autoRefreshToken: true,     // refresh token before it expires
    detectSessionInUrl: true,   // pick up tokens from URL on PWA cold-start
    storageKey: "auracycle-auth-token", // stable key across browser/PWA contexts
  },
});
