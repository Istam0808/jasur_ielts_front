"use client";

import { useEffect, useRef, useState } from "react";
import { MOCK_STATIC_INSTRUCTION_VIDEO_PATHS } from "@/lib/mockAssetCacheConstants";
import {
  canUseServiceWorkerPrefetch,
  prefetchUrlsViaServiceWorkerOnly,
  putBlobInMediaCache,
  readCachedAssetBlob,
  streamFetchToBlob,
} from "@/utils/mockPrefetchCache";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".bmp"];
const AUDIO_KEY_HINTS = ["audio", "listening"];
const IMAGE_KEY_HINTS = ["image", "img", "diagram", "picture", "photo", "chart"];
const VIDEO_KEY_HINTS = ["video", "instruction", "instructions"];

const assetCache = new Map();
const pendingAssetLoads = new Map();
let unloadCleanupBound = false;

function bindUnloadCleanup() {
  if (unloadCleanupBound || typeof window === "undefined") return;
  unloadCleanupBound = true;

  window.addEventListener("beforeunload", () => {
    assetCache.forEach((entry) => {
      if (entry?.objectUrl) {
        URL.revokeObjectURL(entry.objectUrl);
      }
    });
    assetCache.clear();
    pendingAssetLoads.clear();
  });
}

function stripQuery(url) {
  const clean = String(url || "").trim();
  const queryIndex = clean.indexOf("?");
  return queryIndex >= 0 ? clean.slice(0, queryIndex).toLowerCase() : clean.toLowerCase();
}

function hasAnyHint(value, hints) {
  const text = String(value || "").toLowerCase();
  return hints.some((hint) => text.includes(hint));
}

function detectAssetKind(url, key, parentKey) {
  const normalizedUrl = stripQuery(url);
  const keyText = `${String(parentKey || "")}.${String(key || "")}`;

  if (IMAGE_EXTENSIONS.some((ext) => normalizedUrl.endsWith(ext))) {
    return "image";
  }
  if (VIDEO_EXTENSIONS.some((ext) => normalizedUrl.endsWith(ext))) {
    return "video";
  }
  if (normalizedUrl.endsWith(".webm")) {
    if (normalizedUrl.includes("/videos/") || hasAnyHint(keyText, VIDEO_KEY_HINTS)) {
      return "video";
    }
    return "audio";
  }
  if (AUDIO_EXTENSIONS.some((ext) => normalizedUrl.endsWith(ext))) {
    return "audio";
  }
  if (hasAnyHint(keyText, AUDIO_KEY_HINTS)) {
    return "audio";
  }
  if (hasAnyHint(keyText, VIDEO_KEY_HINTS)) {
    return "video";
  }
  if (hasAnyHint(keyText, IMAGE_KEY_HINTS)) {
    return "image";
  }

  return null;
}

function resolveMockAssetUrl(raw) {
  if (typeof window === "undefined") return String(raw || "").trim();
  const t = String(raw || "").trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^\/\//.test(t)) return `${window.location.protocol}${t}`;
  if (t.startsWith("/")) return `${window.location.origin}${t}`;
  return t;
}

function isCandidateAssetString(raw, key, parentKey) {
  const s = String(raw || "").trim();
  if (!s) return false;

  if (/^https?:\/\//i.test(s) || /^\/\//.test(s)) {
    return detectAssetKind(s, key, parentKey) != null;
  }

  if (s.startsWith("/")) {
    return detectAssetKind(s, key, parentKey) != null;
  }

  return false;
}

function cloneData(input) {
  if (typeof structuredClone === "function") {
    return structuredClone(input);
  }
  return JSON.parse(JSON.stringify(input));
}

function setValueByPath(target, path, nextValue) {
  if (!target || !Array.isArray(path) || !path.length) return;

  let cursor = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (cursor == null) return;
    cursor = cursor[key];
  }

  if (cursor != null) {
    cursor[path[path.length - 1]] = nextValue;
  }
}

function collectAssetReferences(input) {
  const references = [];

  function walk(node, path, parentKey) {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...path, index], parentKey));
      return;
    }

    if (!node || typeof node !== "object") {
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      const currentPath = [...path, key];

      if (typeof value === "string" && isCandidateAssetString(value, key, parentKey)) {
        const sourceUrl = value.trim();
        const fetchUrl = resolveMockAssetUrl(sourceUrl);
        const kind = detectAssetKind(sourceUrl, key, parentKey);

        if (kind && fetchUrl) {
          references.push({
            sourceUrl,
            fetchUrl,
            kind,
            path: currentPath,
          });
        }
      } else if (value && typeof value === "object") {
        walk(value, currentPath, key);
      }
    });
  }

  walk(input, [], "");
  return references;
}

