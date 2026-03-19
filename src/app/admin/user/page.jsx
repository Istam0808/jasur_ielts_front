"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiActivity, FiCpu, FiLogOut, FiSettings } from "react-icons/fi";
import "../styles/style_admin.scss";

// --- Фейковые данные для мока админки ---

const FAKE_MACHINES = [
  {
    id: "PC-01",
    name: "PC-01",
    status: "busy",
    lastActivityAt: "30 секунд назад",
    currentSessionId: "S-1001",
  },
  {
    id: "PC-02",
    name: "PC-02",
    status: "busy",
    lastActivityAt: "2 минуты назад",
    currentSessionId: "S-1002",
  },
  {
    id: "PC-03",
    name: "PC-03",
    status: "free",
    lastActivityAt: "5 минут назад",
    currentSessionId: null,
  },
  {
    id: "PC-04",
    name: "PC-04",
    status: "free",
    lastActivityAt: "10 минут назад",
    currentSessionId: null,
  },
  {
    id: "PC-05",
    name: "PC-05",
    status: "busy",
    lastActivityAt: "1 минуту назад",
    currentSessionId: "S-1003",
  },
  {
    id: "PC-06",
    name: "PC-06",
    status: "busy",
    lastActivityAt: "3 минуты назад",
    currentSessionId: "S-1004",
  },
  {
    id: "PC-07",
    name: "PC-07",
    status: "busy",
    lastActivityAt: "7 минут назад",
    currentSessionId: "S-1005",
  },
  {
    id: "PC-08",
    name: "PC-08",
    status: "free",
    lastActivityAt: "12 минут назад",
    currentSessionId: null,
  },
  {
    id: "PC-09",
    name: "PC-09",
    status: "free",
    lastActivityAt: "20 минут назад",
    currentSessionId: null,
  },
  {
    id: "PC-10",
    name: "PC-10",
    status: "free",
    lastActivityAt: "вчера",
    currentSessionId: null,
  },
];

const FAKE_SESSIONS = [
  {
    id: "S-1001",
    sessionKey: "abc123",
    studentName: "Jasur Abdullayev",
    computerId: "PC-01",
    startedAt: "10:00",
    finishedAt: null,
    status: "active",
  },
  {
    id: "S-1002",
    sessionKey: "xyz789",
    studentName: "Laylo Karimova",
    computerId: "PC-02",
    startedAt: "09:45",
    finishedAt: "11:05",
    status: "finished",
  },
  {
    id: "S-1003",
    sessionKey: "k1m9p2",
    studentName: "Jasur Abdullayev",
    computerId: "PC-05",
    startedAt: "09:00",
    finishedAt: "10:20",
    status: "finished",
  },
  {
    id: "S-1004",
    sessionKey: "mno456",
    studentName: "Aziza Rasulova",
    computerId: "PC-06",
    startedAt: "11:30",
    finishedAt: "12:50",
    status: "finished",
  },
  {
    id: "S-1005",
    sessionKey: "qwe321",
    studentName: "Bekzod Iskanderov",
    computerId: "PC-07",
    startedAt: "08:15",
    finishedAt: "09:35",
    status: "finished",
  },
];

const FAKE_RESULTS = [
  {
    sessionId: "S-1002",
    listening: 7.5,
    reading: 7.0,
    writing: 6.5,
    speaking: 7.0,
  },
  {
    sessionId: "S-1003",
    listening: 8.0,
    reading: 7.5,
    writing: 7.0,
    speaking: 7.5,
  },
  {
    sessionId: "S-1004",
    listening: 6.5,
    reading: 6.0,
    writing: 6.5,
    speaking: 6.5,
  },
  {
    sessionId: "S-1005",
    listening: 8.5,
    reading: 8.0,
    writing: 7.5,
    speaking: 8.0,
  },
];

const NAV_MACHINES = "machines";
const NAV_SESSIONS = "sessions";
const NAV_RESULTS = "results";

const THEME_LIGHT = "light";
const THEME_DARK = "dark";
const ADMIN_THEME_KEY = "adminTheme";

function roundToNearestHalf(value) {
  return Math.round(value * 2) / 2;
}

function getResultWithOverall(result) {
  const { listening, reading, writing, speaking } = result;
  const avg = (listening + reading + writing + speaking) / 4;
  const overall = roundToNearestHalf(avg);
  return { ...result, overall };
}

