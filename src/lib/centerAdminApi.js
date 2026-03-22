import { buildBackendUrl } from "@/lib/backend";
import { getCenterAdminAuthHeaders } from "@/lib/centerAdminAuth";

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function extractErrorMessage(data, status) {
  if (data?.detail) {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      return String(data.detail[0].msg);
    }
  }
  if (typeof data?.message === "string") return data.message;
  return `Ошибка запроса (${status})`;
}

/**
 * GET с заголовками center-admin.
 * @returns {Promise<{ ok: true, data: object } | { ok: false, unauthorized?: boolean, status: number, data?: object, message?: string }>}
 */
export async function centerAdminGet(path) {
  const response = await fetch(buildBackendUrl(path), {
    headers: getCenterAdminAuthHeaders(),
  });
  const data = await parseJsonSafe(response);
  if (response.status === 401) {
    return { ok: false, unauthorized: true, status: 401, data };
  }
  if (!response.ok) {
    return {
      ok: false,
      unauthorized: false,
      status: response.status,
      data,
      message: extractErrorMessage(data, response.status),
    };
  }
  return { ok: true, data };
}

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * POST с JSON-телом (center-admin).
 * @returns {Promise<{ ok: true, data: object } | { ok: false, unauthorized?: boolean, status: number, data?: object, message?: string }>}
 */
