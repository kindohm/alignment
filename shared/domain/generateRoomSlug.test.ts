import { describe, expect, it } from "vitest";
import { generateRoomSlug } from "./generateRoomSlug";

describe("generateRoomSlug", () => {
  it("creates readable slug", () => {
    expect(generateRoomSlug(new Set(), () => 0)).toBe("amber-arcade-10");
  });

  it("avoids used slugs", () => {
    const used = new Set(["amber-arcade-10"]);
    expect(generateRoomSlug(used, () => 0)).toMatch(/^room-/);
  });
});
