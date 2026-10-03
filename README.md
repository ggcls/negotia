<h1 align="center">
  negotia
</h1>

🤝 Small HTTP content negotiation primitives for modern JavaScript runtimes.

The package focuses on `Accept`, `Accept-Language`, and `Accept-Encoding`.
Currently, `Accept` parsing and media negotiation are implemented.

## Get started

```sh
pnpm add @ggcls/negotia
```

## Usage

```ts
import { parseAccept } from "@ggcls/negotia";

parseAccept("text/html, application/json;q=0.8");
// [
//   { type: "text", subtype: "html", parameters: {}, quality: 1 },
//   { type: "application", subtype: "json", parameters: {}, quality: 0.8 },
// ]
```

Missing or empty headers return `[]`. Invalid members are ignored. Valid member
order and duplicates are preserved without sorting by preference. Media types and
parameter names are lowercased; parameter values retain their casing and quoted
strings are decoded. `q` is parsed as quality wherever it appears and is excluded
from `parameters`.

```ts
import { negotiate } from "@ggcls/negotia";

negotiate("text/html, application/json;q=0.8", ["application/json", "text/html"]);
// "text/html"

negotiate("*/*;q=1, application/json;q=0", ["application/json", "text/html"]);
// "text/html"
```

`negotiate` returns the original available string. A missing header selects the
first valid available media type; an empty or unusable header returns `undefined`.
Invalid available entries are ignored, including wildcards and `q` parameters.

The most specific matching range determines each candidate's quality: exact
type/subtype, then `type/*`, then `*/*`, with more matching parameters taking
precedence within each level. Every required parameter must be present and its
value must match exactly, including `charset`. Equal-precedence matching ranges
use the first valid header occurrence, including duplicate ranges.

Candidates with effective `q=0` are excluded. The remaining candidates are compared
by quality, specificity, matched parameter count, header order, and finally
available order. The caller's array is never mutated.

## License

[MIT](./LICENSE)
