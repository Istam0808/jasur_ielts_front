import {
  MOCK_ASSETS_CACHE_NAME,
  SW_MESSAGE_MOCK_PREFETCH,
} from "@/lib/mockAssetCacheConstants";

const SW_READY_TIMEOUT_MS = 8000;
const SW_PREFETCH_TIMEOUT_MS = 20000;

/** SW prefetch + read cache: production или NEXT_PUBLIC_ENABLE_MOCK_SW_IN_DEV. */
export function canUseServiceWorkerPrefetch() {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER === "true") return false;
  if (process.env.NODE_ENV === "production") return "serviceWorker" in navigator;
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_SW_IN_DEV === "true" && "serviceWorker" in navigator;
}

/**
 * Единый ключ Cache API: CORS + omit credentials (как streamFetchToBlob).
 * Не использовать no-cors — иначе opaque-ответы нельзя прочитать через blob().
 */
export function buildCacheRequest(url) {
  const href = String(url || "").trim();
  return new Request(href, { mode: "cors", credentials: "omit" });
}

async function matchCachedResponse(cache, url) {
  const href = String(url || "").trim();
  const req = buildCacheRequest(href);
  let response =
    (await cache.match(req)) ||
    (await cache.match(href)) ||
    (await cache.match(new Request(href)));
  return response;
}

function prefetchViaServiceWorker(activeWorker, urls, options = {}) {
  const { onProgress } = options;
  return new Promise((resolve) => {
    let settled = false;
    const channel = new MessageChannel();
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ errors: [], via: "sw-timeout" });
      }
    }, SW_PREFETCH_TIMEOUT_MS);

    channel.port1.onmessage = (event) => {
      const msg = event.data;
      if (msg?.type === "MOCK_PREFETCH_PROGRESS") {
        onProgress?.({
          done: msg.done,
          total: msg.total,
          url: msg.url,
        });
        return;
      }
      if (msg?.type === "MOCK_PREFETCH_DONE" && !settled) {
        settled = true;
        clearTimeout(timeoutId);
        resolve({ errors: Array.isArray(msg.errors) ? msg.errors : [], via: "sw" });
      }
    };

    try {
      activeWorker.postMessage({ type: SW_MESSAGE_MOCK_PREFETCH, urls }, [channel.port2]);
    } catch (e) {
      clearTimeout(timeoutId);
      if (!settled) {
        settled = true;
        resolve({ errors: [], via: "sw-post-failed", postError: String(e?.message || e) });
      }
    }
  });
}

async function getServiceWorkerRegistrationWithTimeout() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => {
        setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS);
      }),
    ]);
    return reg || null;
  } catch {
    return null;
  }
}

export async function prefetchViaClientCache(urls) {
  if (typeof window === "undefined" || !("caches" in window)) {
    return { errors: [], via: "no-caches-api" };
  }

  const cache = await caches.open(MOCK_ASSETS_CACHE_NAME);
  const errors = [];

  for (const url of urls) {
    try {
      const request = buildCacheRequest(url);
      const hit = await matchCachedResponse(cache, url);
      if (hit) continue;

      const response = await fetch(request);
      if (response?.type === "opaque") {
        throw new Error("opaque response (CORS?)");
      }
      if (!response?.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      await cache.put(request, response.clone());
    } catch (e) {
      errors.push({ url, message: String(e?.message || e) });
      console.warn("[mock-preloader] client cache put failed:", url, e);
    }
  }

  return { errors, via: "client" };
}

/**
 * Прогрев Cache API: сначала SW (если доступен), затем клиентский put для пропусков.
 * @param {string[]} absoluteUrls
 * @param {{ onProgress?: (info: { done: number; total: number; url?: string }) => void }} [options]
 */
export async function prefetchMockAssetsToCache(absoluteUrls, options = {}) {
  const { onProgress } = options;
  const urls = [...new Set(absoluteUrls.filter(Boolean))];
  if (!urls.length) {
    return { errors: [] };
  }

  const mergedErrors = [];

  if (canUseServiceWorkerPrefetch()) {
    try {
      const reg = await getServiceWorkerRegistrationWithTimeout();
      if (reg.active) {
        const swResult = await prefetchViaServiceWorker(reg.active, urls, { onProgress });
        if (Array.isArray(swResult.errors) && swResult.errors.length) {
          mergedErrors.push(...swResult.errors);
        }
      }
    } catch (e) {
      console.warn("[mock-preloader] SW prefetch path failed:", e);
    }
  }

  const clientResult = await prefetchViaClientCache(urls);
  if (Array.isArray(clientResult.errors) && clientResult.errors.length) {
    mergedErrors.push(...clientResult.errors);
  }

  return { errors: mergedErrors };
}

/**
 * Только SW-батч (для useMockPreloader), с прогрессом по файлам.
 */
export async function prefetchUrlsViaServiceWorkerOnly(urls, options = {}) {
  const list = [...new Set(urls.filter(Boolean))];
  if (!list.length) {
    return { errors: [], via: "empty" };
  }
  if (!canUseServiceWorkerPrefetch()) {
    return { errors: [], via: "sw-disabled" };
  }
  try {
    const reg = await getServiceWorkerRegistrationWithTimeout();
    if (!reg?.active) {
      return { errors: [], via: "no-active-worker" };
    }
    return await prefetchViaServiceWorker(reg.active, list, options);
  } catch (e) {
    console.warn("[mock-preloader] SW-only prefetch failed:", e);
    return { errors: [], via: "sw-error" };
  }
}

export async function readCachedAssetBlob(url) {
  if (typeof window === "undefined" || !("caches" in window)) return null;
  try {
    const cache = await caches.open(MOCK_ASSETS_CACHE_NAME);
    const response = await matchCachedResponse(cache, url);
    if (!response) return null;
    if (response.type === "opaque") return null;
    if (!response.ok) return null;
    return response.blob();
  } catch {
    return null;
  }
}

/**
 * Потоковая загрузка с колбэком прогресса (байты получены / ожидаемый размер по Content-Length).
 * @param {(info: { loaded: number; total: number; url: string }) => void} [options.onProgress]
 */
export async function streamFetchToBlob(url, options = {}) {
  const { onProgress } = options;

  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok || response.type === "opaque") {
      return null;
    }

    const headerTotal = parseInt(response.headers.get("content-length") || "0", 10) || 0;
    const contentType = response.headers.get("content-type") || "";

    if (!response.body) {
      const blob = await response.blob();
      onProgress?.({ loaded: blob.size, total: blob.size || headerTotal, url });
      return blob;
    }

    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      const total = headerTotal > 0 ? headerTotal : loaded;
      onProgress?.({ loaded, total, url });
    }

    const blob = new Blob(chunks, { type: contentType || undefined });
    const finalTotal = headerTotal > 0 ? headerTotal : blob.size;
    onProgress?.({ loaded: blob.size, total: finalTotal, url });

    return blob;
  } catch {
    return null;
  }
}

/** Сохранить blob в Cache API под тем же ключом, что и readCachedAssetBlob. */
export async function putBlobInMediaCache(url, blob) {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    const request = buildCacheRequest(url);
    const response = new Response(blob, {
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
      },
    });
    const cache = await caches.open(MOCK_ASSETS_CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (e) {
    console.warn("[mock-preloader] cache put failed:", url, e);
  }
}
