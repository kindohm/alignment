import { describe, expect, it } from "vitest";
import { canEditUsername } from "./canEditUsername";

describe("canEditUsername", () => {
  it("blocks edits during active rounds", () => {
    expect(canEditUsername("round_active")).toBe(false);
  });

  it("allows edits outside active rounds", () => {
    expect(canEditUsername("lobby")).toBe(true);
    expect(canEditUsername("round_complete")).toBe(true);
    expect(canEditUsername("complete")).toBe(true);
  });
});
