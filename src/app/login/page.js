"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/layout/AuthShell";

const ROLE_HOME = {
  resident: "/resident",
  admin: "/admin",
  employee: "/employee",
  volunteer: "/volunteer",
};

// Only follow ?next= when it's an in-app path. "//evil.com" and
// "/\evil.com" are protocol-relative to browsers, so they're rejected too —
// otherwise the login form doubles as an open redirect for phishing links.
function safeNextPath(next) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null;
  }
  return next;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      const destination =
        safeNextPath(searchParams.get("next")) || ROLE_HOME[data.user.role] || "/";
      router.push(destination);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-loop-900">
          Log in to CleanLoop
        </h1>
        <p className="mt-2 text-sm text-loop-500">
          Residents, operations, crew, and volunteers all sign in here.
        </p>

        {searchParams.get("reset") === "1" && (
          <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Password reset. Log in with your new password.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="field-input"
              value={form.email}
              onChange={update("email")}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="field-input"
              value={form.password}
              onChange={update("password")}
            />
          </div>

          {error && <p className="text-sm text-clay-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-sm text-loop-700">
          No account yet?{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800">
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
