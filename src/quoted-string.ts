/**
 * Decodes one complete HTTP quoted string.
 *
 * Quoted pairs contribute the character following the backslash literally.
 * Control characters other than HTAB and characters outside the HTTP octet
 * range are rejected, including when escaped.
 *
 * @param value A string including its opening and closing double quotes.
 * @returns The unquoted text, or undefined for invalid quoting or characters.
 * @example
 * ```ts
 * unquote(String.raw`"a\"b"`); // 'a"b'
 * ```
 */
export const unquote = (value: string): string | undefined => {
  if (value[0] !== '"') {
    return undefined;
  }

  let result = "";
  let start = 1;
  for (let index = 1; index < value.length; index++) {
    let code = value.charCodeAt(index);
    if (code === 34) {
      return index === value.length - 1 ? result + value.slice(start, index) : undefined;
    }
    if (code === 92) {
      result += value.slice(start, index);
      index++;
      if (index === value.length) {
        return undefined;
      }
      code = value.charCodeAt(index);
      start = index;
    }
    if (code !== 9 && (code < 32 || code === 127 || code > 255)) {
      return undefined;
    }
  }
  return undefined;
};
