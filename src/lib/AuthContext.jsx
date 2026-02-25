import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

const profileCacheKey = (userId) => `aura_profile_${userId}`;

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialised  = useRef(false);
  // Keep a ref of the current profile so we never wipe it on a background re-fetch failure
  const profileRef   = useRef(null);

  const loadProfile = async (userId, { isInitial = false } = {}) => {
    // On initial load, immediately restore from cache to avoid any onboarding flash
    if (isInitial) {
      try {
        const cached = localStorage.getItem(profileCacheKey(userId));
        if (cached) {
          const cachedProfile = JSON.parse(cached);
          profileRef.current = cachedProfile;
          setProfile(cachedProfile);
          setLoading(false); // stop spinner right away — we have enough to render
        }
      } catch {}
    }

    try {
      const { data } = await Promise.race([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("profile_timeout")), 5000)
        ),
      ]);
      profileRef.current = data ?? null;
      setProfile(data ?? null);
      // Keep cache up-to-date for the next load
      if (data) {
        localStorage.setItem(profileCacheKey(userId), JSON.stringify(data));
      } else {
        localStorage.removeItem(profileCacheKey(userId));
      }
    } catch {
      // On initial load with no cached profile, clear it.
      // On background re-fetches (TOKEN_REFRESHED etc.) keep what we have —
      // this prevents the onboarding flash when a background refresh times out.
      if (isInitial && !profileRef.current) {
        profileRef.current = null;
        setProfile(null);
      }
      // else: silently keep existing profile
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 4000);

    // Fast path — getSession() reads localStorage then optionally refreshes
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (initialised.current) return;
        initialised.current = true;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          loadProfile(currentUser.id, { isInitial: true });
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (!initialised.current) {
          initialised.current = true;
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;

        if (event === "INITIAL_SESSION") {
          if (initialised.current) return;
          initialised.current = true;
          setUser(currentUser);
          if (currentUser) {
            await loadProfile(currentUser.id, { isInitial: true });
          } else {
            setLoading(false);
          }
          return;
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          profileRef.current = null;
          setProfile(null);
          setLoading(false);
          return;
        }

        if (event === "TOKEN_REFRESHED") {
          // Token refresh doesn't change user data — just update the user object.
          // Do NOT re-fetch the profile; that would wipe it on a timeout and
          // send the user back to onboarding mid-session.
          setUser(currentUser);
          return;
        }

        // SIGNED_IN (after login), USER_UPDATED, PASSWORD_RECOVERY
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser.id, { isInitial: !profileRef.current });
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id, { isInitial: false });
  };

  const logout = async () => {
    // Clear profile cache so the next login starts fresh
    if (user?.id) {
      localStorage.removeItem(profileCacheKey(user.id));
    }
    await supabase.auth.signOut();
    setUser(null);
    profileRef.current = null;
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
