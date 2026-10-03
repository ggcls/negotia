import { isToken, parseParameters } from "./parameters";
import { splitHeaderList, splitParameters } from "./parse";
import type { MediaPreference } from "./types";

const parseMediaRange = (member: string): MediaPreference | undefined => {
  const parts = splitParameters(member);
  if (parts === undefined) {
    return undefined;
  }

  const range = parts[0]!;
  const slash = range.indexOf("/");
  if (slash < 1) {
    return undefined;
  }

  const type = range.slice(0, slash);
  const subtype = range.slice(slash + 1);
  if (!isToken(type) || !isToken(subtype) || (type === "*" && subtype !== "*")) {
    return undefined;
  }

  const parsed = parseParameters(parts.slice(1));
  if (parsed === undefined) {
    return undefined;
  }

  return { type: type.toLowerCase(), subtype: subtype.toLowerCase(), ...parsed };
};

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
