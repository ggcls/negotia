import { parseQuality } from "./quality";
import { unquote } from "./quoted-string";
import { trimOWS } from "./whitespace";

const NON_TOKEN = /[^!#$%&'*+\-.^_`|~0-9A-Za-z]/;

/** Checks the RFC 9110 token syntax, including its non-empty requirement. */
export const isToken = (value: string): boolean => value !== "" && !NON_TOKEN.test(value);

/**
 * Parses an HTTP parameter name and value.
 *
 * Names are lowercased; value casing is preserved. Quoted strings are decoded.
 * Whitespace around the equals sign is invalid.
 *
 * @param input One name=value segment, with optional surrounding OWS.
 * @returns The pair and whether its value was quoted, or undefined when invalid.
 * @example
 * ```ts
 * parseParameter('FOO="Bar"'); // { name: "foo", value: "Bar", quoted: true }
 * ```
 */
export const parseParameter = (
  input: string,
): { name: string; value: string; quoted: boolean } | undefined => {
  const parameter = trimOWS(input);
  const equals = parameter.indexOf("=");
  if (equals < 1) {
    return undefined;
  }
  const name = parameter.slice(0, equals);
  const rawValue = parameter.slice(equals + 1);
  if (!isToken(name)) {
    return undefined;
  }
  const quoted = rawValue.startsWith('"');
  const value = quoted ? unquote(rawValue) : rawValue;
  if (value === undefined || (!quoted && !isToken(value))) {
    return undefined;
  }
  return { name: name.toLowerCase(), value, quoted };
};

/**
 * Parses a member's parameters and separates its quality value.
 *
 * An absent q defaults to 1. Quoted qvalues, duplicate q names (including Q),
 * and malformed parameters invalidate the member. Empty segments are ignored.
 *
 * @param parts Parameter segments excluding the member's leading value.
 * @returns Parameters excluding q and their quality, or undefined when invalid.
 * @example
 * ```ts
 * parseParameters(["foo=bar", "Q=0.8"]); // { parameters: { foo: "bar" }, quality: 0.8 }
 * ```
 */
export const parseParameters = (
  parts: readonly string[],
): { parameters: Record<string, string>; quality: number } | undefined => {
  const parameters: Record<string, string> = {};
  let quality = 1;
  let hasQuality = false;

  for (const part of parts) {
    // RFC 9110 permits empty parameter segments between semicolons.
    if (trimOWS(part) === "") {
      continue;
    }
    const parameter = parseParameter(part);
    if (parameter === undefined) {
      return undefined;
    }
    if (parameter.name === "q") {
      if (hasQuality || parameter.quoted) {
        return undefined;
      }
      const parsedQuality = parseQuality(parameter.value);
      if (parsedQuality === undefined) {
        return undefined;
      }
      quality = parsedQuality;
      hasQuality = true;
    } else {
      // Names such as __proto__ must remain ordinary own properties.
      Object.defineProperty(parameters, parameter.name, {
        value: parameter.value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  return { parameters, quality };
};
