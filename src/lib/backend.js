const DEFAULT_BACKEND_URL = "http://localhost:8000";

function normalizeBackendUrl(value) {
  const raw = (value || DEFAULT_BACKEND_URL).trim().replace(/\/+$/, "");
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return DEFAULT_BACKEND_URL;
  }
  return raw;
}

export const BACKEND_URL = normalizeBackendUrl(process.env.NEXT_PUBLIC_BACKEND_URL);

export function buildBackendUrl(pathname) {
  if (!pathname) return BACKEND_URL;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (typeof window !== "undefined") {
    try {
      const origin = window.location.origin;
      const backendOrigin = new URL(BACKEND_URL).origin;
      if (origin !== backendOrigin) {
        return `${origin}/api/backend${path}`;
      }
    } catch (_) {}
  }
  return `${BACKEND_URL}${path}`;
}

