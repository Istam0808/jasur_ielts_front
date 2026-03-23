/* global self, caches, fetch */
/**
 * Service Worker: кэш медиа для мок-экзамена (Cache API).
 * Имя кэша дублирует src/lib/mockAssetCacheConstants.js — при смене версии обновить оба.
 */
const CACHE_NAME = "ielts-mock-assets-v2";

const MEDIA_EXT_PATTERN =
  /\.(mp3|wav|m4a|aac|ogg|flac|webm|mp4|mov|m4v|jpg|jpeg|png|webp|gif|svg|avif|bmp)(\?|$)/i;

function looksLikeMockMediaUrl(urlString) {
  if (!urlString || typeof urlString !== "string") return false;
  try {
    const u = new URL(urlString, self.location.origin);
    return MEDIA_EXT_PATTERN.test(u.pathname);
  } catch {
    return false;
  }
}

function buildCacheRequest(url) {
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

async function putUrlInCache(cache, url) {
  const request = buildCacheRequest(url);
  const response = await fetch(request);
  if (response?.type === "opaque") {
    throw new Error("opaque response (CORS?)");
  }
  if (!response || !response.ok) {
    throw new Error(`HTTP ${response?.status || "?"}`);
  }
  await cache.put(request, response.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "MOCK_PREFETCH") return;

  const urls = Array.isArray(data.urls) ? data.urls.filter(Boolean) : [];
  const port = event.ports && event.ports[0];

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const errors = [];
      let done = 0;
      const total = urls.length;

      for (const url of urls) {
        try {
          const hit = await matchCachedResponse(cache, url);
          if (!hit) {
            await putUrlInCache(cache, url);
          }
        } catch (e) {
          errors.push({ url, message: String(e?.message || e) });
          console.warn("[mock-assets-sw] prefetch failed:", url, e);
        }
        done += 1;
        if (port) {
          port.postMessage({
            type: "MOCK_PREFETCH_PROGRESS",
            done,
            total,
            url,
          });
        }
      }

      if (port) {
        port.postMessage({
          type: "MOCK_PREFETCH_DONE",
          total,
          errors,
        });
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = event.request.url;
  if (!looksLikeMockMediaUrl(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      let cached = await cache.match(event.request);
      if (!cached) {
        cached = await matchCachedResponse(cache, url);
      }
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response && response.ok && response.type !== "opaque") {
          const key = buildCacheRequest(url);
          await cache.put(key, response.clone());
        }
        return response;
      } catch (e) {
        const retry = await matchCachedResponse(cache, url);
        if (retry) return retry;
        throw e;
      }
    })()
  );
});
