import { describe, expect, test } from "vitest";
import { negotiate, parseAccept } from "../src/index";

describe("negotiate", () => {
  test.each<{
    name: string;
    header: string | null | undefined;
    available: string[];
    expected: string | undefined;
  }>([
    {
      name: "matches an exact media type",
      header: "text/html",
      available: ["application/json", "text/html"],
      expected: "text/html",
    },
    {
      name: "compares type names case-insensitively",
      header: "TEXT/html",
      available: ["text/html"],
      expected: "text/html",
    },
    {
      name: "compares subtype names case-insensitively",
      header: "text/HTML",
      available: ["text/html"],
      expected: "text/html",
    },
    {
      name: "returns the original available spelling and whitespace",
      header: "text/html;charset=UTF-8",
      available: [' \tText/HTML ; CHARSET="UTF-8"\t '],
      expected: ' \tText/HTML ; CHARSET="UTF-8"\t ',
    },
    {
      name: "matches a type wildcard",
      header: "text/*",
      available: ["application/json", "text/plain"],
      expected: "text/plain",
    },
    {
      name: "matches a global wildcard using server order",
      header: "*/*",
      available: ["application/json", "text/html"],
      expected: "application/json",
    },
    {
      name: "ranks an exact range above a wildcard at equal quality",
      header: "*/*;q=0.8, text/html;q=0.8",
      available: ["application/json", "text/html"],
      expected: "text/html",
    },
    {
      name: "ranks a type wildcard above a global wildcard at equal quality",
      header: "*/*, text/*",
      available: ["application/json", "text/plain"],
      expected: "text/plain",
    },
    {
      name: "ranks quality before specificity between representations",
      header: "text/html;q=0.8, */*;q=0.9",
      available: ["text/html", "application/json"],
      expected: "application/json",
    },
    {
      name: "selects the greatest client quality",
      header: "text/html, application/json;q=0.8",
      available: ["application/json", "text/html"],
      expected: "text/html",
    },
    {
      name: "matches a required media parameter",
      header: "text/plain;format=flowed",
      available: ["text/plain", "text/plain;format=flowed"],
      expected: "text/plain;format=flowed",
    },
    {
      name: "requires every media parameter",
      header: "text/plain;format=flowed;charset=utf-8",
      available: ["text/plain;format=flowed", "text/plain;format=flowed;charset=utf-8"],
      expected: "text/plain;format=flowed;charset=utf-8",
    },
    {
      name: "allows extra available parameters without increasing client specificity",
      header: "text/plain",
      available: ["text/plain;format=flowed", "text/plain"],
      expected: "text/plain;format=flowed",
    },
    {
      name: "rejects a candidate missing a required parameter",
      header: "text/plain;format=flowed",
      available: ["text/plain"],
      expected: undefined,
    },
    {
      name: "compares parameter names case-insensitively",
      header: "text/plain;CHARSET=utf-8",
      available: ["text/plain;Charset=utf-8"],
      expected: "text/plain;Charset=utf-8",
    },
    {
      name: "compares parameter values exactly after decoding",
      header: 'text/plain;format="Flowed"',
      available: ["text/plain;format=flowed", "text/plain;format=Flowed"],
      expected: "text/plain;format=Flowed",
    },
    {
      name: "does not give charset values special matching semantics",
      header: "text/plain;charset=UTF-8",
      available: ["text/plain;charset=utf-8"],
      expected: undefined,
    },
    {
      name: "matches a comma inside quoted parameters",
      header: 'text/plain;profile="a,b"',
      available: ['text/plain;profile="a,b"'],
      expected: 'text/plain;profile="a,b"',
    },
    {
      name: "matches semicolons and quoted-pair escapes literally",
      header: String.raw`text/plain;foo="a\"b;c"`,
      available: [String.raw`Text/Plain;FOO="a\"b;c"`],
      expected: String.raw`Text/Plain;FOO="a\"b;c"`,
    },
    {
      name: "matches an empty quoted parameter value",
      header: 'text/plain;foo=""',
      available: ["text/plain", 'text/plain;foo=""'],
      expected: 'text/plain;foo=""',
    },
    {
      name: "preserves empty parameter segments allowed by RFC 9110",
      header: "text/plain;format=flowed",
      available: ["text/plain;; \t;format=flowed;"],
      expected: "text/plain;; \t;format=flowed;",
    },
    {
      name: "uses the more parameter-specific effective range before quality",
      header: "text/html;level=1;q=0.4, text/html;q=0.8, application/json;q=0.6",
      available: ["text/html;level=1", "application/json"],
      expected: "application/json",
    },
    {
      name: "updates effective precedence when a more parameter-specific range follows",
      header: "text/html;q=0.8, text/html;level=1;q=0.4, application/json;q=0.6",
      available: ["text/html;level=1", "application/json"],
      expected: "application/json",
    },
    {
      name: "ranks matching parameter count before header order",
      header: "application/json;q=0.8, text/plain;format=flowed;q=0.8",
      available: ["application/json", "text/plain;format=flowed"],
      expected: "text/plain;format=flowed",
    },
    {
      name: "ignores a parameter-specific range that does not match",
      header: "text/plain;format=fixed;q=0, text/plain;q=0.8",
      available: ["text/plain;format=flowed"],
      expected: "text/plain;format=flowed",
    },
    {
      name: "requires parameters on type wildcard ranges too",
      header: "text/*;format=flowed",
      available: ["text/html", "text/plain;format=flowed"],
      expected: "text/plain;format=flowed",
    },
    {
      name: "requires parameters on global wildcard ranges too",
      header: "*/*;profile=Foo",
      available: ["text/html", "application/json;profile=Foo"],
      expected: "application/json;profile=Foo",
    },
    {
      name: "uses parameter count for otherwise equal wildcard precedence",
      header: "text/*;q=1, text/*;format=flowed;q=0.2, application/json;q=0.5",
      available: ["text/plain;format=flowed", "application/json"],
      expected: "application/json",
    },
    {
      name: "uses header order before server order at equal quality and specificity",
      header: "text/html;q=0.8, application/json;q=0.8",
      available: ["application/json", "text/html"],
      expected: "text/html",
    },
    {
      name: "keeps the earlier header preference when encountered first by the server",
      header: "text/html;q=0.8, application/json;q=0.8",
      available: ["text/html", "application/json"],
      expected: "text/html",
    },
    {
      name: "uses server order for candidates matching the same type wildcard",
      header: "text/*",
      available: ["text/plain", "text/html"],
      expected: "text/plain",
    },
    {
      name: "uses server order for otherwise equal concrete available entries",
      header: "text/html",
      available: ["Text/HTML", "text/html;level=1"],
      expected: "Text/HTML",
    },
    {
      name: "uses the first valid available entry for an undefined header",
      header: undefined,
      available: ["broken", "application/json", "text/html"],
      expected: "application/json",
    },
    {
      name: "uses the first valid available entry for a null header",
      header: null,
      available: ["text/*", "Text/HTML;Level=Foo", "application/json"],
      expected: "Text/HTML;Level=Foo",
    },
    {
      name: "retains valid header siblings after malformed members",
      header: "broken, text/html;q=2, application/json;q=0.8",
      available: ["text/html", "application/json"],
      expected: "application/json",
    },
    {
      name: "retains valid siblings after malformed quoting",
      header: 'text/html;foo="unterminated, application/json;q=0.8',
      available: ["text/html", "application/json"],
      expected: "application/json",
    },
    {
      name: "uses the first equally specific duplicate regardless of its lower quality",
      header: "text/html;q=0.5, text/html;q=0.8, application/json;q=0.6",
      available: ["text/html", "application/json"],
      expected: "application/json",
    },
    {
      name: "reflects duplicate header order when their qualities are reversed",
      header: "text/html;q=0.8, text/html;q=0.5, application/json;q=0.6",
      available: ["application/json", "text/html"],
      expected: "text/html",
    },
    {
      name: "preserves server order with duplicate available entries",
      header: "text/html",
      available: ["Text/HTML", "Text/HTML", "text/html"],
      expected: "Text/HTML",
    },
    {
      name: "matches prototype-related parameters only when present as own properties",
      header: "text/plain;__proto__=safe;constructor=value",
      available: ["text/plain", "text/plain;__proto__=safe;constructor=value"],
      expected: "text/plain;__proto__=safe;constructor=value",
    },
  ])("$name", ({ header, available, expected }) => {
    expect(negotiate(header, available)).toBe(expected);
  });

  test.each<[string, string[], string | undefined]>([
    ["*/*;q=1, application/json;q=0", ["application/json", "text/html"], "text/html"],
    ["application/json;q=0, */*;q=1", ["application/json", "text/html"], "text/html"],
    ["text/*;q=1, text/html;q=0.5", ["text/html", "text/plain"], "text/plain"],
    ["text/html;q=0.5, text/*;q=1", ["text/html", "text/plain"], "text/plain"],
    ["*/*;q=1, text/*;q=0.4", ["text/html", "application/json"], "application/json"],
    ["text/*;q=0, */*;q=1", ["text/html", "application/json"], "application/json"],
    ["*/*;q=1, text/*;q=0", ["text/html", "text/plain"], undefined],
    ["text/html;q=0", ["text/html"], undefined],
    ["text/html;q=0, application/json;q=0", ["text/html", "application/json"], undefined],
    ["*/*;q=0", ["text/html", "application/json"], undefined],
    ["*/*;q=0, text/html;q=0.5", ["application/json", "text/html"], "text/html"],
    ["text/*;q=0, text/html;q=0.8", ["text/plain", "text/html"], "text/html"],
    [
      "text/html;q=1, text/html;level=1;q=0",
      ["text/html;level=1", "text/html;level=2"],
      "text/html;level=2",
    ],
    ["text/html;level=1;q=0, text/html;q=1", ["text/html;level=1"], undefined],
    [
      "text/html;level=1;q=0.9, text/html;level=1;profile=Foo;q=0, */*",
      ["text/html;level=1;profile=Foo", "application/json"],
      "application/json",
    ],
    ["text/html;q=0, text/html;q=1, */*", ["text/html", "application/json"], "application/json"],
    ["text/html;q=1, text/html;q=0", ["text/html"], "text/html"],
  ])("applies specificity and exclusions in %j", (header, available, expected) => {
    expect(negotiate(header, available)).toBe(expected);
  });

  test.each(["", " \t", ",,,", "broken, also-broken", "text/html;q=2", "text/html;q=.5"])(
    "treats unusable present header %j as having no acceptable range",
    (header) => {
      expect(negotiate(header, ["text/html", "application/json"])).toBeUndefined();
    },
  );

  test.each([undefined, null, "", "text/html", "*/*", "broken"])(
    "returns undefined for no available values with header %j",
    (header) => {
      expect(negotiate(header, [])).toBeUndefined();
      expect(negotiate(header, ["text", "text/*", "*/*"])).toBeUndefined();
    },
  );

  test("returns undefined when no valid candidate matches", () => {
    expect(negotiate("image/png", ["application/json", "text/html"])).toBeUndefined();
  });

  test.each([
    "",
    " \t",
    "text/*",
    "*/*",
    "*/json",
    "*",
    "text",
    "text/",
    "/html",
    "text/html/extra",
    "text /html",
    "text/html\n",
    "text/html, application/json",
    "text/html;foo",
    "text/html;foo=",
    "text/html;foo =bar",
    "text/html;foo=bar,baz",
    'text/html;foo="unterminated',
    'text/html;foo="bad"suffix',
    'text/html;foo="\n"',
    "text/html;q=0.8",
    "text/html;Q=0",
    'text/html;q="0.8"',
    "text/html;q=wat",
  ])("ignores invalid available media type %j", (invalid) => {
    expect(negotiate("*/*", [invalid, "text/plain"])).toBe("text/plain");
    expect(negotiate(undefined, [invalid, "text/plain"])).toBe("text/plain");
  });

  test("follows the RFC 9110 media-range quality example", () => {
    const header =
      "text/*;q=0.3, text/plain;q=0.7, text/plain;format=flowed, text/plain;format=fixed;q=0.4, */*;q=0.5";
    const available = [
      "text/html",
      "text/plain;format=fixed",
      "image/jpeg",
      "text/plain",
      "text/plain;format=flowed",
    ];
    expect(negotiate(header, available)).toBe("text/plain;format=flowed");
    expect(negotiate(header, available.slice(0, -1))).toBe("text/plain");
    expect(negotiate(header, available.slice(0, -2))).toBe("image/jpeg");
    expect(negotiate(header, available.slice(0, -3))).toBe("text/plain;format=fixed");
    expect(negotiate(header, ["text/html;level=3", "image/jpeg"])).toBe("image/jpeg");
  });

  test("does not mutate available and repeats deterministic selections", () => {
    const available = Object.freeze(["application/json", "Text/HTML", "text/plain"]);
    const original = [...available];
    for (let index = 0; index < 3; index++) {
      expect(negotiate("text/html, application/json;q=0.8", available)).toBe("Text/HTML");
      expect(negotiate("*/*", available)).toBe("application/json");
      expect(negotiate(null, available)).toBe("application/json");
    }
    expect(available).toEqual(original);
  });
});