export async function centerAdminPost(path, body) {
  const response = await fetch(buildBackendUrl(path), {
    method: "POST",
    headers: {
      ...getCenterAdminAuthHeaders(),
      ...JSON_HEADERS,
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await parseJsonSafe(response);
  if (response.status === 401) {
    return { ok: false, unauthorized: true, status: 401, data };
  }
  if (!response.ok) {
    return {
      ok: false,
      unauthorized: false,
      status: response.status,
      data,
      message: extractErrorMessage(data, response.status),
    };
  }
  return { ok: true, data };
}

function sessionDetailPath(sessionId) {
  const id = encodeURIComponent(String(sessionId));
  return `/api/v1/auth/center-admin/sessions/${id}/`;
}

/** GET — полная сессия с метаданными и scores (для дашборда). */
export function fetchSessionDetail(sessionId) {
  return centerAdminGet(sessionDetailPath(sessionId));
}

/** GET — review payload: ответы по модулям и корректность. */
export function fetchSessionSavedAnswers(sessionId) {
  return centerAdminGet(`${sessionDetailPath(sessionId)}saved-answers/`);
}

/** GET — сохранённые JSON scores для сессии. */
export function fetchSessionScore(sessionId) {
  return centerAdminGet(`${sessionDetailPath(sessionId)}score/`);
}

/** POST — выставить Speaking (0–9, шаг 0.5), пересчёт overall при полном наборе. */
export function postSessionSpeakingScore(sessionId, speaking) {
  return centerAdminPost(`${sessionDetailPath(sessionId)}speaking-score/`, { speaking });
}

function numBand(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Извлекает полосы L/R/W/S/Overall из ответов /score/, POST speaking-score или объекта session.
 * @param {object} data
 * @returns {{ listening: number | null, reading: number | null, writing: number | null, speaking: number | null, overall: number | null }}
 */
/** Извлекает числовой band из числа или из объекта секции `{ band, ... }`. */
function bandFromSection(section) {
  if (section == null) return null;
  if (typeof section === "number") return numBand(section);
  if (typeof section === "object") {
    return numBand(section.band ?? section.score ?? section.value ?? section.band_score);
  }
  return null;
}

export function extractBandsFromScorePayload(data) {
  const empty = {
    listening: null,
    reading: null,
    writing: null,
    speaking: null,
    overall: null,
  };
  if (!data || typeof data !== "object") return { ...empty };

  function fromScoresObject(scores) {
    if (!scores || typeof scores !== "object") return null;
    const speakingRaw = scores.speaking;
    const speakingFlat =
      speakingRaw != null && typeof speakingRaw === "object"
        ? bandFromSection(speakingRaw)
        : numBand(
            scores.speaking ?? scores.speaking_band ?? scores.speakingBand ?? speakingRaw
          );
    return {
      listening: bandFromSection(scores.listening) ??
        numBand(scores.listening_band ?? scores.listeningBand),
      reading:
        bandFromSection(scores.reading) ??
        numBand(scores.reading_band ?? scores.readingBand),
      writing:
        bandFromSection(scores.writing) ??
        numBand(scores.writing_band ?? scores.writingBand),
      speaking: speakingFlat,
      overall: numBand(
        scores.overall ?? scores.overall_band ?? scores.overallBand ?? scores.band
      ),
    };
  }

  const candidates = [
    data.scores,
    data.session?.scores,
    data.data?.scores,
    data.updated_scores,
    data.updatedScores,
  ];

  for (const c of candidates) {
    const row = fromScoresObject(c);
    if (
      row &&
      (row.listening != null ||
        row.reading != null ||
        row.writing != null ||
        row.speaking != null ||
        row.overall != null)
    ) {
      return row;
    }
  }

  const root = fromScoresObject(data);
  if (
    root &&
    (root.listening != null ||
      root.reading != null ||
      root.writing != null ||
      root.speaking != null ||
      root.overall != null)
  ) {
    return root;
  }

  return { ...empty };
}

/**
 * Объединяет два набора полос: непустые поля из primary, затем fallback.
 * @param {ReturnType<extractBandsFromScorePayload>} primary
 * @param {ReturnType<extractBandsFromScorePayload>} fallback
 */
export function mergeScoreBands(primary, fallback) {
  const a = primary || {};
  const b = fallback || {};
  return {
    listening: a.listening ?? b.listening ?? null,
    reading: a.reading ?? b.reading ?? null,
    writing: a.writing ?? b.writing ?? null,
    speaking: a.speaking ?? b.speaking ?? null,
    overall: a.overall ?? b.overall ?? null,
  };
}

function parseListeningReadingSection(section) {
  if (section == null) return null;
  if (typeof section === "object") {
    const correctRaw = section.correct;
    const correct =
      correctRaw != null && correctRaw !== "" && Number.isFinite(Number(correctRaw))
        ? Number(correctRaw)
        : null;
    return {
      band: numBand(section.band ?? section.score),
      correct,
    };
  }
  return { band: numBand(section), correct: null };
}

function parseWritingSection(section) {
  if (section == null) return null;
  if (typeof section === "object") {
    return {
      band: numBand(section.band ?? section.score),
      task1: section.task1,
      task2: section.task2,
    };
  }
  return { band: numBand(section), task1: null, task2: null };
}

/**
 * Полная структура scores для UI (GET /score/ и ответ POST speaking).
 * @param {object} data — корень ответа, ожидается `{ session_id?, scores: { ... } }` или вложенный session.
 */
export function parseScoreDetailForAdminUi(data) {
  const sessionId = pickFirstString(
    data?.session_id,
    data?.session?.session_id,
    data?.session?.id,
    ""
  );
  const scores = data?.scores ?? data?.session?.scores ?? null;
  if (!scores || typeof scores !== "object") {
    return {
      sessionId: sessionId || null,
      overall: null,
      listening: null,
      reading: null,
      writing: null,
      speaking: null,
    };
  }

  const speakingRaw = scores.speaking;
  let speaking =
    speakingRaw != null && typeof speakingRaw === "object"
      ? bandFromSection(speakingRaw)
      : numBand(speakingRaw);

  return {
    sessionId: sessionId || null,
    overall: numBand(scores.overall ?? scores.overall_band),
    listening: parseListeningReadingSection(scores.listening),
    reading: parseListeningReadingSection(scores.reading),
    writing: parseWritingSection(scores.writing),
    speaking,
  };
}

export function fetchAgents() {
  return centerAdminGet("/api/v1/auth/center-admin/agents/");
}

export function fetchAgentSessions(agentId) {
  return centerAdminGet(`/api/v1/auth/center-admin/agents/${agentId}/sessions/`);
}

export function fetchAllSessions() {
  return centerAdminGet("/api/v1/auth/center-admin/sessions/");
}

function pickFirstString(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function pickFirstNumber(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatSessionTimestamp(value) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Унифицированная форма session summary для таблиц админки.
 * @param {object} raw
 * @returns {object | null}
 */
export function normalizeSessionSummary(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = pickFirstString(raw.id, raw.session_id, raw.pk, raw.uuid);
  if (!id) return null;

  const agentId = pickFirstNumber(raw.agent_id, raw.agentId, raw.agent);
  const sessionKey = pickFirstString(
    raw.session_key,
    raw.sessionKey,
    raw.access_code,
    raw.code,
    ""
  );
  const agentUsername = pickFirstString(raw.agent_username, raw.agentUsername, "");

  const studentName = pickFirstString(
    raw.student_name,
    raw.studentName,
    raw.user_full_name,
    raw.full_name,
    raw.username,
    raw.student?.username,
    agentUsername,
    "—"
  );

  const startedRaw =
    raw.started_at ??
    raw.startedAt ??
    raw.begin_at ??
    raw.created_at ??
    raw.started ??
    raw.start_time;

  const endedRaw =
    raw.ended_at ??
    raw.finished_at ??
    raw.endedAt ??
    raw.completed_at ??
    raw.completedAt ??
    raw.end_time ??
    raw.session_end ??
    raw.closed_at ??
    raw.ended;

  const statusRaw = String(
    raw.status ?? raw.state ?? raw.lifecycle ?? raw.session_status ?? raw.exam_status ?? ""
  )
    .trim()
    .toLowerCase();

  const hasEndTimestamp = endedRaw != null && String(endedRaw).trim() !== "";

  const completedFlags =
    raw.completed === true ||
    raw.is_completed === true ||
    raw.is_complete === true ||
    raw.finished === true ||
    raw.is_finished === true;

  const finishedStatuses = new Set([
    "finished",
    "completed",
    "complete",
    "done",
    "closed",
    "ended",
    "inactive",
    "submitted",
    "graded",
    "archived",
    "cancelled",
    "canceled",
    "terminated",
  ]);

  const activeStatuses = new Set([
    "active",
    "in_progress",
    "started",
    "running",
    "live",
    "ongoing",
    "pending",
    "open",
    "reading_tutorial",
  ]);

  let isFinished = false;

  if (hasEndTimestamp) {
    isFinished = true;
  } else if (completedFlags) {
    isFinished = true;
  } else if (statusRaw && finishedStatuses.has(statusRaw)) {
    isFinished = true;
  } else if (raw.is_active === false || raw.session_active === false) {
    isFinished = true;
  } else if (statusRaw && activeStatuses.has(statusRaw)) {
    isFinished = false;
  } else if (raw.is_active === true || raw.session_active === true) {
    isFinished = false;
  }

  const isActive = !isFinished;

  const apiStatusDisplay = String(raw.status ?? raw.state ?? "").trim() || "—";

  const mockIdRaw = raw.mock_id ?? raw.mockId;
  const mockId =
    mockIdRaw !== null && mockIdRaw !== undefined && mockIdRaw !== ""
      ? Number(mockIdRaw)
      : null;
  const mockIdSafe = Number.isFinite(mockId) ? mockId : null;

  return {
    id,
    sessionKey: sessionKey || "—",
    studentName,
    agentUsername,
    agentId,
    computerLabel: pickFirstString(
      agentUsername,
      agentId != null ? `Agent #${agentId}` : "",
      "—"
    ),
    apiStatus: apiStatusDisplay,
    mockId: mockIdSafe,
    isActiveFlag: Boolean(raw.is_active),
    createdAtDisplay: formatSessionTimestamp(raw.created_at) || "—",
    lastHeartbeatDisplay: formatSessionTimestamp(raw.last_heartbeat) || "—",
    startedAtDisplay: formatSessionTimestamp(startedRaw) || "—",
    finishedAtDisplay: endedRaw ? formatSessionTimestamp(endedRaw) : null,
    status: isActive ? "active" : "finished",
    isActive,
    raw,
  };
}

/**
 * @param {object[]} agents
 * @returns {Map<number, string>}
 */
export function buildAgentLabelMap(agents) {
  const map = new Map();
  for (const a of agents || []) {
    const id = pickFirstNumber(a.id, a.pk);
    if (id == null) continue;
    const name = pickFirstString(a.username, `Agent #${id}`);
    map.set(id, name);
  }
  return map;
}

/**
 * @param {ReturnType<normalizeSessionSummary>} session
 * @param {Map<number, string>} labelMap
 */
export function enrichSessionWithAgentLabel(session, labelMap) {
  if (!session || session.agentId == null) return session;
  const fromMap = labelMap.get(session.agentId);
  const computerLabel = pickFirstString(
    session.agentUsername,
    fromMap,
    session.computerLabel,
    session.agentId != null ? `Agent #${session.agentId}` : "",
    "—"
  );
  return { ...session, computerLabel };
}

/**
 * Лучший кандидат «текущей» сессии агента из списка (приоритет активной).
 * @param {object[]} rawSessions
 * @param {Map<number, string>} labelMap
 * @returns {ReturnType<normalizeSessionSummary> | null}
 */
export function pickSessionForAgentRow(rawSessions, labelMap) {
  const list = (rawSessions || [])
    .map((r) => normalizeSessionSummary(r))
    .filter(Boolean)
    .map((s) => enrichSessionWithAgentLabel(s, labelMap));
  const active = list.find((s) => s.isActive);
  if (active) return active;
  return list[0] || null;
}
