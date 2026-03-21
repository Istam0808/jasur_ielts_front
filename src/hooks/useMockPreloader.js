"use client";

import { useEffect, useRef, useState } from "react";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".bmp"];
const AUDIO_KEY_HINTS = ["audio", "listening"];
const IMAGE_KEY_HINTS = ["image", "img", "diagram", "picture", "photo", "chart"];

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

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
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

  if (AUDIO_EXTENSIONS.some((ext) => normalizedUrl.endsWith(ext))) {
    return "audio";
  }
  if (IMAGE_EXTENSIONS.some((ext) => normalizedUrl.endsWith(ext))) {
    return "image";
  }
  if (hasAnyHint(keyText, AUDIO_KEY_HINTS)) {
    return "audio";
  }
  if (hasAnyHint(keyText, IMAGE_KEY_HINTS)) {
    return "image";
  }

  return null;
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

      if (typeof value === "string" && isHttpUrl(value)) {
        const url = value.trim();
        const kind = detectAssetKind(url, key, parentKey);

        if (kind) {
          references.push({
            url,
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

function toUniqueAssets(references) {
  const uniqueMap = new Map();

  references.forEach((item) => {
    const cacheKey = `${item.kind}:${item.url}`;
    if (!uniqueMap.has(cacheKey)) {
      uniqueMap.set(cacheKey, { kind: item.kind, url: item.url });
    }
  });

  return Array.from(uniqueMap.values());
}

async function loadAudioAsset(url) {
  const cacheKey = `audio:${url}`;
  const cached = assetCache.get(cacheKey);
  if (cached?.status === "loaded") {
    return cached;
  }

  if (pendingAssetLoads.has(cacheKey)) {
    return pendingAssetLoads.get(cacheKey);
  }

  const requestPromise = fetch(url, { mode: "cors" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "audio/mpeg";
      const blob = new Blob([buffer], { type: contentType });
      const objectUrl = URL.createObjectURL(blob);

      const result = { status: "loaded", objectUrl, url };
      assetCache.set(cacheKey, result);
      return result;
    })
    .catch((error) => {
      const result = { status: "failed", objectUrl: null, url, error: String(error?.message || error) };
      assetCache.set(cacheKey, result);
      return result;
    })
    .finally(() => {
      pendingAssetLoads.delete(cacheKey);
    });

  pendingAssetLoads.set(cacheKey, requestPromise);
  return requestPromise;
}

async function loadImageAsset(url) {
  const cacheKey = `image:${url}`;
  const cached = assetCache.get(cacheKey);
  if (cached?.status === "loaded") {
    return cached;
  }

  if (pendingAssetLoads.has(cacheKey)) {
    return pendingAssetLoads.get(cacheKey);
  }

  const requestPromise = new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      const result = { status: "loaded", objectUrl: null, url };
      assetCache.set(cacheKey, result);
      resolve(result);
    };

    image.onerror = async () => {
      try {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get("content-type") || "image/png";
        const blob = new Blob([buffer], { type: contentType });
        const objectUrl = URL.createObjectURL(blob);
        const result = { status: "loaded", objectUrl, url };
        assetCache.set(cacheKey, result);
        resolve(result);
      } catch (error) {
        const result = { status: "failed", objectUrl: null, url, error: String(error?.message || error) };
        assetCache.set(cacheKey, result);
        resolve(result);
      }
    };

    image.src = url;
  }).finally(() => {
    pendingAssetLoads.delete(cacheKey);
  });

  pendingAssetLoads.set(cacheKey, requestPromise);
  return requestPromise;
}

function getCachedReplacement(kind, url) {
  const entry = assetCache.get(`${kind}:${url}`);
  if (!entry || entry.status !== "loaded") return null;

  // Prefer object URLs (blob cache); fallback to original URL for successfully warmed images.
  return entry.objectUrl || url;
}

export function useMockPreloader(mockData) {
  const runRef = useRef(0);
  const [state, setState] = useState({
    percent: 0,
    status: "idle",
    errors: [],
    cachedData: null,
  });

  useEffect(() => {
    bindUnloadCleanup();

    if (!mockData || typeof mockData !== "object") {
      setState({
        percent: 0,
        status: "idle",
        errors: [],
        cachedData: null,
      });
      return undefined;
    }

    const runId = runRef.current + 1;
    runRef.current = runId;
    let isDisposed = false;

    const references = collectAssetReferences(mockData);
    const uniqueAssets = toUniqueAssets(references);
    const total = uniqueAssets.length;

    if (total === 0) {
      setState({
        percent: 100,
        status: "done",
        errors: [],
        cachedData: mockData,
      });
      return undefined;
    }

    setState({
      percent: 0,
      status: "loading",
      errors: [],
      cachedData: null,
    });

    const errors = [];
    let loaded = 0;

    const handleAssetFinished = (assetUrl, ok, reason) => {
      loaded += 1;
      const nextPercent = Math.min(100, Math.round((loaded / total) * 100));

      if (!ok) {
        errors.push(assetUrl);
        // Do not block the flow on individual asset failures.
        console.warn("[mock-preloader] asset failed:", assetUrl, reason || "");
      }

      if (!isDisposed && runRef.current === runId) {
        setState((prev) => ({
          ...prev,
          percent: nextPercent,
          status: "loading",
          errors: [...errors],
        }));
      }
    };

    Promise.all(
      uniqueAssets.map(async ({ kind, url }) => {
        if (kind === "audio") {
          const result = await loadAudioAsset(url);
          handleAssetFinished(url, result.status === "loaded", result.error);
          return;
        }

        const result = await loadImageAsset(url);
        handleAssetFinished(url, result.status === "loaded", result.error);
      })
    )
      .then(() => {
        if (isDisposed || runRef.current !== runId) return;

        const cloned = cloneData(mockData);
        references.forEach((reference) => {
          const replacement = getCachedReplacement(reference.kind, reference.url);
          if (replacement) {
            setValueByPath(cloned, reference.path, replacement);
          }
        });

        setState({
          percent: 100,
          status: "done",
          errors,
          cachedData: cloned,
        });
      })
      .catch((error) => {
        if (isDisposed || runRef.current !== runId) return;

        console.error("[mock-preloader] unexpected preload failure:", error);
        setState({
          percent: 100,
          status: "error",
          errors: [...errors],
          cachedData: mockData,
        });
      });

    return () => {
      isDisposed = true;
    };
  }, [mockData]);

  return state;
}
