"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackendApiError, getMocksList, loginAgent, logoutAgent } from "@/lib/mockApi";
import {
  clearMockSession,
  getMockSession,
  saveMockSession,
} from "@/lib/mockSession";
import "./student-login.scss";

export default function StudentLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMocks, setIsLoadingMocks] = useState(false);
  const [session, setSession] = useState(null);
  const [mocks, setMocks] = useState([]);

  const loadMocks = useCallback(async (token) => {
    setIsLoadingMocks(true);

    try {
      const listPayload = await getMocksList(token);
      setMocks(listPayload.results);
    } catch (err) {
      if (err instanceof BackendApiError) {
        if (Number(err.status) === 401) {
          setError(
            "Нет доступа к списку mock тестов. Обратитесь к администратору или повторите вход."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Не удалось загрузить список mock тестов.");
      }
    } finally {
      setIsLoadingMocks(false);
    }
  }, []);

  useEffect(() => {
    const storedSession = getMockSession();
    if (!storedSession?.accessToken) return;

    setSession(storedSession);
    loadMocks(storedSession.accessToken);
  }, [loadMocks]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!login.trim() || !password) {
      setError("Введите логин и пароль.");
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = await loginAgent(login.trim(), password);
      if (!auth.accessToken) {
        setError("Backend не вернул access token.");
        return;
      }

      const newSession = {
        accessToken: auth.accessToken,
        sessionId: auth.sessionId,
        username: login.trim(),
      };
      saveMockSession(newSession);
      setSession(newSession);
      setPassword("");
      await loadMocks(auth.accessToken);
    } catch (err) {
      if (err instanceof BackendApiError) {
        const msg =
          err.status === 409
            ? "Пользователь уже вошёл в систему. Сначала нажмите «Выйти» на странице с mock тестами, затем войдите снова."
            : err.message;
        setError(msg);
      } else {
        setError("Не удалось выполнить вход.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    // Всегда берём токен из storage, чтобы гарантированно отправить logout на бэкенд
    const storedSession = getMockSession();
    const token = storedSession?.accessToken;

    if (token) {
      try {
        await logoutAgent(token);
      } catch (err) {
        // Локально всё равно выходим; пользователь видит форму входа
        console.warn("Logout на сервере не выполнен:", err);
      }
    }

    clearMockSession();
    setSession(null);
    setMocks([]);
    setLogin("");
    setPassword("");
    setError("");
  }

  function handleStartMock(mockId) {
    router.push(`/mock/${mockId}/listening`);
  }

  return (
    <div className="student-login">
      <div className="student-login__card">
        {!session ? (
          <>
            <h1 className="student-login__title">Вход для mock теста</h1>
            <p className="student-login__subtitle">
              Введите данные аккаунта, чтобы получить список доступных mock тестов.
            </p>

            <form
              className="student-login__form"
              onSubmit={handleSubmit}
              noValidate
              autoComplete="on"
            >
              <div className="student-login__field">
                <label className="student-login__label" htmlFor="student-login">
                  Логин
                </label>
                <input
                  id="student-login"
                  type="text"
                  className="student-login__input"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Введите логин"
                  autoComplete="username"
                  autoFocus
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? "student-login-error" : undefined}
                />
              </div>

              <div className="student-login__field">
                <label className="student-login__label" htmlFor="student-password">
                  Пароль
                </label>
                <input
                  id="student-password"
                  type="password"
                  className="student-login__input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={!!error}
                />
              </div>

              {error && (
                <p
                  id="student-login-error"
                  className="student-login__error"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="student-login__btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Выполняется вход..." : "Войти"}
              </button>
            </form>
          </>
        ) : (
          <div className="student-login__mocks">
            <div className="student-login__mocks-head">
              <div>
                <h1 className="student-login__title">Выберите mock тест</h1>
                <p className="student-login__subtitle">
                  Пользователь: <strong>{session.username || "agent"}</strong>
                </p>
              </div>
              <button
                type="button"
                className="student-login__logout-btn"
                onClick={handleLogout}
              >
                Выйти
              </button>
            </div>

            {error && (
              <p id="student-login-error" className="student-login__error" role="alert">
                {error}
              </p>
            )}

            {isLoadingMocks ? (
              <p className="student-login__status">Загрузка mock тестов...</p>
            ) : null}

            {!isLoadingMocks && !error && mocks.length === 0 ? (
              <div className="student-login__empty">
                <p className="student-login__status">Доступных mock тестов пока нет.</p>
                <button
                  type="button"
                  className="student-login__logout-btn"
                  onClick={handleLogout}
                >
                  Выйти
                </button>
              </div>
            ) : null}

            {!isLoadingMocks && mocks.length > 0 ? (
              <div className="student-login__mock-grid">
                {mocks.map((mockItem) => (
                  <article className="student-login__mock-card" key={mockItem.id}>
                    <h2 className="student-login__mock-title">
                      Mock #{mockItem.id} — {mockItem.name || "Без названия"}
                    </h2>
                    <p className="student-login__mock-meta">
                      Создан: {mockItem.created_at || "—"}
                    </p>
                    <p className="student-login__mock-meta">
                      Обновлен: {mockItem.updated_at || "—"}
                    </p>
                    
                    <button
                      type="button"
                      className="student-login__btn"
                      onClick={() => handleStartMock(mockItem.id)}
                    >
                      Начать mock
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
