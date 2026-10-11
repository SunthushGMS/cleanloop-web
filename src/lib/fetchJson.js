function buildMessage(data, fallback) {
  const details = data?.details
    ? Object.entries(data.details)
        .map(([field, msgs]) => `${field}: ${[].concat(msgs).join(", ")}`)
        .join("; ")
    : "";
  return (data?.error || fallback) + (details ? ` (${details})` : "");
}

/**
 * fetch + JSON parsing + readable errors.
 * Throws an Error whose message can be shown directly to the user.
 */
export async function fetchJson(url, options = {}) {
  const method = options.method || "GET";
  const res = await fetch(url, { cache: "no-store", ...options });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      `${method} ${url} returned ${res.status}, not JSON. Check that the API route file exists at the matching path.`
    );
  }

  if (!res.ok) {
    throw new Error(buildMessage(data, `Request failed (${res.status})`));
  }
  return data;
}