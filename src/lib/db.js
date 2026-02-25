/**
 * Data access layer — all Supabase queries go here.
 * RLS policies guarantee strict per-user data isolation at the DB level.
 */
import { supabase } from "./supabaseClient";

// ─── CYCLE LOGS ───────────────────────────────────────────────

export async function getCycleLogs(limit = 200) {
  const { data, error } = await supabase
    .from("cycle_logs")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
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

// ─── CYCLE SETTINGS ───────────────────────────────────────────

export async function getCycleSettings() {
  const { data, error } = await supabase
    .from("cycle_settings")
    .select("*")
    .maybeSingle();
  if (error) throw error;
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
  return data;
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
