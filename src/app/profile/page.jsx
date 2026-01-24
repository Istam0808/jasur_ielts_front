import Link from "next/link";
import styles from "./page.module.scss";

export const metadata = {
  title: "Профиль — Jasur IELTS",
};

export default function ProfilePage() {
  return (
    <main className={`section ${styles.page}`}>
      <div className="container">
        <h1 className="section__title">Профиль</h1>
        <p className="section__subtitle">
          Страница профиля (заглушка). Backend-роут: <code>/accounts/profile/</code>.
        </p>

        <div className={styles.actions}>
          <Link className="btn btn--primary" href="/">
            На главную
          </Link>
          <Link className="btn btn--ghost" href="/auth/login">
            Войти
          </Link>
        </div>
      </div>
    </main>
  );
}
