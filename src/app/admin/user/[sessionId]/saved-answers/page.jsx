"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import "../../../styles/style_admin.scss";

import {
  extractBandsFromScorePayload,
  fetchSessionDetail,
  fetchSessionSavedAnswers,
  fetchSessionScore,
  mergeScoreBands,
  parseScoreDetailForAdminUi,
  postSessionSpeakingScore,
} from "@/lib/centerAdminApi";
import {
  CENTER_ADMIN_ACCESS_TOKEN_KEY,
  CENTER_ADMIN_ID_KEY,
  clearCenterAdminAuthStorage,
  getCenterAdminTokenExpiryMs,
  invalidateCenterAdminSession,
} from "@/lib/centerAdminAuth";

const THEME_LIGHT = "light";
const THEME_DARK = "dark";
const ADMIN_THEME_KEY = "adminTheme";

const ACTIVE_STATUS_HINTS = new Set([
  "active",
  "in_progress",
  "inprogress",
  "started",
  "running",
  "live",
  "ongoing",
  "pending",
  "open",
  "reading_tutorial",
  "busy",
]);

function formatBand(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return String(v);
}

function roundToHalf(n) {
  return Math.round(n * 2) / 2;
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

/**
 * @param {object | null} session
 * @returns {{ started: string | null, ended: string | null }}
 */
function pickTestStartedEnded(session) {
  if (!session || typeof session !== "object") {
    return { started: null, ended: null };
  }
  const started =
    session.test_started_at ??
    session.testStartedAt ??
    session.exam_started_at ??
    session.examStartedAt ??
    session.started_at ??
    session.startedAt ??
    session.begin_at ??
    session.created_at ??
    null;
  const ended =
    session.test_finished_at ??
    session.testFinishedAt ??
    session.exam_finished_at ??
    session.examFinishedAt ??
    session.finished_at ??
    session.ended_at ??
    session.endedAt ??
    session.completed_at ??
    session.completedAt ??
    session.end_time ??
    session.session_end ??
    null;
  return { started, ended };
}

function pickStudentLabel(session) {
  if (!session || typeof session !== "object") return "—";
  const candidates = [
    session.student_name,
    session.studentName,
    session.user_full_name,
    session.full_name,
    session.username,
    session.student?.username,
    session.agent_username,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "—";
}

/**
 * @param {{ sessionId: string | null, session: object, root: object }} normalized
 * @param {{ ok: boolean, data?: object, message?: string, status?: number, unauthorized?: boolean }} scoreRes
 * @param {{ ok: boolean, data?: object, message?: string, status?: number, unauthorized?: boolean }} detailRes
 */
function mergeScoreDataFromResponses(normalized, scoreRes, detailRes) {
  const fromScore = extractBandsFromScorePayload(scoreRes.ok ? scoreRes.data : {});
  const fromDetail = extractBandsFromScorePayload(detailRes.ok ? detailRes.data : {});
  const apiBands = mergeScoreBands(fromScore, fromDetail);

  const savedPayload =
    normalized?.session && typeof normalized.session === "object"
      ? { session: normalized.session, session_id: normalized.sessionId }
      : normalized?.root ?? {};
  const fromSaved = extractBandsFromScorePayload(savedPayload);
  const mergedBands = mergeScoreBands(apiBands, fromSaved);

  let scoreDetailUi;
  if (scoreRes.ok && scoreRes.data) {
    scoreDetailUi = parseScoreDetailForAdminUi(scoreRes.data);
  } else if (detailRes.ok && detailRes.data?.session) {
    const s = detailRes.data.session;
    scoreDetailUi = parseScoreDetailForAdminUi({
      session_id: s.session_id ?? s.id,
      scores: s.scores,
    });
  } else if (normalized?.session) {
    scoreDetailUi = parseScoreDetailForAdminUi(normalized);
  } else {
    scoreDetailUi = parseScoreDetailForAdminUi({});
  }

  const warnings = [];
  if (!scoreRes.ok && !scoreRes.unauthorized) {
    warnings.push(scoreRes.message || `score (${scoreRes.status ?? "—"})`);
  }
  if (!detailRes.ok && !detailRes.unauthorized) {
    warnings.push(detailRes.message || `сессия (${detailRes.status ?? "—"})`);
  }
  const scoreMetaError = warnings.filter(Boolean).join(" · ");

  return { mergedBands, scoreDetailUi, scoreMetaError };
}

function formatBoolRu(v) {
  return v ? "да" : "нет";
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

function formatWritingBand(scores) {
  const band = scores?.band ?? scores?.Band ?? scores?.overall_band ?? null;
  if (band == null || band === "") return "—";
  const n = Number(band);
  return Number.isFinite(n) ? String(n) : String(band);
}

function formatCorrectAnswersText(correctAnswers) {
  if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) return "—";
  return correctAnswers
    .map((x) => (x == null || x === "" ? null : String(x)))
    .filter(Boolean)
    .join(", ");
}

function normalizeSavedAnswersPayload(raw) {
  const session =
    raw && typeof raw === "object" && raw.session && typeof raw.session === "object"
      ? raw.session
      : raw;

  const sessionId =
    raw?.session_id ??
    session?.session_id ??
    session?.id ??
    raw?.id ??
    raw?.pk ??
    null;

  return {
    sessionId: sessionId != null ? String(sessionId) : null,
    session,
    root: raw ?? {},
  };
}

/** Сессия считается активной (экзамен идёт) — как на странице результатов админки. */
function isSessionProbablyActive(session) {
  if (!session || typeof session !== "object") return false;
  if (session.is_active === true || session.session_active === true) return true;
  if (session.is_active === false || session.session_active === false) return false;
  const st = String(session.status ?? session.state ?? "").trim().toLowerCase();
  return ACTIVE_STATUS_HINTS.has(st);
}

function AnswerCorrectnessBadge({ isCorrect }) {
  if (isCorrect === true) {
    return <span className="admin-dashboard__correct-badge">Верно</span>;
  }
  if (isCorrect === false) {
    return <span className="admin-dashboard__wrong-badge">Неверно</span>;
  }
  return <span className="admin-dashboard__neutral-badge">—</span>;
}

const READING_PART_KEYS = ["p1", "p2", "p3"];
const READING_PART_LABELS = {
  p1: "Часть 1 (Passage 1)",
  p2: "Часть 2 (Passage 2)",
  p3: "Часть 3 (Passage 3)",
};

const LISTENING_PART_KEYS = ["p1", "p2", "p3", "p4"];
const LISTENING_PART_LABELS = {
  p1: "Часть 1 (Section 1)",
  p2: "Часть 2 (Section 2)",
  p3: "Часть 3 (Section 3)",
  p4: "Часть 4 (Section 4)",
};

function computePartStats(questionsObj) {
  if (!questionsObj || typeof questionsObj !== "object") {
    return { total: 0, correct: 0, wrong: 0 };
  }
  const values = Object.values(questionsObj);
  let total = values.length;
  let correct = 0;
  let wrong = 0;
  for (const v of values) {
    if (v && typeof v === "object") {
      if (v.is_correct === true) correct += 1;
      else if (v.is_correct === false) wrong += 1;
    }
  }
  return { total, correct, wrong };
}

function ReadingListeningPartTable({ partLabel, data }) {
  const entries = useMemo(() => {
    if (!data || typeof data !== "object") return [];
    return Object.entries(data).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [data]);

  const stats = useMemo(() => computePartStats(data), [data]);

  return (
    <div className="admin-dashboard__reading-part-block" aria-label={partLabel}>
      <h3 className="admin-dashboard__saved-answers-part-title">{partLabel}</h3>
      <p className="admin-dashboard__saved-answers-hint">
        Верно: <strong>{stats.correct}</strong> · Неверно: <strong>{stats.wrong}</strong> · Всего:{" "}
        <strong>{stats.total}</strong>
      </p>

      {entries.length === 0 ? (
        <p className="admin-dashboard__saved-answers-empty">Нет данных</p>
      ) : (
        <div className="admin-dashboard__answers-matrix-wrap">
          <table className="admin-dashboard__answers-matrix">
            <thead>
              <tr>
                <th scope="col" style={{ width: "4rem" }}>
                  Вопрос
                </th>
                <th scope="col">Ответ</th>
                <th scope="col" style={{ width: "6.5rem" }}>
                  Статус
                </th>
                <th scope="col">Правильный ответ</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([q, item]) => {
                const isCorrect = item?.is_correct;
                const answerText = item?.answer;
                const correctAnswersText = formatCorrectAnswersText(item?.correct_answers);
                const showCorrect = isCorrect === false;
                const rowClass =
                  isCorrect === true
                    ? "admin-dashboard__answer-row admin-dashboard__answer-row--correct"
                    : isCorrect === false
                      ? "admin-dashboard__answer-row admin-dashboard__answer-row--wrong"
                      : "admin-dashboard__answer-row admin-dashboard__answer-row--unknown";

                return (
                  <tr key={q} className={rowClass}>
                    <td>{q}</td>
                    <td>{answerText === "" || answerText == null ? "—" : String(answerText)}</td>
                    <td>
                      <AnswerCorrectnessBadge isCorrect={isCorrect} />
                    </td>
                    <td>
                      {showCorrect ? (
                        <span className="admin-dashboard__correct-answers">{correctAnswersText}</span>
                      ) : (
                        <span className="admin-dashboard__correct-answers admin-dashboard__correct-answers--muted">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SessionWritingTasks({ writing }) {
  const tasks = ["t1", "t2"];

  return (
    <section aria-label="Writing" className="admin-dashboard__reading-part-block">
      <h3 className="admin-dashboard__saved-answers-section-title">Writing</h3>

      <div className="admin-dashboard__score-cards">
        {tasks.map((tKey) => {
          const item = writing?.[tKey];
          const taskLabel = tKey === "t1" ? "Task 1" : "Task 2";
          const answer = item?.answer;
          const scores = item?.scores;
          const band = formatWritingBand(scores);
          const taskResponseLabel =
            scores?.TR != null || scores?.tr != null ? "TR" : "TA";
          const taskResponseValue =
            scores?.TA ?? scores?.ta ?? scores?.TR ?? scores?.tr ?? "—";

          return (
            <article key={tKey} className="admin-dashboard__score-card" aria-label={taskLabel}>
              <h4 className="admin-dashboard__score-card-title">{taskLabel}</h4>
              <dl className="admin-dashboard__score-dl">
                <div className="admin-dashboard__score-dl-row">
                  <dt>band</dt>
                  <dd>{band}</dd>
                </div>
              </dl>

              <div className="admin-dashboard__score-writing-block">
                <span className="admin-dashboard__score-sub">Ответ</span>
                <pre className="admin-dashboard__score-task-pre" tabIndex={0}>
                  {answer === "" || answer == null ? "—" : String(answer)}
                </pre>
              </div>

              {scores && typeof scores === "object" ? (
                <div className="admin-dashboard__score-writing-block">
                  <span className="admin-dashboard__score-sub">Scores</span>
                  <pre className="admin-dashboard__score-task-pre" tabIndex={0}>
                    {`CC: ${scores?.CC ?? scores?.cc ?? "—"}\nLR: ${
                      scores?.LR ?? scores?.lr ?? "—"
                    }\n${taskResponseLabel}: ${taskResponseValue}\nGRA: ${
                      scores?.GRA ?? scores?.gra ?? "—"
                    }\nband: ${band}`}
                  </pre>
                </div>
              ) : (
                <p className="admin-dashboard__saved-answers-empty">Нет scores</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ScoreBoardBlock({
  scoreDetailUi,
  mergedBands,
  sessionIdLabel,
  classNameExtra,
}) {
  const boardClass = ["admin-dashboard__score-board", classNameExtra].filter(Boolean).join(" ");
  return (
    <div className={boardClass} aria-label="Баллы сессии">
      {sessionIdLabel ? (
        <p className="admin-dashboard__score-board-session">
          <span className="admin-dashboard__score-board-k">session_id</span>
          <span className="admin-dashboard__score-board-v">{sessionIdLabel}</span>
        </p>
      ) : null}
      <div className="admin-dashboard__score-overall-pill">
        <span className="admin-dashboard__score-overall-label">Overall</span>
        <span className="admin-dashboard__score-overall-value" aria-live="polite">
          {formatBand(scoreDetailUi?.overall ?? mergedBands?.overall)}
        </span>
      </div>
      <div className="admin-dashboard__score-cards">
        <article className="admin-dashboard__score-card">
          <h4 className="admin-dashboard__score-card-title">Listening</h4>
          <dl className="admin-dashboard__score-dl">
            <div className="admin-dashboard__score-dl-row">
              <dt>band</dt>
              <dd>{formatBand(scoreDetailUi?.listening?.band ?? mergedBands?.listening)}</dd>
            </div>
            <div className="admin-dashboard__score-dl-row">
              <dt>correct</dt>
              <dd>
                {scoreDetailUi?.listening?.correct != null
                  ? String(scoreDetailUi.listening.correct)
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
              <dd>{formatBand(scoreDetailUi?.reading?.band ?? mergedBands?.reading)}</dd>
            </div>
            <div className="admin-dashboard__score-dl-row">
              <dt>correct</dt>
              <dd>
                {scoreDetailUi?.reading?.correct != null
                  ? String(scoreDetailUi.reading.correct)
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
              <dd>{formatBand(scoreDetailUi?.writing?.band ?? mergedBands?.writing)}</dd>
            </div>
            <div className="admin-dashboard__score-writing-block">
              <span className="admin-dashboard__score-sub">task1</span>
              <pre className="admin-dashboard__score-task-pre" tabIndex={0}>
                {formatWritingTaskPreview(scoreDetailUi?.writing?.task1)}
              </pre>
            </div>
            <div className="admin-dashboard__score-writing-block">
              <span className="admin-dashboard__score-sub">task2</span>
              <pre className="admin-dashboard__score-task-pre" tabIndex={0}>
                {formatWritingTaskPreview(scoreDetailUi?.writing?.task2)}
              </pre>
            </div>
          </dl>
        </article>
        <article className="admin-dashboard__score-card">
          <h4 className="admin-dashboard__score-card-title">Speaking</h4>
          <dl className="admin-dashboard__score-dl">
            <div className="admin-dashboard__score-dl-row">
              <dt>band</dt>
              <dd>{formatBand(scoreDetailUi?.speaking ?? mergedBands?.speaking)}</dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  );
}

export default function AdminSavedAnswersDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId ? String(params.sessionId) : null;

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [theme, setTheme] = useState(THEME_LIGHT);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const [detailSession, setDetailSession] = useState(null);
  const [mergedBands, setMergedBands] = useState(null);
  const [scoreDetailUi, setScoreDetailUi] = useState(null);
  const [scoreMetaError, setScoreMetaError] = useState("");

  const [scoresRefreshing, setScoresRefreshing] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [speakingDraft, setSpeakingDraft] = useState("");
  const [speakingSaving, setSpeakingSaving] = useState(false);
  const [speakingSaveError, setSpeakingSaveError] = useState("");

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
    if (typeof window === "undefined" || !authChecked || !isAuth) return;
    const token = localStorage.getItem(CENTER_ADMIN_ACCESS_TOKEN_KEY);
    const targetMs = getCenterAdminTokenExpiryMs(token);
    if (targetMs == null) {
      invalidateCenterAdminSession({ reason: "expired" });
      return;
    }
    const delay = Math.max(0, targetMs - Date.now());
    const id = window.setTimeout(() => {
      invalidateCenterAdminSession({ reason: "expired" });
    }, delay);
    return () => window.clearTimeout(id);
  }, [authChecked, isAuth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      const saved = localStorage.getItem(ADMIN_THEME_KEY);
      if (saved === THEME_DARK || saved === THEME_LIGHT) {
        setTheme(saved);
      }
    });
  }, []);

  const refreshScoresOnly = useCallback(async () => {
    if (!sessionId || !data) return;
    setScoresRefreshing(true);
    setSpeakingSaveError("");
    const [scoreRes, detailRes] = await Promise.all([
      fetchSessionScore(sessionId),
      fetchSessionDetail(sessionId),
    ]);
    if (scoreRes.unauthorized || detailRes.unauthorized) {
      setScoresRefreshing(false);
      return;
    }
    if (detailRes.ok && detailRes.data?.session) {
      setDetailSession(detailRes.data.session);
    }
    const { mergedBands: nextBands, scoreDetailUi: nextUi, scoreMetaError: nextErr } =
      mergeScoreDataFromResponses(data, scoreRes, detailRes);
    setMergedBands(nextBands);
    setScoreDetailUi(nextUi);
    setScoreMetaError(nextErr);
    setSpeakingDraft(
      nextBands.speaking != null && Number.isFinite(nextBands.speaking)
        ? String(nextBands.speaking)
        : ""
    );
    setScoresRefreshing(false);
  }, [sessionId, data]);

  useEffect(() => {
    if (!authChecked || !isAuth) return;
    if (!sessionId) return;
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setData(null);
      setDetailSession(null);
      setMergedBands(null);
      setScoreDetailUi(null);
      setScoreMetaError("");
      setSpeakingDraft("");
      setSpeakingSaveError("");

      const [answersRes, scoreRes, detailRes] = await Promise.all([
        fetchSessionSavedAnswers(sessionId),
        fetchSessionScore(sessionId),
        fetchSessionDetail(sessionId),
      ]);
      if (!alive) return;

      if (answersRes.unauthorized || scoreRes.unauthorized || detailRes.unauthorized) {
        setLoading(false);
        return;
      }

      if (!answersRes.ok) {
        setError(answersRes.message || "Не удалось загрузить подробные ответы");
        setLoading(false);
        return;
      }

      const normalized = normalizeSavedAnswersPayload(answersRes.data);
      setData(normalized);

      if (detailRes.ok && detailRes.data?.session) {
        setDetailSession(detailRes.data.session);
      }

      const { mergedBands: bands, scoreDetailUi: ui, scoreMetaError: metaErr } =
        mergeScoreDataFromResponses(normalized, scoreRes, detailRes);
      setMergedBands(bands);
      setScoreDetailUi(ui);
      setScoreMetaError(metaErr);
      setSpeakingDraft(
        bands.speaking != null && Number.isFinite(bands.speaking) ? String(bands.speaking) : ""
      );
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [authChecked, isAuth, sessionId]);

  useEffect(() => {
    if (!detailModalOpen) return;
    function handleEscape(e) {
      if (e.key === "Escape") setDetailModalOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [detailModalOpen]);

  const rootSession = data?.session;
  const sessionForTimestamps = useMemo(() => {
    if (!rootSession) return null;
    if (detailSession && typeof detailSession === "object") {
      return { ...rootSession, ...detailSession };
    }
    return rootSession;
  }, [rootSession, detailSession]);

  const { started: testStartedRaw, ended: testEndedRaw } = useMemo(
    () => pickTestStartedEnded(sessionForTimestamps),
    [sessionForTimestamps]
  );

  const reading = useMemo(() => rootSession?.reading ?? {}, [rootSession]);
  const listening = useMemo(() => rootSession?.listening ?? {}, [rootSession]);
  const writing = rootSession?.writing ?? {};
  const speakingSaved = rootSession?.speaking ?? null;

  const readingOverall = useMemo(() => {
    let total = 0;
    let correct = 0;
    let wrong = 0;
    for (const pk of READING_PART_KEYS) {
      const part = reading?.[pk];
      const stats = computePartStats(part);
      total += stats.total;
      correct += stats.correct;
      wrong += stats.wrong;
    }
    return { total, correct, wrong };
  }, [reading]);

  const listeningOverall = useMemo(() => {
    let total = 0;
    let correct = 0;
    let wrong = 0;
    for (const pk of LISTENING_PART_KEYS) {
      const part = listening?.[pk];
      const stats = computePartStats(part);
      total += stats.total;
      correct += stats.correct;
      wrong += stats.wrong;
    }
    return { total, correct, wrong };
  }, [listening]);

  const examActive = isSessionProbablyActive(sessionForTimestamps ?? rootSession);
  const studentLabel = pickStudentLabel(sessionForTimestamps ?? rootSession);
  const sidLabel = data?.sessionId ?? sessionId ?? "—";

  async function handleSaveSpeaking() {
    if (!sessionId || examActive) return;
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
    const res = await postSessionSpeakingScore(String(sessionId), rounded);
    if (res.unauthorized) {
      setSpeakingSaving(false);
      return;
    }
    if (!res.ok) {
      setSpeakingSaveError(res.message || "Не удалось сохранить");
      setSpeakingSaving(false);
      return;
    }
    const bands = extractBandsFromScorePayload(res.data);
    setMergedBands((prev) => mergeScoreBands(bands, prev || {}));
    setScoreDetailUi(parseScoreDetailForAdminUi(res.data));
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
          <div className="admin-dashboard__ielts-brand" aria-label="IELTS Mode">
            <span className="admin-dashboard__ielts-brand-ielts">IELTS</span>
            <span className="admin-dashboard__ielts-brand-mode">MODE</span>
          </div>
          <div className="admin-dashboard__header-main">
            <div className="admin-dashboard__title-block">
              <div className="admin-dashboard__title-text">
                <h1 className="admin-dashboard__title">Подробный отчёт</h1>
                <p className="admin-dashboard__title-subtitle">
                  {studentLabel} · Saved answers и правильность
                </p>
              </div>
            </div>
            <div className="admin-dashboard__actions">
              <button
                type="button"
                className="admin-dashboard__btn-secondary"
                onClick={() => router.push("/admin/user")}
                aria-label="Назад к списку"
              >
                <FiArrowLeft aria-hidden="true" />
                Назад
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="admin-dashboard__main">
        <section className="admin-dashboard__section" aria-label="Сводка и баллы">
          <h2 className="admin-dashboard__section-title">Сессия</h2>

          {!loading && !error && data && (
            <>
              {scoreMetaError ? (
                <p className="admin-dashboard__detail-error" role="status">
                  {scoreMetaError}
                </p>
              ) : null}

              {!examActive && mergedBands && scoreDetailUi ? (
                <div
                  className="admin-dashboard__score-board admin-dashboard__score-board--saved-summary"
                  aria-label="Краткая сводка баллов"
                >
                  <div className="admin-dashboard__score-overall-pill">
                    <span className="admin-dashboard__score-overall-label">Overall</span>
                    <span className="admin-dashboard__score-overall-value" aria-live="polite">
                      {formatBand(scoreDetailUi.overall ?? mergedBands.overall)}
                    </span>
                  </div>
                  <div className="admin-dashboard__score-cards admin-dashboard__score-cards--saved-summary">
                    <article className="admin-dashboard__score-card">
                      <h4 className="admin-dashboard__score-card-title">Listening</h4>
                      <dl className="admin-dashboard__score-dl">
                        <div className="admin-dashboard__score-dl-row">
                          <dt>band</dt>
                          <dd>
                            {formatBand(scoreDetailUi.listening?.band ?? mergedBands.listening)}
                          </dd>
                        </div>
                        <div className="admin-dashboard__score-dl-row">
                          <dt>correct</dt>
                          <dd>
                            {scoreDetailUi.listening?.correct != null
                              ? String(scoreDetailUi.listening.correct)
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
                          <dd>
                            {formatBand(scoreDetailUi.reading?.band ?? mergedBands.reading)}
                          </dd>
                        </div>
                        <div className="admin-dashboard__score-dl-row">
                          <dt>correct</dt>
                          <dd>
                            {scoreDetailUi.reading?.correct != null
                              ? String(scoreDetailUi.reading.correct)
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </article>
                    <article className="admin-dashboard__score-card">
                      <h4 className="admin-dashboard__score-card-title">Writing</h4>
                      <dl className="admin-dashboard__score-dl">
                        <div className="admin-dashboard__score-dl-row">
                          <dt>band</dt>
                          <dd>
                            {formatBand(scoreDetailUi.writing?.band ?? mergedBands.writing)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                    <article className="admin-dashboard__score-card">
                      <h4 className="admin-dashboard__score-card-title">Speaking</h4>
                      <dl className="admin-dashboard__score-dl">
                        <div className="admin-dashboard__score-dl-row">
                          <dt>band</dt>
                          <dd>
                            {formatBand(scoreDetailUi.speaking ?? mergedBands.speaking)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  </div>
                </div>
              ) : null}

              {examActive && (
                <p className="admin-dashboard__placeholder">
                  Полные баллы из API будут доступны после завершения экзамена на агенте. Ниже — сводка
                  по сохранённым ответам (Reading/Listening).
                </p>
              )}
            </>
          )}

          <dl className="admin-dashboard__saved-answers-meta-grid">
            <dt>session_id</dt>
            <dd>{sidLabel}</dd>

            <dt>Ученик</dt>
            <dd>{studentLabel}</dd>

            <dt>is_active</dt>
            <dd>{formatBoolRu(Boolean(rootSession?.is_active ?? rootSession?.isActive))}</dd>

            <dt>created_at</dt>
            <dd>{formatIsoDateRu(rootSession?.created_at)}</dd>

            <dt>updated</dt>
            <dd>{formatIsoDateRu(rootSession?.updated_at)}</dd>
          </dl>

          <div className="admin-dashboard__subsection" aria-label="Время теста">
            <h3 className="admin-dashboard__subsection-title">Период теста</h3>
            <div className="admin-dashboard__table-wrap">
              <table className="admin-dashboard__table">
                <thead>
                  <tr>
                    <th scope="col" className="admin-dashboard__th">
                      Начало теста
                    </th>
                    <th scope="col" className="admin-dashboard__th">
                      Окончание теста
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="admin-dashboard__td">{formatIsoDateRu(testStartedRaw)}</td>
                    <td className="admin-dashboard__td">{formatIsoDateRu(testEndedRaw)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {!loading && !error && data && (
            <div className="admin-dashboard__saved-answers-toolbar">
              <button
                type="button"
                className="admin-dashboard__btn-secondary"
                onClick={() => setDetailModalOpen(true)}
              >
                Баллы и Speaking (подробно)
              </button>
            </div>
          )}

          <div className="admin-dashboard__scores-grid" aria-label="Итого по чтению/аудированию">
            <div className="admin-dashboard__scores-item">
              <span>Reading</span>
              <strong>
                {readingOverall.correct}/{readingOverall.total}
              </strong>
            </div>
            <div className="admin-dashboard__scores-item">
              <span>Listening</span>
              <strong>
                {listeningOverall.correct}/{listeningOverall.total}
              </strong>
            </div>
          </div>
        </section>

        {loading && <p className="admin-dashboard__detail-status">Загрузка…</p>}
        {error && (
          <p className="admin-dashboard__detail-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {READING_PART_KEYS.map((pk) => (
              <ReadingListeningPartTable
                key={pk}
                partLabel={READING_PART_LABELS[pk] ?? pk}
                data={reading?.[pk]}
              />
            ))}

            {LISTENING_PART_KEYS.map((pk) => (
              <ReadingListeningPartTable
                key={pk}
                partLabel={LISTENING_PART_LABELS[pk] ?? pk}
                data={listening?.[pk]}
              />
            ))}

            <SessionWritingTasks writing={writing} />

            <section aria-label="Speaking" className="admin-dashboard__reading-part-block">
              <h3 className="admin-dashboard__saved-answers-section-title">Speaking</h3>
              <article className="admin-dashboard__score-card">
                <dl className="admin-dashboard__score-dl">
                  <div className="admin-dashboard__score-dl-row">
                    <dt>band</dt>
                    <dd>
                      {speakingSaved == null || speakingSaved === ""
                        ? "—"
                        : String(speakingSaved)}
                    </dd>
                  </div>
                </dl>
              </article>
            </section>
          </>
        )}
      </main>

      {detailModalOpen && data && (
        <div
          className="admin-dashboard__modal-backdrop"
          onClick={() => setDetailModalOpen(false)}
          role="presentation"
        >
          <div
            className="admin-dashboard__modal admin-dashboard__modal--detail"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-answers-score-modal-title"
          >
            <h2 id="saved-answers-score-modal-title" className="admin-dashboard__modal-title">
              Баллы и Speaking
            </h2>
            <p className="admin-dashboard__modal-sub">
              <code>
                {`GET …/sessions/${String(sidLabel)}/score/`} ·{" "}
                {`GET …/sessions/${String(sidLabel)}/`}
              </code>
            </p>

            <div className="admin-dashboard__results-form admin-dashboard__results-form--modal">
              <div className="admin-dashboard__results-aside-head">
                <h3 className="admin-dashboard__subsection-title">Детализация</h3>
                <button
                  type="button"
                  className="admin-dashboard__refresh-btn admin-dashboard__refresh-btn--compact"
                  onClick={() => refreshScoresOnly()}
                  disabled={scoresRefreshing}
                  aria-label="Обновить баллы сессии"
                >
                  <FiRefreshCw
                    aria-hidden="true"
                    className={scoresRefreshing ? "admin-dashboard__refresh-icon--spin" : ""}
                  />
                  <span>{scoresRefreshing ? "…" : "Обновить баллы"}</span>
                </button>
              </div>
              <p className="admin-dashboard__results-form-meta">
                {studentLabel} · {sidLabel}
              </p>
              <p className="admin-dashboard__session-details-row">
                <span>Статус</span>
                <strong>{examActive ? "Активна" : "Завершена"}</strong>
              </p>

              {scoresRefreshing && (
                <p className="admin-dashboard__detail-status">Обновление баллов…</p>
              )}
              {scoreMetaError ? (
                <p className="admin-dashboard__detail-error" role="status">
                  {scoreMetaError}
                </p>
              ) : null}

              {!examActive && mergedBands && scoreDetailUi ? (
                <ScoreBoardBlock
                  scoreDetailUi={scoreDetailUi}
                  mergedBands={mergedBands}
                  sessionIdLabel={scoreDetailUi.sessionId ?? sidLabel}
                  classNameExtra="admin-dashboard__score-board--modal"
                />
              ) : (
                <div className="admin-dashboard__placeholder">
                  Полные карточки баллов из API недоступны, пока сессия активна.
                </div>
              )}

              {!examActive && (
                <div className="admin-dashboard__speaking-form">
                  <label className="admin-dashboard__speaking-label" htmlFor="speaking-band-modal">
                    Speaking (IELTS band, ввод вручную после очной оценки)
                  </label>
                  <div className="admin-dashboard__speaking-row">
                    <input
                      id="speaking-band-modal"
                      type="number"
                      min={0}
                      max={9}
                      step={0.5}
                      value={speakingDraft}
                      onChange={(e) => setSpeakingDraft(e.target.value)}
                      className="admin-dashboard__speaking-input"
                      disabled={speakingSaving || scoresRefreshing}
                      aria-describedby="speaking-hint-modal"
                    />
                    <button
                      type="button"
                      className="admin-dashboard__btn-primary admin-dashboard__speaking-save"
                      onClick={() => handleSaveSpeaking()}
                      disabled={speakingSaving || scoresRefreshing}
                    >
                      {speakingSaving ? "Сохранение…" : "Сохранить Speaking"}
                    </button>
                  </div>
                  <p id="speaking-hint-modal" className="admin-dashboard__speaking-hint">
                    Шаг 0.5, диапазон 0–9. Сохранение пересчитывает overall, когда все секции заполнены.
                  </p>
                  {speakingSaveError && (
                    <p className="admin-dashboard__detail-error" role="alert">
                      {speakingSaveError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="admin-dashboard__modal-close"
              onClick={() => setDetailModalOpen(false)}
              aria-label="Закрыть окно баллов"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
