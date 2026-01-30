"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "../styles/style_admin.scss";

export default function AdminUserPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined" && sessionStorage.getItem("adminAuth") === "true";
    setIsAuth(ok);
    setAuthChecked(true);
    if (!ok) {
      router.replace("/admin");
    }
  }, [router]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("adminAuth");
    }
    router.replace("/admin");
  }

  if (!authChecked || !isAuth) {
    return (
      <div className="admin-dashboard admin-dashboard--loading">
        <div className="admin-dashboard__spinner">Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div className="admin-dashboard__header-inner">
          <h1 className="admin-dashboard__title">Админ-панель</h1>
          <div className="admin-dashboard__actions">
            <Link className="admin-dashboard__link" href="/">
              На главную
            </Link>
            <button type="button" className="admin-dashboard__logout" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="admin-dashboard__main">
        <div className="admin-dashboard__grid">
          <section className="admin-dashboard__card" aria-labelledby="card-stats">
            <h2 id="card-stats" className="admin-dashboard__card-title">
              Статистика
            </h2>
            <p className="admin-dashboard__card-desc">
              Здесь будет сводка по заявкам, тестам и пользователям (имитация).
            </p>
            <div className="admin-dashboard__placeholder">Блок в разработке</div>
          </section>

          <section className="admin-dashboard__card" aria-labelledby="card-content">
            <h2 id="card-content" className="admin-dashboard__card-title">
              Контент
            </h2>
            <p className="admin-dashboard__card-desc">
              Управление форматами, ценами и текстами (имитация).
            </p>
            <div className="admin-dashboard__placeholder">Блок в разработке</div>
          </section>

          <section className="admin-dashboard__card" aria-labelledby="card-settings">
            <h2 id="card-settings" className="admin-dashboard__card-title">
              Настройки
            </h2>
            <p className="admin-dashboard__card-desc">
              Настройки сайта и уведомлений (имитация).
            </p>
            <div className="admin-dashboard__placeholder">Блок в разработке</div>
          </section>
        </div>
      </main>
    </div>
  );
}
