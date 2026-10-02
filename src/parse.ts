import { sliceOWS } from "./whitespace";

const recoverListTail = (value: string, parts: string[], commas: readonly number[]): number => {
  let start = commas[0]! + 1;
  for (let index = 1; index < commas.length; index++) {
    const comma = commas[index]!;
    const part = sliceOWS(value, start, comma);
    if (part !== "") {
      parts.push(part);
    }
    start = comma + 1;
  }
  return start;
};

const splitOutsideQuotes = (value: string, separator: "," | ";"): string[] | undefined => {
  const parts: string[] = [];
  let start = 0;
  let quoted = false;
  let quotedCommas: number[] | undefined;

  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (quoted && character === "\\") {
      index++;
    } else if (character === '"') {
      if (quoted && separator === ",") {
        let next = index + 1;
        while (value[next] === " " || value[next] === "\t") {
          next++;
        }
        const suffix = value[next];
        if (
          suffix !== undefined &&
          suffix !== ";" &&
          suffix !== "," &&
          quotedCommas !== undefined
        ) {
          // An invalid closing quote can be a later member's opening quote.
          // Recover at recorded commas without moving the scanner backwards.
          start = recoverListTail(value, parts, quotedCommas);
          quotedCommas = undefined;
          continue;
        }
      }
      quoted = !quoted;
      quotedCommas = undefined;
    } else if (character === separator) {
      if (quoted) {
        if (separator === ",") {
          (quotedCommas ??= []).push(index);
        }
      } else {
        const part = sliceOWS(value, start, index);
        if (part !== "" || separator === ";") {
          parts.push(part);
        }
        start = index + 1;
      }
    }
  }

  if (quoted) {
    if (separator === ";") {
      return undefined;
    }

    // No closing quote exists: discard that member and recover at its commas.
    // Recorded boundaries avoid rescanning an unterminated tail repeatedly.
    if (quotedCommas === undefined) {
      return parts;
    }
    start = recoverListTail(value, parts, quotedCommas);
  }

  const part = sliceOWS(value, start, value.length);
  if (part !== "" || separator === ";") {
    parts.push(part);
  }
  return parts;
};

/**
 * Splits an HTTP list at commas outside quoted strings.
 *
 * Empty members and surrounding OWS are removed. For an unclosed quoted string,
 * the malformed fragment is discarded and following comma-delimited fragments
 * are retained for member validation.
 *
 * @param value A header field value, or null/undefined for a missing field.
 * @returns Members in source order; missing and empty fields return an empty list.
 * @example
 * ```ts
 * splitHeaderList('item;foo="a,b", other'); // ['item;foo="a,b"', "other"]
 * ```
 */
export const splitHeaderList = (value: string | null | undefined): string[] => {
  if (value === null || value === undefined) {
    return [];
  }
  return splitOutsideQuotes(value, ",")!;
};

/**
 * Splits a member at semicolons outside quoted strings.
 *
 * The leading value and empty parameter segments are preserved. Surrounding
 * OWS is removed from each segment. An unclosed quoted string invalidates
 * this member only.
 *
 * @param member One HTTP list member.
 * @returns The segments, or undefined when quoting is unterminated.
 * @example
 * ```ts
 * splitParameters('item;foo="a;b";q=0.8'); // ["item", 'foo="a;b"', "q=0.8"]
 * ```
 */
export const splitParameters = (member: string): string[] | undefined =>
  splitOutsideQuotes(member, ";");
