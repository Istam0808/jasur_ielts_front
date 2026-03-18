"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import "./styles/style_admin.scss";

// Demo: valid credentials (frontend only).
const MOCK_LOGIN = "admin";
const MOCK_PASSWORD = "admin";

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (login.trim() !== MOCK_LOGIN || password !== MOCK_PASSWORD) {
        setError("Неверный логин или пароль");
        return;
      }

      // Demo: save to sessionStorage and redirect to admin panel.
      if (typeof window !== "undefined") {
        sessionStorage.setItem("adminAuth", "true");
      }
      router.push("/admin/user");
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorId = error ? "admin-login-error" : undefined;

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
