/**
 * Extracts a substring without surrounding HTTP optional whitespace.
 *
 * Trims the bounds before slicing so callers do not need an intermediate string.
 *
 * @param value The source text.
 * @param start Inclusive start of the substring.
 * @param end Exclusive end of the substring.
 * @returns The substring without surrounding spaces or horizontal tabs.
 * @example
 * ```ts
 * sliceOWS("x  value  y", 1, 10); // "value"
 * ```
 */
export const sliceOWS = (value: string, start: number, end: number): string => {
  while (start < end && (value[start] === " " || value[start] === "\t")) {
    start++;
  }
  while (end > start && (value[end - 1] === " " || value[end - 1] === "\t")) {
    end--;
  }
  return value.slice(start, end);
};

/**
 * Removes surrounding HTTP optional whitespace.
 *
 * Only spaces and horizontal tabs are removed. Other whitespace is preserved.
 *
 * @param value Text with optional surrounding OWS.
 * @returns The text between the first and last non-OWS characters.
 * @example
 * ```ts
 * trimOWS(" \tvalue\t "); // "value"
 * ```
 */
export const trimOWS = (value: string): string => sliceOWS(value, 0, value.length);
