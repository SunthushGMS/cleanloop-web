"use client";

import { useState } from "react";
import Link from "next/link";

const IDLE = { loading: false, error: "", message: "", devResetUrl: "" };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(IDLE);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ ...IDLE, loading: true });
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detailMsg = data.details ? Object.values(data.details).flat().join(" ") : "";
        setStatus({ ...IDLE, error: (data.error || "Request failed") + (detailMsg ? ` ${detailMsg}` : "") });
        return;
      }
      setStatus({ ...IDLE, message: data.message, devResetUrl: data.devResetUrl || "" });
    } catch {
      setStatus({ ...IDLE, error: "Something went wrong. Please try again." });
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-loop-950 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-loop-950">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-loop-700">
          Enter your account email and we&rsquo;ll send you a link to choose a new password.
        </p>

        {status.message ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-[3px] bg-loop-700/10 px-3 py-2 text-sm text-loop-700">
              {status.message}
            </p>
            {/* Dev-only: no mail provider is configured yet, so the API hands
                the link back outside production (see forgot-password route). */}
            {status.devResetUrl && (
              <p className="text-xs text-loop-500">
                Development mode: no email is sent.{" "}
                <a href={status.devResetUrl} className="font-medium text-loop-900 underline">
                  Open the reset link
                </a>
              </p>
            )}
          </div>
        ) : (
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {status.error && <p className="text-sm text-red-600">{status.error}</p>}
            <button
              type="submit"
              disabled={status.loading}
              className="btn-primary w-full disabled:opacity-60"
            >
              {status.loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-loop-700">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-loop-900 underline">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}
