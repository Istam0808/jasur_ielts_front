/**
 * Сессия администратора центра: access_token и center_admin_id в localStorage
 * и заголовки для запросов к API.
 */

export const CENTER_ADMIN_ACCESS_TOKEN_KEY = "adminAccessToken";
export const CENTER_ADMIN_ID_KEY = "centerAdminId";

/** Страница входа center-admin (App Router) */
export const CENTER_ADMIN_LOGIN_PATH = "/admin";

/** Устаревший ключ — очищается при выходе и при сбросе сессии */
const LEGACY_ADMIN_SESSION_ID_KEY = "adminSessionId";

/** Запас до exp (секунды) — учёт рассинхрона часов */
const DEFAULT_EXP_SKEW_SEC = 60;

let invalidateRedirectScheduled = false;

/**
 * Декодирует payload JWT (без проверки подписи).
 * @param {string} token
 * @returns {object | null}
 */
export function parseCenterAdminJwtPayload(token) {
  if (typeof token !== "string" || !token.trim()) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(normalized);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Токен сейчас валиден по exp и типу актора (если указан в payload).
 * @param {string} token
 */
export function isCenterAdminAccessTokenValid(token) {
  if (typeof token !== "string" || !token.trim()) return false;
  const payload = parseCenterAdminJwtPayload(token);
  if (!payload || typeof payload !== "object") return false;

  if (payload.actor_type && payload.actor_type !== "center_admin") {
    return false;
  }

  if (typeof payload.exp !== "number") {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
}

/**
 * Время истечения access-токена (ms с epoch) или null.
 * @param {string} token
 * @param {number} [skewSec]
 * @returns {number | null}
 */
export function getCenterAdminTokenExpiryMs(token, skewSec = DEFAULT_EXP_SKEW_SEC) {
  if (typeof token !== "string" || !token.trim()) return null;
  const payload = parseCenterAdminJwtPayload(token);
  if (!payload || typeof payload !== "object" || typeof payload.exp !== "number") {
    return null;
  }
  if (payload.actor_type && payload.actor_type !== "center_admin") {
    return null;
  }
  const skew = Math.max(0, Number(skewSec) || 0);
  return (payload.exp - skew) * 1000;
}

export function getStoredCenterAdminAccessToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CENTER_ADMIN_ACCESS_TOKEN_KEY) || "";
}

export function getStoredCenterAdminId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CENTER_ADMIN_ID_KEY) || "";
}

export function clearCenterAdminAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CENTER_ADMIN_ACCESS_TOKEN_KEY);
  localStorage.removeItem(CENTER_ADMIN_ID_KEY);
  localStorage.removeItem(LEGACY_ADMIN_SESSION_ID_KEY);
}

/**
 * Сброс сессии center-admin и редирект на страницу входа (без вызова logout).
 * Идемпотентен при параллельных 401.
 *
 * @param {{ reason?: 'invalid' | 'expired' }} [options]
 *   - invalid — 401 с API (query session_invalid=1)
 *   - expired — проактивно по JWT exp (query session_expired=1)
 */
export function invalidateCenterAdminSession(options = {}) {
  if (typeof window === "undefined") return;
  const reason = options.reason === "expired" ? "expired" : "invalid";
  clearCenterAdminAuthStorage();
  if (invalidateRedirectScheduled) return;
  invalidateRedirectScheduled = true;
  const q = new URLSearchParams();
  if (reason === "expired") {
    q.set("session_expired", "1");
  } else {
    q.set("session_invalid", "1");
  }
  const qs = q.toString();
  window.location.replace(`${CENTER_ADMIN_LOGIN_PATH}${qs ? `?${qs}` : ""}`);
}

/**
 * Заголовки для авторизованных запросов center-admin.
 * @param {string} [accessTokenOverride]
 * @param {string} [centerAdminIdOverride]
 */
export function getCenterAdminAuthHeaders(accessTokenOverride, centerAdminIdOverride) {
  const token =
    accessTokenOverride !== undefined
      ? accessTokenOverride
      : getStoredCenterAdminAccessToken();
  const centerAdminId =
    centerAdminIdOverride !== undefined
      ? centerAdminIdOverride
      : getStoredCenterAdminId();

  const headers = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (centerAdminId) {
    headers["X-Center-Admin-Id"] = centerAdminId;
  }

  return headers;
}

/**
 * Когда бэкенд добавит refresh (лучше httpOnly cookie): вызывать из обёртки API
 * до редиректа при 401; при успехе положить новый access в localStorage и вернуть true.
 * Контракт: URL, метод, credentials — по согласованию с бэком.
 * @returns {Promise<boolean>}
 */
export async function tryRefreshCenterAdminAccess() {
  return false;
}