export default function AdminUserPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [activeNav, setActiveNav] = useState(NAV_MACHINES);
  const [theme, setTheme] = useState(THEME_LIGHT);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [exitConfirmModalOpen, setExitConfirmModalOpen] = useState(false);
  const [machines, setMachines] = useState(FAKE_MACHINES);
  const [lastRefreshSeconds, setLastRefreshSeconds] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState("S-1002");
  const [results, setResults] = useState(
    FAKE_RESULTS.map((r) => getResultWithOverall(r))
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLastRefreshSeconds((prev) => {
        const next = prev + 1;
        if (next >= 12) {
          setMachines((current) => {
            const copy = current.map((m) => ({ ...m }));
            const index = Math.floor(Math.random() * copy.length);
            const machine = copy[index];
            if (machine) {
              machine.status = machine.status === "free" ? "busy" : "free";
            }
            return copy;
          });
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  function closeSettingsModal() {
    setSettingsModalOpen(false);
  }

  function closeExitConfirmModal() {
    setExitConfirmModalOpen(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    queueMicrotask(() => {
      const ok = sessionStorage.getItem("adminAuth") === "true";
      setIsAuth(ok);
      setAuthChecked(true);
      if (!ok) {
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

  const machinesWithSession = useMemo(
    () =>
      machines.map((machine) => ({
        ...machine,
        session: FAKE_SESSIONS.find(
          (session) => session.id === machine.currentSessionId
        ),
      })),
    [machines]
  );

  const sessions = useMemo(() => FAKE_SESSIONS, []);

  const sessionsWithResults = useMemo(
    () =>
      sessions.map((session) => ({
        ...session,
        result: results.find((r) => r.sessionId === session.id) || null,
      })),
    [sessions, results]
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
    () => sessionsWithResults.find((s) => s.id === selectedSessionId) || null,
    [selectedSessionId, sessionsWithResults]
  );

  const selectedSessionResult = selectedSession?.result || null;
  const isSelectedFinished = selectedSession?.status === "finished";
  const isSelectedActive = selectedSession?.status === "active";

  const totalSessionsCount = sessionsWithResults.length;
  const activeCount = activeSessions.length;
  const finishedCount = finishedSessions.length;

  const finishedWithResults = finishedSessions.filter((s) => s.result);
  const averageOverall =
    finishedWithResults.length > 0
      ? (
          finishedWithResults.reduce(
            (sum, s) => sum + (s.result?.overall ?? 0),
            0
          ) / finishedWithResults.length
        ).toFixed(1)
      : "—";

  const distributionBuckets = [
    { label: "≤ 6.0", min: -Infinity, max: 6.0 },
    { label: "6.5 – 7.0", min: 6.5, max: 7.0 },
    { label: "7.5 – 8.0", min: 7.5, max: 8.0 },
    { label: "≥ 8.5", min: 8.5, max: Infinity },
  ];

  const overallValues = finishedWithResults
    .map((s) => s.result?.overall)
    .filter((v) => typeof v === "number");

  const distribution = distributionBuckets.map((bucket) => {
    const count = overallValues.filter(
      (v) => v >= bucket.min && v <= bucket.max
    ).length;
    return { ...bucket, count };
  });

  const maxDistributionCount = distribution.reduce(
    (max, item) => (item.count > max ? item.count : max),
    0
  );

  function handleThemeChange(newTheme) {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(ADMIN_THEME_KEY, newTheme);
    }
  }

  function handleLogout() {
    closeExitConfirmModal();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("adminAuth");
    }
    router.replace("/admin");
  }

  function handleSessionRowClick(sessionId) {
    setActiveNav(NAV_RESULTS);
    setSelectedSessionId(sessionId);
  }

  function handleResultFieldChange(field, value) {
    setResults((prev) => {
      const numeric = parseFloat(value.replace(",", "."));
      const safeValue = Number.isFinite(numeric) ? numeric : 0;
      const updated = prev.map((result) =>
        result.sessionId === selectedSessionId
          ? getResultWithOverall({ ...result, [field]: safeValue })
          : result
      );
      return updated;
    });
  }

  function handleSaveResults() {
    // В реальном приложении здесь был бы запрос на бэк.
    // Сейчас просто оставляем состояние и визуальный эффект.
    // Можно дополнительно показать toast, но для мока достаточно.
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
            <div className="admin-dashboard__modal-actions">
              <button
                type="button"
                className="admin-dashboard__btn-primary admin-dashboard__modal-confirm-btn"
                onClick={handleLogout}
                aria-label="Да, выйти из аккаунта"
              >
                Выйти
              </button>
              <button
                type="button"
                className="admin-dashboard__modal-close"
                onClick={closeExitConfirmModal}
                aria-label="Отмена выхода"
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
                  activeNav === NAV_SESSIONS
                    ? "admin-dashboard__nav-btn--active"
                    : ""
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
                  activeNav === NAV_RESULTS
                    ? "admin-dashboard__nav-btn--active"
                    : ""
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
                    {
                      machinesWithSession.filter((m) => m.status === "busy")
                        .length
                    }
                  </strong>
                </p>
                <div className="admin-dashboard__machines-refresh">
                  <FiActivity aria-hidden="true" />
                  <span>
                    Авто-обновление каждые ~12 секунд · прошло{" "}
                    {lastRefreshSeconds} c
                  </span>
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
                        Статус
                      </th>
                      <th scope="col" className="admin-dashboard__th">
                        Активная сессия
                      </th>
                      <th scope="col" className="admin-dashboard__th">
                        Последняя активность
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {machinesWithSession.length === 0 ? (
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
                          <td className="admin-dashboard__td">
                            {machine.name}
                          </td>
                          <td className="admin-dashboard__td">
                            <span
                              className={`admin-dashboard__badge ${
                                machine.status === "free"
                                  ? "admin-dashboard__badge--free"
                                  : "admin-dashboard__badge--busy"
                              }`}
                            >
                              {machine.status === "free"
                                ? "🟢 Свободен"
                                : "🔴 Занят"}
                            </span>
                          </td>
                          <td className="admin-dashboard__td">
                            {machine.status === "busy" && machine.session ? (
                              <button
                                type="button"
                                className="admin-dashboard__link-button"
                                onClick={() =>
                                  handleSessionRowClick(
                                    machine.session?.id ?? ""
                                  )
                                }
                              >
                                {machine.session.id} ·{" "}
                                {machine.session.studentName}
                              </button>
                            ) : (
                              <span className="admin-dashboard__text-muted">
                                —
                              </span>
                            )}
                          </td>
                          <td className="admin-dashboard__td">
                            {machine.lastActivityAt}
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
              <div className="admin-dashboard__sessions-layout">
                <div className="admin-dashboard__subsection">
                  <h3 className="admin-dashboard__subsection-title">
                    Активные сессии
                  </h3>
                  <div className="admin-dashboard__table-wrap">
                    <table
                      className="admin-dashboard__table"
                      aria-label="Активные сессии"
                    >
                      <thead>
                        <tr>
                          <th scope="col" className="admin-dashboard__th">
                            Сессия
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            sessionKey
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Ученик
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Компьютер
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Статус
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSessions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
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
                              <td className="admin-dashboard__td">
                                {session.id}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.sessionKey}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.studentName}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.computerId}
                              </td>
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
                  <h3 className="admin-dashboard__subsection-title">
                    История сессий
                  </h3>
                  <div className="admin-dashboard__table-wrap">
                    <table
                      className="admin-dashboard__table"
                      aria-label="Завершённые сессии"
                    >
                      <thead>
                        <tr>
                          <th scope="col" className="admin-dashboard__th">
                            Сессия
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Ученик
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Компьютер
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Статус
                          </th>
                          <th scope="col" className="admin-dashboard__th">
                            Время
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {finishedSessions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
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
                              <td className="admin-dashboard__td">
                                {session.id}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.studentName}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.computerId}
                              </td>
                              <td className="admin-dashboard__td">
                                <span className="admin-dashboard__badge admin-dashboard__badge--session-finished">
                                  Завершена
                                </span>
                              </td>
                              <td className="admin-dashboard__td">
                                {session.startedAt}–{session.finishedAt}
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
                    <h3 className="admin-dashboard__subsection-title">
                      Детали сессии
                    </h3>
                    <p className="admin-dashboard__session-details-row">
                      <span>ID сессии</span>
                      <strong>{selectedSession.id}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>sessionKey</span>
                      <strong>{selectedSession.sessionKey}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>Ученик</span>
                      <strong>{selectedSession.studentName}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>Компьютер</span>
                      <strong>{selectedSession.computerId}</strong>
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>Статус</span>
                      <strong>
                        {selectedSession.status === "active"
                          ? "Активна"
                          : "Завершена"}
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
              <div className="admin-dashboard__results-stats">
                <div className="admin-dashboard__stats">
                  <div className="admin-dashboard__stats-item">
                    <span className="admin-dashboard__stats-label">
                      Всего попыток
                    </span>
                    <span className="admin-dashboard__stats-value">
                      {totalSessionsCount}
                    </span>
                  </div>
                  <div className="admin-dashboard__stats-item">
                    <span className="admin-dashboard__stats-label">
                      Активных сейчас
                    </span>
                    <span className="admin-dashboard__stats-value">
                      {activeCount}
                    </span>
                  </div>
                  <div className="admin-dashboard__stats-item">
                    <span className="admin-dashboard__stats-label">
                      Завершённых
                    </span>
                    <span className="admin-dashboard__stats-value">
                      {finishedCount}
                    </span>
                  </div>
                  <div className="admin-dashboard__stats-item">
                    <span className="admin-dashboard__stats-label">
                      Средний Overall (finished)
                    </span>
                    <span className="admin-dashboard__stats-value">
                      {averageOverall}
                    </span>
                  </div>
                </div>

                <div className="admin-dashboard__bars">
                  {distribution.map((item) => (
                    <div key={item.label} className="admin-dashboard__bar-row">
                      <span className="admin-dashboard__bar-label">
                        {item.label}
                      </span>
                      <div className="admin-dashboard__bar-track">
                        <div
                          className="admin-dashboard__bar-fill"
                          style={{
                            width:
                              maxDistributionCount === 0
                                ? "0%"
                                : `${
                                    (item.count / maxDistributionCount) * 100
                                  }%`,
                          }}
                        />
                      </div>
                      <span className="admin-dashboard__bar-count">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-dashboard__results-layout">
                <div className="admin-dashboard__subsection">
                  <h3 className="admin-dashboard__subsection-title">
                    Список попыток
                  </h3>
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
                            Ученик
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
                        {sessionsWithResults.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="admin-dashboard__td admin-dashboard__td--empty"
                            >
                              Пока нет сессий с результатами
                            </td>
                          </tr>
                        ) : (
                          sessionsWithResults.map((session) => (
                            <tr
                              key={session.id}
                              className={`admin-dashboard__row-clickable ${
                                session.id === selectedSessionId
                                  ? "admin-dashboard__row--active"
                                  : ""
                              }`}
                              onClick={() => setSelectedSessionId(session.id)}
                            >
                              <td className="admin-dashboard__td">
                                {session.id}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.studentName}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.result?.listening ?? "—"}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.result?.reading ?? "—"}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.result?.writing ?? "—"}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.result?.speaking ?? "—"}
                              </td>
                              <td className="admin-dashboard__td">
                                {session.result?.overall ?? "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedSession && (
                  <aside className="admin-dashboard__results-form">
                    <h3 className="admin-dashboard__subsection-title">
                      Редактирование результатов
                    </h3>
                    <p className="admin-dashboard__results-form-meta">
                      {selectedSession.studentName} · {selectedSession.id}
                    </p>
                    <p className="admin-dashboard__session-details-row">
                      <span>Статус</span>
                      <strong>
                        {isSelectedActive ? "Активна" : "Завершена"}
                      </strong>
                    </p>

                    {isSelectedActive ? (
                      <div className="admin-dashboard__placeholder">
                        Нельзя редактировать результаты, пока сессия активна.
                        Дождитесь завершения теста.
                      </div>
                    ) : (
                      <>
                        <div className="admin-dashboard__results-grid">
                          <label className="admin-dashboard__results-field">
                            <span>Listening</span>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              step="0.5"
                              value={selectedSessionResult?.listening ?? ""}
                              disabled
                              className="admin-dashboard__results-input"
                            />
                          </label>
                          <label className="admin-dashboard__results-field">
                            <span>Reading</span>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              step="0.5"
                              value={selectedSessionResult?.reading ?? ""}
                              disabled
                              className="admin-dashboard__results-input"
                            />
                          </label>
                          <label className="admin-dashboard__results-field">
                            <span>Writing</span>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              step="0.5"
                              value={selectedSessionResult?.writing ?? ""}
                              disabled
                              className="admin-dashboard__results-input"
                            />
                          </label>
                          <label className="admin-dashboard__results-field">
                            <span>Speaking</span>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              step="0.5"
                              value={selectedSessionResult?.speaking ?? ""}
                              onChange={(e) =>
                                handleResultFieldChange(
                                  "speaking",
                                  e.target.value
                                )
                              }
                              className="admin-dashboard__results-input"
                            />
                          </label>
                        </div>

                        <div className="admin-dashboard__results-summary">
                          <span>Overall</span>
                          <strong>
                            {selectedSessionResult?.overall ?? "—"}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="admin-dashboard__btn-primary admin-dashboard__results-save-btn"
                          onClick={handleSaveResults}
                          disabled={!isSelectedFinished}
                        >
                          Сохранить (мок)
                        </button>
                        <p className="admin-dashboard__results-hint">
                          Данные сохраняются только в состоянии браузера — это
                          демонстрационный режим без бэкенда.
                        </p>
                      </>
                    )}
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
