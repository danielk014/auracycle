/**
 * Data access layer — all Supabase queries go here.
 * RLS policies guarantee strict per-user data isolation at the DB level.
 */
import { supabase } from "./supabaseClient";

const SETTINGS_CACHE_KEY = "aura_cycle_settings";
const LOGS_CACHE_KEY     = "aura_cycle_logs";

// ─── CYCLE LOGS ───────────────────────────────────────────────

export function getCycleLogsCache() {
  try {
    const cached = localStorage.getItem(LOGS_CACHE_KEY);
    return cached ? JSON.parse(cached) : undefined;
  } catch {
    return undefined;
  }
}

export async function getCycleLogs(limit = 200) {
  const { data, error } = await supabase
    .from("cycle_logs")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const result = data ?? [];
  // Cache up to 500 entries for instant display on next load
  if (result.length > 0) {
    try { localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(result.slice(0, 500))); } catch {}
  }
  return result;
}

export async function createCycleLog(logData) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("cycle_logs")
    .insert({ ...logData, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCycleLog(id) {
  const { error } = await supabase
    .from("cycle_logs")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function updateCycleLog(id, logData) {
  const { data, error } = await supabase
    .from("cycle_logs")
    .update(logData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── CYCLE SETTINGS ───────────────────────────────────────────

export function getCycleSettingsCache() {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    return cached ? JSON.parse(cached) : undefined;
  } catch {
    return undefined;
  }
}

export async function getCycleSettings() {
  const { data, error } = await supabase
    .from("cycle_settings")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (data) {
    try { localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data)); } catch {}
  }
  return data ?? null;
}

export async function upsertCycleSettings(settingsData) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("cycle_settings")
    .upsert(
      { ...settingsData, user_id: user.id },
      { onConflict: "user_id" }
    )
    .select()
    .single();
  if (error) throw error;
  if (data) {
    try { localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data)); } catch {}
  }
  return data;
}

export function clearSettingsCache() {
  try {
    localStorage.removeItem(SETTINGS_CACHE_KEY);
    localStorage.removeItem(LOGS_CACHE_KEY);
  } catch {}
}

// ─── PROFILES ─────────────────────────────────────────────────

export async function getProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertProfile(profileData) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { ...profileData, id: user.id, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
