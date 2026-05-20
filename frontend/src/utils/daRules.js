/**
 * DA (Daily Allowance) Rules — designation-based
 *
 * Software Developer, Project Analyst  →  ₹800/day
 * Manager                              →  ₹900/day
 * DG and all others                    →  ₹1000/day
 */

const DA_RATES = {
  800: [
    'project analyst',
    'software developer',
    'junior software developer',
    'senior software developer',
    'ui/ux designer',
    'data analyst',
    'software developer',
    'junior developer',
    'senior developer'
  ],
  900: ['project manager'],
  1000: ['dg', 'sdg', 'director general', 'director'],
};

const normalize = (v) => (v || '').toLowerCase().trim();

const DESIGNATION_TO_RATE = (() => {
  const map = new Map();
  for (const [rate, list] of Object.entries(DA_RATES)) {
    for (const item of list) map.set(normalize(item), parseInt(rate, 10));
  }
  return map;
})();

/**
 * Returns the DA amount for a given designation string
 * based on BISAG-N designations.
 */
export const getDAForDesignation = (designation) => {
  const d = normalize(designation);
  if (!d) return 1000;

  // Exact match first
  if (DESIGNATION_TO_RATE.has(d)) return DESIGNATION_TO_RATE.get(d);

  // Fallback: contains checks for UI/UX spacing variations etc.
  for (const [rate, list] of Object.entries(DA_RATES)) {
    if (list.some((item) => d.includes(normalize(item)))) return parseInt(rate, 10);
  }

  return 1000;
};

export const DA_LABEL = {
  800: '₹800 (Project Analyst / Software Dev / UI/UX / Data Analyst)',
  900: '₹900 (Project Manager)',
  1000: '₹1000 (DG / SDG / Other)',
};

