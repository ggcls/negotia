/** A valid media range and its quality value parsed from an Accept field. */
export interface MediaPreference {
  /** Media type normalized to lowercase; `*` denotes the wildcard type. */
  type: string;

  /** Media subtype normalized to lowercase; `*` denotes the wildcard subtype. */
  subtype: string;

  /** Media-range parameters excluding `q`, with lowercase names and unchanged values. */
  parameters: Readonly<Record<string, string>>;

  /** HTTP quality value from 0 through 1, defaulting to 1 when `q` is absent. */
  quality: number;
}
