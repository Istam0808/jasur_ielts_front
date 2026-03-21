"use client";

import PropTypes from "prop-types";

function getStatusText(percent, status) {
  if (status === "error") return "Loading finished with some issues...";
  if (status === "done") return "Almost ready...";
  if (status === "idle") return "Preparing assets...";

  if (percent < 45) return "Loading audio...";
  if (percent < 90) return "Loading images...";
  return "Almost ready...";
}

export default function MockPreloadScreen({ percent, status }) {
  const normalizedPercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
  const statusText = getStatusText(normalizedPercent, status);

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
          Preparing your IELTS mock exam
        </h1>

        <p
          style={{
            margin: 0,
            marginBottom: "1.25rem",
            color: "#cbd5e1",
            fontSize: "0.95rem",
          }}
        >
          We are loading audio and visual assets for a smoother exam experience.
        </p>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={normalizedPercent}
          aria-label="Mock exam asset preload progress"
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
              transition: "width 220ms ease-out",
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
      </section>
    </main>
  );
}

MockPreloadScreen.propTypes = {
  percent: PropTypes.number.isRequired,
  status: PropTypes.oneOf(["idle", "loading", "done", "error"]).isRequired,
};
