"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCpu, FiLogOut, FiRefreshCw, FiSettings } from "react-icons/fi";
import { buildBackendUrl } from "@/lib/backend";
import {
  buildAgentLabelMap,
  enrichSessionWithAgentLabel,
  extractBandsFromScorePayload,
  fetchAgentSessions,
  fetchAgents,
  fetchAllSessions,
  fetchSessionDetail,
  fetchSessionScore,
  mergeScoreBands,
  normalizeSessionSummary,
  parseScoreDetailForAdminUi,
  pickSessionForAgentRow,
  postSessionSpeakingScore,
  postTerminateAgentSession,
} from "@/lib/centerAdminApi";
import {
  CENTER_ADMIN_ACCESS_TOKEN_KEY,
  CENTER_ADMIN_ID_KEY,
  clearCenterAdminAuthStorage,
  getCenterAdminAuthHeaders,
} from "@/lib/centerAdminAuth";
import "../styles/style_admin.scss";

const NAV_MACHINES = "machines";
const NAV_SESSIONS = "sessions";
const NAV_RESULTS = "results";

const THEME_LIGHT = "light";
const THEME_DARK = "dark";
const ADMIN_THEME_KEY = "adminTheme";

async function logoutCenterAdmin() {
  const response = await fetch(buildBackendUrl("/api/v1/auth/center-admin/logout/"), {
    method: "POST",
    headers: getCenterAdminAuthHeaders(),
  });

  if (response.ok || response.status === 401) {
    return { ok: true };
  }

  let message = "";
  try {
    const data = await response.json();
    message =
      (typeof data?.detail === "string" && data.detail) ||
      (typeof data?.message === "string" && data.message) ||
      "";
  } catch (_) {}

  return { ok: false, message: message || "Не удалось завершить сессию на сервере" };
}

function handleUnauthorized(router) {
  clearCenterAdminAuthStorage();
  router.replace("/admin");
}

function formatBand(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return String(v);
}

function roundToHalf(n) {
  return Math.round(n * 2) / 2;
}

function formatMockId(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return String(v);
}

function formatBoolRu(v) {
  return v ? "да" : "нет";
}

/** Сессию можно принудительно завершить только пока она не в финальном состоянии (finished / terminated и т.д.). */
function canTerminateSession(s) {
  return s?.status === "active";
}

function formatWritingTaskPreview(v) {
  if (v == null) return "—";
  if (typeof v === "string") {
    const t = v.trim();
    if (t.length === 0) return "—";
    return t.length > 400 ? `${t.slice(0, 400)}…` : t;
  }
  try {
    const s = JSON.stringify(v, null, 2);
    return s.length > 800 ? `${s.slice(0, 800)}…` : s;
  } catch {
    return String(v);
  }
}

