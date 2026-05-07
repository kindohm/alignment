import type { ChartImage } from "../../shared/domain/types";
import { now } from "./now";

export const seedImages = (): ChartImage[] => [
  {
    id: "img_neon-toast",
    storageKey: "seed/neon-toast.svg",
    url: "/seed/neon-toast.svg",
    filename: "neon-toast.svg",
    contentType: "image/svg+xml",
    width: 512,
    height: 512,
    order: 0,
    createdAt: now()
  },
  {
    id: "img_moon-vase",
    storageKey: "seed/moon-vase.svg",
    url: "/seed/moon-vase.svg",
    filename: "moon-vase.svg",
    contentType: "image/svg+xml",
    width: 512,
    height: 512,
    order: 1,
    createdAt: now()
  },
  {
    id: "img_red-key",
    storageKey: "seed/red-key.svg",
    url: "/seed/red-key.svg",
    filename: "red-key.svg",
    contentType: "image/svg+xml",
    width: 512,
    height: 512,
    order: 2,
    createdAt: now()
  }
];
