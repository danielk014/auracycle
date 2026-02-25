import { createClient } from "@supabase/supabase-js";

// The anon key is safe to expose in client code — it's protected by Row Level Security.
// The service role key must NEVER be used here.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://zgcckaaucihifxcmtfux.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY2NrYWF1Y2loaWZ4Y210ZnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzYyNDAsImV4cCI6MjA4NzYxMjI0MH0.bI0qx8EMCaxC34VChwxqukRqjQZi7HxHDPOW6yAVVBw";

// Abort any Supabase network request that takes longer than 8 seconds.
// This prevents auth from hanging forever if the token-refresh call stalls
// (e.g. cold-start latency on Vercel → Supabase), which is the root cause
// of the "stuck on loading" bug on page refresh.
function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});
