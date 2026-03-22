import { buildBackendUrl } from "@/lib/backend";

class BackendApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Заголовки Safe Exam Browser для бэкенда с REQUIRE_SEB_HEADERS.
 * Задайте в .env.local JSON-объект с ключами как в API (пример):
 * NEXT_PUBLIC_SEB_HEADERS_JSON={"SEB-Browser-Exam-Key":"YOUR_EXAM_KEY","SEB-Config-Key":"YOUR_CONFIG_KEY"}
 */
function buildSebHeaders() {
  const headers = {};
  const raw = process.env.NEXT_PUBLIC_SEB_HEADERS_JSON;
  if (!raw) return headers;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      Object.entries(parsed).forEach(([key, value]) => {
        if (value != null) {
          headers[key] = String(value);
        }
      });
    }
  } catch {
    // Ignore invalid env payload to avoid breaking login.
  }

  return headers;
}

/** Публичные пути: Authorization не отправляется, чтобы DRF не вызывал JWT и не возвращал 401. */
const PUBLIC_PATHS = [
  "/api/v1/auth/login",
];

function isPublicPath(pathname) {
  if (!pathname || typeof pathname !== "string") return false;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return PUBLIC_PATHS.includes(normalized);
}

async function parseResponseBody(response) {
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return null;
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function deriveErrorMessage(status, payload, fallback) {
  if (status === 401) return "Неверный логин или пароль.";
  if (status === 400) {
    if (payload && typeof payload === "object") {
      if (typeof payload.detail === "string") return payload.detail;
      if (typeof payload.message === "string") return payload.message;
    }
    if (typeof payload === "string" && payload.trim()) return payload.trim();
    return "Некорректный запрос.";
  }
  if (status === 403) {
    if (payload && typeof payload === "object" && typeof payload.detail === "string") {
      return payload.detail;
    }
    return "Отсутствуют обязательные Safe Exam Browser заголовки.";
  }
  if (status === 409) return "Пользователь уже вошел в систему.";
  if (payload && typeof payload === "object") {
    if (typeof payload.detail === "string") return payload.detail;
    if (typeof payload.message === "string") return payload.message;
  }
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  return fallback;
}

async function request(pathname, { method = "GET", body, token, headers: extraHeaders } = {}) {
  const headers = {
    Accept: "application/json",
    ...buildSebHeaders(),
    ...(extraHeaders && typeof extraHeaders === "object" ? extraHeaders : {}),
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !isPublicPath(pathname)) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildBackendUrl(pathname), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const message = deriveErrorMessage(
      response.status,
      payload,
      "Ошибка при запросе к backend."
    );
    throw new BackendApiError(message, response.status, payload);
  }

  return payload;
}

export async function loginAgent(username, password, fullName) {
  const payload = await request("/api/v1/auth/login", {
    method: "POST",
    body: { username, password, full_name: fullName },
  });

  return {
    accessToken: payload?.access_token || "",
    sessionId: payload?.session_id || "",
  };
}

/** Допустимые значения для POST /api/v1/auth/session/status/ (mock exam flow). */
export const MOCK_SESSION_STATUS = Object.freeze({
  IDLE: "idle",
  LISTENING_TUTORIAL: "listening_tutorial",
  LISTENING_EXAM: "listening_exam",
  READING_TUTORIAL: "reading_tutorial",
  READING_EXAM: "reading_exam",
  WRITING_TUTORIAL: "writing_tutorial",
  WRITING_EXAM: "writing_exam",
  SUBMITTED: "submitted",
});

/**
 * Обновляет статус сессии на backend (Bearer + X-Session-Id).
 * Ошибки только в console.warn, без throw — чтобы не ломать UX.
 */
export async function postMockSessionStatus(status, { token, sessionId } = {}) {
  const normalizedToken = typeof token === "string" ? token.trim() : "";
  const normalizedSessionId =
    typeof sessionId === "string" ? sessionId.trim() : String(sessionId || "").trim();

  if (!normalizedToken || !normalizedSessionId) {
    return;
  }

  const customHeaders = { "X-Session-Id": normalizedSessionId };

  try {
    await request("/api/v1/auth/session/status/", {
      method: "POST",
      body: { status },
      token: normalizedToken,
      headers: customHeaders,
    });
  } catch (err) {
    console.warn("[mock session status]", status, err);
  }
}