describe("parseAccept", () => {
  test.each([null, undefined, "", " \t", ", ,\t,,"])("returns an empty list for %j", (header) => {
    expect(parseAccept(header)).toEqual([]);
  });

  test.each([
    ["text/html", "text", "html"],
    ["application/json", "application", "json"],
    ["TEXT/html", "text", "html"],
    ["text/HTML", "text", "html"],
    ["TEXT/HTML", "text", "html"],
    ["text/*", "text", "*"],
    ["TEXT/*", "text", "*"],
    ["*/*", "*", "*"],
    ["application/vnd.example.v1+json", "application", "vnd.example.v1+json"],
    ["text/x-c", "text", "x-c"],
    [" \ttext/html\t ", "text", "html"],
  ])("parses %j with default quality", (header, type, subtype) => {
    expect(parseAccept(header)).toEqual([{ type, subtype, parameters: {}, quality: 1 }]);
  });

  test("parses multiple members", () => {
    expect(parseAccept("text/html, application/json;q=0.8")).toEqual([
      { type: "text", subtype: "html", parameters: {}, quality: 1 },
      { type: "application", subtype: "json", parameters: {}, quality: 0.8 },
    ]);
  });

  test("ignores empty list members and permits OWS around delimiters", () => {
    expect(parseAccept(", text/html\t , ,\t application/json ;\tq=0.8 ,")).toEqual([
      { type: "text", subtype: "html", parameters: {}, quality: 1 },
      { type: "application", subtype: "json", parameters: {}, quality: 0.8 },
    ]);
  });

  test.each<[string, number]>([
    ["0", 0],
    ["0.", 0],
    ["0.0", 0],
    ["0.00", 0],
    ["0.000", 0],
    ["0.001", 0.001],
    ["0.5", 0.5],
    ["0.999", 0.999],
    ["1", 1],
    ["1.", 1],
    ["1.0", 1],
    ["1.00", 1],
    ["1.000", 1],
  ])("parses strict quality %s including zero", (qvalue, quality) => {
    expect(parseAccept(`text/html;q=${qvalue}`)).toEqual([
      { type: "text", subtype: "html", parameters: {}, quality },
    ]);
  });

  test.each<[string, Record<string, string>, number]>([
    ["TEXT/HTML;Level=Foo", { level: "Foo" }, 1],
    ["text/html;format=flowed", { format: "flowed" }, 1],
    ["text/html;level=1;foo=Bar", { level: "1", foo: "Bar" }, 1],
    ["text/html;level=1;q=0.8", { level: "1" }, 0.8],
    ["text/html;q=0.8;level=1", { level: "1" }, 0.8],
    ["text/html;level=1;q=0.8;foo=Bar", { level: "1", foo: "Bar" }, 0.8],
    ["text/html;Q=0.8", {}, 0.8],
    ["text/html;CHARSET=UTF-8", { charset: "UTF-8" }, 1],
    ['text/html;foo="Bar";q=0.8', { foo: "Bar" }, 0.8],
    ['text/html;foo="a,b"', { foo: "a,b" }, 1],
    ['text/html;foo="a;b"', { foo: "a;b" }, 1],
    ['text/html;foo="a,b;c=d"', { foo: "a,b;c=d" }, 1],
    [String.raw`text/html;foo="a\"b"`, { foo: 'a"b' }, 1],
    [String.raw`text/html;foo="a\\b"`, { foo: String.raw`a\b` }, 1],
    [String.raw`text/html;foo="a\,b\;c\=d"`, { foo: "a,b;c=d" }, 1],
    [String.raw`text/html;foo="\n\t\x41\u0041"`, { foo: "ntx41u0041" }, 1],
    ['text/html;foo=""', { foo: "" }, 1],
    ['text/html;foo=" a\tb "', { foo: " a\tb " }, 1],
    ['text/html;foo="\u0080\u00ff"', { foo: "\u0080\u00ff" }, 1],
    ['text/html;foo="q=0.5"', { foo: "q=0.5" }, 1],
    ["text/html;; \t;foo=bar;;q=0.8;", { foo: "bar" }, 0.8],
    ["text/html;foo=first;FOO=last", { foo: "last" }, 1],
  ])("parses parameters and separates q in %j", (header, parameters, quality) => {
    expect(parseAccept(header)).toEqual([{ type: "text", subtype: "html", parameters, quality }]);
  });

  test.each([
    "*",
    "*/json",
    "*/json;foo=bar",
    "text",
    "/html",
    "text/",
    "text//html",
    "text/html/",
    "text/html/extra",
    "text /html",
    "text/ html",
    "text\t/html",
    "text/ht ml",
    '"text"/html',
    'text/"html"',
    "text/html suffix",
    "te(xt/html",
    "text/ht[ml]",
    "text/html=extra",
    "text\\/html",
    "text/héml",
    "tëxt/html",
    "text/html\n",
    "text/html\r\n",
    "text/html\u0000",
    "\u00a0text/html",
    "text/html\u00a0",
    ";foo=bar",
    '"unterminated',
  ])("rejects the entire malformed media range %j without throwing", (header) => {
    expect(parseAccept(header)).toEqual([]);
  });

  test.each([
    "text/html;q=2",
    "text/html;q=.5",
    "text/html;q=0.1234",
    "text/html;q=wat",
    "text/html;q=-1",
    "text/html;q=+1",
    "text/html;q=01",
    "text/html;q=1.001",
    "text/html;q=1.1",
    "text/html;q=0.0000",
    "text/html;q=NaN",
    "text/html;q=Infinity",
    "text/html;q=1e0",
    "text/html;q=0.5foo",
    "text/html;q=0.5\n",
    "text/html;q=",
    'text/html;q="0.8"',
    String.raw`text/html;q="0\.8"`,
    "text/html;q=0.8;q=0.5",
    "text/html;Q=0.8;q=0.8",
    "text/html;q=0.8;level=1;Q=0.5",
    "text/html;q =0.8",
    "text/html;q= 0.8",
    "text/html;foo",
    "text/html;=bar",
    "text/html;foo=",
    "text/html;foo =bar",
    "text/html;foo= bar",
    "text/html;foo=ba r",
    "text/html;foo=a/b",
    "text/html;foo=bar=baz",
    'text/html;foo="bar"suffix',
    'text/html;foo="unterminated',
    'text/html;foo="trailing\\',
    'text/html;foo="bad\n"',
    'text/html;foo="\u007f"',
    'text/html;foo="😀"',
  ])("ignores a member with malformed parameters in %j", (header) => {
    expect(parseAccept(header)).toEqual([]);
  });

  test.each([
    "broken",
    "*/json",
    "text/html;q=2",
    "text/html;q=0.8;q=0.5",
    'text/html;foo="bad"suffix',
    'text/html;foo="bad\n"',
    'text/html;foo="unterminated',
  ])("retains valid siblings around %j", (malformed) => {
    expect(parseAccept(`text/plain, ${malformed}, application/json;q=0.8`)).toEqual([
      { type: "text", subtype: "plain", parameters: {}, quality: 1 },
      { type: "application", subtype: "json", parameters: {}, quality: 0.8 },
    ]);
  });

  test("recovers a quoted valid sibling after an unterminated member", () => {
    expect(parseAccept('text/plain, broken;foo="unterminated, text/html;foo=" ok";q=0.8')).toEqual([
      { type: "text", subtype: "plain", parameters: {}, quality: 1 },
      { type: "text", subtype: "html", parameters: { foo: " ok" }, quality: 0.8 },
    ]);
  });

  test("discards a recovered fragment that still has malformed quoting", () => {
    const header = String.raw`text/plain, broken;foo="unterminated, text/html;foo=bar\"baz, application/json;q=0.8`;
    expect(parseAccept(header)).toEqual([
      { type: "text", subtype: "plain", parameters: {}, quality: 1 },
      { type: "application", subtype: "json", parameters: {}, quality: 0.8 },
    ]);
  });

  test("preserves quoted delimiters across multiple members and parameters", () => {
    expect(parseAccept('text/plain;foo="a,b";bar="c;d", application/json;foo="e,f"')).toEqual([
      { type: "text", subtype: "plain", parameters: { foo: "a,b", bar: "c;d" }, quality: 1 },
      { type: "application", subtype: "json", parameters: { foo: "e,f" }, quality: 1 },
    ]);
  });

  test("preserves member order without ranking or deduplicating", () => {
    expect(
      parseAccept("application/json;q=0.5, text/html, image/png;q=0.9, text/html;q=0.8"),
    ).toEqual([
      { type: "application", subtype: "json", parameters: {}, quality: 0.5 },
      { type: "text", subtype: "html", parameters: {}, quality: 1 },
      { type: "image", subtype: "png", parameters: {}, quality: 0.9 },
      { type: "text", subtype: "html", parameters: {}, quality: 0.8 },
    ]);
  });

  test("retains duplicate media ranges with different qvalues", () => {
    expect(parseAccept("text/html;q=0.5, text/html;q=0.8")).toEqual([
      { type: "text", subtype: "html", parameters: {}, quality: 0.5 },
      { type: "text", subtype: "html", parameters: {}, quality: 0.8 },
    ]);
  });

  test("stores prototype-related parameter names as own data properties", () => {
    const [preference] = parseAccept(
      "text/plain;__proto__=safe;constructor=value;toString=literal",
    );
    expect(preference?.parameters).toEqual({
      ["__proto__"]: "safe",
      constructor: "value",
      tostring: "literal",
    });
    expect(Object.getPrototypeOf(preference?.parameters)).toBe(Object.prototype);
    expect(Object.hasOwn(preference!.parameters, "__proto__")).toBe(true);
  });

  test("results and parameter records are independent between calls and members", () => {
    const first = parseAccept("text/html, text/html");
    const second = parseAccept("text/html");
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(first[1]);
    expect(first[0]?.parameters).not.toBe(first[1]?.parameters);
    expect(first[0]?.parameters).not.toBe(second[0]?.parameters);
  });
});
