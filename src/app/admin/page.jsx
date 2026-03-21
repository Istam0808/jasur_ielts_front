"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import { buildBackendUrl } from "@/lib/backend";
import "./styles/style_admin.scss";

const INVALID_CREDENTIALS_MESSAGE = "Неверный логин или пароль";
const ADMIN_ACCESS_TOKEN_KEY = "adminAccessToken";
const ADMIN_SESSION_ID_KEY = "adminSessionId";

function parseJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(normalized);
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

function isAdminAccessTokenValid(token) {
  if (typeof token !== "string" || !token.trim()) return false;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload !== "object") return false;

  if (payload.actor_type && payload.actor_type !== "center_admin") {
    return false;
  }

  if (typeof payload.exp !== "number") {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
}

async function loginCenterAdmin({ username, password }) {
  const response = await fetch(
    buildBackendUrl("/api/v1/auth/center-admin/login/"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ username, password }),
    }
  );

  let data = null;
  try {
    data = await response.json();
  } catch (_) {}

  if (response.ok) {
    const accessToken = typeof data?.access_token === "string" ? data.access_token : "";
    const sessionId = typeof data?.session_id === "string" ? data.session_id : "";

    if (!accessToken) {
      return {
        ok: false,
        message: "Сервер не вернул access_token. Повторите вход.",
      };
    }

    return { ok: true, accessToken, sessionId };
  }

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    return { ok: false, message: INVALID_CREDENTIALS_MESSAGE };
  }

  const backendMessage =
    (typeof data?.detail === "string" && data.detail) ||
    (typeof data?.message === "string" && data.message) ||
    "";

  return {
    ok: false,
    message: backendMessage || "Ошибка авторизации. Попробуйте позже.",
  };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isTokenCheckDone, setIsTokenCheckDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);
    if (isAdminAccessTokenValid(token)) {
      router.replace("/admin/user");
      return;
    }

    localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
    localStorage.removeItem(ADMIN_SESSION_ID_KEY);
    setIsTokenCheckDone(true);
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const username = login.trim();
      if (!username || !password) {
        setError("Заполните логин и пароль");
        return;
      }

      const result = await loginCenterAdmin({ username, password });
      if (!result.ok) {
        setError(result.message || INVALID_CREDENTIALS_MESSAGE);
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, result.accessToken);
        if (result.sessionId) {
          localStorage.setItem(ADMIN_SESSION_ID_KEY, result.sessionId);
        } else {
          localStorage.removeItem(ADMIN_SESSION_ID_KEY);
        }
      }
      router.push("/admin/user");
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorId = error ? "admin-login-error" : undefined;

  if (!isTokenCheckDone) {
    return (
      <div className="admin-login">
        <div className="admin-login__shell">
          <div className="admin-login__card">
            <p className="admin-login__subtitle">Проверяем сессию администратора…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login">
      <div className="admin-login__shell">
        <section className="admin-login__brand" aria-label="О приложении">
          <div className="admin-login__brand-badge" aria-hidden="true">
            <FiLock />
          </div>
          <h1 className="admin-login__brand-title">Jasur IELTS</h1>
          <p className="admin-login__brand-subtitle">Админ-панель</p>
          <ul className="admin-login__brand-list" aria-label="Подсказки">
            <li className="admin-login__brand-item">Безопасный вход</li>
            <li className="admin-login__brand-item">Управление пользователями</li>
            <li className="admin-login__brand-item">Настройки и модерация</li>
          </ul>
        </section>

        <div className="admin-login__card">
          <h2 className="admin-login__title">Вход</h2>
          <p className="admin-login__subtitle">
            Введите учётные данные администратора
          </p>

          <form className="admin-login__form" onSubmit={handleSubmit} noValidate>
            <div className="admin-login__field">
              <label className="admin-login__label" htmlFor="admin-login">
                Логин
              </label>
              <input
                id="admin-login"
                type="text"
                className="admin-login__input"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Например, admin"
                autoComplete="username"
                autoFocus
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={errorId}
              />
            </div>

            <div className="admin-login__field">
              <label className="admin-login__label" htmlFor="admin-password">
                Пароль
              </label>
              <div className="admin-login__input-row">
                <input
                  id="admin-password"
                  type={isPasswordVisible ? "text" : "password"}
                  className="admin-login__input admin-login__input--with-btn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={errorId}
                />
                <button
                  type="button"
                  className="admin-login__icon-btn"
                  onClick={() => setIsPasswordVisible((v) => !v)}
                  aria-label={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
                >
                  {isPasswordVisible ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {error && (
              <p id={errorId} className="admin-login__error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="admin-login__btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Входим…" : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
