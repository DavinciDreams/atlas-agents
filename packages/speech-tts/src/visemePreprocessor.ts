import type { VisemeData, VisemeName } from '@atlas.agents/types';

// ============================================================================
// Phoneme-to-Viseme Mapping
// ============================================================================

const PHONEME_TO_VISEME: Record<string, VisemeName> = {
  // Bilabial (PP) - lips together
  p: 'PP',
  b: 'PP',
  m: 'PP',

  // Labiodental (FF) - teeth on lip
  f: 'FF',
  v: 'FF',

  // Dental (TH) - tongue between teeth
  th: 'TH',

  // Alveolar stops (DD) - tongue on ridge
  t: 'DD',
  d: 'DD',

  // Velar (kk) - back of tongue
  k: 'kk',
  g: 'kk',

  // Postalveolar (CH) - tongue raised
  ch: 'CH',
  j: 'CH',
  sh: 'CH',
  zh: 'CH',

  // Sibilants (SS) - hissing
  s: 'SS',
  z: 'SS',

  // Nasals (nn)
  n: 'nn',
  ng: 'nn',

  // Approximants (RR)
  r: 'RR',
  l: 'RR',
  w: 'ou',
  y: 'ih',

  // Vowels
  a: 'aa',
  e: 'E',
  i: 'ih',
  o: 'oh',
  u: 'ou',

  // Additional
  h: 'sil',
  x: 'kk',
  q: 'kk',
  c: 'kk',
};

// ============================================================================
// Vowel Combinations
// ============================================================================

const VOWEL_COMBINATIONS: Record<string, VisemeName> = {
  ee: 'ih',
  ea: 'ih',
  oo: 'ou',
  ou: 'ou',
  ow: 'ou',
  ai: 'E',
  ay: 'E',
  ei: 'E',
  ey: 'E',
  oa: 'oh',
  oe: 'oh',
  ie: 'ih',
  oi: 'oh',
  oy: 'oh',
  au: 'aa',
  aw: 'aa',
};

// ============================================================================
// Simple viseme cache (Map-based, no external dependencies)
// ============================================================================

const visemeCache = new Map<string, VisemeData[]>();
const VISEME_CACHE_MAX_SIZE = 200;

function getCachedVisemes(key: string): VisemeData[] | undefined {
  return visemeCache.get(key);
}

function setCachedVisemes(key: string, visemes: VisemeData[]): void {
  if (visemeCache.size >= VISEME_CACHE_MAX_SIZE) {
    const oldest = visemeCache.keys().next().value;
    if (oldest) visemeCache.delete(oldest);
  }
  visemeCache.set(key, visemes);
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the viseme for a single character or digraph.
 */
function getVisemeForChar(
  char: string,
  nextChar?: string
): { viseme: VisemeName; consumed: number } {
  const lower = char.toLowerCase();
  const lowerNext = nextChar?.toLowerCase();

  // Check for digraphs first
  if (lowerNext) {
    const digraph = lower + lowerNext;

    // Vowel combinations
    if (VOWEL_COMBINATIONS[digraph]) {
      return { viseme: VOWEL_COMBINATIONS[digraph], consumed: 2 };
    }

    // Consonant digraphs
    if (PHONEME_TO_VISEME[digraph]) {
      return { viseme: PHONEME_TO_VISEME[digraph], consumed: 2 };
    }
  }

  // Single character lookup
  if (PHONEME_TO_VISEME[lower]) {
    return { viseme: PHONEME_TO_VISEME[lower], consumed: 1 };
  }

  // Space or punctuation -> silence
  if (/\s/.test(char)) {
    return { viseme: 'sil', consumed: 1 };
  }

  // Unknown character -> silence
  return { viseme: 'sil', consumed: 1 };
}

/**
 * Convert text to an array of viseme data with timing information.
 * @param text The text to convert
 * @param duration Optional total duration in seconds (defaults to text.length * 0.08)
 */
export function textToVisemes(text: string, duration?: number): VisemeData[] {
  if (!text || text.trim().length === 0) return [];

  // Check cache
  const cacheKey = `${text}:${duration ?? 'auto'}`;
  const cached = getCachedVisemes(cacheKey);
  if (cached) return cached;

  const totalDuration = duration ?? text.length * 0.08;
  const visemes: VisemeData[] = [];
  let i = 0;
  const chars: { viseme: VisemeName }[] = [];

  // First pass: convert text to viseme sequence
  while (i < text.length) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : undefined;
    const result = getVisemeForChar(char, nextChar);
    chars.push({ viseme: result.viseme });
    i += result.consumed;
  }

  // Second pass: assign timing and weights
  const timePerViseme = chars.length > 0 ? totalDuration / chars.length : 0;
  let prevViseme: VisemeName = 'sil';

  for (let idx = 0; idx < chars.length; idx++) {
    const { viseme } = chars[idx];

    // Calculate weight based on viseme type
    let weight = 0.7;
    if (viseme === 'sil') {
      weight = 0.0;
    } else if (viseme === 'aa' || viseme === 'oh' || viseme === 'ou') {
      weight = 1.0; // Open vowels get full weight
    } else if (viseme === 'E' || viseme === 'ih') {
      weight = 0.8; // Closed vowels
    } else if (viseme === 'PP' || viseme === 'FF') {
      weight = 0.6; // Bilabials/labiodentals
    }

    // Reduce weight for repeated visemes
    if (viseme === prevViseme && viseme !== 'sil') {
      weight *= 0.7;
    }

    visemes.push({
      name: viseme,
      weight,
      duration: timePerViseme,
    });

    prevViseme = viseme;
  }

  // Add silence at start and end
  if (visemes.length > 0 && visemes[0].name !== 'sil') {
    visemes.unshift({ name: 'sil', weight: 0, duration: 0.05 });
  }
  if (visemes.length > 0 && visemes[visemes.length - 1].name !== 'sil') {
    visemes.push({ name: 'sil', weight: 0, duration: 0.1 });
  }

  // Cache the result
  setCachedVisemes(cacheKey, visemes);

  return visemes;
}

