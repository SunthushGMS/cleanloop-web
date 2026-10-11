"use client";

import { useEffect, useState } from "react";

/**
 * ProfileManager
 * --------------------------------------------------------------------------
 * Three independent forms (name, email, password), each with its own
 * submit/loading/error/success state — a failed password change shouldn't
 * blank out an in-progress name edit. `initialUser` comes from the server
 * component (src/app/profile/page.js -> getCurrentUser()), so the page has
 * real data on first paint instead of a client-side loading flash.
 *
 * Endpoints:
 *  - PATCH /api/auth/profile   { name }                     -> rename
 *  - PATCH /api/auth/profile   { email, currentPassword }    -> change email
 *  - PATCH /api/auth/password  { currentPassword, newPassword } -> change password
 */
export default function ProfileManager({ initialUser }) {
  const [user, setUser] = useState(initialUser);

  return (
    <div className="space-y-6">
      <AccountSummaryCard user={user} />
      <NameForm user={user} onUpdated={setUser} />
      {user.role === "resident" && <ZoneForm user={user} onUpdated={setUser} />}
      <EmailForm user={user} onUpdated={setUser} />
      <PasswordForm />
    </div>
  );
}

// --- Account summary --------------------------------------------------

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function AccountSummaryCard({ user }) {
  const joined = user.createdAt ? formatDate(user.createdAt) : null;
  const passwordChanged = user.passwordChangedAt
    ? formatDate(user.passwordChangedAt)
    : "Never (since account creation)";

  return (
    <section className="card">
      <h2 className="font-display text-base font-semibold text-loop-950">
        Account summary
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <SummaryRow label="Role" value={<span className="capitalize">{user.role}</span>} />
        {user.zone && <SummaryRow label="Zone / ward" value={user.zone} />}
        {joined && <SummaryRow label="Member since" value={joined} />}
        <SummaryRow label="Password last changed" value={passwordChanged} />
      </dl>
    </section>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-loop-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-loop-900">{value}</dd>
    </div>
  );
}

// --- Shared helper -----------------------------------------------------

function extractErrorMessage(data, fallback) {
  // Mirrors the pattern already used in register/page.js for zod field errors.
  const detailMsg = data?.details ? Object.values(data.details).flat().join(" ") : "";
  return (data?.error || fallback) + (detailMsg ? ` ${detailMsg}` : "");
}

function FormFeedback({ status }) {
  if (status.error) return <p className="mt-3 text-sm text-red-600">{status.error}</p>;
  if (status.success) return <p className="mt-3 text-sm text-loop-700">{status.success}</p>;
  return null;
}

// --- Name form -----------------------------------------------------------

function NameForm({ user, onUpdated }) {
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const dirty = name.trim() !== user.name;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!dirty) return;
    setStatus({ loading: true, error: "", success: "" });

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ loading: false, error: extractErrorMessage(data, "Could not update name"), success: "" });
        return;
      }
      onUpdated(data.user);
      setStatus({ loading: false, error: "", success: "Name updated." });
    } catch {
      setStatus({ loading: false, error: "Something went wrong. Please try again.", success: "" });
    }
  }

  return (
    <section className="card">
      <h2 className="font-display text-base font-semibold text-loop-950">Display name</h2>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="field-label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            required
            minLength={2}
            maxLength={80}
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={!dirty || status.loading}
          className="btn-primary shrink-0 disabled:opacity-50"
        >
          {status.loading ? "Saving…" : "Save name"}
        </button>
      </form>
      <FormFeedback status={status} />
    </section>
  );
}

// --- Zone form (residents only) -------------------------------------------

