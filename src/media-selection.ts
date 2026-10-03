import type { MediaType } from "./media";
import type { MediaPreference } from "./types";

export interface MediaCandidate {
  original: string;
  media: MediaType;
}

interface RankedPreference {
  media: MediaPreference;
  specificity: number;
  parameters: [string, string][];
  order: number;
}

const matches = (preference: RankedPreference, candidate: MediaType): boolean => {
  const { type, subtype } = preference.media;
  if (type !== "*" && type !== candidate.type) {
    return false;
  }
  if (subtype !== "*" && subtype !== candidate.subtype) {
    return false;
  }
  for (const [name, value] of preference.parameters) {
    if (!Object.hasOwn(candidate.parameters, name) || candidate.parameters[name] !== value) {
      return false;
    }
  }
  return true;
};

const comparePrecedence = (left: RankedPreference, right: RankedPreference): number =>
  left.specificity - right.specificity || left.parameters.length - right.parameters.length;

const compareCandidates = (left: RankedPreference, right: RankedPreference): number =>
  left.media.quality - right.media.quality ||
  comparePrecedence(left, right) ||
  right.order - left.order;

/** Selects from parsed inputs using media precedence and client preference. */
export const selectMediaType = (
  preferences: readonly MediaPreference[],
  candidates: readonly MediaCandidate[],
): string | undefined => {
  const ranked: RankedPreference[] = preferences.map((media, order) => ({
    media,
    specificity: media.type === "*" ? 0 : media.subtype === "*" ? 1 : 2,
    parameters: Object.entries(media.parameters),
    order,
  }));

  let selected: string | undefined;
  let best: RankedPreference | undefined;
  for (const candidate of candidates) {
    let applicable: RankedPreference | undefined;
    for (const preference of ranked) {
      // Precedence chooses the effective range before quality ranks candidates.
      // Keeping an equal-precedence range preserves the earlier header member.
      if (
        matches(preference, candidate.media) &&
        (applicable === undefined || comparePrecedence(preference, applicable) > 0)
      ) {
        applicable = preference;
      }
    }
    if (applicable === undefined || applicable.media.quality === 0) {
      continue;
    }
    if (best === undefined || compareCandidates(applicable, best) > 0) {
      selected = candidate.original;
      best = applicable;
    }
  }
  return selected;
};
