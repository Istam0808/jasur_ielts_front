const DEFAULT_BACKEND_URL = "https://jasur-ielts-backend.onrender.com/";

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

  // Гарантируем только ведущий слеш у пути.
  // Хвостовой слеш будет добавлен на стороне backend‑rewrite.
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;

  // В браузере ходим через Next.js proxy `/api/backend/...`,
  // чтобы избежать прямых запросов с localhost:3000 на внешний домен.
  if (typeof window !== "undefined") {
    try {
      const origin = window.location.origin;
      const backendOrigin = new URL(BACKEND_URL).origin;
      if (origin !== backendOrigin) {
        return `${origin}/api/backend${path}`;
      }
    } catch (_) {}
  }

  // На сервере (SSR/Route handlers) или если origin совпал — идём напрямую.
  return `${BACKEND_URL}${path}`;
}

