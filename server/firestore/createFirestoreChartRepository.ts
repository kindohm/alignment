import type { Firestore } from "firebase-admin/firestore";
import type { Chart, ChartImage } from "../../shared/domain/types";

type CreateChartDocument = Omit<Chart, "images"> & {
  images: ChartImage[];
};

export const createFirestoreChartRepository = (db: Firestore) => {
  const charts = db.collection("charts");

  const readChart = async (chartId: string): Promise<Chart | undefined> => {
    const chartSnapshot = await charts.doc(chartId).get();

    if (!chartSnapshot.exists) {
      return undefined;
    }

    const imageSnapshots = await charts.doc(chartId).collection("images").orderBy("order", "asc").get();

    return {
      ...(chartSnapshot.data() as Omit<Chart, "images">),
      images: imageSnapshots.docs.map((snapshot) => snapshot.data() as ChartImage)
    };
  };

  const listCharts = async (): Promise<Chart[]> => {
    const snapshots = await charts.orderBy("name", "asc").get();
    const chartResults = await Promise.all(snapshots.docs.map((snapshot) => readChart(snapshot.id)));

    return chartResults.filter((chart): chart is Chart => Boolean(chart));
  };

  const saveChart = async (chart: CreateChartDocument): Promise<Chart> => {
    const { images, ...chartDocument } = chart;
    const batch = db.batch();
    const chartRef = charts.doc(chart.id);

    batch.set(chartRef, chartDocument);
    images.forEach((image) => {
      batch.set(chartRef.collection("images").doc(image.id), image);
    });

    await batch.commit();
    return chart;
  };

  return {
    listCharts,
    readChart,
    saveChart
  };
};
