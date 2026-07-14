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
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getBrowserSupabase();

    const { data, error } =
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

    // Signup with email confirmation enabled returns a user but no session.
    // Don't redirect a session-less user — show a "check your email" state.
    if (mode === "signup" && !data.session) {
      setLoading(false);
      setConfirmEmailSent(true);
      return;
    }

    // Hard navigation bypasses stale RSC cache after sign-in.
    window.location.replace(redirectTo);
  }

  if (confirmEmailSent) {
    return (
      <div className="rounded-xl border border-(--color-border) bg-muted/40 p-6 text-center">
        <p className="text-base font-semibold text-(--color-foreground)">Check your email</p>
        <p className="mt-2 text-sm text-(--color-muted-foreground)">
          We sent a confirmation link to <span className="font-medium">{email}</span>. Open it to
          finish creating your account, then sign in.
        </p>
        <button
          type="button"
          onClick={() => {
            setConfirmEmailSent(false);
            setMode("signin");
          }}
          className="mt-4 text-sm font-medium text-(--color-primary) underline-offset-2 hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
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
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-muted-foreground) hover:text-(--color-foreground)"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-10 w-full items-center justify-center rounded-lg bg-(--color-primary) text-sm font-semibold text-(--color-primary-foreground) transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <p className="text-center text-sm text-(--color-muted-foreground)">
        {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-(--color-primary) underline-offset-2 hover:underline"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
          }}
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
