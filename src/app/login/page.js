"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
    <main className="min-h-screen flex items-center justify-center bg-loop-950 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-loop-950">
          Log in to CleanLoop
        </h1>
        <p className="mt-1 text-sm text-loop-700">
          Residents, operations, crew, and volunteers all sign in here.
        </p>

        {searchParams.get("reset") === "1" && (
          <p className="mt-4 rounded-[3px] bg-loop-700/10 px-3 py-2 text-sm text-loop-700">
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
              <Link href="/forgot-password" className="text-xs text-loop-700 underline">
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

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-sm text-loop-700">
          No account yet?{" "}
          <Link href="/register" className="font-medium text-loop-900 underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