function toUniqueAssets(references, extraStatic) {
  const uniqueMap = new Map();

  references.forEach((item) => {
    const cacheKey = `${item.kind}:${item.fetchUrl}`;
    if (!uniqueMap.has(cacheKey)) {
      uniqueMap.set(cacheKey, { kind: item.kind, fetchUrl: item.fetchUrl });
    }
  });

  extraStatic.forEach((item) => {
    const cacheKey = `${item.kind}:${item.fetchUrl}`;
    if (!uniqueMap.has(cacheKey)) {
      uniqueMap.set(cacheKey, { kind: item.kind, fetchUrl: item.fetchUrl });
    }
  });

  return Array.from(uniqueMap.values());
}

function shortFileLabel(url) {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean);
    const name = path[path.length - 1] || url;
    return decodeURIComponent(name);
  } catch {
    return url;
  }
}

/**
 * Кэш → потоковый fetch → один запрос blob (без прогресса по байтам).
 */
async function loadBlobWithProgress(fetchUrl, onProgress) {
  const cached = await readCachedAssetBlob(fetchUrl);
  if (cached) {
    onProgress?.({ loaded: cached.size, total: cached.size, url: fetchUrl });
    return cached;
  }

  let blob = await streamFetchToBlob(fetchUrl, { onProgress });
  if (blob && blob.size > 0) {
    await putBlobInMediaCache(fetchUrl, blob);
    return blob;
  }

  try {
    const response = await fetch(fetchUrl, { mode: "cors", credentials: "omit" });
    if (response.ok && response.type !== "opaque") {
      blob = await response.blob();
      onProgress?.({ loaded: blob.size, total: blob.size, url: fetchUrl });
      if (blob.size > 0) {
        await putBlobInMediaCache(fetchUrl, blob);
      }
      return blob;
    }
  } catch {
    /* ignore */
  }

  return null;
}

async function loadAudioLikeAsset(kind, fetchUrl, defaultMime, onProgress) {
  const cacheKey = `${kind}:${fetchUrl}`;
  const cached = assetCache.get(cacheKey);
  if (cached?.status === "loaded") {
    return cached;
  }

  if (pendingAssetLoads.has(cacheKey)) {
    return pendingAssetLoads.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      const blob = await loadBlobWithProgress(fetchUrl, onProgress);
      if (!blob) {
        const result = { status: "loaded", objectUrl: null, url: fetchUrl };
        assetCache.set(cacheKey, result);
        return result;
      }
      const mime = blob.type || defaultMime;
      const finalBlob = blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: mime });
      const objectUrl = URL.createObjectURL(finalBlob);
      const result = { status: "loaded", objectUrl, url: fetchUrl };
      assetCache.set(cacheKey, result);
      return result;
    } catch (error) {
      const result = {
        status: "failed",
        objectUrl: null,
        url: fetchUrl,
        error: String(error?.message || error),
      };
      assetCache.set(cacheKey, result);
      return result;
    }
  })().finally(() => {
    pendingAssetLoads.delete(cacheKey);
  });

  pendingAssetLoads.set(cacheKey, requestPromise);
  return requestPromise;
}

async function loadAudioAsset(fetchUrl, onProgress) {
  return loadAudioLikeAsset("audio", fetchUrl, "audio/mpeg", onProgress);
}

async function loadVideoAsset(fetchUrl, onProgress) {
  return loadAudioLikeAsset("video", fetchUrl, "video/webm", onProgress);
}

async function loadImageAsset(fetchUrl, onProgress) {
  const cacheKey = `image:${fetchUrl}`;
  const cached = assetCache.get(cacheKey);
  if (cached?.status === "loaded") {
    return cached;
  }

  if (pendingAssetLoads.has(cacheKey)) {
    return pendingAssetLoads.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      const blob = await loadBlobWithProgress(fetchUrl, onProgress);
      if (!blob || blob.size === 0) {
        throw new Error("empty body");
      }
      const mime = blob.type || "image/png";
      const finalBlob = blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: mime });
      const objectUrl = URL.createObjectURL(finalBlob);
      const result = { status: "loaded", objectUrl, url: fetchUrl };
      assetCache.set(cacheKey, result);
      return result;
    } catch {
      return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";

        image.onload = () => {
          const result = { status: "loaded", objectUrl: null, url: fetchUrl };
          assetCache.set(cacheKey, result);
          resolve(result);
        };

        image.onerror = async () => {
          try {
            const response = await fetch(fetchUrl, { mode: "cors", credentials: "omit" });
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            const contentType = response.headers.get("content-type") || "image/png";
            const blob = new Blob([buffer], { type: contentType });
            const objectUrl = URL.createObjectURL(blob);
            const result = { status: "loaded", objectUrl, url: fetchUrl };
            assetCache.set(cacheKey, result);
            resolve(result);
          } catch (error) {
            const result = {
              status: "failed",
              objectUrl: null,
              url: fetchUrl,
              error: String(error?.message || error),
            };
            assetCache.set(cacheKey, result);
            resolve(result);
          }
        };

        image.src = fetchUrl;
      });
    }
  })().finally(() => {
    pendingAssetLoads.delete(cacheKey);
  });

  pendingAssetLoads.set(cacheKey, requestPromise);
  return requestPromise;
}

