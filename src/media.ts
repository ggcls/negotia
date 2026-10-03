import { isToken, parseParameter, parseParameters } from "./parameters";
import { splitParameters } from "./parse";
import type { MediaPreference } from "./types";

export type MediaType = Pick<MediaPreference, "type" | "subtype" | "parameters">;

const parseMediaName = (value: string): { type: string; subtype: string } | undefined => {
  const slash = value.indexOf("/");
  if (slash < 1) {
    return undefined;
  }

  const type = value.slice(0, slash);
  const subtype = value.slice(slash + 1);
  if (!isToken(type) || !isToken(subtype)) {
    return undefined;
  }

  return { type: type.toLowerCase(), subtype: subtype.toLowerCase() };
};

export const parseMediaRange = (member: string): MediaPreference | undefined => {
  const parts = splitParameters(member);
  if (parts === undefined) {
    return undefined;
  }

  const media = parseMediaName(parts[0]!);
  if (media === undefined || (media.type === "*" && media.subtype !== "*")) {
    return undefined;
  }

  const parsed = parseParameters(parts.slice(1));
  if (parsed === undefined) {
    return undefined;
  }

  return { ...media, ...parsed };
};

export const parseAvailableMediaType = (value: string): MediaType | undefined => {
  const parts = splitParameters(value);
  if (parts === undefined) {
    return undefined;
  }

  const media = parseMediaName(parts[0]!);
  if (media === undefined || media.type === "*" || media.subtype === "*") {
    return undefined;
  }

  const parameters: Record<string, string> = {};
  for (let index = 1; index < parts.length; index++) {
    const part = parts[index]!;
    if (part === "") {
      continue;
    }
    const parameter = parseParameter(part);
    // RFC 9110 reserves q for negotiation weights, not media-type parameters.
    if (parameter === undefined || parameter.name === "q") {
      return undefined;
    }
    Object.defineProperty(parameters, parameter.name, {
      value: parameter.value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return { ...media, parameters };
};
