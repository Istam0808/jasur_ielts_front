// In-memory storage that mimics localStorage (will be replaced with DB later)
class ProgressStorage {
    constructor() {
        this.storage = new Map();
    }

    getItem(key) {
        return this.storage.get(key) || null;
    }

    setItem(key, value) {
        this.storage.set(key, value);
    }

    removeItem(key) {
        this.storage.delete(key);
    }

    clear() {
        this.storage.clear();
    }
}

// Global progress storage instance (moved outside component for stability)
export const progressStorage = new ProgressStorage(); 