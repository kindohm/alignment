import { describe, expect, it } from "vitest";
import { normalizeAdminEmail } from "./normalizeAdminEmail";

describe("normalizeAdminEmail", () => {
  it("trims and lowercases email addresses", () => {
    expect(normalizeAdminEmail("  Mike@Example.COM ")).toBe("mike@example.com");
  });
});
