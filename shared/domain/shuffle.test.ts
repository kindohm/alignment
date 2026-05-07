import { describe, expect, it } from "vitest";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("keeps all items", () => {
    expect(shuffle(["a", "b", "c"], () => 0.4).sort()).toEqual(["a", "b", "c"]);
  });

  it("does not mutate input", () => {
    const input = ["a", "b", "c"];
    shuffle(input, () => 0);
    expect(input).toEqual(["a", "b", "c"]);
  });
});
