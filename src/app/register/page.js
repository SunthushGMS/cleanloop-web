"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/layout/AuthShell";

const ROLE_HOME = {
  resident: "/resident",
  admin: "/admin",
  employee: "/employee",
  volunteer: "/volunteer",
};

// No admin option: operations accounts are provisioned, not self-registered
// (the register API rejects role "admin" too).
const ROLE_OPTIONS = [
  { value: "resident", label: "Resident" },
  { value: "employee", label: "Collection Crew" },
  { value: "volunteer", label: "Community Volunteer" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "resident",
    zone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Zones come from the admin-managed Zone list (GET /api/zones is
  // PUBLIC — see src/app/api/zones/route.js — specifically so this page
  // can populate the dropdown before the visitor has a session at all).
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/zones")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setZones(data.zones || []);
      })
      .catch((err) => {
        console.error("RegisterPage loadZones error:", err);
        if (!cancelled) setZonesError("Could not load zones.");
      })
      .finally(() => {
        if (!cancelled) setZonesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        const detailMsg = data.details
          ? Object.values(data.details).flat().join(" ")
          : "";
        setError(data.error + (detailMsg ? ` ${detailMsg}` : ""));
        setLoading(false);
        return;
      }

      router.push(ROLE_HOME[data.user.role] || "/");
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
          Create your CleanLoop account
        </h1>
        <p className="mt-2 text-sm text-loop-500">
          Choose the role that matches how you'll use the platform.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="field-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              required
              className="field-input"
              value={form.name}
              onChange={update("name")}
            />
          </div>
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
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="field-input"
              value={form.password}
              onChange={update("password")}
            />
            <p className="mt-1 text-xs text-loop-500">
              At least 8 characters, including a letter and a number.
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="field-input"
              value={form.role}
              onChange={update("role")}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Was a free-text input — now sourced from the admin-managed
              Zone list, so a resident can only pick a zone that actually
              exists (and matches exactly what schedules/routes use). */}
          {form.role === "resident" && (
            <div>
              <label className="field-label" htmlFor="zone">
                Zone / ward
              </label>
              <select
                id="zone"
                required
                className="field-input"
                value={form.zone}
                onChange={update("zone")}
                disabled={zonesLoading || zones.length === 0}
              >
                <option value="">
                  {zonesLoading
                    ? "Loading zones…"
                    : zones.length === 0
                    ? "No zones available yet"
                    : "Select your zone"}
                </option>
                {zones.map((z) => (
                  <option key={z._id} value={z.name}>
                    {z.name}
                  </option>
                ))}
              </select>
              {zonesError && <p className="mt-1 text-xs text-red-600">{zonesError}</p>}
              {!zonesLoading && !zonesError && zones.length === 0 && (
                <p className="mt-1 text-xs text-loop-500">
                  No zones have been set up yet — an administrator needs to
                  add one before residents can register.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-clay-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-loop-700">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}