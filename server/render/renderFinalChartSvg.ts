import type { Game } from "../../shared/domain/types";

const escape = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");

export const renderFinalChartSvg = (game: Game): string => {
  const width = 1200;
  const height = 900;
  const padding = 110;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const imageById = new Map(game.chartSnapshot.images.map((image) => [image.id, image]));
  const points = game.results
    .map((result) => {
      const image = imageById.get(result.imageId);
      const x = padding + result.x * plotWidth;
      const y = padding + (1 - result.y) * plotHeight;

      return image
        ? `<g transform="translate(${x - 42} ${y - 42})">
          <rect width="84" height="84" rx="16" fill="#fffaf0" stroke="#151515" stroke-width="3"/>
          <image href="${escape(image.url)}" x="10" y="10" width="64" height="64" preserveAspectRatio="xMidYMid meet"/>
        </g>`
        : "";
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="1200" height="900" fill="#f6ead1"/>
  <rect x="${padding}" y="${padding}" width="${plotWidth}" height="${plotHeight}" fill="#fbf7ec" stroke="#151515" stroke-width="5"/>
  <line x1="${padding + plotWidth / 2}" y1="${padding}" x2="${padding + plotWidth / 2}" y2="${height - padding}" stroke="#151515" stroke-width="2" stroke-dasharray="10 12"/>
  <line x1="${padding}" y1="${padding + plotHeight / 2}" x2="${width - padding}" y2="${padding + plotHeight / 2}" stroke="#151515" stroke-width="2" stroke-dasharray="10 12"/>
  <text x="${width / 2}" y="58" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#151515">${escape(game.chartSnapshot.name)}</text>
  <text x="${padding + plotWidth / 3}" y="${height - 36}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="24" fill="#151515">${escape(game.chartSnapshot.xAxisMinLabel)}</text>
  <text x="${padding + (plotWidth * 2) / 3}" y="${height - 36}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="24" fill="#151515">${escape(game.chartSnapshot.xAxisMaxLabel)}</text>
  <text x="42" y="${padding + (plotHeight * 2) / 3}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="24" fill="#151515" transform="rotate(-90 42 ${padding + (plotHeight * 2) / 3})">${escape(game.chartSnapshot.yAxisMinLabel)}</text>
  <text x="42" y="${padding + plotHeight / 3}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="24" fill="#151515" transform="rotate(-90 42 ${padding + plotHeight / 3})">${escape(game.chartSnapshot.yAxisMaxLabel)}</text>
  ${points}
</svg>`;
};
