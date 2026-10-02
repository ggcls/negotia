import { expect, test } from "vitest";
import * as entry from "../src/index";

test("the scaffold entry point imports without exposing a public API", () => {
  expect(Object.keys(entry)).toEqual([]);
});
