"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FiActivity, FiCpu, FiLogOut, FiSettings } from "react-icons/fi";
import "../styles/style_admin.scss";

// Dummy machines for demo
const DUMMY_MACHINES = [
  { id: "1", name: "computer1", ready_for_test: true },
  { id: "2", name: "computer2", ready_for_test: false },
  { id: "3", name: "computer3", ready_for_test: true },
  { id: "4", name: "computer4", ready_for_test: false },
  { id: "5", name: "computer5", ready_for_test: true },
];

const NAV_MACHINES = "machines";
const NAV_ONGOING_SESSIONS = "ongoing_sessions";
const NAV_FINISH_TESTS = "finish-tests";

const THEME_LIGHT = "light";
const THEME_DARK = "dark";
const ADMIN_THEME_KEY = "adminTheme";

export default function AdminUserPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [activeNav, setActiveNav] = useState(NAV_MACHINES);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [theme, setTheme] = useState(THEME_LIGHT);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [exitConfirmModalOpen, setExitConfirmModalOpen] = useState(false);

  const readyMachines = useMemo(
    () => DUMMY_MACHINES.filter((m) => m.ready_for_test),
    []
  );
  const notReadyMachines = useMemo(
    () => DUMMY_MACHINES.filter((m) => !m.ready_for_test),
    []
  );

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

  function handleSelectAllReady(checked) {
    if (checked) {
      setSelectedIds(new Set(readyMachines.map((m) => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleSelectOne(id, checked) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleStartTest() {
    if (selectedIds.size === 0) return;
    // Placeholder: in real app would start test for selected machines
    console.log("Start test for:", Array.from(selectedIds));
  }

  const isAllReadySelected =
    readyMachines.length > 0 &&
    readyMachines.every((m) => selectedIds.has(m.id));

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
                className={`admin-dashboard__nav-btn ${activeNav === NAV_ONGOING_SESSIONS ? "admin-dashboard__nav-btn--active" : ""}`}
                onClick={() => setActiveNav(NAV_ONGOING_SESSIONS)}
                aria-current={activeNav === NAV_ONGOING_SESSIONS ? "true" : undefined}
              >
                <span className="admin-dashboard__nav-label">Идут тесты</span>
              </button>
            </li>
            <li className="admin-dashboard__nav-item">
              <button
                type="button"
                className={`admin-dashboard__nav-btn ${activeNav === NAV_FINISH_TESTS ? "admin-dashboard__nav-btn--active" : ""}`}
                onClick={() => setActiveNav(NAV_FINISH_TESTS)}
                aria-current={activeNav === NAV_FINISH_TESTS ? "true" : undefined}
              >
                <span className="admin-dashboard__nav-label">Завершение</span>
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
                Machines
              </h2>

              {/* Ready machines */}
              <div className="admin-dashboard__subsection">
                <h3 id="ready-title" className="admin-dashboard__subsection-title">
                  Ready machines
                </h3>
                <div className="admin-dashboard__table-toolbar">
                  <label className="admin-dashboard__checkbox-label">
                    <input
                      type="checkbox"
                      className="admin-dashboard__checkbox"
                      checked={isAllReadySelected}
                      onChange={(e) => handleSelectAllReady(e.target.checked)}
                      aria-label="Select all ready machines"
                    />
                    <span className="admin-dashboard__checkbox-text">Select all</span>
                  </label>
                  <button
                    type="button"
                    className="admin-dashboard__btn-primary"
                    onClick={handleStartTest}
                    disabled={selectedIds.size === 0}
                    aria-label="Start test for selected machines"
                  >
                    Start test
                  </button>
                </div>
                <div className="admin-dashboard__table-wrap">
                  <table className="admin-dashboard__table" aria-labelledby="ready-title">
                    <thead>
                      <tr>
                        <th scope="col" className="admin-dashboard__th admin-dashboard__th--check">
                          <span className="visually-hidden">Select</span>
                        </th>
                        <th scope="col" className="admin-dashboard__th">Name</th>
                        <th scope="col" className="admin-dashboard__th">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readyMachines.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="admin-dashboard__td admin-dashboard__td--empty">
                            No ready machines
                          </td>
                        </tr>
                      ) : (
                        readyMachines.map((machine) => (
                          <tr key={machine.id}>
                            <td className="admin-dashboard__td admin-dashboard__td--check">
                              <input
                                type="checkbox"
                                className="admin-dashboard__checkbox"
                                checked={selectedIds.has(machine.id)}
                                onChange={(e) =>
                                  handleSelectOne(machine.id, e.target.checked)
                                }
                                aria-label={`Select ${machine.name}`}
                              />
                            </td>
                            <td className="admin-dashboard__td">{machine.name}</td>
                            <td className="admin-dashboard__td">
                              <span
                                className="admin-dashboard__badge admin-dashboard__badge--ready"
                                aria-label="Ready for test"
                              >
                                Ready
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Not ready machines */}
              <div className="admin-dashboard__subsection">
                <h3 id="not-ready-title" className="admin-dashboard__subsection-title">
                  Not ready machines
                </h3>
                <div className="admin-dashboard__table-wrap">
                  <table className="admin-dashboard__table" aria-labelledby="not-ready-title">
                    <thead>
                      <tr>
                        <th scope="col" className="admin-dashboard__th">Name</th>
                        <th scope="col" className="admin-dashboard__th">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notReadyMachines.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="admin-dashboard__td admin-dashboard__td--empty">
                            No not-ready machines
                          </td>
                        </tr>
                      ) : (
                        notReadyMachines.map((machine) => (
                          <tr key={machine.id}>
                            <td className="admin-dashboard__td">{machine.name}</td>
                            <td className="admin-dashboard__td">
                              <span
                                className="admin-dashboard__badge admin-dashboard__badge--not-ready"
                                aria-label="Not ready for test"
                              >
                                Not ready
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeNav === NAV_ONGOING_SESSIONS && (
            <section
              className="admin-dashboard__section"
              aria-labelledby="ongoing-sessions-title"
            >
              <h2 id="ongoing-sessions-title" className="admin-dashboard__section-title">
                Идут тесты
              </h2>
              <div className="admin-dashboard__placeholder">
                Здесь будет отображаться список активных сессий: какой компьютер, какой тест и оставшееся время.
              </div>
            </section>
          )}

          {activeNav === NAV_FINISH_TESTS && (
            <section
              className="admin-dashboard__section"
              aria-labelledby="finish-tests-title"
            >
              <h2 id="finish-tests-title" className="admin-dashboard__section-title">
                Завершение тестов
              </h2>
              <div className="admin-dashboard__placeholder">
                Здесь появится управление завершением тестов и проверкой результатов для выбранных сессий.
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
