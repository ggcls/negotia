import { describe, expect, test } from "vitest";
import { parseAccept } from "../src/index";

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
