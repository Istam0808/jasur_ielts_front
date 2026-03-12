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

function buildMockCachePayload(detail) {
  if (!detail || typeof detail !== "object") return null;

  const {
    id,
    reading_p1,
    reading_p2,
    reading_p3,
    listening_p1,
    listening_p2,
    listening_p3,
    listening_p4,
    writing_task1,
    writing_task2,
    ...rest
  } = detail;

  // Храним только нужные для экзамена секции и минимальные метаданные,
  // чтобы не парсить и не тянуть лишние поля при каждом переходе.
  return {
    id,
    reading_p1,
    reading_p2,
    reading_p3,
    listening_p1,
    listening_p2,
    listening_p3,
    listening_p4,
    writing_task1,
    writing_task2,
    // В случае, если адаптеры вдруг используют что‑то ещё,
    // оставляем небольшой объект с основными метаданными.
    meta: {
      title: rest?.title,
      module: rest?.module,
      level: rest?.level,
    },
  };
}

export function setMockPayload(mockId, payload) {
  if (typeof window === "undefined") return;
  const key = MOCK_PAYLOAD_PREFIX + String(mockId);

  const cachePayload = buildMockCachePayload(payload) || payload;
  window.sessionStorage.setItem(key, JSON.stringify(cachePayload));
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
