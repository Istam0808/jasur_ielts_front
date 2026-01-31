"use client";

import { useState } from "react";
import "./student-login.scss";

export default function StudentLoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!login.trim() || !password) {
      setError("Enter login and password");
      return;
    }
    // Placeholder: in real app would validate and start mock test
    console.log("Student login:", { login: login.trim(), password: "***" });
  }

  return (
    <div className="student-login">
      <div className="student-login__card">
        <h1 className="student-login__title">Start mock test</h1>
        <p className="student-login__subtitle">
          Enter your credentials to begin the IELTS mock test.
        </p>

        <form
          className="student-login__form"
          onSubmit={handleSubmit}
          noValidate
          autoComplete="on"
        >
          <div className="student-login__field">
            <label className="student-login__label" htmlFor="student-login">
              Login
            </label>
            <input
              id="student-login"
              type="text"
              className="student-login__input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Enter your login"
              autoComplete="username"
              autoFocus
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? "student-login-error" : undefined}
            />
          </div>

          <div className="student-login__field">
            <label className="student-login__label" htmlFor="student-password">
              Password
            </label>
            <input
              id="student-password"
              type="password"
              className="student-login__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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

          <button type="submit" className="student-login__btn">
            Start mock test
          </button>
        </form>
      </div>
    </div>
  );
}
