"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiCpu } from "react-icons/fi";
import "../../../styles/style_admin.scss";

import { fetchSessionSavedAnswers } from "@/lib/centerAdminApi";
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
  // Backend может отдавать структуру как `{ session: {...} }` или как `{ session_id, reading, ... }`.
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

  useEffect(() => {
    if (typeof window === "undefined") return;
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
    const saved = localStorage.getItem(ADMIN_THEME_KEY);
    if (saved === THEME_DARK || saved === THEME_LIGHT) setTheme(saved);
  }, []);

  useEffect(() => {
    if (!authChecked || !isAuth) return;
    if (!sessionId) return;
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setData(null);
      const res = await fetchSessionSavedAnswers(sessionId);
      if (!alive) return;

      if (res.unauthorized) {
        return;
      }
      if (!res.ok) {
        setError(res.message || "Не удалось загрузить подробные ответы");
        setLoading(false);
        return;
      }

      setData(normalizeSavedAnswersPayload(res.data));
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [authChecked, isAuth, sessionId]);

  const rootSession = data?.session;
  const reading = rootSession?.reading ?? {};
  const listening = rootSession?.listening ?? {};
  const writing = rootSession?.writing ?? {};
  const speaking = rootSession?.speaking ?? null;

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
              <h1 className="admin-dashboard__title">Подробный отчёт</h1>
              <p className="admin-dashboard__title-subtitle">Saved answers и правильность</p>
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
      </header>

      <main className="admin-dashboard__main">
        <section className="admin-dashboard__section" aria-label="Сводка">
          <h2 className="admin-dashboard__section-title">Сессия</h2>
          <dl className="admin-dashboard__saved-answers-meta-grid">
            <dt>session_id</dt>
            <dd>{data?.sessionId ?? sessionId ?? "—"}</dd>

            <dt>is_active</dt>
            <dd>
              {formatBoolRu(Boolean(rootSession?.is_active ?? rootSession?.isActive))}
            </dd>

            <dt>created_at</dt>
            <dd>{formatIsoDateRu(rootSession?.created_at)}</dd>

            <dt>updated</dt>
            <dd>{formatIsoDateRu(rootSession?.updated_at)}</dd>
          </dl>

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
                    <dd>{speaking == null || speaking === "" ? "—" : String(speaking)}</dd>
                  </div>
                </dl>
              </article>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

