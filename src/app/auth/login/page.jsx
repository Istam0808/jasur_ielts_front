import Link from "next/link";
import styles from "./page.module.scss";

export const metadata = {
  title: "Вход — Jasur IELTS",
};

export default function LoginPage() {
  return (
    <main className={`section ${styles.page}`}>
      <div className="container">
        <h1 className="section__title">Вход</h1>
        <p className="section__subtitle">
          Страница входа (заглушка). Backend-роут: <code>/accounts/login/</code>.
        </p>

        <div className={styles.actions}>
          <Link className="btn btn--primary" href="/">
            На главную
          </Link>
          <Link className="btn btn--ghost" href="/auth/register">
            Регистрация
          </Link>
          <Link className="btn btn--ghost" href="/profile">
            Профиль
          </Link>
        </div>
      </div>
    </main>
  );
}
