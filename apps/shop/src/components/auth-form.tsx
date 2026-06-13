"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-(--color-foreground)">{label}</label>
      {children}
      {error && <p className="text-xs text-(--color-destructive)">{error}</p>}
    </div>
  );
}

export function AuthForm() {
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getBrowserSupabase();

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Hard navigation so the browser sends a fresh request with the new session
    // cookies, bypassing any stale Next.js RSC cache that would re-trigger the
    // server-side redirect to /login.
    window.location.replace(redirectTo);
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-(--color-border) bg-(--color-background) px-3 text-sm placeholder:text-(--color-muted-foreground) focus:border-(--color-ring) focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <Field label="Full name">
          <input
            className={inputClass}
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Field>
      )}

      <Field label="Email address">
        <input
          type="email"
          className={inputClass}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field label="Password">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className={`${inputClass} pr-10`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-muted-foreground) hover:text-(--color-foreground)"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-10 w-full items-center justify-center rounded-lg bg-(--color-primary) text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <p className="text-center text-sm text-(--color-muted-foreground)">
        {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-(--color-primary) underline-offset-2 hover:underline"
          onClick={() => { setMode((m) => (m === "signin" ? "signup" : "signin")); setError(null); }}
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
