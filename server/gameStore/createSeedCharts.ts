import type { Chart } from "../../shared/domain/types";
import { now } from "./now";
import { seedImages } from "./seedImages";

export const createSeedCharts = (): Chart[] => [
  {
    id: "chart_starter",
    name: "Kitchen Mythology",
    xAxisName: "Lawful / Chaotic",
    yAxisName: "Good / Evil",
    status: "published",
    createdBy: "seed",
    createdAt: now(),
    updatedAt: now(),
    images: seedImages()
  }
];
