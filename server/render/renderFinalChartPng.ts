import sharp from "sharp";
import type { Game } from "../../shared/domain/types";

const escape = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");

const renderBaseSvg = (game: Game): string => {
  const width = 1200;
  const height = 900;
  const padding = 110;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f6ead1"/>
  <rect x="${padding}" y="${padding}" width="${plotWidth}" height="${plotHeight}" fill="#fbf7ec" stroke="#151515" stroke-width="5"/>
  <line x1="${padding + plotWidth / 2}" y1="${padding}" x2="${padding + plotWidth / 2}" y2="${height - padding}" stroke="#151515" stroke-width="2" stroke-dasharray="10 12"/>
  <line x1="${padding}" y1="${padding + plotHeight / 2}" x2="${width - padding}" y2="${padding + plotHeight / 2}" stroke="#151515" stroke-width="2" stroke-dasharray="10 12"/>
  <text x="${width / 2}" y="58" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#151515">${escape(game.chartSnapshot.name)}</text>
  <text x="${padding + plotWidth / 3}" y="${height - 36}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="24" font-weight="700" fill="#151515">${escape(game.chartSnapshot.xAxisMinLabel)}</text>
  <text x="${padding + (plotWidth * 2) / 3}" y="${height - 36}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="24" font-weight="700" fill="#151515">${escape(game.chartSnapshot.xAxisMaxLabel)}</text>
  <text x="42" y="${padding + (plotHeight * 2) / 3}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="24" font-weight="700" fill="#151515" transform="rotate(-90 42 ${padding + (plotHeight * 2) / 3})">${escape(game.chartSnapshot.yAxisMinLabel)}</text>
  <text x="42" y="${padding + plotHeight / 3}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="24" font-weight="700" fill="#151515" transform="rotate(-90 42 ${padding + plotHeight / 3})">${escape(game.chartSnapshot.yAxisMaxLabel)}</text>
</svg>`;
};

const renderTileSvg = (): Buffer =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="92" height="92" viewBox="0 0 92 92">
  <rect x="4" y="4" width="84" height="84" rx="16" fill="#fffaf0" stroke="#151515" stroke-width="4"/>
</svg>`);

const fetchImage = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to fetch result image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

export const renderFinalChartPng = async (game: Game): Promise<Buffer> => {
  const width = 1200;
  const height = 900;
  const padding = 110;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const imageById = new Map(game.chartSnapshot.images.map((image) => [image.id, image]));
  const composites = [];

  for (const result of game.results) {
    const image = imageById.get(result.imageId);

    if (!image) {
      continue;
    }

    const centerX = padding + result.x * plotWidth;
    const centerY = padding + (1 - result.y) * plotHeight;
    const left = Math.round(Math.max(padding, Math.min(padding + plotWidth - 92, centerX - 46)));
    const top = Math.round(Math.max(padding, Math.min(padding + plotHeight - 92, centerY - 46)));
    const imageBuffer = await sharp(await fetchImage(image.url))
      .resize(68, 68, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    composites.push(
      {
        input: renderTileSvg(),
        left,
        top
      },
      {
        input: imageBuffer,
        left: left + 12,
        top: top + 12
      }
    );
  }

  return sharp(Buffer.from(renderBaseSvg(game))).composite(composites).png().toBuffer();
};
