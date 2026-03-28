"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import { buildBackendUrl } from "@/lib/backend";
import {
  CENTER_ADMIN_ACCESS_TOKEN_KEY,
  CENTER_ADMIN_ID_KEY,
  clearCenterAdminAuthStorage,
  isCenterAdminAccessTokenValid,
} from "@/lib/centerAdminAuth";
import "./styles/style_admin.scss";

const INVALID_CREDENTIALS_MESSAGE = "Неверный логин или пароль";

const ACTIVE_SESSION_FALLBACK_MESSAGE =
  "Уже есть активная сессия. Выйдите на другом устройстве или завершите сессию через выход.";

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
    const rawCenterAdminId = data?.center_admin_id;
    const centerAdminId =
      rawCenterAdminId != null && String(rawCenterAdminId).trim() !== ""
        ? String(rawCenterAdminId)
        : "";

    if (!accessToken) {
      return {
        ok: false,
        message: "Сервер не вернул access_token. Повторите вход.",
      };
    }

    if (!centerAdminId) {
      return {
        ok: false,
        message: "Сервер не вернул center_admin_id. Повторите вход.",
      };
    }

    return { ok: true, accessToken, centerAdminId };
  }

  if (response.status === 409) {
    const fromBody =
      (typeof data?.detail === "string" && data.detail) ||
      (typeof data?.message === "string" && data.message) ||
      "";
    return {
      ok: false,
      message: fromBody || ACTIVE_SESSION_FALLBACK_MESSAGE,
    };
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
  const [sessionMessage, setSessionMessage] = useState("");
  const [isTokenCheckDone, setIsTokenCheckDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem(CENTER_ADMIN_ACCESS_TOKEN_KEY);
    if (isCenterAdminAccessTokenValid(token)) {
      router.replace("/admin/user");
      return;
    }

    clearCenterAdminAuthStorage();
    setIsTokenCheckDone(true);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    let msg = "";
    if (sp.get("session_expired") === "1") {
      msg = "Время сессии истекло. Войдите снова.";
    } else if (sp.get("session_invalid") === "1") {
      msg = "Сессия недействительна. Войдите снова.";
    }
    if (msg) {
      setSessionMessage(msg);
      router.replace("/admin", { scroll: false });
    }
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSessionMessage("");
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
        localStorage.setItem(CENTER_ADMIN_ACCESS_TOKEN_KEY, result.accessToken);
        localStorage.setItem(CENTER_ADMIN_ID_KEY, result.centerAdminId);
      }
      router.push("/admin/user");
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorId = error || sessionMessage ? "admin-login-error" : undefined;

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
                aria-invalid={Boolean(error || sessionMessage) || undefined}
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
                  aria-invalid={Boolean(error || sessionMessage) || undefined}
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

            {(sessionMessage || error) && (
              <p id={errorId} className="admin-login__error" role="alert">
                {error || sessionMessage}
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
