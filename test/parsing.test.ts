import { describe, expect, test } from "vitest";
import { parseParameter, parseParameters } from "../src/parameters";
import { splitHeaderList, splitParameters } from "../src/parse";
import { parseQuality } from "../src/quality";
import { unquote } from "../src/quoted-string";
import { trimOWS } from "../src/whitespace";

describe("HTTP optional whitespace", () => {
  test.each([
    [" \tvalue\t ", "value"],
    ["value", "value"],
    [" \t ", ""],
    ["", ""],
    ["a b\tc", "a b\tc"],
    ["\nvalue\r", "\nvalue\r"],
    ["\u00a0value\u00a0", "\u00a0value\u00a0"],
  ])("trims only OWS in %j", (input, expected) => {
    expect(trimOWS(input)).toBe(expected);
  });
});

describe("HTTP list scanning", () => {
  test.each([
    { input: undefined, expected: [] },
    { input: null, expected: [] },
    { input: "", expected: [] },
    { input: " \t", expected: [] },
    { input: ", ,\t,,", expected: [] },
    { input: "text/html", expected: ["text/html"] },
    { input: "text/html, application/json", expected: ["text/html", "application/json"] },
    { input: " \tfirst\t, second ,third ", expected: ["first", "second", "third"] },
    { input: ",first,,second,", expected: ["first", "second"] },
    { input: 'first;foo="a,b", second', expected: ['first;foo="a,b"', "second"] },
    { input: 'first;foo="a,b,c", second', expected: ['first;foo="a,b,c"', "second"] },
    { input: 'first;foo="a;b", second', expected: ['first;foo="a;b"', "second"] },
    { input: 'first;foo="", second', expected: ['first;foo=""', "second"] },
    {
      input: String.raw`first;foo="a\",b", second`,
      expected: [String.raw`first;foo="a\",b"`, "second"],
    },
    {
      input: String.raw`first;foo="a\\", second`,
      expected: [String.raw`first;foo="a\\"`, "second"],
    },
    {
      input: 'first;foo="a,b";bar="c,d", second;foo="e,f"',
      expected: ['first;foo="a,b";bar="c,d"', 'second;foo="e,f"'],
    },
    { input: '"unterminated', expected: [] },
    { input: 'first, broken;foo="unterminated', expected: ["first"] },
    { input: 'first, broken;foo="unterminated, second', expected: ["first", "second"] },
    { input: 'broken;foo="unterminated, second, third', expected: ["second", "third"] },
    { input: 'first, broken;foo="unterminated, ,second,', expected: ["first", "second"] },
    { input: 'first, broken;foo="a,b";bar="unterminated, second', expected: ["first", "second"] },
    { input: 'first, broken;foo="trailing\\', expected: ["first"] },
  ])("splits $input", ({ input, expected }) => {
    expect(splitHeaderList(input)).toEqual(expected);
  });

  test("backslashes outside quotes do not escape list delimiters", () => {
    expect(splitHeaderList("first\\,second")).toEqual(["first\\", "second"]);
  });
});

describe("parameter scanning", () => {
  test.each([
    { input: "item", expected: ["item"] },
    { input: " item ; foo=bar ; q=0.8\t", expected: ["item", "foo=bar", "q=0.8"] },
    { input: 'item;foo="a;b";q=0.8', expected: ["item", 'foo="a;b"', "q=0.8"] },
    { input: 'item;foo="a;b;c"', expected: ["item", 'foo="a;b;c"'] },
    { input: 'item;foo="a,b"', expected: ["item", 'foo="a,b"'] },
    { input: 'item;foo=""', expected: ["item", 'foo=""'] },
    {
      input: String.raw`item;foo="a\";b";q=0.8`,
      expected: ["item", String.raw`foo="a\";b"`, "q=0.8"],
    },
    { input: String.raw`item;foo="a\\";q=0.8`, expected: ["item", String.raw`foo="a\\"`, "q=0.8"] },
    { input: "", expected: [""] },
    { input: "item;;foo=bar;", expected: ["item", "", "foo=bar", ""] },
    { input: 'item;foo="unterminated;q=0.8', expected: undefined },
    { input: 'item;foo="trailing\\', expected: undefined },
  ])("splits $input", ({ input, expected }) => {
    expect(splitParameters(input)).toEqual(expected);
  });
});