function getCachedReplacement(kind, fetchUrl) {
  const entry = assetCache.get(`${kind}:${fetchUrl}`);
  if (!entry || entry.status !== "loaded") return null;
  return entry.objectUrl || fetchUrl;
}

/**
 * @param {object | null} mockData — сырой ответ getMockById
 * @param {{ includeStaticInstructions?: boolean }} [options]
 */
export function useMockPreloader(mockData, options = {}) {
  const includeStaticInstructions = options.includeStaticInstructions === true;
  const runRef = useRef(0);
  const [state, setState] = useState({
    percent: 0,
    status: "idle",
    bytesLoaded: 0,
    bytesTotal: null,
    currentLabel: "",
    filesDone: 0,
    filesTotal: 0,
    swPrefetchDone: null,
    swPrefetchTotal: null,
    errors: [],
    cachedData: null,
  });

  useEffect(() => {
    bindUnloadCleanup();

    if (!mockData || typeof mockData !== "object") {
      queueMicrotask(() => {
        setState({
          percent: 0,
          status: "idle",
          bytesLoaded: 0,
          bytesTotal: null,
          currentLabel: "",
          filesDone: 0,
          filesTotal: 0,
          swPrefetchDone: null,
          swPrefetchTotal: null,
          errors: [],
          cachedData: null,
        });
      });
      return undefined;
    }

    runRef.current += 1;
    const runId = runRef.current;
    let isDisposed = false;

    const references = collectAssetReferences(mockData);
    const staticExtras =
      includeStaticInstructions && typeof window !== "undefined"
        ? MOCK_STATIC_INSTRUCTION_VIDEO_PATHS.map((p) => ({
            kind: "video",
            fetchUrl: resolveMockAssetUrl(p),
          }))
        : [];

    const uniqueAssets = toUniqueAssets(references, staticExtras);
    const totalFiles = uniqueAssets.length;

    if (totalFiles === 0) {
      queueMicrotask(() => {
        setState({
          percent: 100,
          status: "done",
          bytesLoaded: 0,
          bytesTotal: null,
          currentLabel: "",
          filesDone: 0,
          filesTotal: 0,
          swPrefetchDone: null,
          swPrefetchTotal: null,
          errors: [],
          cachedData: mockData,
        });
      });
      return undefined;
    }

    queueMicrotask(() => {
      setState({
        percent: 0,
        status: "loading",
        bytesLoaded: 0,
        bytesTotal: null,
        currentLabel: "",
        filesDone: 0,
        filesTotal: totalFiles,
        swPrefetchDone: null,
        swPrefetchTotal: null,
        errors: [],
        cachedData: null,
      });
    });

    const errors = [];
    const progressByUrl = new Map();
    let rafScheduled = false;
    let completedFiles = 0;

    uniqueAssets.forEach(({ fetchUrl }) => {
      progressByUrl.set(fetchUrl, { loaded: 0, total: 0 });
    });

    const scheduleProgressFlush = (activeUrl) => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        if (isDisposed || runRef.current !== runId) return;

        let sumLoaded = 0;
        let denom = 0;
        for (const v of progressByUrl.values()) {
          sumLoaded += v.loaded;
          denom += Math.max(v.loaded, v.total || 0);
        }

        let nextPercent = 0;
        if (denom > 0) {
          nextPercent = Math.min(99, Math.round((sumLoaded / denom) * 100));
        } else if (totalFiles > 0) {
          nextPercent = Math.min(99, Math.round((completedFiles / totalFiles) * 100));
        }

        const label = activeUrl ? shortFileLabel(activeUrl) : "";

        setState((prev) => ({
          ...prev,
          bytesLoaded: sumLoaded,
          bytesTotal: denom > 0 ? denom : null,
          percent: nextPercent,
          currentLabel: label || prev.currentLabel,
        }));
      });
    };

    const onFileProgress = (fetchUrl) => (info) => {
      if (isDisposed || runRef.current !== runId) return;
      const prev = progressByUrl.get(fetchUrl) || { loaded: 0, total: 0 };
      progressByUrl.set(fetchUrl, {
        loaded: info.loaded,
        total: Math.max(prev.total || 0, info.total || 0, info.loaded),
      });
      scheduleProgressFlush(fetchUrl);
    };

    const handleAssetFinished = (assetUrl, ok, reason) => {
      completedFiles += 1;

      if (!ok) {
        errors.push(assetUrl);
        console.warn("[mock-preloader] asset failed:", assetUrl, reason || "");
      }

      if (!isDisposed && runRef.current === runId) {
        setState((prev) => ({
          ...prev,
          status: "loading",
          filesDone: completedFiles,
          errors: [...errors],
        }));
      }
    };

    (async () => {
      if (isDisposed || runRef.current !== runId) return;

      let cacheHitsBeforePrefetch = 0;
      const needPrefetchUrls = [];
      for (const { fetchUrl } of uniqueAssets) {
        const blob = await readCachedAssetBlob(fetchUrl);
        if (blob && blob.size > 0) {
          cacheHitsBeforePrefetch += 1;
        } else {
          needPrefetchUrls.push(fetchUrl);
        }
      }

      if (
        needPrefetchUrls.length > 0 &&
        canUseServiceWorkerPrefetch()
      ) {
        if (!isDisposed && runRef.current === runId) {
          setState((prev) => ({
            ...prev,
            swPrefetchDone: 0,
            swPrefetchTotal: needPrefetchUrls.length,
            currentLabel: "",
          }));
        }

        await prefetchUrlsViaServiceWorkerOnly(needPrefetchUrls, {
          onProgress: ({ done, total, url }) => {
            if (isDisposed || runRef.current !== runId) return;
            const pct =
              totalFiles > 0
                ? Math.min(
                    99,
                    Math.round(((cacheHitsBeforePrefetch + done) / totalFiles) * 100)
                  )
                : 0;
            setState((prev) => ({
              ...prev,
              swPrefetchDone: done,
              swPrefetchTotal: total,
              percent: pct,
              currentLabel: url ? shortFileLabel(url) : prev.currentLabel,
            }));
          },
        });
      }

      if (isDisposed || runRef.current !== runId) return;

      if (!isDisposed && runRef.current === runId) {
        setState((prev) => ({
          ...prev,
          swPrefetchDone: null,
          swPrefetchTotal: null,
        }));
      }

      completedFiles = 0;

      await Promise.all(
        uniqueAssets.map(async ({ kind, fetchUrl }) => {
          const onProg = onFileProgress(fetchUrl);
          if (kind === "audio") {
            const result = await loadAudioAsset(fetchUrl, onProg);
            handleAssetFinished(fetchUrl, result.status === "loaded", result.error);
            return;
          }
          if (kind === "video") {
            const result = await loadVideoAsset(fetchUrl, onProg);
            handleAssetFinished(fetchUrl, result.status === "loaded", result.error);
            return;
          }
          const result = await loadImageAsset(fetchUrl, onProg);
          handleAssetFinished(fetchUrl, result.status === "loaded", result.error);
        })
      );

      if (isDisposed || runRef.current !== runId) return;

      const cloned = cloneData(mockData);
      references.forEach((reference) => {
        const replacement = getCachedReplacement(reference.kind, reference.fetchUrl);
        if (replacement) {
          setValueByPath(cloned, reference.path, replacement);
        }
      });

      setState({
        percent: 100,
        status: "done",
        bytesLoaded: 0,
        bytesTotal: null,
        currentLabel: "",
        filesDone: totalFiles,
        filesTotal: totalFiles,
        swPrefetchDone: null,
        swPrefetchTotal: null,
        errors,
        cachedData: cloned,
      });
    })().catch((error) => {
      if (isDisposed || runRef.current !== runId) return;

      console.error("[mock-preloader] unexpected preload failure:", error);
      setState({
        percent: 100,
        status: "error",
        bytesLoaded: 0,
        bytesTotal: null,
        currentLabel: "",
        filesDone: 0,
        filesTotal: totalFiles,
        swPrefetchDone: null,
        swPrefetchTotal: null,
        errors: [...errors],
        cachedData: mockData,
      });
    });

    return () => {
      isDisposed = true;
    };
  }, [mockData, includeStaticInstructions]);

  return state;
}
