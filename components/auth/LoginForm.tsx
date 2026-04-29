"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { getSafeRedirectPath } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const nextPath = getSafeRedirectPath(searchParams.get("next"));

  async function handleAuth(mode: "sign-in" | "sign-up") {
    setMessage(null);
    setIsLoading(true);

    const supabase = getSupabaseBrowserClient();
    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
            },
          });

    setIsLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "sign-up" && !result.data.session) {
      setMessage("Check your email to confirm the new Grimoire account.");
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAuth("sign-in");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
        Password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          placeholder="Minimum 6 characters"
        />
      </label>

      {message ? (
        <div className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#FBBF24]" role="status">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <LockKeyhole className="size-4" aria-hidden="true" /> : <LogIn className="size-4" aria-hidden="true" />}
        {isLoading ? "Signing in" : "Sign in"}
      </button>

      <button
        type="button"
        disabled={isLoading}
        onClick={() => void handleAuth("sign-up")}
        className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-semibold text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UserPlus className="size-4" aria-hidden="true" />
        Create account
      </button>
    </form>
  );
}
