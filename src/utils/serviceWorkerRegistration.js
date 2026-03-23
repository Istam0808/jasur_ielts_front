const SW_SCRIPT = "/mock-assets-sw.js";
const SW_SCOPE = "/";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isMockSwEnabledInDev() {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_SW_IN_DEV === "true";
}

function shouldRegisterMockServiceWorker() {
  if (isProduction()) return true;
  return isMockSwEnabledInDev();
}

function isServiceWorkerDisabled() {
  return process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER === "true";
}

/**
 * Регистрация SW для кэша медиа мок-экзамена (production или NEXT_PUBLIC_ENABLE_MOCK_SW_IN_DEV).
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!shouldRegisterMockServiceWorker()) return;
  if (isServiceWorkerDisabled()) return;
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register(SW_SCRIPT, { scope: SW_SCOPE })
    .catch((error) => {
      console.warn("[service-worker] registration failed:", error);
    });
}

/**
 * При смене контролирующего SW — перезагрузка вкладки, чтобы подтянуть новый кэш/логику.
 */
export function handleServiceWorkerUpdate() {
  if (typeof window === "undefined") return;
  if (!shouldRegisterMockServiceWorker()) return;
  if (isServiceWorkerDisabled()) return;
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
