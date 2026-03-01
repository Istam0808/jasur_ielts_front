const STORAGE_KEY = 'smart_cache_v1';
const DEFAULT_KEYS = ['learning_hours', 'profile_data'];
const memoryStore = new Map();

const isBrowser = typeof window !== 'undefined';

const loadFromStorage = () => {
  if (!isBrowser) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    Object.entries(parsed).forEach(([key, entry]) => {
      if (entry && typeof entry === 'object') {
        memoryStore.set(key, entry);
      }
    });
  } catch (_) {}
};

const saveToStorage = () => {
  if (!isBrowser) return;
  try {
    const obj = {};
    memoryStore.forEach((value, key) => {
      obj[key] = value;
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (_) {}
};

const getEntry = (key) => {
  if (!memoryStore.size && isBrowser) {
    loadFromStorage();
  }
  return memoryStore.get(key) || null;
};

const getAge = (entry) => {
  if (!entry?.timestamp) return null;
  return Date.now() - entry.timestamp;
};

const isValid = (entry) => {
  if (!entry) return false;
  if (!entry.maxAge) return true;
  const age = getAge(entry);
  if (age == null) return false;
  return age <= entry.maxAge;
};

const SmartCache = {
  set(key, value, maxAge = null) {
    const entry = {
      value,
      maxAge,
      timestamp: Date.now()
    };
    memoryStore.set(key, entry);
    saveToStorage();
  },

  get(key, { allowStale = false } = {}) {
    const entry = getEntry(key);
    if (!entry) return null;
    if (!allowStale && !isValid(entry)) return null;
    return entry.value;
  },

  getStatus(key) {
    const entry = getEntry(key);
    return {
      valid: isValid(entry),
      age: getAge(entry),
      maxAge: entry?.maxAge ?? null
    };
  },

  getCacheStatus(keys = DEFAULT_KEYS) {
    const status = {};
    keys.forEach((key) => {
      status[key] = SmartCache.getStatus(key);
    });
    return status;
  },

  clearCache() {
    memoryStore.clear();
    if (isBrowser) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
    }
  }
};

export default SmartCache;
