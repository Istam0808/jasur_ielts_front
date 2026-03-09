import { buildBackendUrl } from "@/lib/backend";

class BackendApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
    this.payload = payload;
  }
}

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
  if (status === 403) return "Отсутствуют обязательные Safe Exam Browser заголовки.";
  if (status === 409) return "Пользователь уже вошел в систему.";
  if (payload && typeof payload === "object") {
    if (typeof payload.detail === "string") return payload.detail;
    if (typeof payload.message === "string") return payload.message;
  }
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  return fallback;
}

async function request(pathname, { method = "GET", body, token } = {}) {
  const headers = {
    Accept: "application/json",
    ...buildSebHeaders(),
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

export async function loginAgent(username, password) {
  const payload = await request("/api/v1/auth/login", {
    method: "POST",
    body: { username, password },
  });

  return {
    accessToken: payload?.access_token || "",
    sessionId: payload?.session_id || "",
  };
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

export async function validateListeningMockAnswers(mockId, userAnswers, token) {
  return request(`/api/v1/mocks/${mockId}/validate_listening/`, {
    method: "POST",
    body: { answers: userAnswers },
    token,
  });
}

export { BackendApiError };