function formatIsoDateRu(iso) {
  if (iso == null || iso === "") return "—";
  if (typeof iso !== "string") return String(iso);
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const READING_PART_KEYS = ["p1", "p2", "p3"];

const READING_PART_LABELS = {
  p1: "Часть 1 (Passage 1)",
  p2: "Часть 2 (Passage 2)",
  p3: "Часть 3 (Passage 3)",
};

function ReadingPartAnswersTable({ partKey, data }) {
  const title = READING_PART_LABELS[partKey] ?? partKey;
  if (!data || typeof data !== "object") {
    return (
      <div className="admin-dashboard__reading-part-block">
        <h5 className="admin-dashboard__saved-answers-part-title">{title}</h5>
        <p className="admin-dashboard__saved-answers-empty">Нет данных</p>
      </div>
    );
  }
  const entries = Object.entries(data).sort((a, b) => Number(a[0]) - Number(b[0]));
  return (
    <div className="admin-dashboard__reading-part-block">
      <h5 className="admin-dashboard__saved-answers-part-title">{title}</h5>
      <div className="admin-dashboard__answers-matrix-wrap">
        <table className="admin-dashboard__answers-matrix">
          <thead>
            <tr>
              <th scope="col">Вопрос</th>
              <th scope="col">Ответ</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([q, val]) => (
              <tr key={q}>
                <td>{q}</td>
                <td>{val === "" || val == null ? "—" : String(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionJsonBlock({ title, value }) {
  const empty =
    value == null ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);
  if (empty) {
    return (
      <div className="admin-dashboard__saved-answers-json-block">
        <h4 className="admin-dashboard__saved-answers-json-title">{title}</h4>
        <p className="admin-dashboard__saved-answers-empty">Пусто</p>
      </div>
    );
  }
  return (
    <div className="admin-dashboard__saved-answers-json-block">
      <h4 className="admin-dashboard__saved-answers-json-title">{title}</h4>
      <pre className="admin-dashboard__saved-answers-pre admin-dashboard__saved-answers-pre--modal">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

const OVERALL_DISTRIBUTION_BUCKETS = [
  { label: "≤ 6.0", min: -Infinity, max: 6.0 },
  { label: "6.5 – 7.0", min: 6.5, max: 7.0 },
  { label: "7.5 – 8.0", min: 7.5, max: 8.0 },
  { label: "≥ 8.5", min: 8.5, max: Infinity },
];

export default function AdminUserPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [activeNav, setActiveNav] = useState(NAV_MACHINES);
  const [theme, setTheme] = useState(THEME_LIGHT);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [exitConfirmModalOpen, setExitConfirmModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [agents, setAgents] = useState([]);
  const [normalizedSessions, setNormalizedSessions] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [lastRefreshLabel, setLastRefreshLabel] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [scoresBySessionId, setScoresBySessionId] = useState({});
  const [scoreDetailBySessionId, setScoreDetailBySessionId] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [speakingDraft, setSpeakingDraft] = useState("");
  const [speakingSaving, setSpeakingSaving] = useState(false);
  const [speakingSaveError, setSpeakingSaveError] = useState("");
  const [savedAnswersPayload, setSavedAnswersPayload] = useState(null);
  const [savedAnswersError, setSavedAnswersError] = useState("");
  const [savedAnswersModalOpen, setSavedAnswersModalOpen] = useState(false);
  const [selectedTerminateIds, setSelectedTerminateIds] = useState(() => new Set());
  const [terminateError, setTerminateError] = useState("");
  const [terminatingSessionId, setTerminatingSessionId] = useState(null);
  const [bulkTerminating, setBulkTerminating] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setListError("");
    setListLoading(true);
    try {
      const [agentsRes, sessionsRes] = await Promise.all([fetchAgents(), fetchAllSessions()]);

      if (agentsRes.unauthorized || sessionsRes.unauthorized) {
        handleUnauthorized(router);
        return;
      }
      if (!agentsRes.ok) {
        setListError(agentsRes.message || "Не удалось загрузить агентов");
        return;
      }
      if (!sessionsRes.ok) {
        setListError(sessionsRes.message || "Не удалось загрузить сессии");
        return;
      }

      const agentList = Array.isArray(agentsRes.data.agents) ? agentsRes.data.agents : [];
      const rawSessions = Array.isArray(sessionsRes.data.sessions)
        ? sessionsRes.data.sessions
        : [];

      const labelMap = buildAgentLabelMap(agentList);
      let sessions = rawSessions
        .map((r) => normalizeSessionSummary(r))
        .filter(Boolean)
        .map((s) => enrichSessionWithAgentLabel(s, labelMap));

      const activeByAgentId = new Map();
      for (const s of sessions) {
        if (s.agentId == null || !s.isActive) continue;
        if (!activeByAgentId.has(s.agentId)) activeByAgentId.set(s.agentId, s);
      }

      const needAgentFetch = agentList.filter(
        (a) => a.has_active_session && !activeByAgentId.get(a.id)
      );

      if (needAgentFetch.length > 0) {
        const extraResults = await Promise.all(
          needAgentFetch.map((a) => fetchAgentSessions(a.id))
        );
        const seenIds = new Set(sessions.map((s) => String(s.id)));
        for (let i = 0; i < needAgentFetch.length; i++) {
          const r = extraResults[i];
          if (r.unauthorized) {
            handleUnauthorized(router);
            return;
          }
          if (!r.ok) continue;
          const list = Array.isArray(r.data.sessions) ? r.data.sessions : [];
          const picked = pickSessionForAgentRow(list, labelMap);
          if (picked && !seenIds.has(String(picked.id))) {
            sessions.push(picked);
            seenIds.add(String(picked.id));
          }
        }
      }

      setAgents(agentList);
      setNormalizedSessions(sessions);
      setSelectedTerminateIds((prev) => {
        const valid = new Set(sessions.map((s) => String(s.id)));
        const next = new Set();
        for (const id of prev) {
          if (valid.has(id)) next.add(id);
        }
        return next;
      });
      setLastRefreshLabel(
        new Date().toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "medium" })
      );

      setSelectedSessionId((prev) => {
        if (prev == null) return prev;
        const stillExists = sessions.some((s) => String(s.id) === String(prev));
        return stillExists ? prev : null;
      });
    } catch (_) {
      setListError("Ошибка сети при загрузке данных");
    } finally {
      setListLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked || !isAuth) return;
    loadDashboardData();
  }, [authChecked, isAuth, loadDashboardData]);

  const loadSessionScores = useCallback(async () => {
    if (!selectedSessionId || !isAuth) {
      setDetailError("");
      setSpeakingSaveError("");
      return;
    }

    setDetailLoading(true);
    setDetailError("");
    setSpeakingSaveError("");
    setSavedAnswersPayload(null);
    setSavedAnswersError("");
    setSavedAnswersModalOpen(false);

    const sid = String(selectedSessionId);
    const [scoreRes, detailRes] = await Promise.all([
      fetchSessionScore(sid),
      fetchSessionDetail(sid),
    ]);

    if (scoreRes.unauthorized || detailRes.unauthorized) {
      setDetailLoading(false);
      handleUnauthorized(router);
      return;
    }

    if (!scoreRes.ok && !detailRes.ok) {
      setDetailError(
        scoreRes.message || detailRes.message || "Не удалось загрузить данные сессии"
      );
      setDetailLoading(false);
      return;
    }

    const bands = mergeScoreBands(
      extractBandsFromScorePayload(scoreRes.ok ? scoreRes.data : {}),
      extractBandsFromScorePayload(detailRes.ok ? detailRes.data : {})
    );

    setScoresBySessionId((prev) => ({ ...prev, [sid]: bands }));

    const mergedForParse =
      scoreRes.ok && scoreRes.data
        ? scoreRes.data
        : detailRes.ok && detailRes.data?.session
          ? {
              session_id:
                detailRes.data.session.session_id ?? detailRes.data.session.id,
              scores: detailRes.data.session.scores,
            }
          : {};
    setScoreDetailBySessionId((prev) => ({
      ...prev,
      [sid]: parseScoreDetailForAdminUi(mergedForParse),
    }));

    const warnings = [];
    if (!scoreRes.ok) warnings.push(scoreRes.message || `score (${scoreRes.status})`);
    if (!detailRes.ok) warnings.push(detailRes.message || `сессия (${detailRes.status})`);
    setDetailError(warnings.filter(Boolean).join(" · "));

    setSpeakingDraft(
      bands.speaking != null && Number.isFinite(bands.speaking) ? String(bands.speaking) : ""
    );
    setDetailLoading(false);
  }, [selectedSessionId, isAuth, router]);

  useEffect(() => {
    loadSessionScores();
  }, [loadSessionScores]);

  function closeSettingsModal() {
    setSettingsModalOpen(false);
  }

  function closeExitConfirmModal() {
    setExitConfirmModalOpen(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    queueMicrotask(() => {
      const token = localStorage.getItem(CENTER_ADMIN_ACCESS_TOKEN_KEY);
      const centerAdminId = localStorage.getItem(CENTER_ADMIN_ID_KEY);
      const ok =
        typeof token === "string" &&
        token.trim().length > 0 &&
        typeof centerAdminId === "string" &&
        centerAdminId.trim().length > 0;
      setIsAuth(ok);
      setAuthChecked(true);
      if (!ok) {
        clearCenterAdminAuthStorage();
        router.replace("/admin");
      }
    });
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      const saved = localStorage.getItem(ADMIN_THEME_KEY);
      if (saved === THEME_DARK || saved === THEME_LIGHT) {
        setTheme(saved);
      }
    });
  }, []);

  useEffect(() => {
    if (!settingsModalOpen) return;
    function handleEscape(e) {
      if (e.key === "Escape") closeSettingsModal();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [settingsModalOpen]);

  useEffect(() => {
    if (!exitConfirmModalOpen) return;
    function handleEscape(e) {
      if (e.key === "Escape") closeExitConfirmModal();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [exitConfirmModalOpen]);

  const machinesWithSession = useMemo(() => {
    const activeByAgent = new Map();
    for (const s of normalizedSessions) {
      if (s.agentId == null || !s.isActive) continue;
      if (!activeByAgent.has(s.agentId)) activeByAgent.set(s.agentId, s);
    }

    return agents.map((agent) => {
      const name =
        typeof agent.username === "string" && agent.username.trim()
          ? agent.username.trim()
          : `Agent #${agent.id}`;
      const sessionFromGlobal = agent.id != null ? activeByAgent.get(agent.id) : null;
      const busy =
        Boolean(agent.has_active_session) || Boolean(sessionFromGlobal?.isActive);
      return {
        id: agent.id,
        name,
        isAgentActive: Boolean(agent.is_active),
        status: busy ? "busy" : "free",
        session: sessionFromGlobal || null,
      };
    });
  }, [agents, normalizedSessions]);

  const sessionsWithResults = useMemo(
    () =>
      normalizedSessions.map((session) => ({
        ...session,
        result: null,
      })),
    [normalizedSessions]
  );

  const activeSessions = useMemo(
    () => sessionsWithResults.filter((s) => s.status === "active"),
    [sessionsWithResults]
  );

  const finishedSessions = useMemo(
    () => sessionsWithResults.filter((s) => s.status === "finished"),
    [sessionsWithResults]
  );

  const selectedSession = useMemo(
    () =>
      sessionsWithResults.find((s) => String(s.id) === String(selectedSessionId)) || null,
    [selectedSessionId, sessionsWithResults]
  );

  const selectedBands = useMemo(
    () =>
      selectedSessionId ? scoresBySessionId[String(selectedSessionId)] ?? null : null,
    [selectedSessionId, scoresBySessionId]
  );

  const selectedScoreDetail = useMemo(
    () =>
      selectedSessionId
        ? scoreDetailBySessionId[String(selectedSessionId)] ?? null
        : null,
    [selectedSessionId, scoreDetailBySessionId]
  );

  const savedAnswersScoreUi = useMemo(
    () =>
      savedAnswersPayload?.session
        ? parseScoreDetailForAdminUi(savedAnswersPayload)
        : null,
    [savedAnswersPayload]
  );

  const isSelectedActive = selectedSession?.status === "active";

  const totalSessionsCount = sessionsWithResults.length;
  const activeCount = activeSessions.length;
  const finishedCount = finishedSessions.length;

  const selectedTerminatableCount = useMemo(() => {
    let n = 0;
    for (const id of selectedTerminateIds) {
      const s = sessionsWithResults.find((x) => String(x.id) === String(id));
      if (s && canTerminateSession(s)) n += 1;
    }
    return n;
  }, [selectedTerminateIds, sessionsWithResults]);

  const allActiveSessionsSelected = useMemo(() => {
    if (activeSessions.length === 0) return false;
    return activeSessions.every((s) => selectedTerminateIds.has(String(s.id)));
  }, [activeSessions, selectedTerminateIds]);

  const someActiveSessionsSelected = useMemo(() => {
    return activeSessions.some((s) => selectedTerminateIds.has(String(s.id)));
  }, [activeSessions, selectedTerminateIds]);

  const toggleTerminateSelection = useCallback((sessionId) => {
    const id = String(sessionId);
    setSelectedTerminateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllActiveSessions = useCallback(() => {
    const ids = activeSessions.map((s) => String(s.id));
    setSelectedTerminateIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((i) => prev.has(i));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  }, [activeSessions]);

  const handleTerminateSession = useCallback(
    async (sessionId) => {
      const id = String(sessionId);
      setTerminateError("");
      setTerminatingSessionId(id);
      try {
        const res = await postTerminateAgentSession(id);
        if (res.unauthorized) {
          handleUnauthorized(router);
          return;
        }
        if (!res.ok) {
          setTerminateError(res.message || "Не удалось завершить сессию");
          return;
        }
        setSelectedTerminateIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        await loadDashboardData();
      } catch (_) {
        setTerminateError("Ошибка сети при завершении сессии");
      } finally {
        setTerminatingSessionId(null);
      }
    },
    [router, loadDashboardData]
  );

  const handleTerminateSelectedSessions = useCallback(async () => {
    const ids = [];
    for (const id of selectedTerminateIds) {
      const s = sessionsWithResults.find((x) => String(x.id) === String(id));
      if (s && canTerminateSession(s)) ids.push(String(id));
    }
    if (ids.length === 0) return;
    setTerminateError("");
    setBulkTerminating(true);
    const errors = [];
    try {
      for (const id of ids) {
        const res = await postTerminateAgentSession(id);
        if (res.unauthorized) {
          handleUnauthorized(router);
          return;
        }
        if (!res.ok) {
          errors.push(`${id}: ${res.message || "ошибка"}`);
        }
      }
      if (errors.length > 0) {
        setTerminateError(errors.slice(0, 3).join("; ") + (errors.length > 3 ? "…" : ""));
      }
      setSelectedTerminateIds(new Set());
      await loadDashboardData();
    } catch (_) {
      setTerminateError("Ошибка сети при завершении сессий");
    } finally {
      setBulkTerminating(false);
    }
  }, [router, loadDashboardData, selectedTerminateIds, sessionsWithResults]);

  const averageOverall = useMemo(() => {
    const vals = finishedSessions
      .map((s) => scoresBySessionId[String(s.id)]?.overall)
      .filter((v) => typeof v === "number" && Number.isFinite(v));
    if (vals.length === 0) return "—";
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }, [finishedSessions, scoresBySessionId]);

  const distribution = useMemo(() => {
    const overallValues = finishedSessions
      .map((s) => scoresBySessionId[String(s.id)]?.overall)
      .filter((v) => typeof v === "number" && Number.isFinite(v));
    return OVERALL_DISTRIBUTION_BUCKETS.map((bucket) => ({
      ...bucket,
      count: overallValues.filter((v) => v >= bucket.min && v <= bucket.max).length,
    }));
  }, [finishedSessions, scoresBySessionId]);

  const maxDistributionCount = distribution.reduce(
    (max, item) => (item.count > max ? item.count : max),
    0
  );

  const hasCachedDistribution = useMemo(
    () =>
      finishedSessions.some((s) => {
        const o = scoresBySessionId[String(s.id)]?.overall;
        return typeof o === "number" && Number.isFinite(o);
      }),
    [finishedSessions, scoresBySessionId]
  );

  function handleThemeChange(newTheme) {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(ADMIN_THEME_KEY, newTheme);
    }
  }

  async function handleLogout() {
    if (typeof window === "undefined") return;
    setLogoutError("");
    setIsLoggingOut(true);
    try {
      const result = await logoutCenterAdmin();
      if (!result.ok) {
        setLogoutError(result.message || "Не удалось выполнить выход");
        return;
      }
      closeExitConfirmModal();
      clearCenterAdminAuthStorage();
      router.replace("/admin");
    } catch (_) {
      setLogoutError("Ошибка сети при выходе. Попробуйте ещё раз.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleSessionRowClick(sessionId) {
    setActiveNav(NAV_RESULTS);
    setSelectedSessionId(sessionId);
  }

  function handleViewSavedAnswersDetail() {
    if (!selectedSessionId) return;
    router.push(`/admin/user/${String(selectedSessionId)}/saved-answers`);
  }

  function closeSavedAnswersModal() {
    setSavedAnswersModalOpen(false);
  }

  useEffect(() => {
    if (!savedAnswersModalOpen) return;
    function handleEscape(e) {
      if (e.key === "Escape") closeSavedAnswersModal();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [savedAnswersModalOpen]);

  useEffect(() => {
    setSavedAnswersModalOpen(false);
  }, [selectedSessionId]);

  async function handleSaveSpeaking() {
    if (!selectedSessionId || isSelectedActive) return;
    setSpeakingSaveError("");
    const raw = parseFloat(String(speakingDraft).replace(",", "."));
    if (!Number.isFinite(raw) || raw < 0 || raw > 9) {
      setSpeakingSaveError("Введите значение от 0 до 9");
      return;
    }
    const rounded = roundToHalf(raw);
    if (Math.abs(rounded - raw) > 1e-6) {
      setSpeakingSaveError("Допустим шаг 0.5 (например 7.5)");
      return;
    }
    setSpeakingSaving(true);
    const res = await postSessionSpeakingScore(String(selectedSessionId), rounded);
    if (res.unauthorized) {
      handleUnauthorized(router);
      setSpeakingSaving(false);
      return;
    }
    if (!res.ok) {
      setSpeakingSaveError(res.message || "Не удалось сохранить");
      setSpeakingSaving(false);
      return;
    }
    const bands = extractBandsFromScorePayload(res.data);
    setScoresBySessionId((prev) => ({
      ...prev,
      [String(selectedSessionId)]: mergeScoreBands(
        bands,
        prev[String(selectedSessionId)] || {}
      ),
    }));
    setScoreDetailBySessionId((prev) => ({
      ...prev,
      [String(selectedSessionId)]: parseScoreDetailForAdminUi(res.data),
    }));
    setSpeakingDraft(
      bands.speaking != null && Number.isFinite(bands.speaking)
        ? String(bands.speaking)
        : String(rounded)
    );
    setSpeakingSaving(false);
  }

  if (!authChecked || !isAuth) {
    return (
      <div className="admin-dashboard admin-dashboard--loading">
        <div className="admin-dashboard__spinner">Loading…</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard" data-theme={theme}>
      <header className="admin-dashboard__header">
        <div className="admin-dashboard__header-inner">
          <div className="admin-dashboard__title-block">
            <span className="admin-dashboard__title-icon" aria-hidden="true">
              <FiCpu />
            </span>
            <div className="admin-dashboard__title-text">
              <h1 className="admin-dashboard__title">Админ-панель</h1>
              <p className="admin-dashboard__title-subtitle">
                Управление компьютерами и сессиями тестов
              </p>
            </div>
          </div>
          <div className="admin-dashboard__actions">
            <button
              type="button"
              className="admin-dashboard__settings-btn"
              onClick={() => setSettingsModalOpen(true)}
              aria-label="Открыть настройки панели"
            >
              <FiSettings aria-hidden="true" />
              <span>Настройки</span>
            </button>
            <button
              type="button"
              className="admin-dashboard__logout"
              onClick={() => setExitConfirmModalOpen(true)}
              aria-label="Выйти из админ-панели"
            >
              <FiLogOut aria-hidden="true" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </header>

      {exitConfirmModalOpen && (
        <div
          className="admin-dashboard__modal-backdrop"
          onClick={closeExitConfirmModal}
          role="presentation"
        >
          <div
            className="admin-dashboard__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-confirm-title"
          >
            <h2 id="exit-confirm-title" className="admin-dashboard__modal-title">
              Выйти из аккаунта
            </h2>
            <p className="admin-dashboard__modal-text">
              Вы уверены, что хотите выйти из аккаунта администратора?
            </p>
            {logoutError && (
              <p className="admin-login__error" role="alert">
                {logoutError}
              </p>
            )}
            <div className="admin-dashboard__modal-actions">
              <button
                type="button"
                className="admin-dashboard__btn-primary admin-dashboard__modal-confirm-btn"
                onClick={handleLogout}
                aria-label="Да, выйти из аккаунта"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Выходим…" : "Выйти"}
              </button>
              <button
                type="button"
                className="admin-dashboard__modal-close"
                onClick={closeExitConfirmModal}
                aria-label="Отмена выхода"
                disabled={isLoggingOut}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsModalOpen && (
        <div
          className="admin-dashboard__modal-backdrop"
          onClick={closeSettingsModal}
          role="presentation"
        >
          <div
            className="admin-dashboard__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
          >
            <h2 id="settings-modal-title" className="admin-dashboard__modal-title">
              Настройки панели
            </h2>
            <div className="admin-dashboard__modal-row">
              <span className="admin-dashboard__modal-label">Theme</span>
              <div className="admin-dashboard__theme-toggle" role="group" aria-label="Тема оформления">
                <button
                  type="button"
                  className={`admin-dashboard__theme-btn ${theme === THEME_LIGHT ? "admin-dashboard__theme-btn--active" : ""}`}
                  onClick={() => handleThemeChange(THEME_LIGHT)}
                  aria-pressed={theme === THEME_LIGHT}
                >
                  Светлая тема
                </button>
                <button
                  type="button"
                  className={`admin-dashboard__theme-btn ${theme === THEME_DARK ? "admin-dashboard__theme-btn--active" : ""}`}
                  onClick={() => handleThemeChange(THEME_DARK)}
                  aria-pressed={theme === THEME_DARK}
                >
                  Тёмная тема
                </button>
              </div>
            </div>
            <button
              type="button"
              className="admin-dashboard__modal-close"
              onClick={closeSettingsModal}
              aria-label="Закрыть настройки панели"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {savedAnswersModalOpen && savedAnswersPayload?.session && (
        <div
          className="admin-dashboard__modal-backdrop"
          onClick={closeSavedAnswersModal}
          role="presentation"
        >
          <div
            className="admin-dashboard__modal admin-dashboard__modal--detail"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-answers-detail-title"
          >
            <h2 id="saved-answers-detail-title" className="admin-dashboard__modal-title">
              Подробный отчёт
            </h2>
            <p className="admin-dashboard__modal-sub">
              <code>
                {`GET /api/v1/auth/center-admin/sessions/${String(savedAnswersPayload.session.session_id)}/saved-answers/`}
              </code>
            </p>
            <div className="admin-dashboard__saved-answers-modal-body">
              <section aria-label="Метаданные сессии">
                <h3 className="admin-dashboard__saved-answers-section-title">Сессия</h3>
                <dl className="admin-dashboard__saved-answers-meta-grid">
                  <dt>session_id</dt>
                  <dd>{String(savedAnswersPayload.session.session_id ?? "—")}</dd>
                  <dt>agent_id</dt>
                  <dd>
                    {savedAnswersPayload.session.agent_id != null
                      ? String(savedAnswersPayload.session.agent_id)
                      : "—"}
                  </dd>
                  <dt>agent_username</dt>
                  <dd>
                    {typeof savedAnswersPayload.session.agent_username === "string"
                      ? savedAnswersPayload.session.agent_username
                      : "—"}
                  </dd>
                  <dt>status</dt>
                  <dd>
                    {typeof savedAnswersPayload.session.status === "string"
                      ? savedAnswersPayload.session.status
                      : "—"}
                  </dd>
                  <dt>is_active</dt>
                  <dd>{formatBoolRu(Boolean(savedAnswersPayload.session.is_active))}</dd>
                  <dt>mock_id</dt>
                  <dd>{formatMockId(savedAnswersPayload.session.mock_id)}</dd>
                  <dt>created_at</dt>
                  <dd>{formatIsoDateRu(savedAnswersPayload.session.created_at)}</dd>
                  <dt>last_heartbeat</dt>
                  <dd>{formatIsoDateRu(savedAnswersPayload.session.last_heartbeat)}</dd>
                </dl>
              </section>

              {savedAnswersScoreUi && (
                <section aria-label="Баллы из сохранённого ответа">
                  <h3 className="admin-dashboard__saved-answers-section-title">
                    Баллы (вложенные scores)
                  </h3>
                  <div
                    className="admin-dashboard__score-board admin-dashboard__score-board--modal"
                    aria-label="Баллы из API saved-answers"
                  >
                    <div className="admin-dashboard__score-overall-pill">
                      <span className="admin-dashboard__score-overall-label">Overall</span>
                      <span className="admin-dashboard__score-overall-value" aria-live="polite">
                        {formatBand(savedAnswersScoreUi.overall)}
                      </span>
                    </div>
                    <div className="admin-dashboard__score-cards">
                      <article className="admin-dashboard__score-card">
                        <h4 className="admin-dashboard__score-card-title">Listening</h4>
                        <dl className="admin-dashboard__score-dl">
                          <div className="admin-dashboard__score-dl-row">
                            <dt>band</dt>
                            <dd>{formatBand(savedAnswersScoreUi.listening?.band)}</dd>
                          </div>
                          <div className="admin-dashboard__score-dl-row">
                            <dt>correct</dt>
                            <dd>
                              {savedAnswersScoreUi.listening?.correct != null
                                ? String(savedAnswersScoreUi.listening.correct)
                                : "—"}
                            </dd>
                          </div>
                        </dl>
                      </article>
                      <article className="admin-dashboard__score-card">
                        <h4 className="admin-dashboard__score-card-title">Reading</h4>
                        <dl className="admin-dashboard__score-dl">
                          <div className="admin-dashboard__score-dl-row">
                            <dt>band</dt>
                            <dd>{formatBand(savedAnswersScoreUi.reading?.band)}</dd>
                          </div>
                          <div className="admin-dashboard__score-dl-row">
                            <dt>correct</dt>
                            <dd>
                              {savedAnswersScoreUi.reading?.correct != null
                                ? String(savedAnswersScoreUi.reading.correct)
                                : "—"}
                            </dd>
                          </div>
                        </dl>
                      </article>
                      <article className="admin-dashboard__score-card admin-dashboard__score-card--wide">
                        <h4 className="admin-dashboard__score-card-title">Writing</h4>
                        <dl className="admin-dashboard__score-dl">
                          <div className="admin-dashboard__score-dl-row">
                            <dt>band</dt>
                            <dd>{formatBand(savedAnswersScoreUi.writing?.band)}</dd>
                          </div>
                          <div className="admin-dashboard__score-writing-block">
                            <span className="admin-dashboard__score-sub">task1</span>
                            <pre className="admin-dashboard__score-task-pre" tabIndex={0}>
                              {formatWritingTaskPreview(savedAnswersScoreUi.writing?.task1)}
                            </pre>
                          </div>
                          <div className="admin-dashboard__score-writing-block">
                            <span className="admin-dashboard__score-sub">task2</span>
                            <pre className="admin-dashboard__score-task-pre" tabIndex={0}>
                              {formatWritingTaskPreview(savedAnswersScoreUi.writing?.task2)}
                            </pre>
                          </div>
                        </dl>
                      </article>
                      <article className="admin-dashboard__score-card">
                        <h4 className="admin-dashboard__score-card-title">Speaking</h4>
                        <dl className="admin-dashboard__score-dl">
                          <div className="admin-dashboard__score-dl-row">
                            <dt>band</dt>
                            <dd>{formatBand(savedAnswersScoreUi.speaking)}</dd>
                          </div>
                        </dl>
                      </article>
                    </div>
                  </div>
                </section>
              )}

              <section aria-label="Reading — ответы по частям">
                <h3 className="admin-dashboard__saved-answers-section-title">Reading</h3>
                {READING_PART_KEYS.map((pk) => (
                  <ReadingPartAnswersTable
                    key={pk}
                    partKey={pk}
                    data={savedAnswersPayload.session.reading?.[pk]}
                  />
                ))}
              </section>

              <section aria-label="Listening и Writing">
                <SessionJsonBlock title="Listening (сохранённые ответы)" value={savedAnswersPayload.session.listening} />
                <SessionJsonBlock title="Writing (сохранённые ответы)" value={savedAnswersPayload.session.writing} />
              </section>
            </div>
            <button
              type="button"
              className="admin-dashboard__modal-close"
              onClick={closeSavedAnswersModal}
              aria-label="Закрыть подробный отчёт"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <div className="admin-dashboard__body">
        <nav className="admin-dashboard__nav" aria-label="Разделы панели">
          <ul className="admin-dashboard__nav-list">
            <li className="admin-dashboard__nav-item">
              <button
                type="button"
                className={`admin-dashboard__nav-btn ${activeNav === NAV_MACHINES ? "admin-dashboard__nav-btn--active" : ""}`}
                onClick={() => setActiveNav(NAV_MACHINES)}
                aria-current={activeNav === NAV_MACHINES ? "true" : undefined}
              >
                <span className="admin-dashboard__nav-label">Компьютеры</span>
              </button>
            </li>
            <li className="admin-dashboard__nav-item">
              <button
                type="button"
                className={`admin-dashboard__nav-btn ${
                  activeNav === NAV_SESSIONS ? "admin-dashboard__nav-btn--active" : ""
                }`}
                onClick={() => setActiveNav(NAV_SESSIONS)}
                aria-current={activeNav === NAV_SESSIONS ? "true" : undefined}
              >
                <span className="admin-dashboard__nav-label">Сессии</span>
              </button>
            </li>
            <li className="admin-dashboard__nav-item">
              <button
                type="button"
                className={`admin-dashboard__nav-btn ${
                  activeNav === NAV_RESULTS ? "admin-dashboard__nav-btn--active" : ""
                }`}
                onClick={() => setActiveNav(NAV_RESULTS)}
                aria-current={activeNav === NAV_RESULTS ? "true" : undefined}
              >
                <span className="admin-dashboard__nav-label">Результаты</span>
              </button>
            </li>
          </ul>
        </nav>

        <main className="admin-dashboard__main">
          {listError && (
            <div className="admin-dashboard__inline-error" role="alert">
              <p>{listError}</p>
              <button
                type="button"
                className="admin-dashboard__btn-primary admin-dashboard__inline-error-retry"
                onClick={() => loadDashboardData()}
                disabled={listLoading}
              >
                Повторить
              </button>
            </div>
          )}

          {activeNav === NAV_MACHINES && (
            <section
              className="admin-dashboard__section"
              aria-labelledby="machines-title"
            >
              <h2 id="machines-title" className="admin-dashboard__section-title">
                Мониторинг компьютеров
              </h2>
              <div className="admin-dashboard__machines-header">
                <p className="admin-dashboard__machines-meta">
                  Всего компьютеров:{" "}
                  <strong>{machinesWithSession.length}</strong> · Заняты:{" "}
                  <strong>
                    {machinesWithSession.filter((m) => m.status === "busy").length}
                  </strong>
                </p>
                <div className="admin-dashboard__machines-toolbar">
                  <button
                    type="button"
                    className="admin-dashboard__refresh-btn"
                    onClick={() => loadDashboardData()}
                    disabled={listLoading}
                    aria-label="Обновить список компьютеров"
                  >
                    <FiRefreshCw
                      aria-hidden="true"
                      className={listLoading ? "admin-dashboard__refresh-icon--spin" : ""}
                    />
                    <span>{listLoading ? "Обновление…" : "Обновить"}</span>
                  </button>
                  {lastRefreshLabel && (
                    <span className="admin-dashboard__machines-refresh-meta">
                      Обновлено: {lastRefreshLabel}
                    </span>
                  )}
                </div>
              </div>

              <div className="admin-dashboard__table-wrap">
                <table
                  className="admin-dashboard__table"
                  aria-label="Мониторинг компьютеров"
                >
                  <thead>
                    <tr>
                      <th scope="col" className="admin-dashboard__th">
                        Компьютер
                      </th>
                      <th scope="col" className="admin-dashboard__th">
                        Онлайн
                      </th>
                      <th scope="col" className="admin-dashboard__th">
                        Статус
                      </th>
                      <th scope="col" className="admin-dashboard__th">
                        Активная сессия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {listLoading && machinesWithSession.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="admin-dashboard__td admin-dashboard__td--empty"
                        >
                          <span className="admin-dashboard__table-loading">Загрузка…</span>
                        </td>
                      </tr>
                    ) : machinesWithSession.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="admin-dashboard__td admin-dashboard__td--empty"
                        >
                          Нет зарегистрированных компьютеров
                        </td>
                      </tr>
                    ) : (
                      machinesWithSession.map((machine) => (
                        <tr key={machine.id}>
                          <td className="admin-dashboard__td">{machine.name}</td>
                          <td className="admin-dashboard__td">
                            <span
                              className={`admin-dashboard__badge ${
                                machine.isAgentActive
                                  ? "admin-dashboard__badge--free"
                                  : "admin-dashboard__badge--not-ready"
                              }`}
                            >
                              {machine.isAgentActive ? "онлайн" : "офлайн"}
                            </span>
                          </td>
                          <td className="admin-dashboard__td">
                            <span
                              className={`admin-dashboard__badge ${
                                machine.status === "free"
                                  ? "admin-dashboard__badge--free"
                                  : "admin-dashboard__badge--busy"
                              }`}
                            >
                              {machine.status === "free" ? "Свободен" : "Занят"}
                            </span>
                          </td>
                          <td className="admin-dashboard__td">
                            {machine.status === "busy" && machine.session ? (
                              <button
                                type="button"
                                className="admin-dashboard__link-button"
                                onClick={() =>
                                  handleSessionRowClick(String(machine.session.id))
                                }
                              >
                                {machine.session.id} · {machine.session.studentName}
                              </button>
                            ) : (
                              <span className="admin-dashboard__text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeNav === NAV_SESSIONS && (
            <section
              className="admin-dashboard__section"
              aria-labelledby="ongoing-sessions-title"
            >
              <h2 id="ongoing-sessions-title" className="admin-dashboard__section-title">
                Сессии
              </h2>
              <div className="admin-dashboard__machines-header admin-dashboard__machines-header--sessions">
                <p className="admin-dashboard__machines-meta">
                  Всего сессий: <strong>{totalSessionsCount}</strong>
                </p>
                <div className="admin-dashboard__machines-toolbar">
                  <button
                    type="button"
                    className="admin-dashboard__terminate-selected-btn"
                    onClick={() => handleTerminateSelectedSessions()}
                    disabled={
                      listLoading ||
                      selectedTerminatableCount === 0 ||
                      bulkTerminating ||
                      terminatingSessionId != null
                    }
                  >
                    {bulkTerminating ? "Завершение…" : "Завершить выбранные"}
                  </button>
                  <button
                    type="button"
                    className="admin-dashboard__refresh-btn"
                    onClick={() => loadDashboardData()}
                    disabled={listLoading}
                    aria-label="Обновить список сессий"
                  >
                    <FiRefreshCw
                      aria-hidden="true"
                      className={listLoading ? "admin-dashboard__refresh-icon--spin" : ""}
                    />
                    <span>{listLoading ? "Обновление…" : "Обновить"}</span>
                  </button>
                </div>
              </div>
              {terminateError ? (
                <p className="admin-dashboard__terminate-error" role="alert">
                  {terminateError}
                </p>
              ) : null}

              <div className="admin-dashboard__sessions-layout">
                <div className="admin-dashboard__subsection">
                  <h3 className="admin-dashboard__subsection-title">Активные сессии</h3>
                  <div className="admin-dashboard__table-wrap">
                    <table
                      className="admin-dashboard__table"
                      aria-label="Активные сессии"
                    >
                      <thead>
                        <tr>
                          <th scope="col" className="admin-dashboard__th admin-dashboard__th--session-actions">
                            <span className="visually-hidden">Выбор</span>
                            <input
                              type="checkbox"
                              className="admin-dashboard__session-select-all"
                              aria-label="Выбрать все активные сессии"
                              checked={allActiveSessionsSelected && activeSessions.length > 0}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate =
                                    someActiveSessionsSelected && !allActiveSessionsSelected;
                                }
                              }}
                              onChange={handleSelectAllActiveSessions}
                              disabled={listLoading || activeSessions.length === 0 || bulkTerminating}
                            />
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Сессия
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Агент
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Статус API
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            mock
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Активна
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Создана
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Heartbeat
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Вид
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {listLoading && activeSessions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="admin-dashboard__td admin-dashboard__td--empty"
                            >
                              <span className="admin-dashboard__table-loading">Загрузка…</span>
                            </td>
                          </tr>
                        ) : activeSessions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="admin-dashboard__td admin-dashboard__td--empty"
                            >
                              Сейчас нет активных сессий
                            </td>
                          </tr>
                        ) : (
                          activeSessions.map((session) => (
                            <tr
                              key={session.id}
                              className="admin-dashboard__row-clickable"
                              onClick={() => handleSessionRowClick(session.id)}
                            >
                              <td
                                className="admin-dashboard__td admin-dashboard__td--session-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="admin-dashboard__session-action-cell">
                                  <input
                                    type="checkbox"
                                    className="admin-dashboard__session-row-checkbox"
                                    aria-label={`Выбрать сессию ${session.id}`}
                                    checked={selectedTerminateIds.has(String(session.id))}
                                    onChange={() => toggleTerminateSelection(session.id)}
                                    disabled={bulkTerminating || !canTerminateSession(session)}
                                  />
                                  <button
                                    type="button"
                                    className="admin-dashboard__session-terminate-btn"
                                    disabled={
                                      !canTerminateSession(session) ||
                                      terminatingSessionId === String(session.id) ||
                                      bulkTerminating
                                    }
                                    onClick={() => handleTerminateSession(session.id)}
                                  >
                                    {terminatingSessionId === String(session.id)
                                      ? "…"
                                      : "Завершить"}
                                  </button>
                                </div>
                              </td>
                              <td className="admin-dashboard__td admin-dashboard__td--uuid">
                                {session.id}
                              </td>
                              <td className="admin-dashboard__td">{session.agentUsername || session.computerLabel}</td>
                              <td className="admin-dashboard__td admin-dashboard__td--mono">
                                {session.apiStatus}
                              </td>
                              <td className="admin-dashboard__td">{formatMockId(session.mockId)}</td>
                              <td className="admin-dashboard__td">{formatBoolRu(session.isActiveFlag)}</td>
                              <td className="admin-dashboard__td">{session.createdAtDisplay}</td>
                              <td className="admin-dashboard__td">{session.lastHeartbeatDisplay}</td>
                              <td className="admin-dashboard__td">
                                <span className="admin-dashboard__badge admin-dashboard__badge--session-active">
                                  Активна
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="admin-dashboard__subsection">
                  <h3 className="admin-dashboard__subsection-title">История сессий</h3>
                  <div className="admin-dashboard__table-wrap">
                    <table
                      className="admin-dashboard__table"
                      aria-label="Завершённые сессии"
                    >
                      <thead>
                        <tr>
                          <th scope="col" className="admin-dashboard__th admin-dashboard__th--session-actions">
                            <span className="visually-hidden">Действия</span>
                            <input
                              type="checkbox"
                              className="admin-dashboard__session-select-all"
                              aria-label="Выбор недоступен для завершённых сессий"
                              disabled
                              checked={false}
                              title="Завершённые сессии нельзя принудительно завершить"
                            />
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Сессия
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Агент
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Статус API
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            mock
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Активна
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Создана
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Heartbeat
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Вид
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {listLoading && finishedSessions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="admin-dashboard__td admin-dashboard__td--empty"
                            >
                              <span className="admin-dashboard__table-loading">Загрузка…</span>
                            </td>
                          </tr>
                        ) : finishedSessions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="admin-dashboard__td admin-dashboard__td--empty"
                            >
                              История попыток пока пуста
                            </td>
                          </tr>
                        ) : (
                          finishedSessions.map((session) => (
                            <tr
                              key={session.id}
                              className="admin-dashboard__row-clickable"
                              onClick={() => handleSessionRowClick(session.id)}
                            >
                              <td
                                className="admin-dashboard__td admin-dashboard__td--session-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="admin-dashboard__session-action-cell">
                                  <input
                                    type="checkbox"
                                    className="admin-dashboard__session-row-checkbox"
                                    aria-label={`Выбор недоступен для сессии ${session.id}`}
                                    checked={false}
                                    disabled
                                    title="Сессия уже завершена"
                                  />
                                  <button
                                    type="button"
                                    className="admin-dashboard__session-terminate-btn"
                                    disabled
                                    title="Сессия уже завершена"
                                  >
                                    Завершить
                                  </button>
                                </div>
                              </td>
                              <td className="admin-dashboard__td admin-dashboard__td--uuid">
                                {session.id}
                              </td>
                              <td className="admin-dashboard__td">{session.agentUsername || session.computerLabel}</td>
                              <td className="admin-dashboard__td admin-dashboard__td--mono">
                                {session.apiStatus}
                              </td>
                              <td className="admin-dashboard__td">{formatMockId(session.mockId)}</td>
                              <td className="admin-dashboard__td">{formatBoolRu(session.isActiveFlag)}</td>
                              <td className="admin-dashboard__td">{session.createdAtDisplay}</td>
                              <td className="admin-dashboard__td">{session.lastHeartbeatDisplay}</td>
                              <td className="admin-dashboard__td">
                                <span className="admin-dashboard__badge admin-dashboard__badge--session-finished">
                                  {session.apiStatus}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedSession && (
                  <aside className="admin-dashboard__session-details">
                    <h3 className="admin-dashboard__subsection-title">Детали сессии</h3>
                    <p className="admin-dashboard__session-details-row">
                      <span>session_id</span>
                      <strong className="admin-dashboard__session-details-strong--wrap">
                        {selectedSession.id}
                      </strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>agent_id</span>
                      <strong>{selectedSession.agentId ?? "—"}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>agent_username</span>
                      <strong>{selectedSession.agentUsername || "—"}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>status</span>
                      <strong>{selectedSession.apiStatus}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>is_active</span>
                      <strong>{formatBoolRu(selectedSession.isActiveFlag)}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>created_at</span>
                      <strong>{selectedSession.createdAtDisplay}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>last_heartbeat</span>
                      <strong>{selectedSession.lastHeartbeatDisplay}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>mock_id</span>
                      <strong>{formatMockId(selectedSession.mockId)}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>Ключ сессии</span>
                      <strong>{selectedSession.sessionKey}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>Ученик (если есть)</span>
                      <strong>{selectedSession.studentName}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>Отображение в UI</span>
                      <strong>
                        {selectedSession.status === "active" ? "Активная сессия" : "Завершённая / неактивная"}
                      </strong>
                    </p>
                  </aside>
                )}
              </div>
            </section>
          )}

          {activeNav === NAV_RESULTS && (
            <section
              className="admin-dashboard__section"
              aria-labelledby="finish-tests-title"
            >
              <h2 id="finish-tests-title" className="admin-dashboard__section-title">
                Результаты по секциям
              </h2>
              <p className="admin-dashboard__results-api-placeholder">
                Баллы подгружаются при выборе строки (GET score и детали сессии). Средний Overall и
                диаграмма считаются по сессиям, для которых уже загружены баллы в этой сессии
                браузера.
              </p>
              <div className="admin-dashboard__machines-header admin-dashboard__machines-header--sessions">
                <p className="admin-dashboard__machines-meta">
                  Всего сессий: <strong>{totalSessionsCount}</strong>
                </p>
                <div className="admin-dashboard__machines-toolbar">
                  <button
                    type="button"
                    className="admin-dashboard__refresh-btn"
                    onClick={() => loadDashboardData()}
                    disabled={listLoading}
                    aria-label="Обновить данные"
                  >
                    <FiRefreshCw
                      aria-hidden="true"
                      className={listLoading ? "admin-dashboard__refresh-icon--spin" : ""}
                    />
                    <span>{listLoading ? "Обновление…" : "Обновить"}</span>
                  </button>
                </div>
              </div>

              <div className="admin-dashboard__results-stats">
                <div className="admin-dashboard__stats">
                  <div className="admin-dashboard__stats-item">
                    <span className="admin-dashboard__stats-label">Всего попыток</span>
                    <span className="admin-dashboard__stats-value">{totalSessionsCount}</span>
                  </div>
                  <div className="admin-dashboard__stats-item">
                    <span className="admin-dashboard__stats-label">Активных сейчас</span>
                    <span className="admin-dashboard__stats-value">{activeCount}</span>
                  </div>
                  <div className="admin-dashboard__stats-item">
                    <span className="admin-dashboard__stats-label">Завершённых</span>
                    <span className="admin-dashboard__stats-value">{finishedCount}</span>
                  </div>
                  <div className="admin-dashboard__stats-item">
                    <span className="admin-dashboard__stats-label">Средний Overall</span>
                    <span className="admin-dashboard__stats-value">{averageOverall}</span>
                  </div>
                </div>

                {hasCachedDistribution ? (
                  <div className="admin-dashboard__bars">
                    {distribution.map((item) => (
                      <div key={item.label} className="admin-dashboard__bar-row">
                        <span className="admin-dashboard__bar-label">{item.label}</span>
                        <div className="admin-dashboard__bar-track">
                          <div
                            className="admin-dashboard__bar-fill"
                            style={{
                              width:
                                maxDistributionCount === 0
                                  ? "0%"
                                  : `${(item.count / maxDistributionCount) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="admin-dashboard__bar-count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-dashboard__bars admin-dashboard__bars--placeholder">
                    <p className="admin-dashboard__bars-placeholder-text">
                      Выберите завершённые сессии в таблице, чтобы подтянуть Overall и увидеть
                      распределение.
                    </p>
                  </div>
                )}
              </div>

              <div className="admin-dashboard__results-layout">
                <div className="admin-dashboard__subsection">
                  <h3 className="admin-dashboard__subsection-title">Список попыток</h3>
                  <div className="admin-dashboard__table-wrap">
                    <table
                      className="admin-dashboard__table"
                      aria-label="Результаты сессий"
                    >
                      <thead>
                        <tr>
                          <th scope="col" className="admin-dashboard__th">
                            Сессия
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            mock
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Статус API
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Ученик / агент
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            L
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            R
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            W
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            S
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Overall
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {listLoading && sessionsWithResults.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="admin-dashboard__td admin-dashboard__td--empty"
                            >
                              <span className="admin-dashboard__table-loading">Загрузка…</span>
                            </td>
                          </tr>
                        ) : sessionsWithResults.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="admin-dashboard__td admin-dashboard__td--empty"
                            >
                              Пока нет сессий
                            </td>
                          </tr>
                        ) : (
                          sessionsWithResults.map((session) => {
                            const r = scoresBySessionId[String(session.id)];
                            return (
                              <tr
                                key={session.id}
                                className={`admin-dashboard__row-clickable ${
                                  String(session.id) === String(selectedSessionId)
                                    ? "admin-dashboard__row--active"
                                    : ""
                                }`}
                                onClick={() => setSelectedSessionId(session.id)}
                              >
                                <td className="admin-dashboard__td admin-dashboard__td--uuid">
                                  {session.id}
                                </td>
                                <td className="admin-dashboard__td">{formatMockId(session.mockId)}</td>
                                <td className="admin-dashboard__td admin-dashboard__td--mono">
                                  {session.apiStatus}
                                </td>
                                <td className="admin-dashboard__td">{session.studentName}</td>
                                <td className="admin-dashboard__td">
                                  {formatBand(r?.listening)}
                                </td>
                                <td className="admin-dashboard__td">
                                  {formatBand(r?.reading)}
                                </td>
                                <td className="admin-dashboard__td">
                                  {formatBand(r?.writing)}
                                </td>
                                <td className="admin-dashboard__td">
                                  {formatBand(r?.speaking)}
                                </td>
                                <td className="admin-dashboard__td">
                                  {formatBand(r?.overall)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedSession && (
                  <aside className="admin-dashboard__results-form">
                    <div className="admin-dashboard__results-aside-head">
                      <h3 className="admin-dashboard__subsection-title">Сводка по сессии</h3>
                      <button
                        type="button"
                        className="admin-dashboard__refresh-btn admin-dashboard__refresh-btn--compact"
                        onClick={() => loadSessionScores()}
                        disabled={detailLoading}
                        aria-label="Обновить баллы по выбранной сессии"
                      >
                        <FiRefreshCw
                          aria-hidden="true"
                          className={detailLoading ? "admin-dashboard__refresh-icon--spin" : ""}
                        />
                        <span>{detailLoading ? "…" : "Обновить баллы"}</span>
                      </button>
                    </div>
                    <p className="admin-dashboard__results-form-meta">
                      {selectedSession.studentName} · {selectedSession.id}
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>Статус</span>
                      <strong>{isSelectedActive ? "Активна" : "Завершена"}</strong>
                    </p>

                    {detailLoading && (
                      <p className="admin-dashboard__detail-status">Загрузка баллов…</p>
                    )}
                    {detailError && (
                      <p className="admin-dashboard__detail-error" role="status">
                        {detailError}
                      </p>
                    )}

                    {!detailLoading && !isSelectedActive && (
                      <div
                        className="admin-dashboard__score-board"
                        aria-label="Баллы из API /score/"
                      >
                        <p className="admin-dashboard__score-board-caption">
                          Данные:{" "}
                          <code>
                            {`GET /api/v1/auth/center-admin/sessions/<session_id>/score/`}
                          </code>
                        </p>
                        {selectedScoreDetail?.sessionId && (
                          <p className="admin-dashboard__score-board-session">
                            <span className="admin-dashboard__score-board-k">session_id</span>
                            <span className="admin-dashboard__score-board-v">{selectedScoreDetail.sessionId}</span>
                          </p>
                        )}
                        <div className="admin-dashboard__score-overall-pill">
                          <span className="admin-dashboard__score-overall-label">Overall</span>
                          <span className="admin-dashboard__score-overall-value" aria-live="polite">
                            {formatBand(selectedScoreDetail?.overall ?? selectedBands?.overall)}
                          </span>
                        </div>
                        <div className="admin-dashboard__score-cards">
                          <article className="admin-dashboard__score-card">
                            <h4 className="admin-dashboard__score-card-title">Listening</h4>
                            <dl className="admin-dashboard__score-dl">
                              <div className="admin-dashboard__score-dl-row">
                                <dt>band</dt>
                                <dd>{formatBand(selectedScoreDetail?.listening?.band ?? selectedBands?.listening)}</dd>
                              </div>
                              <div className="admin-dashboard__score-dl-row">
                                <dt>correct</dt>
                                <dd>
                                  {selectedScoreDetail?.listening?.correct != null
                                    ? String(selectedScoreDetail.listening.correct)
                                    : "—"}
                                </dd>
                              </div>
                            </dl>
                          </article>
                          <article className="admin-dashboard__score-card">
                            <h4 className="admin-dashboard__score-card-title">Reading</h4>
                            <dl className="admin-dashboard__score-dl">
                              <div className="admin-dashboard__score-dl-row">
                                <dt>band</dt>
                                <dd>{formatBand(selectedScoreDetail?.reading?.band ?? selectedBands?.reading)}</dd>
                              </div>
                              <div className="admin-dashboard__score-dl-row">
                                <dt>correct</dt>
                                <dd>
                                  {selectedScoreDetail?.reading?.correct != null
                                    ? String(selectedScoreDetail.reading.correct)
                                    : "—"}
                                </dd>
                              </div>
                            </dl>
                          </article>
                          <article className="admin-dashboard__score-card admin-dashboard__score-card--wide">
                            <h4 className="admin-dashboard__score-card-title">Writing</h4>
                            <dl className="admin-dashboard__score-dl">
                              <div className="admin-dashboard__score-dl-row">
                                <dt>band</dt>
                                <dd>{formatBand(selectedScoreDetail?.writing?.band ?? selectedBands?.writing)}</dd>
                              </div>
                              <div className="admin-dashboard__score-writing-block">
                                <span className="admin-dashboard__score-sub">task1</span>
                                <pre className="admin-dashboard__score-task-pre" tabIndex={0}>
                                  {formatWritingTaskPreview(selectedScoreDetail?.writing?.task1)}
                                </pre>
                              </div>
                              <div className="admin-dashboard__score-writing-block">
                                <span className="admin-dashboard__score-sub">task2</span>
                                <pre className="admin-dashboard__score-task-pre" tabIndex={0}>
                                  {formatWritingTaskPreview(selectedScoreDetail?.writing?.task2)}
                                </pre>
                              </div>
                            </dl>
                          </article>
                          <article className="admin-dashboard__score-card">
                            <h4 className="admin-dashboard__score-card-title">Speaking</h4>
                            <dl className="admin-dashboard__score-dl">
                              <div className="admin-dashboard__score-dl-row">
                                <dt>band</dt>
                                <dd>{formatBand(selectedScoreDetail?.speaking ?? selectedBands?.speaking)}</dd>
                              </div>
                            </dl>
                          </article>
                        </div>
                      </div>
                    )}

                    {isSelectedActive && (
                      <div className="admin-dashboard__placeholder">
                        Полные баллы будут доступны после завершения экзамена на агенте.
                      </div>
                    )}

                    {!isSelectedActive && (
                      <div className="admin-dashboard__speaking-form">
                        <label className="admin-dashboard__speaking-label" htmlFor="speaking-band">
                          Speaking (IELTS band, ввод вручную после очной оценки)
                        </label>
                        <div className="admin-dashboard__speaking-row">
                          <input
                            id="speaking-band"
                            type="number"
                            min={0}
                            max={9}
                            step={0.5}
                            value={speakingDraft}
                            onChange={(e) => setSpeakingDraft(e.target.value)}
                            className="admin-dashboard__speaking-input"
                            disabled={speakingSaving || detailLoading}
                            aria-describedby="speaking-hint"
                          />
                          <button
                            type="button"
                            className="admin-dashboard__btn-primary admin-dashboard__speaking-save"
                            onClick={() => handleSaveSpeaking()}
                            disabled={speakingSaving || detailLoading}
                          >
                            {speakingSaving ? "Сохранение…" : "Сохранить Speaking"}
                          </button>
                        </div>
                        <p id="speaking-hint" className="admin-dashboard__speaking-hint">
                          Шаг 0.5, диапазон 0–9. Сохранение пересчитывает overall, когда все секции
                          заполнены.
                        </p>
                        {speakingSaveError && (
                          <p className="admin-dashboard__detail-error" role="alert">
                            {speakingSaveError}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="admin-dashboard__saved-answers-block">
                      <button
                        type="button"
                        className="admin-dashboard__btn-secondary"
                        onClick={() => handleViewSavedAnswersDetail()}
                        disabled={!selectedSessionId}
                      >
                        Увидеть подробнее
                      </button>
                      <p className="admin-dashboard__saved-answers-hint">
                        Данные:{" "}
                        <code>
                          {`GET /api/v1/auth/center-admin/sessions/<session_id>/saved-answers/`}
                        </code>
                      </p>
                      {savedAnswersError && (
                        <p className="admin-dashboard__detail-error" role="alert">
                          {savedAnswersError}
                        </p>
                      )}
                    </div>
                  </aside>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
