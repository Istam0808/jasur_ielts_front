const MOCK_AUTH_STORAGE_KEY = "mock-auth-session";

export function saveMockSession({ accessToken, sessionId, username }) {
  if (typeof window === "undefined") return;
  const payload = {
    accessToken: accessToken || "",
    sessionId: sessionId || "",
    username: username || "",
    savedAt: Date.now(),
  };
  window.sessionStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(payload));
}

export function getMockSession() {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(MOCK_AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getMockAccessToken() {
  return getMockSession()?.accessToken || "";
}

export function clearMockSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
}