export async function logoutAgent(token) {
  await request("/api/v1/auth/logout", {
    method: "POST",
    body: {},
    token,
  });
}

export async function getMocksList(token) {
  try {
    const payload = await request("/api/v1/mocks/list/", { token });

    const resultsArray = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
      ? payload
      : [];

    return {
      count:
        typeof payload?.count === "number"
          ? payload.count
          : Array.isArray(resultsArray)
          ? resultsArray.length
          : 0,
      next: payload?.next || null,
      previous: payload?.previous || null,
      results: resultsArray,
    };
  } catch (error) {
    if (error instanceof BackendApiError && Number(error.status) === 404) {
      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
    }
    throw error;
  }
}

export async function getMockById(id, token) {
  return request(`/api/v1/mocks/${id}/`, { token });
}

export function isBackendUnavailableError(error) {
  if (error instanceof BackendApiError) {
    const status = Number(error.status);
    return status === 404 || status === 502 || status === 503;
  }
  return false;
}

export async function validateReadingMockAnswers(mockId, userAnswers) {
  return request(`/api/v1/mocks/${mockId}/reading/validate/`, {
    method: "POST",
    body: { answers: userAnswers },
  });
}

export async function validateListeningMockAnswers(
  mockId,
  userAnswers,
  { token, sessionId } = {}
) {
  const customHeaders = {};
  if (sessionId) {
    customHeaders["X-Session-Id"] = String(sessionId).trim();
  }

  return request(`/api/v1/mocks/${mockId}/validate_listening/`, {
    method: "POST",
    body: { answers: userAnswers },
    token,
    headers: customHeaders,
  });
}

/**
 * POST /api/v1/mocks/saved-answers/{section}/
 * Сохраняет ответы для mock, привязанного к сессии (mock_id задаётся через GET /api/v1/mocks/{id}/).
 * Требует JWT из POST /api/v1/auth/login/ и X-Session-Id (session_id из ответа логина).
 * Тело: { answers: ... } — форма зависит от секции (reading: p1–p3; listening: p1–p4; writing: t1, t2).
 * 400 — если mock к сессии не привязан (нужно сначала открыть mock через GET /api/v1/mocks/{id}/).
 */
export async function saveMockSectionAnswers(
  section,
  answersPayload,
  { token, sessionId } = {}
) {
  const allowedSections = new Set(["reading", "listening", "writing"]);
  const normalizedSection = String(section || "").trim().toLowerCase();
  if (!normalizedSection || !allowedSections.has(normalizedSection)) {
    throw new Error(
      "Section must be one of: reading, listening, writing."
    );
  }

  const normalizedToken = typeof token === "string" ? token.trim() : "";
  const normalizedSessionId =
    typeof sessionId === "string" ? sessionId.trim() : String(sessionId || "").trim();

  if (!normalizedToken) {
    throw new Error("Access token is required for mock saved answers.");
  }
  if (!normalizedSessionId) {
    throw new Error("X-Session-Id is required for mock saved answers.");
  }

  const customHeaders = {};
  customHeaders["X-Session-Id"] = normalizedSessionId;

  return request(`/api/v1/mocks/saved-answers/${normalizedSection}/`, {
    method: "POST",
    body: answersPayload,
    token: normalizedToken,
    headers: customHeaders,
  });
}

export function isMockSessionMismatchError(error) {
  if (!(error instanceof BackendApiError)) return false;
  if (Number(error.status) !== 403) return false;

  const detail = error?.payload?.detail;
  if (typeof detail !== "string") return false;

  const normalizedDetail = detail.toLowerCase();
  return (
    normalizedDetail.includes("x-session-id does not match") ||
    normalizedDetail.includes("session is not associated")
  );
}

/** 400 при сохранении ответов без привязанного к сессии mock (нужен GET /api/v1/mocks/{id}/). */
export function isMockNotBoundError(error) {
  if (!(error instanceof BackendApiError)) return false;
  if (Number(error.status) !== 400) return false;

  const detail = error?.payload?.detail;
  const message = error?.payload?.message;
  const text =
    typeof detail === "string"
      ? detail
      : typeof message === "string"
        ? message
        : typeof error?.message === "string"
          ? error.message
          : "";
  const normalized = text.toLowerCase();
  return (
    normalized.includes("retrieve") ||
    normalized.includes("mock_id") ||
    normalized.includes("mock id") ||
    (normalized.includes("mock") && normalized.includes("first"))
  );
}

export { BackendApiError };
