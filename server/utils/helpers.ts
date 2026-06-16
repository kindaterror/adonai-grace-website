/**
 * Shared Helper Functions
 * 
 * Utility functions for grade normalization, subject handling, etc.
 */

// ---------------------------------------------------------------------
// GRADE NORMALIZATION
// ---------------------------------------------------------------------

/**
 * Convert various grade representations to canonical form:
 * - "Kinder", "kindergarten", "K" -> "K"
 * - "Grade 1", "grade 1", "1" -> "1"
 * - "6" -> "6"
 */
export const toCanonicalGrade = (g: string): string => {
  const v = String(g || "").trim();
  if (!v) return v;
  // Kinder / Kindergarten → "K"
  if (/^k(in(der(garten)?)?)?$/i.test(v) || /^kinder$/i.test(v)) return "K";
  // "Grade 1" → "1", "grade 6" → "6"
  const m = v.match(/\d+/);
  if (m) return m[0];
  // Already canonical? allow "K" or plain "1".."12"
  if (/^(K|[0-9]{1,2})$/i.test(v)) return v.toUpperCase();
  return v;
};

/**
 * Convert canonical grade to display label:
 * - "K" -> "Kinder"
 * - "1" -> "Grade 1"
 */
export const toLabelGrade = (canon: string): string => {
  if (!canon) return canon;
  if (canon.toUpperCase() === "K") return "Kinder";
  if (/^[0-9]{1,2}$/.test(canon)) return `Grade ${canon}`;
  // If someone previously stored "Grade 3", pass it through for backward compatibility
  if (/^grade\s*\d+$/i.test(canon)) return canon.replace(/^grade\s*/i, (m) => m[0].toUpperCase() + m.slice(1));
  return canon;
};

// ---------------------------------------------------------------------
// SUBJECT NORMALIZATION
// ---------------------------------------------------------------------

/**
 * Check if a subject is a storybook
 */
export const isStorybookSubject = (s?: string): boolean => {
  return !!s && /^storybook(s)?$/i.test(s.trim());
};

/**
 * Convert subject to kebab-case for comparison
 * e.g., "Science" -> "science", "Filipino" -> "filipino"
 */
export const normSubject = (s?: string): string => {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

/**
 * Normalize subjects array - convert "storybooks" to "Storybook"
 */
export const normalizeSubjects = (arr: unknown): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0)
    .map((s) => (/^storybooks?$/i.test(s) ? "Storybook" : s));
};

// ---------------------------------------------------------------------
// GENERAL UTILITIES
// ---------------------------------------------------------------------

/**
 * Check if password is strong
 */
export const isStrongPassword = (password: string): boolean => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return strongRegex.test(password);
};

/**
 * Unique array helper
 */
export const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

/**
 * Parse numeric ID from URL parameter
 */
const NUM_ID_REGEX = /^\d{1,10}$/;
export const parseNumericId = (raw: string | undefined): number | null => {
  if (!raw || !NUM_ID_REGEX.test(raw)) return null;
  const num = parseInt(raw, 10);
  return Number.isFinite(num) ? num : null;
};

/**
 * Escape LIKE special characters
 */
export const escapeLike = (input: string): string => {
  return input.replace(/[\\%_]/g, ch => `\\${ch}`);
};
