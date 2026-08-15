import { describe, it, expect } from "vitest";
import { buildQuery, jsonResult, textResult, errorResult } from "../src/utils.js";

describe("buildQuery", () => {
  it("joins parts with ^", () => {
    expect(buildQuery(["active=true", "priority=1"])).toBe("active=true^priority=1");
  });

  it("drops empty/falsy parts", () => {
    expect(buildQuery(["active=true", "", "priority=1"])).toBe("active=true^priority=1");
  });

  it("returns an empty string for no parts", () => {
    expect(buildQuery([])).toBe("");
  });
});

describe("result helpers", () => {
  it("jsonResult wraps pretty-printed JSON as text content", () => {
    const r = jsonResult({ a: 1, b: [2, 3] });
    expect(r.content[0].type).toBe("text");
    expect(JSON.parse(r.content[0].text)).toEqual({ a: 1, b: [2, 3] });
  });

  it("textResult wraps plain text", () => {
    expect(textResult("hello").content[0].text).toBe("hello");
  });

  it("errorResult flags isError and includes the message", () => {
    const r = errorResult(new Error("boom"));
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("boom");
  });

  it("errorResult stringifies non-Error values", () => {
    const r = errorResult("plain failure");
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("plain failure");
  });
});
