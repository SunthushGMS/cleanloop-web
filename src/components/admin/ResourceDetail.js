"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ResourceFormModal from "./ResourceFormModal";
import StatusBadge from "./StatusBadge";
import { CATEGORY_LABEL, CONDITION_LABEL } from "@/lib/resourceConstants";

// --- Small formatting helpers ---------------------------------------------

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCost(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const show = (value) => (value || value === 0 ? value : "—");

// "fuelType" -> "Fuel type"
function humanize(key) {
  const spaced = key.replace(/([A-Z])/g, " $1").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// --- Layout pieces ------------------------------------------------------------

function Section({ title, children }) {
  return (
    <section className="card">
      <h2 className="font-display text-base font-semibold text-loop-950">{title}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
        {children}
      </dl>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-loop-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-loop-900">{children}</dd>
    </div>
  );
}

// --- Page component -------------------------------------------------------------

export default function ResourceDetail({ id }) {
  const router = useRouter();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/resources/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load resource");
        if (!cancelled) setResource(data.resource);
      } catch (err) {
        console.error("ResourceDetail load error:", err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${resource.name}"? This can't be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/resources/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.push("/admin/resources");
      router.refresh();
    } catch (err) {
      console.error("ResourceDetail delete error:", err);
      alert(err.message);
    }
  }

  const backLink = (
    <Link href="/admin/resources" className="text-sm text-loop-700 hover:underline">
      &larr; Back to resources
    </Link>
  );

  if (loading) {
    return <p className="py-10 text-center text-sm text-loop-500">Loading resource…</p>;
  }

  if (error || !resource) {
    return (
      <div className="py-6">
        {backLink}
        <p className="mt-6 text-sm text-red-600">{error || "Resource not found"}</p>
      </div>
    );
  }

  const overdue =
    resource.nextMaintenanceAt &&
    resource.status !== "retired" &&
    new Date(resource.nextMaintenanceAt) < new Date();

  const extras = Object.entries(resource.meta || {}).filter(([, v]) => v);

  return (
    <div className="space-y-6">
      {backLink}

      {/* Header */}
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-loop-950">
              {resource.name}
            </h1>
            <StatusBadge status={resource.status} />
          </div>
          <p className="mt-1 text-sm text-loop-500">
            {CATEGORY_LABEL[resource.category] || resource.category}
            {resource.registrationNumber ? ` · ${resource.registrationNumber}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className="btn-primary">
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="btn-secondary text-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      <Section title="Registration">
        <Row label="Registration number">{show(resource.registrationNumber)}</Row>
        <Row label="ID / Tag">{show(resource.identifier)}</Row>
        <Row label="Make">{show(resource.make)}</Row>
        <Row label="Model">{show(resource.model)}</Row>
        <Row label="Capacity">{show(resource.capacity)}</Row>
        <Row label="Quantity">{show(resource.quantity)}</Row>
      </Section>

      <Section title="Status & assignment">
        <Row label="Status">
          <StatusBadge status={resource.status} />
        </Row>
        <Row label="Condition">
          {CONDITION_LABEL[resource.condition] || show(resource.condition)}
        </Row>
        <Row label="Zone / location">{show(resource.zone)}</Row>
        <Row label="Driver / operator">{show(resource.operatorName)}</Row>
      </Section>

      <Section title="Purchase & warranty">
        <Row label="Purchase date">{formatDate(resource.purchaseDate)}</Row>
        <Row label="Purchase cost">{formatCost(resource.purchaseCost)}</Row>
        <Row label="Warranty">{show(resource.warranty)}</Row>
      </Section>

      <Section title="Maintenance">
        <Row label="Last serviced">{formatDate(resource.lastServicedAt)}</Row>
        <Row label="Next maintenance">
          <span className={overdue ? "text-red-600" : ""}>
            {formatDate(resource.nextMaintenanceAt)}
            {overdue ? " (overdue)" : ""}
          </span>
        </Row>
      </Section>

      {extras.length > 0 && (
        <Section title="Additional details">
          {extras.map(([key, value]) => (
            <Row key={key} label={humanize(key)}>
              {value}
            </Row>
          ))}
        </Section>
      )}

      {resource.notes && (
        <section className="card">
          <h2 className="font-display text-base font-semibold text-loop-950">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-loop-700">{resource.notes}</p>
        </section>
      )}

      <p className="text-xs text-loop-500">
        Added {formatDate(resource.createdAt)} · Last updated {formatDate(resource.updatedAt)}
      </p>

      {editing && (
        <ResourceFormModal
          target={resource}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setResource(saved);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}