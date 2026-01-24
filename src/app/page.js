const TEST_TYPES = [
  {
    title: "Listening",
    desc: "Тайминг как на экзамене, разбор ошибок и стратегия набора баллов.",
    meta: "4 секции • 30 минут + перенос ответов",
  },
  {
    title: "Reading",
    desc: "Отработка сканирования/скимминга, работа с ловушками и временем.",
    meta: "3 текста • 60 минут",
  },
  {
    title: "Writing",
    desc: "Проверка по критериям IELTS, структура, лексика, грамматика, примеры улучшений.",
    meta: "Task 1 + Task 2 • 60 минут",
  },
  {
    title: "Speaking",
    desc: "Реалистичная беседа, фидбек по fluency, vocabulary, grammar и pronunciation.",
    meta: "Part 1–3 • 11–14 минут",
  },
];

const STEPS = [
  {
    title: "Выбираете формат",
    desc: "Один модуль или полный mock. Можно собрать пакет под вашу цель.",
  },
  {
    title: "Проходите пробник",
    desc: "Чёткий тайминг и условия, максимально похожие на реальный IELTS.",
  },
  {
    title: "Получаете обратную связь",
    desc: "Сильные/слабые стороны, приоритеты, конкретные упражнения и план на неделю.",
  },
];

const FAQ = [
  {
    q: "Это похоже на настоящий IELTS?",
    a: "Да: тайминг, структура заданий и критерии оценки максимально близки к экзамену.",
  },
  {
    q: "Сколько занимает проверка?",
    a: "Обычно 24–48 часов для Writing и 24 часа для Speaking (зависит от загрузки).",
  },
  {
    q: "Можно ли сделать фокус на Writing Task 2?",
    a: "Да, можно взять отдельный разбор Task 2 или пакет из нескольких эссе с прогрессом.",
  },
];

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className="home">
      <header className="topbar">
        <div className="container topbar__inner">
          <div className="brand">
            <span className="brand__dot" aria-hidden="true" />
            <span className="brand__name">Jasur IELTS</span>
            <span className="brand__tag">Mock Tests</span>
          </div>

          <nav className="nav" aria-label="Навигация">
            <a className="nav__link" href="#formats">
              Форматы
            </a>
            <a className="nav__link" href="#process">
              Как проходит
            </a>
            <a className="nav__link" href="#faq">
              Вопросы
            </a>
          </nav>

          <a className="btn btn--primary topbar__cta" href="#cta">
            Записаться
          </a>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="container hero__inner">
            <div className="hero__copy">
              <div className="badge">Подготовка к IELTS с учителем Джасуром</div>
              <h1 className="hero__title" id="hero-title">
                Красивый, честный и полезный <span>mock IELTS</span>
              </h1>
              <p className="hero__subtitle">
                Пробные тесты в экзаменационном формате + понятная обратная связь:
                что мешает вашему баллу и как подняться быстрее.
              </p>

              <div className="hero__actions" id="cta">
                <a className="btn btn--primary" href="#formats">
                  Выбрать формат
                </a>
                <a className="btn btn--ghost" href="#process">
                  Как проходит
                </a>
              </div>

              <div className="hero__highlights" role="list" aria-label="Ключевые преимущества">
                <div className="pill" role="listitem">
                  Экзаменационный тайминг
                </div>
                <div className="pill" role="listitem">
                  Фидбек по критериям IELTS
                </div>
                <div className="pill" role="listitem">
                  План улучшений после пробника
                </div>
              </div>
            </div>

            <div className="hero__card" aria-label="Карточка результата">
              <div className="scorecard">
                <div className="scorecard__row">
                  <div className="scorecard__label">Цель</div>
                  <div className="scorecard__value">Band 7+</div>
                </div>
                <div className="scorecard__row">
                  <div className="scorecard__label">Фокус</div>
                  <div className="scorecard__value">Writing & Speaking</div>
                </div>
                <div className="scorecard__row">
                  <div className="scorecard__label">Результат</div>
                  <div className="scorecard__value scorecard__value--accent">
                    Чёткий план на 7 дней
                  </div>
                </div>

                <div className="scorecard__divider" aria-hidden="true" />

                <div className="mini">
                  <div className="mini__kpi">
                    <div className="mini__num">+0.5</div>
                    <div className="mini__txt">типичный рост за 3–4 недели при системной работе</div>
                  </div>
                  <div className="mini__note">
                    На основе прогресса учеников; результат зависит от регулярности и уровня.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="formats" aria-labelledby="formats-title">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title" id="formats-title">
                Форматы пробников
              </h2>
              <p className="section__subtitle">
                Выберите модуль под слабое место или пройдите полный mock, чтобы увидеть реальную
                картину.
              </p>
            </div>

            <div className="grid" role="list" aria-label="Список форматов">
              {TEST_TYPES.map((t) => (
                <article className="card" key={t.title} role="listitem">
                  <div className="card__top">
                    <h3 className="card__title">{t.title}</h3>
                    <div className="chip">{t.meta}</div>
                  </div>
                  <p className="card__desc">{t.desc}</p>
                  <div className="card__actions">
                    <a className="btn btn--ghost btn--sm" href="#cta">
                      Хочу этот формат
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--alt" id="process" aria-labelledby="process-title">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title" id="process-title">
                Как проходит mock с Джасуром
              </h2>
              <p className="section__subtitle">
                Без воды: вы делаете тест, мы фиксируем паттерны ошибок, а затем строим короткий план,
                который реально выполнить.
              </p>
            </div>

            <ol className="steps" aria-label="Шаги">
              {STEPS.map((s) => (
                <li className="steps__item" key={s.title}>
                  <div className="steps__title">{s.title}</div>
                  <div className="steps__desc">{s.desc}</div>
                </li>
              ))}
            </ol>

            <div className="banner">
              <div className="banner__title">Нужен быстрый аудит уровня?</div>
              <div className="banner__desc">
                Сделаем экспресс-мок и определим, где вы теряете баллы: тайм-менеджмент, лексика,
                грамматика или структура ответа.
              </div>
              <div className="banner__actions">
                <a className="btn btn--primary" href="#cta">
                  Записаться на пробник
                </a>
                <a className="btn btn--ghost" href="#faq">
                  Сначала вопросы
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="faq" aria-labelledby="faq-title">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title" id="faq-title">
                Частые вопросы
              </h2>
              <p className="section__subtitle">
                Если хотите — добавлю сюда цены/пакеты и форму заявки (после того как скажете, где
                принимаете заявки: Telegram, WhatsApp, email или сайт).
              </p>
            </div>

            <div className="faq" role="list" aria-label="FAQ">
              {FAQ.map((f) => (
                <details className="faq__item" key={f.q}>
                  <summary className="faq__q">{f.q}</summary>
                  <div className="faq__a">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__left">
            <div className="brand brand--footer">
              <span className="brand__dot" aria-hidden="true" />
              <span className="brand__name">Jasur IELTS</span>
              <span className="brand__tag">Mock Tests</span>
            </div>
            <div className="footer__fine">
              © {year} Jasur IELTS. Пробные IELTS тесты и обратная связь от учителя Джасура.
            </div>
          </div>

          <div className="footer__right">
            <a className="footer__link" href="#formats">
              Форматы
            </a>
            <a className="footer__link" href="#process">
              Как проходит
            </a>
            <a className="footer__link" href="#cta">
              Записаться
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
