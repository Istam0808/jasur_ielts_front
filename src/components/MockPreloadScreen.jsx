"use client";

import PropTypes from "prop-types";

function formatBytes(value) {
  if (value == null || !Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusText(percent, status) {
  if (status === "error") return "Загрузка завершена с предупреждениями…";
  if (status === "done") return "Почти готово…";
  if (status === "idle") return "Подготовка материалов…";

  if (percent < 45) return "Загрузка аудио…";
  if (percent < 90) return "Загрузка изображений…";
  return "Почти готово…";
}

export default function MockPreloadScreen({
  percent,
  status,
  bytesLoaded = 0,
  bytesTotal = null,
  currentLabel = "",
  filesDone = 0,
  filesTotal = 0,
  swPrefetchDone = null,
  swPrefetchTotal = null,
}) {
  const normalizedPercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
  const statusText = getStatusText(normalizedPercent, status);
  const showLiveBytes = status === "loading" && (bytesLoaded > 0 || (bytesTotal != null && bytesTotal > 0));
  const showFilesRow =
    status === "loading" && filesTotal > 0 && (swPrefetchTotal == null || swPrefetchTotal === 0);
  const showSwRow =
    status === "loading" &&
    swPrefetchTotal != null &&
    swPrefetchTotal > 0 &&
    swPrefetchDone != null;

  return (
    <main
      aria-live="polite"
      aria-busy={status !== "done"}
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
        color: "#f8fafc",
        padding: "1.5rem",
      }}
    >
      <section
        style={{
          width: "min(680px, 100%)",
          background: "rgba(17, 24, 39, 0.72)",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          borderRadius: "16px",
          padding: "1.5rem",
          boxShadow: "0 22px 50px rgba(2, 6, 23, 0.45)",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            lineHeight: 1.3,
            margin: 0,
            marginBottom: "0.625rem",
            fontWeight: 700,
          }}
        >
          Подготовка IELTS mock
        </h1>

        <p
          style={{
            margin: 0,
            marginBottom: "1.25rem",
            color: "#cbd5e1",
            fontSize: "0.95rem",
          }}
        >
          Загружаем аудио и визуальные материалы — прогресс обновляется в реальном времени.
        </p>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={normalizedPercent}
          aria-label="Прогресс загрузки материалов мок-экзамена"
          style={{
            width: "100%",
            height: "12px",
            backgroundColor: "rgba(71, 85, 105, 0.45)",
            borderRadius: "999px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${normalizedPercent}%`,
              height: "100%",
              background: "linear-gradient(90deg, #38bdf8 0%, #0ea5e9 55%, #0284c7 100%)",
              transition: "width 120ms linear",
              boxShadow: "0 0 20px rgba(14, 165, 233, 0.5)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "0.75rem",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <strong style={{ fontSize: "0.95rem", color: "#e2e8f0" }}>{statusText}</strong>
          <span style={{ fontVariantNumeric: "tabular-nums", color: "#93c5fd", fontWeight: 700 }}>
            {normalizedPercent}%
          </span>
        </div>

        {(showSwRow || showFilesRow || showLiveBytes) && (
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(148, 163, 184, 0.18)",
              fontSize: "0.875rem",
              color: "#94a3b8",
              lineHeight: 1.5,
            }}
          >
            {showSwRow ? (
              <div style={{ fontVariantNumeric: "tabular-nums", marginBottom: showFilesRow || showLiveBytes ? "0.5rem" : 0 }}>
                Кэш (Service Worker):{" "}
                <span style={{ color: "#e2e8f0" }}>
                  {swPrefetchDone} / {swPrefetchTotal}
                </span>
              </div>
            ) : null}
            {showFilesRow ? (
              <div style={{ fontVariantNumeric: "tabular-nums", marginBottom: showLiveBytes ? "0.5rem" : 0 }}>
                Файлы:{" "}
                <span style={{ color: "#e2e8f0" }}>
                  {filesDone} / {filesTotal}
                </span>
              </div>
            ) : null}
            {showLiveBytes ? (
              <>
                <div style={{ fontVariantNumeric: "tabular-nums" }}>
                  Скачано: <span style={{ color: "#e2e8f0" }}>{formatBytes(bytesLoaded)}</span>
                  {bytesTotal != null && bytesTotal > 0 ? (
                    <>
                      {" "}
                      / <span style={{ color: "#e2e8f0" }}>{formatBytes(bytesTotal)}</span>
                    </>
                  ) : null}
                </div>
                {currentLabel ? (
                  <div
                    style={{
                      marginTop: "0.35rem",
                      color: "#cbd5e1",
                      wordBreak: "break-all",
                    }}
                  >
                    Файл: <span style={{ color: "#f1f5f9" }}>{currentLabel}</span>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

MockPreloadScreen.propTypes = {
  percent: PropTypes.number.isRequired,
  status: PropTypes.oneOf(["idle", "loading", "done", "error"]).isRequired,
  bytesLoaded: PropTypes.number,
  bytesTotal: PropTypes.number,
  currentLabel: PropTypes.string,
  filesDone: PropTypes.number,
  filesTotal: PropTypes.number,
  swPrefetchDone: PropTypes.number,
  swPrefetchTotal: PropTypes.number,
};
