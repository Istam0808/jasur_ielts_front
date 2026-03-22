/**
 * Сессия администратора центра: access_token и center_admin_id в localStorage
 * и заголовки для запросов к API.
 */

export const CENTER_ADMIN_ACCESS_TOKEN_KEY = "adminAccessToken";
export const CENTER_ADMIN_ID_KEY = "centerAdminId";

/** Устаревший ключ — очищается при выходе и при сбросе сессии */
const LEGACY_ADMIN_SESSION_ID_KEY = "adminSessionId";

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
