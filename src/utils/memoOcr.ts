import * as tf from '@tensorflow/tfjs';
import { loadMnistModel, isModelLoaded, predictMnistDigitWithProbs } from '@/utils/mnistModel';

type Span = { minX: number; maxX: number; minY: number; maxY: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const binarizeCanvas = (canvas: HTMLCanvasElement) => {
  const width = Math.max(1, Math.floor(canvas.width));
  const height = Math.max(1, Math.floor(canvas.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const binary = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a < 10) continue;
    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    const ink = 255 - gray;
    binary[i] = ink > 35 ? 1 : 0;
  }

  return { binary, width, height };
};

const findSpans = (binary: Uint8Array, width: number, height: number): Span[] => {
  const colSums = new Uint16Array(width);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      colSums[x] += binary[row + x];
    }
  }

  const minInk = Math.max(1, Math.floor(height * 0.02));
  const gapTolerance = Math.max(1, Math.floor(width * 0.01));
  const spans: Array<{ minX: number; maxX: number }> = [];
  let inSpan = false;
  let start = 0;
  let gap = 0;

  for (let x = 0; x < width; x++) {
    if (colSums[x] >= minInk) {
      if (!inSpan) {
        inSpan = true;
        start = x;
      }
      gap = 0;
      continue;
    }

    if (!inSpan) continue;
    gap += 1;
    if (gap > gapTolerance) {
      spans.push({ minX: start, maxX: x - gap });
      inSpan = false;
      gap = 0;
    }
  }

  if (inSpan) {
    spans.push({ minX: start, maxX: width - 1 });
  }

  const out: Span[] = [];
  for (const span of spans) {
    const spanWidth = span.maxX - span.minX + 1;
    if (spanWidth < 2) continue;

    let minY = height;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = span.minX; x <= span.maxX; x++) {
        if (!binary[row + x]) continue;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxY < 0) continue;
    if (maxY - minY + 1 < 2) continue;
    out.push({ minX: span.minX, maxX: span.maxX, minY, maxY });
  }

  return out;
};

const getRowColSums = (binary: Uint8Array, width: number, height: number, span: Span) => {
  const boxWidth = span.maxX - span.minX + 1;
  const boxHeight = span.maxY - span.minY + 1;
  const rowSums = new Uint16Array(boxHeight);
  const colSums = new Uint16Array(boxWidth);

  for (let y = span.minY; y <= span.maxY; y++) {
    const row = y * width;
    for (let x = span.minX; x <= span.maxX; x++) {
      if (!binary[row + x]) continue;
      rowSums[y - span.minY] += 1;
      colSums[x - span.minX] += 1;
    }
  }

  return { rowSums, colSums, boxWidth, boxHeight };
};

const countClusters = (values: Uint16Array, threshold: number) => {
  let clusters = 0;
  let inCluster = false;
  for (let i = 0; i < values.length; i++) {
    if (values[i] >= threshold) {
      if (!inCluster) {
        clusters += 1;
        inCluster = true;
      }
      continue;
    }
    inCluster = false;
  }
  return clusters;
};

const classifySymbol = (binary: Uint8Array, width: number, height: number, span: Span): string | null => {
  const { rowSums, colSums, boxWidth, boxHeight } = getRowColSums(binary, width, height, span);
  const ratio = boxWidth / Math.max(1, boxHeight);

  let maxRow = 0;
  let maxCol = 0;
  for (const v of rowSums) {
    if (v > maxRow) maxRow = v;
  }
  for (const v of colSums) {
    if (v > maxCol) maxCol = v;
  }

  const rowDensity = maxRow / Math.max(1, boxWidth);
  const colDensity = maxCol / Math.max(1, boxHeight);
  const rowClusters = countClusters(rowSums, Math.max(1, Math.floor(boxWidth * 0.3)));

  if (ratio >= 1.2 && rowDensity >= 0.35 && colDensity < 0.55 && rowClusters >= 2) {
    return '=';
  }

  if (ratio >= 2.2 && rowDensity >= 0.35 && colDensity < 0.35 && rowClusters <= 1) {
    return '-';
  }

  if (ratio >= 0.5 && ratio <= 1.8 && rowDensity >= 0.25 && colDensity >= 0.25 && rowClusters <= 2) {
    return '+';
  }

  return null;
};

