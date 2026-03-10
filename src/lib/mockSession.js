const MOCK_AUTH_STORAGE_KEY = "mock-auth-session";
const MOCK_PAYLOAD_PREFIX = "mock-payload-";

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

export function getMockPayload(mockId) {
  if (typeof window === "undefined") return null;
  const key = MOCK_PAYLOAD_PREFIX + String(mockId);
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function setMockPayload(mockId, payload) {
  if (typeof window === "undefined") return;
  const key = MOCK_PAYLOAD_PREFIX + String(mockId);
  window.sessionStorage.setItem(key, JSON.stringify(payload));
}

export function clearMockPayloads() {
  if (typeof window === "undefined") return;
  const keysToRemove = [];
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const key = window.sessionStorage.key(i);
    if (key && key.startsWith(MOCK_PAYLOAD_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
}

export function clearMockSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
  clearMockPayloads();
}
