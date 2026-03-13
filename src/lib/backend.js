const DEFAULT_BACKEND_URL = "https://jasur-ielts-backend.onrender.com";

function stripKnownApiSuffix(pathname) {
  if (!pathname) return "";
  let cleanPath = pathname.replace(/\/+$/, "");

  // Защита от ошибочно заданной базы вида:
  // .../api/backend, .../api/v1, .../api/backend/api/v1
  cleanPath = cleanPath.replace(/(\/api\/backend|\/api\/v1)+$/i, "");

  return cleanPath === "/" ? "" : cleanPath;
}

function normalizeBackendUrl(value) {
  const fallback = DEFAULT_BACKEND_URL;
  const raw = (value || fallback).trim();

  if (!raw || !/^https?:\/\//i.test(raw)) {
    return DEFAULT_BACKEND_URL;
  }

  try {
    const parsed = new URL(raw);
    const cleanPath = stripKnownApiSuffix(parsed.pathname);
    return `${parsed.origin}${cleanPath}`;
  } catch (_) {
    return fallback;
  }
}

export const BACKEND_URL = normalizeBackendUrl(process.env.NEXT_PUBLIC_BACKEND_URL);

function normalizeApiPath(pathname) {
  const rawPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const withoutTrailingSlash = rawPath.replace(/\/+$/, "");

  // Authentication endpoints в backend объявлены без хвостового слеша.
  if (/^\/api\/v1\/auth\/(login|logout|heartbeat)$/i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }

  // Detail endpoint для mocks должен быть только со слешем в конце.
  if (/^\/api\/v1\/mocks\/[^/]+$/i.test(withoutTrailingSlash)) {
    return `${withoutTrailingSlash}/`;
  }

  return rawPath;
}

export function buildBackendUrl(pathname) {
  if (!pathname) return BACKEND_URL;

  // Гарантируем корректную форму пути для backend endpoint'ов.
  const path = normalizeApiPath(pathname);

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

