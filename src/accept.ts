import { parseAvailableMediaType, parseMediaRange } from "./media";
import { selectMediaType, type MediaCandidate } from "./media-selection";
import { splitHeaderList } from "./parse";
import type { MediaPreference } from "./types";

/**
 * Parses an Accept header into media ranges, parameters, and quality values.
 *
 * Missing (`null` or `undefined`) and empty headers produce an empty array.
 * Invalid members are ignored while valid siblings are retained. Valid member
 * order and duplicates are preserved; results are not sorted by preference.
 * Type, subtype, and parameter names are lowercased. Parameter values retain
 * their casing, with quoted strings decoded. The `q` parameter is excluded
 * from media parameters regardless of its position.
 *
 * @returns The valid media preferences in their original header order.
 */
export const parseAccept = (value: string | null | undefined): MediaPreference[] => {
  const preferences: MediaPreference[] = [];
  for (const member of splitHeaderList(value)) {
    const preference = parseMediaRange(member);
    if (preference !== undefined) {
      preferences.push(preference);
    }
  }
  return preferences;
};

/**
 * Selects an available representation using an Accept header.
 *
 * Returns the original string from `available`. A missing header (`null` or
 * `undefined`) selects the first valid available media type. Invalid header
 * members and invalid available entries are ignored; available wildcards and
 * `q` parameters are invalid. A present header without an acceptable match
 * returns `undefined`.
 *
 * The most specific matching range supplies each representation's quality;
 * `q=0` makes that representation unacceptable. Parameter values match exactly.
 * Equal-precedence matching ranges use header order. Candidates are ranked by
 * quality, specificity, parameter count, header order, then available order.
 * The caller's available array is never mutated.
 *
 * @returns The selected original available value, or `undefined`.
 */
export const negotiate = (
  value: string | null | undefined,
  available: readonly string[],
): string | undefined => {
  const missing = value === null || value === undefined;
  const candidates: MediaCandidate[] = [];
  for (const original of available) {
    const media = parseAvailableMediaType(original);
    if (media === undefined) {
      continue;
    }
    if (missing) {
      return original;
    }

    candidates.push({ original, media });
  }
  return selectMediaType(parseAccept(value), candidates);
};
