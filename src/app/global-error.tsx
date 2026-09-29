"use client";

/**
 * Last-resort boundary for failures the locale `error.tsx` cannot catch (the locale layout, header,
 * footer or message loading itself). It replaces the root layout, so it owns <html>/<body> and uses
 * inline styles only: no stylesheet, font, provider or translation catalogue is assumed to work.
 * Copy is deliberately static and trilingual for the same reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#ffffff",
          color: "#121826",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif",
        }}
      >
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", color: "#8a6f30" }}>
            SHAHEEN SKY
          </p>
          <h1 style={{ fontSize: 28, lineHeight: 1.25, margin: "12px 0" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 8px", lineHeight: 1.7, color: "#4a5468" }}>
            The page could not be displayed. Please try again in a moment.
          </p>
          <p lang="zh-CN" style={{ margin: "0 0 8px", lineHeight: 1.8, color: "#4a5468" }}>
            页面暂时无法显示，请稍后重试。
          </p>
          <p lang="ar" dir="rtl" style={{ margin: "0 0 24px", lineHeight: 1.9, color: "#4a5468" }}>
            تعذّر عرض الصفحة. يُرجى المحاولة مرة أخرى بعد قليل.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "0 24px",
              border: 0,
              borderRadius: 6,
              background: "#0b1f3a",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again · 重试 · إعادة المحاولة
          </button>
          {error.digest ? (
            <p style={{ marginTop: 24, fontSize: 12, color: "#667085" }}>
              Reference: <span dir="ltr">{error.digest}</span>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
