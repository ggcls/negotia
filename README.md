<h1 align="center">
  negotia
</h1>

🤝 Small HTTP content negotiation primitives for modern JavaScript runtimes.

The package focuses on `Accept`, `Accept-Language`, and `Accept-Encoding`.
Currently, only `Accept` parsing is implemented.

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

## License

[MIT](./LICENSE)