describe("quoted strings", () => {
  test.each([
    ['"bar"', "bar"],
    ['"a,b"', "a,b"],
    ['"a;b"', "a;b"],
    [String.raw`"a\"b"`, 'a"b'],
    [String.raw`"a\\b"`, String.raw`a\b`],
    ['""', ""],
    ['" a\tb "', " a\tb "],
    [String.raw`"\n\t\x41\u0041"`, "ntx41u0041"],
    [String.raw`"a\,b\;c\=d"`, "a,b;c=d"],
    ['"\\\t\\ "', "\t "],
    ['"\u0080\u00ff"', "\u0080\u00ff"],
    ['"\\\u0080\\\u00ff"', "\u0080\u00ff"],
    ['"![]~"', "![]~"],
  ])("decodes %j literally", (input, expected) => {
    expect(unquote(input)).toBe(expected);
  });

  test.each([
    "",
    "plain",
    '"',
    '"unterminated',
    '"trailing\\',
    '"escaped final\\"',
    '"value"suffix',
    '"value" ',
    '"a""b"',
    '"a\nb"',
    '"a\rb"',
    '"\u0000"',
    '"\u001f"',
    '"\u007f"',
    '"\u0100"',
    '"😀"',
    '"\\\n"',
    '"\\\r"',
    '"\\\u0000"',
    '"\\\u007f"',
    '"\\\u0100"',
  ])("rejects %j without throwing", (input) => {
    expect(unquote(input)).toBeUndefined();
  });
});

describe("parameter name/value pairs", () => {
  test.each([
    { input: "foo=bar", expected: { name: "foo", value: "bar", quoted: false } },
    { input: "\tFOO=Bar \t", expected: { name: "foo", value: "Bar", quoted: false } },
    { input: 'foo="bar"', expected: { name: "foo", value: "bar", quoted: true } },
    { input: 'foo=""', expected: { name: "foo", value: "", quoted: true } },
    { input: 'foo="a=b"', expected: { name: "foo", value: "a=b", quoted: true } },
    { input: 'foo="a,b;c"', expected: { name: "foo", value: "a,b;c", quoted: true } },
    { input: String.raw`foo="a\"b"`, expected: { name: "foo", value: 'a"b', quoted: true } },
    {
      input: String.raw`foo="a\\b"`,
      expected: { name: "foo", value: String.raw`a\b`, quoted: true },
    },
    { input: "Q=0.8", expected: { name: "q", value: "0.8", quoted: false } },
    {
      input: "a!#$%&'*+-.^_`|~0129Z=value",
      expected: { name: "a!#$%&'*+-.^_`|~0129z", value: "value", quoted: false },
    },
  ])("parses $input", ({ input, expected }) => {
    expect(parseParameter(input)).toEqual(expected);
  });

  test.each([
    "",
    "foo",
    "=bar",
    "foo=",
    "foo= ",
    "foo =bar",
    "foo= bar",
    "foo\t=bar",
    "foo=\tbar",
    "fo o=bar",
    "foo=ba r",
    "foo=bar=baz",
    "foo=a/b",
    "foo=a,b",
    "foo=a;b",
    '"foo"=bar',
    'foo="unterminated',
    'foo="value"suffix',
    "foo=bar\n",
    "foo=\u00e9",
    "\u00a0foo=bar",
    'foo="\n"',
  ])("rejects %j atomically", (input) => {
    expect(parseParameter(input)).toBeUndefined();
  });
});

describe("quality values", () => {
  test("defaults an absent qvalue to 1", () => {
    expect(parseQuality()).toBe(1);
    expect(parseQuality(undefined)).toBe(1);
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
  ])("parses %s", (input, expected) => {
    expect(parseQuality(input)).toBe(expected);
  });

  test.each([
    "",
    "-1",
    "+1",
    ".5",
    "01",
    "1.001",
    "1.1",
    "0.0000",
    "0.1234",
    "2",
    "NaN",
    "Infinity",
    "0.5foo",
    "0.5.0",
    "1e0",
    "0x1",
    " 0.5",
    "0.5 ",
    "0.5\t",
    "0.5\n",
    "0.5\r",
    "0.5\r\n",
    '"0.5"',
    "0,5",
    "０.５",
    "0.a",
    "1.a",
    "0.1a",
  ])("rejects the entire invalid value %j", (input) => {
    expect(parseQuality(input)).toBeUndefined();
  });

  test("preserves the numeric value of every three-digit fraction", () => {
    for (let fraction = 0; fraction < 1000; fraction++) {
      const value = `0.${fraction.toString().padStart(3, "0")}`;
      expect(parseQuality(value)).toBe(Number(value));
    }
  });
});

