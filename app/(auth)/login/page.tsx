"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push(from);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-7 rounded-[28px] border border-base-border bg-white p-8 md:p-10 shadow-soft">
      {/* Header with App Branding */}
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-pastel-lavender via-pastel-blue to-pastel-yellow border border-white text-charcoal-900 mb-4 shadow-sm">
          <Sparkles className="h-6 w-6 text-charcoal-900" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
          StockFlow AI
        </h1>
        <p className="mt-1.5 text-xs text-charcoal-muted">
          Personal Adobe Stock AI portfolio management suite
        </p>
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-2.5 rounded-full border border-[#D5E5F2] bg-[#EEF5FB] px-4 py-2 text-xs text-[#2C4866]">
        <ShieldCheck className="h-4 w-4 text-[#2C4866] flex-shrink-0" />
        <span>Portfolio protected. Enter master password to access.</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl border border-status-rejectedBorder bg-status-rejectedBg px-4 py-3 text-xs text-status-rejectedText">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-charcoal-muted mb-2"
          >
            Master Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-charcoal-muted">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              placeholder="Enter password..."
              className="w-full rounded-full border border-base-border bg-base-cardWarm py-3 pl-11 pr-11 text-sm text-charcoal-900 placeholder-charcoal-muted/60 transition-all focus:border-pastel-lavenderDeep focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-charcoal-muted hover:text-charcoal-900 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="group relative flex w-full items-center justify-center gap-2 rounded-full bg-charcoal-900 py-3.5 px-6 text-sm font-semibold text-white shadow-md transition-all hover:bg-charcoal-800 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          <span>{loading ? "Unlocking..." : "Unlock Portfolio"}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </form>

      {/* Footer Info */}
      <div className="text-center pt-2">
        <p className="text-[11px] text-charcoal-muted">
          Protected by signed HttpOnly session cookie.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-bg px-4 py-12">
      <Suspense fallback={<div className="text-charcoal-muted text-sm font-medium">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