/**
 * Get the current viseme from a viseme sequence given the elapsed time.
 * @param visemes The viseme sequence
 * @param currentTime Elapsed time in seconds
 */
export function getCurrentViseme(
  visemes: VisemeData[],
  currentTime: number
): VisemeData | null {
  if (!visemes || visemes.length === 0) return null;

  let elapsed = 0;
  for (const viseme of visemes) {
    const visemeDuration = viseme.duration ?? 0.08;
    if (currentTime >= elapsed && currentTime < elapsed + visemeDuration) {
      return viseme;
    }
    elapsed += visemeDuration;
  }

  // Past the end - return silence
  return { name: 'sil', weight: 0, duration: 0.1 };
}

/**
 * Interpolate between two viseme states for smooth transitions.
 * @param current The current viseme data
 * @param target The target viseme data
 * @param progress Interpolation progress from 0 to 1
 */
export function interpolateVisemes(
  current: VisemeData,
  target: VisemeData,
  progress: number
): VisemeData {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // If same viseme, just interpolate weight
  if (current.name === target.name) {
    return {
      name: current.name,
      weight: current.weight + (target.weight - current.weight) * clampedProgress,
      duration: target.duration,
    };
  }

  // Cross-fade: if past halfway, use target viseme name
  if (clampedProgress > 0.5) {
    return {
      name: target.name,
      weight: target.weight * (clampedProgress - 0.5) * 2,
      duration: target.duration,
    };
  }

  // Before halfway, keep current viseme but reduce weight
  return {
    name: current.name,
    weight: current.weight * (1 - clampedProgress * 2),
    duration: current.duration,
  };
}

// ============================================================================
// VRM Blend Shape Mapping
// ============================================================================

/**
 * Mapping from viseme names to VRM blend shape proxy names.
 */
export const VRM_VISEME_MAPPING: Record<VisemeName, string> = {
  sil: 'viseme_sil',
  PP: 'viseme_PP',
  FF: 'viseme_FF',
  TH: 'viseme_TH',
  DD: 'viseme_DD',
  kk: 'viseme_kk',
  CH: 'viseme_CH',
  SS: 'viseme_SS',
  nn: 'viseme_nn',
  RR: 'viseme_RR',
  aa: 'viseme_aa',
  E: 'viseme_E',
  ih: 'viseme_ih',
  oh: 'viseme_oh',
  ou: 'viseme_ou',
};

/**
 * Get VRM blend shape values for a given viseme.
 * Returns a record of blend shape names to weights (0-1).
 */
export function getVRMBlendShapes(
  viseme: VisemeData
): Record<string, number> {
  const shapes: Record<string, number> = {};

  // Reset all viseme blend shapes to 0
  for (const blendShapeName of Object.values(VRM_VISEME_MAPPING)) {
    shapes[blendShapeName] = 0;
  }

  // Set the active viseme
  const blendShapeName = VRM_VISEME_MAPPING[viseme.name];
  if (blendShapeName) {
    shapes[blendShapeName] = viseme.weight;
  }

  return shapes;
}
