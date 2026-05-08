import type { Chart } from "../../shared/domain/types";
import { now } from "./now";
import { seedImages } from "./seedImages";

export const createSeedCharts = (): Chart[] => [
  {
    id: "chart_starter",
    name: "Kitchen Mythology",
    xAxisMinLabel: "Lawful",
    xAxisMaxLabel: "Chaotic",
    yAxisMinLabel: "Evil",
    yAxisMaxLabel: "Good",
    status: "published",
    createdBy: "seed",
    createdAt: now(),
    updatedAt: now(),
    images: seedImages()
  }
];
