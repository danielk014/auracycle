import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [mode, setMode]         = useState("login"); // "login" | "signup" | "magic"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [magicSent, setMagicSent] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setMagicSent(true);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (magicSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "linear-gradient(160deg, #faf5ff 0%, #fff0f8 100%)" }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your inbox!</h2>
          <p className="text-slate-500 mb-6 max-w-xs">
            We sent a magic link to <strong className="text-violet-600">{email}</strong>. Click it to sign in.
          </p>
          <button onClick={() => setMagicSent(false)} className="text-sm text-violet-500 hover:text-violet-700 font-medium">
            ← Try a different email
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ background: "linear-gradient(160deg, #faf5ff 0%, #fff0f8 100%)" }}>
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-200">
            <Sparkles className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">AuraCycle</h1>
          <p className="text-slate-400 text-sm">Your personal cycle companion</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-white rounded-3xl p-6 shadow-xl shadow-violet-100 border border-purple-50"
        >
          {/* Mode tabs */}
          <div className="flex bg-slate-50 rounded-2xl p-1 mb-6 gap-1">
            {[["login", "Sign In"], ["signup", "Sign Up"]].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                  mode === m
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                    Your Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-purple-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-purple-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all"
                />
              </div>
            </div>

            {mode !== "magic" && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-purple-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold shadow-lg shadow-violet-200 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Magic link option */}
          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode(mode === "magic" ? "login" : "magic"); setError(""); }}
              className="text-xs text-violet-500 hover:text-violet-700 font-medium"
            >
              {mode === "magic" ? "← Use password instead" : "✨ Sign in with magic link (no password)"}
            </button>
          </div>
        </motion.div>

        <p className="text-center text-xs text-slate-400 mt-6 px-4">
          By continuing, you agree to keep your health data private and secure.
        </p>
      </div>
    </div>
  );
}
