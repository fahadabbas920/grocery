"use client";

import { useState } from "react";
import { Button, Input } from "@grocery/ui";
import { resolveAuthIdentifier } from "@grocery/shared";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getBrowserSupabase();
    const { authEmail } = resolveAuthIdentifier(identifier.trim());
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    window.location.replace("/");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Input
        placeholder="Email or phone"
        aria-label="Email or phone number"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        aria-label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && (
        <p role="alert" className="text-sm text-(--color-destructive)">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