const spanToTensor = (binary: Uint8Array, width: number, height: number, span: Span): tf.Tensor2D => {
  const boxWidth = span.maxX - span.minX + 1;
  const boxHeight = span.maxY - span.minY + 1;
  const boxSize = Math.max(boxWidth, boxHeight);
  const paddedSize = boxSize + 4;

  const padded = document.createElement('canvas');
  padded.width = paddedSize;
  padded.height = paddedSize;
  const pctx = padded.getContext('2d');
  if (!pctx) {
    return tf.tensor2d(new Float32Array(28 * 28), [28, 28]);
  }

  pctx.fillStyle = '#000000';
  pctx.fillRect(0, 0, paddedSize, paddedSize);
  const img = pctx.createImageData(paddedSize, paddedSize);
  const offsetX = Math.floor((paddedSize - boxWidth) / 2);
  const offsetY = Math.floor((paddedSize - boxHeight) / 2);

  for (let y = 0; y < boxHeight; y++) {
    for (let x = 0; x < boxWidth; x++) {
      const srcIdx = (span.minY + y) * width + (span.minX + x);
      if (!binary[srcIdx]) continue;
      const dx = offsetX + x;
      const dy = offsetY + y;
      const dst = (dy * paddedSize + dx) * 4;
      img.data[dst] = 255;
      img.data[dst + 1] = 255;
      img.data[dst + 2] = 255;
      img.data[dst + 3] = 255;
    }
  }
  pctx.putImageData(img, 0, 0);

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = 28;
  finalCanvas.height = 28;
  const fctx = finalCanvas.getContext('2d');
  if (!fctx) {
    return tf.tensor2d(new Float32Array(28 * 28), [28, 28]);
  }
  fctx.imageSmoothingEnabled = false;
  fctx.fillStyle = '#000000';
  fctx.fillRect(0, 0, 28, 28);
  fctx.drawImage(padded, 4, 4, 20, 20);

  const finalImage = fctx.getImageData(0, 0, 28, 28);
  const input = new Float32Array(28 * 28);
  let maxVal = 0;

  for (let i = 0; i < 28 * 28; i++) {
    const v = finalImage.data[i * 4] / 255;
    input[i] = v;
    if (v > maxVal) maxVal = v;
  }

  if (maxVal > 0) {
    for (let i = 0; i < input.length; i++) {
      input[i] = clamp(input[i] / maxVal, 0, 1);
    }
  }

  return tf.tensor2d(input, [28, 28]);
};

const classifyDigit = (
  binary: Uint8Array,
  width: number,
  height: number,
  span: Span
): { digit: string; confidence: number } | null => {
  const tensor = spanToTensor(binary, width, height, span);
  const prediction = predictMnistDigitWithProbs(tensor);
  if (!prediction) return null;
  const confidence = Math.max(...prediction.probabilities);
  return { digit: String(prediction.predictedDigit), confidence };
};

export const runMemoOcr = async (canvas: HTMLCanvasElement): Promise<string> => {
  const override = canvas.dataset.memoOcrOverride?.trim();
  if (override) {
    return override.replace(/[^0-9+=-]/g, '');
  }

  const bin = binarizeCanvas(canvas);
  if (!bin) return '';

  await loadMnistModel();
  if (!isModelLoaded) return '';

  const spans = findSpans(bin.binary, bin.width, bin.height);
  if (spans.length === 0) return '';

  const out: string[] = [];
  for (const span of spans) {
    const digit = classifyDigit(bin.binary, bin.width, bin.height, span);
    const symbol = classifySymbol(bin.binary, bin.width, bin.height, span);
    if (symbol && (!digit || digit.confidence < 0.92)) {
      out.push(symbol);
      continue;
    }

    if (digit && digit.confidence >= 0.45) {
      out.push(digit.digit);
    }
  }

  return out.join('').replace(/[^0-9+=-]/g, '');
};

export const checkMemoContainsAnswer = (memoText: string, correctAnswer: string) => {
  if (!memoText) return false;
  return memoText.includes(`=${correctAnswer}`);
};