describe("member parameter validation", () => {
  test("defaults to quality 1 and preserves parameter values", () => {
    expect(parseParameters(["FOO=Bar", 'other="a,b;c"'])).toEqual({
      parameters: { foo: "Bar", other: "a,b;c" },
      quality: 1,
    });
    expect(parseParameters([])).toEqual({ parameters: {}, quality: 1 });
  });

  test.each([["q=0.8"], ["Q=0.8"], ["q=0.8", "foo=bar"], ["foo=bar", "q=0.8"]])(
    "recognizes quality in %j",
    (...parts) => {
      expect(parseParameters(parts)?.quality).toBe(0.8);
      expect(parseParameters(parts)?.parameters).not.toHaveProperty("q");
    },
  );

  test("keeps zero quality", () => {
    expect(parseParameters(["q=0"])).toEqual({ parameters: {}, quality: 0 });
  });

  test("permits empty parameter segments", () => {
    expect(parseParameters(["", " \t", "foo=bar", ""])).toEqual({
      parameters: { foo: "bar" },
      quality: 1,
    });
  });

  test.each([
    ["q=0.8", "q=0.5"],
    ["Q=0.8", "q=0.8"],
    ["q=0.8", "foo=bar", "Q=0.5"],
    ["q=2"],
    ["q=.5"],
    ["q=0.1234"],
    ["q=wat"],
    ["q=-1"],
    ["q=0.5foo"],
    ['q="0.8"'],
    [String.raw`q="0\.8"`],
    ["q="],
    ["foo=bar", "broken"],
    ['foo="unterminated'],
    ['foo="\n"'],
  ])("rejects a malformed member with parameters %j", (...parts) => {
    expect(parseParameters(parts)).toBeUndefined();
  });

  test("stores prototype-related names as ordinary own properties", () => {
    const parsed = parseParameters([
      "__proto__=safe",
      "constructor=value",
      "toString=literal",
      "foo=first",
      "foo=last",
    ]);
    expect(parsed?.parameters).toEqual({
      ["__proto__"]: "safe",
      constructor: "value",
      tostring: "literal",
      foo: "last",
    });
    expect(Object.getPrototypeOf(parsed?.parameters)).toBe(Object.prototype);
  });

  test.each([
    "first, broken;q=2, second;q=0.8",
    "first, broken;Q=0.8;q=0.5, second;q=0.8",
    'first, broken;foo="bad"suffix, second;q=0.8',
    'first, broken;foo="bad\n", second;q=0.8',
    'first, broken;foo="unterminated, second;q=0.8',
    'first, broken;foo="unterminated, second;foo="ok";q=0.8',
    'first, broken;foo="unterminated, second;foo=" ok";q=0.8',
    'first, broken;foo="unterminated, second;foo="";q=0.8',
  ])("retains valid siblings of a malformed member in %j", (header) => {
    const retained = splitHeaderList(header).flatMap((member) => {
      const parts = splitParameters(member);
      if (parts === undefined || parseParameters(parts.slice(1)) === undefined) {
        return [];
      }
      return [parts[0]];
    });
    expect(retained).toEqual(["first", "second"]);
  });

  test("scanning terminates on long malformed input and recovers its siblings", () => {
    const header = `first, broken;foo="${"a,".repeat(10_000)}second`;
    const members = splitHeaderList(header);
    expect(members[0]).toBe("first");
    expect(members.at(-1)).toBe("second");
    expect(members).toHaveLength(10_001);
    expect(splitParameters(`item;foo="${"a\\".repeat(10_000)}`)).toBeUndefined();
  });
});
