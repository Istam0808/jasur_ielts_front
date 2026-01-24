import Link from "next/link";
import styles from "./page.module.scss";

export const metadata = {
  title: "Регистрация — Jasur IELTS",
};

export default function RegisterPage() {
  return (
    <main className={`section ${styles.page}`}>
      <div className="container">
        <h1 className="section__title">Регистрация</h1>
        <p className="section__subtitle">
          Страница регистрации (заглушка). Backend-роут: <code>/accounts/register/</code>.
        </p>

        <div className={styles.actions}>
          <Link className="btn btn--primary" href="/">
            На главную
          </Link>
          <Link className="btn btn--ghost" href="/auth/login">
            Уже есть аккаунт — войти
          </Link>
        </div>
      </div>
    </main>
  );
}
