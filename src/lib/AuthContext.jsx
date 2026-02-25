import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Prevents double-processing the initial session when both getSession() and
  // INITIAL_SESSION fire around the same time.
  const initialised = useRef(false);

  // loadProfile has its own 3-second Promise.race timeout so a slow/hung DB
  // query can never keep loading=true indefinitely.
  const loadProfile = async (userId) => {
    try {
      const { data } = await Promise.race([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("profile_timeout")), 3000)
        ),
      ]);
      setProfile(data ?? null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Layer 3: Absolute hard cap — loading can never stay true beyond 4 seconds.
    const safetyTimer = setTimeout(() => setLoading(false), 4000);

    // Layer 1: getSession() — reads localStorage first, fast.
    // Only does a network call if the token needs refreshing.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (initialised.current) return;
        initialised.current = true;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          loadProfile(currentUser.id);
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

    // Layer 2: onAuthStateChange — covers INITIAL_SESSION, SIGNED_IN, SIGNED_OUT,
    // TOKEN_REFRESHED, and all subsequent auth events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;

        if (event === "INITIAL_SESSION") {
          // Deduplicate with getSession() — whichever fires first wins.
          if (initialised.current) return;
          initialised.current = true;
          setUser(currentUser);
          if (currentUser) {
            await loadProfile(currentUser.id);
          } else {
            setLoading(false);
          }
          return;
        }

        // All other events (login, logout, token refresh) — update state directly.
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
