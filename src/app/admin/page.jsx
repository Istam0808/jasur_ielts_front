"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./styles/style_admin.scss";

// Имитация: правильные данные для входа (только frontend).
const MOCK_LOGIN = "admin";
const MOCK_PASSWORD = "admin";

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (login.trim() !== MOCK_LOGIN || password !== MOCK_PASSWORD) {
      setError("Неверный логин или пароль");
      return;
    }

    // Имитация успешного входа: сохраняем в sessionStorage и переходим в админку.
    if (typeof window !== "undefined") {
      sessionStorage.setItem("adminAuth", "true");
    }
    router.push("/admin/user");
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <h1 className="admin-login__title">Вход в админку</h1>
        <p className="admin-login__subtitle">Jasur IELTS — панель администратора</p>

        <form className="admin-login__form" onSubmit={handleSubmit} noValidate>
          <label className="admin-login__label" htmlFor="admin-login">
            Логин
          </label>
          <input
            id="admin-login"
            type="text"
            className="admin-login__input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Введите логин"
            autoComplete="username"
            autoFocus
          />

          <label className="admin-login__label" htmlFor="admin-password">
            Пароль
          </label>
          <input
            id="admin-password"
            type="password"
            className="admin-login__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            autoComplete="current-password"
          />

          {error && <p className="admin-login__error" role="alert">{error}</p>}

          <button type="submit" className="admin-login__btn">
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
