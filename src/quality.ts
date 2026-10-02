/**
 * Parses an HTTP quality value without coercing or repairing invalid input.
 *
 * Accepts 0 through 1 with at most three fractional digits. Fractions of 1
 * must contain only zeros. An absent value defaults to 1.
 *
 * @param value An unquoted qvalue, without surrounding whitespace.
 * @returns The quality, or undefined when the entire value is invalid.
 * @example
 * ```ts
 * parseQuality("0.8"); // 0.8
 * parseQuality("0.8foo"); // undefined
 * ```
 */
export const parseQuality = (value?: string): number | undefined => {
  if (value === undefined) {
    return 1;
  }

  const length = value.length;
  if (length === 0 || length > 5) {
    return undefined;
  }

  const integer = value.charCodeAt(0) - 48;
  if (integer !== 0 && integer !== 1) {
    return undefined;
  }
  if (length === 1) {
    return integer;
  }
  if (value.charCodeAt(1) !== 46) {
    return undefined;
  }

  let fraction = 0;
  let divisor = 1;
  for (let index = 2; index < length; index++) {
    const digit = value.charCodeAt(index) - 48;
    if (digit < 0 || digit > 9 || (integer === 1 && digit !== 0)) {
      return undefined;
    }
    fraction = fraction * 10 + digit;
    divisor *= 10;
  }

  return integer + fraction / divisor;
};
