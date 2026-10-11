"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "" });

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    if (mismatch) return;
    setStatus({ loading: true, error: "" });
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detailMsg = data.details ? Object.values(data.details).flat().join(" ") : "";
        setStatus({
          loading: false,
          error: (data.error || "Could not reset password") + (detailMsg ? ` ${detailMsg}` : ""),
        });
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setStatus({ loading: false, error: "Something went wrong. Please try again." });
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-loop-950 px-4">
      <div className="card w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-loop-950">
          Choose a new password
        </h1>

        {!token ? (
          <p className="mt-4 text-sm text-red-600">
            This reset link is missing its token.{" "}
            <Link href="/forgot-password" className="underline">
              Request a new link
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="field-label" htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="field-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-loop-500">
                At least 8 characters, including a letter and a number.
              </p>
            </div>
            <div>
              <label className="field-label" htmlFor="confirm-password">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="field-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {mismatch && (
                <p className="mt-1 text-xs text-red-600">Passwords don&rsquo;t match.</p>
              )}
            </div>
            {status.error && <p className="text-sm text-red-600">{status.error}</p>}
            <button
              type="submit"
              disabled={status.loading || mismatch}
              className="btn-primary w-full disabled:opacity-60"
            >
              {status.loading ? "Saving…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
