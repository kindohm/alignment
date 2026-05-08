import type { Chart, ChartSnapshot } from "./types";

type AxisLabels = {
  xAxisMinLabel: string;
  xAxisMaxLabel: string;
  yAxisMinLabel: string;
  yAxisMaxLabel: string;
};

export const getAxisLabels = (chart: Pick<Chart | ChartSnapshot, keyof AxisLabels>): AxisLabels => ({
  xAxisMinLabel: chart.xAxisMinLabel,
  xAxisMaxLabel: chart.xAxisMaxLabel,
  yAxisMinLabel: chart.yAxisMinLabel,
  yAxisMaxLabel: chart.yAxisMaxLabel
});
