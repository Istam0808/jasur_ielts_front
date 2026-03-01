/**
 * Utility functions for practice components
 */

/**
 * Normalize question type to standard format
 */
export const normalizeType = (type) => {
    const tStr = (type || "").toString().toLowerCase();
    if (["multiple-gap-filling", "multiple_gap_filling"].includes(tStr)) return "multiple_gap_filling";
    if (["multiple choice", "multiple-choice", "multiple_choice"].includes(tStr)) return "multiple_choice";
    if (["short answer", "short-answer", "short_answer"].includes(tStr)) return "short_answer";
    return tStr || "short_answer";
};

/**
 * Ordered question types for consistent display
 */
export const orderedTypes = ["multiple_choice", "short_answer", "multiple_gap_filling"];

/**
 * Deterministic seeded shuffle to avoid reordering on each render.
 * Uses a simple mulberry32 PRNG seeded from dataset id.
 */
export const seededShuffle = (arr = [], seedStr = "") => {
    const out = Array.from(arr);
    // simple hash to number
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    // mulberry32
    let t = h;
    const rand = () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
};

/**
 * Lazy cached loader for answer checker utilities.
 * Avoids throwing on SSR / test environments where module might not resolve.
 */
let _answerChecker = null;
export const getAnswerChecker = () => {
    if (_answerChecker) return _answerChecker;
    try {
        _answerChecker = require("@/utils/answerChecker");
    } catch {
        _answerChecker = {
            checkAnswer: () => false,
            getCorrectAnswerText: () => "",
            checkAnswerVariants: () => false,
        };
    }
    return _answerChecker;
};

/**
 * Check if user is authenticated
 */
export const checkAuthentication = () => {
    try {
        if (typeof window === "undefined") return false;
        const raw = localStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;
        return !!(user && (user.token || user.accessToken || user.idToken));
    } catch {
        return false;
    }
};

/**
 * Validate practice progress data structure
 */
export const validatePracticeProgress = (data) => {
    if (!data || typeof data !== "object") {
        console.warn("[PracticeValidation] Data invalid; replacing with defaults");
        return false;
    }
    try {
        // Ensure required fields exist (mutate if necessary)
        if (!data.hasOwnProperty("currentType")) data.currentType = "multiple_choice";
        if (!data.hasOwnProperty("answersById")) data.answersById = {};
        if (!data.hasOwnProperty("revealedById")) data.revealedById = {};
        if (!data.hasOwnProperty("correctById")) data.correctById = {};
        if (!data.hasOwnProperty("bestByType")) data.bestByType = {};
        if (!data.hasOwnProperty("updatedAt")) data.updatedAt = new Date().toISOString();

        if (typeof data.currentType !== "string" || !data.currentType) data.currentType = "multiple_choice";

        const objectFields = ["answersById", "revealedById", "correctById", "bestByType"];
        for (const f of objectFields) {
            if (typeof data[f] !== "object" || data[f] === null || Array.isArray(data[f])) {
                data[f] = {};
            }
        }
        if (data.updatedAt && typeof data.updatedAt !== "string") data.updatedAt = new Date().toISOString();

        return true;
    } catch (err) {
        console.error("[PracticeValidation] Unexpected error:", err);
        return false;
    }
};

/**
 * Default practice progress structure
 */
export const getDefaultPracticeProgress = () => ({
    currentType: "multiple_choice",
    answersById: {},
    revealedById: {},
    correctById: {},
    bestByType: {},
    types: {},
    updatedAt: new Date().toISOString(),
});