function ZoneForm({ user, onUpdated }) {
  const [zone, setZone] = useState(user.zone || "");
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const dirty = zone !== (user.zone || "");

  useEffect(() => {
    fetch("/api/zones")
      .then((r) => r.json())
      .then((data) => setZones(data.zones || []))
      .catch((err) => console.error("ZoneForm loadZones error:", err))
      .finally(() => setZonesLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!dirty || !zone) return;
    setStatus({ loading: true, error: "", success: "" });

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ loading: false, error: extractErrorMessage(data, "Could not update zone"), success: "" });
        return;
      }
      onUpdated(data.user);
      setStatus({
        loading: false,
        error: "",
        success: "Zone updated. Your schedule and alerts now follow this zone.",
      });
    } catch {
      setStatus({ loading: false, error: "Something went wrong. Please try again.", success: "" });
    }
  }

  return (
    <section className="card">
      <h2 className="font-display text-base font-semibold text-loop-950">Zone / ward</h2>
      <p className="mt-1 text-sm text-loop-500">
        Moved house? Your collection schedule and truck alerts follow this zone.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="field-label" htmlFor="profile-zone">
            Zone
          </label>
          <select
            id="profile-zone"
            required
            className="field-input"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            disabled={zonesLoading}
          >
            <option value="">{zonesLoading ? "Loading zones…" : "Select your zone"}</option>
            {zones.map((z) => (
              <option key={z._id} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!dirty || !zone || status.loading}
          className="btn-primary shrink-0 disabled:opacity-50"
        >
          {status.loading ? "Saving…" : "Save zone"}
        </button>
      </form>
      <FormFeedback status={status} />
    </section>
  );
}

// --- Email form ------------------------------------------------------------

function EmailForm({ user, onUpdated }) {
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const dirty = email.trim().toLowerCase() !== user.email;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!dirty) return;
    setStatus({ loading: true, error: "", success: "" });

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), currentPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ loading: false, error: extractErrorMessage(data, "Could not update email"), success: "" });
        return;
      }
      onUpdated(data.user);
      setCurrentPassword("");
      setStatus({ loading: false, error: "", success: "Email updated." });
    } catch {
      setStatus({ loading: false, error: "Something went wrong. Please try again.", success: "" });
    }
  }

  return (
    <section className="card">
      <h2 className="font-display text-base font-semibold text-loop-950">Email address</h2>
      <p className="mt-1 text-sm text-loop-500">
        You&rsquo;ll use this to log in. Confirm your current password to change it.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Only asked for once the email actually differs from the stored
            one — keeps the form quiet until the sensitive path is triggered. */}
        {dirty && (
          <div>
            <label className="field-label" htmlFor="email-current-password">
              Current password
            </label>
            <input
              id="email-current-password"
              type="password"
              required
              autoComplete="current-password"
              className="field-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!dirty || status.loading}
          className="btn-primary disabled:opacity-50"
        >
          {status.loading ? "Saving…" : "Save email"}
        </button>
      </form>
      <FormFeedback status={status} />
    </section>
  );
}

// --- Password form ----------------------------------------------------

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && !mismatch;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus({ loading: true, error: "", success: "" });

    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ loading: false, error: extractErrorMessage(data, "Could not update password"), success: "" });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus({ loading: false, error: "", success: "Password updated." });
    } catch {
      setStatus({ loading: false, error: "Something went wrong. Please try again.", success: "" });
    }
  }

  return (
    <section className="card">
      <h2 className="font-display text-base font-semibold text-loop-950">Password</h2>
      <p className="mt-1 text-sm text-loop-500">
        At least 8 characters, including a letter and a number.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-3">
        <div>
          <label className="field-label" htmlFor="current-password">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            required
            autoComplete="current-password"
            className="field-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="confirm-password">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            className="field-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {mismatch && <p className="mt-1 text-xs text-red-600">Passwords don&rsquo;t match.</p>}
        </div>
        <button
          type="submit"
          disabled={!canSubmit || status.loading}
          className="btn-primary disabled:opacity-50"
        >
          {status.loading ? "Saving…" : "Update password"}
        </button>
      </form>
      <FormFeedback status={status} />
    </section>
  );
}