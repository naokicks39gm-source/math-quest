import * as tf from "@tensorflow/tfjs";
import {
  predictMnistDigitWithProbs,
  predictMnist2DigitWithProbs
} from "@/utils/mnistModel";

type ExpectedForm = "mixed" | "improper" | "auto";
type BBox = { minX: number; minY: number; maxX: number; maxY: number };
type DigitSample = { tensor: tf.Tensor2D; preview: ImageData; width: number; height: number; centerX: number };
type Component = { mask: Uint8Array; bbox: BBox; area: number };
type FractionRecognition = { predictedText: string; samples: DigitSample[] };
type RecognitionRoi = BBox & { width: number; height: number };
type BinarizedCanvas = {
  bin: Uint8Array;
  w: number;
  h: number;
  ink: Uint8Array;
  threshold: number;
  roi: RecognitionRoi;
};

const OUTER_MARGIN = 8;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const getRecognitionRoi = (
  canvas: HTMLCanvasElement,
  visibleSize: number,
  margin = OUTER_MARGIN
): RecognitionRoi => {
  const w = Math.max(1, Math.floor(canvas.width));
  const h = Math.max(1, Math.floor(canvas.height));
  const side = Math.max(1, Math.min(w, h));
  const visible = clamp(Math.floor(visibleSize), 1, side);
  const centerX = Math.floor(w / 2);
  const centerY = Math.floor(h / 2);
  const halfVisible = Math.floor(visible / 2);
  const minX = clamp(centerX - halfVisible - margin, 0, w - 1);
  const maxX = clamp(centerX + (visible - halfVisible) + margin - 1, minX, w - 1);
  const minY = clamp(centerY - halfVisible - margin, 0, h - 1);
  const maxY = clamp(centerY + (visible - halfVisible) + margin - 1, minY, h - 1);
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const getBinarizeTuning = (roi: RecognitionRoi) => {
  const roiScale = Math.max(1, Math.min(roi.width, roi.height));
  return {
    dotThresholdRatio: 0.35,
    decimalDotAreaRatio: 0.0005,
    fractionMinKeepRatio: 0.00025,
    integerMinKeepRatio: 0.00055,
    splitThreshold: Math.max(1, Math.floor(roiScale * 0.035))
  };
};

const dilateBinary = (bin: Uint8Array, w: number, h: number, iterations = 1) => {
  let current = bin;
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (current[idx]) {
          next[idx] = 1;
          continue;
        }
        let hit = false;
        for (let oy = -1; oy <= 1 && !hit; oy++) {
          const ny = y + oy;
          if (ny < 0 || ny >= h) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const nx = x + ox;
            if (nx < 0 || nx >= w) continue;
            if (current[ny * w + nx]) {
              hit = true;
              break;
            }
          }
        }
        next[idx] = hit ? 1 : 0;
      }
    }
    current = next;
  }
  return current;
};

const computeBBox = (bin: Uint8Array, w: number, h: number): BBox | null => {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (!bin[row + x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
};

const binarizeCanvasInRoi = (canvas: HTMLCanvasElement, roi: RecognitionRoi): BinarizedCanvas | null => {
  const w = Math.max(1, Math.floor(canvas.width));
  const h = Math.max(1, Math.floor(canvas.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const ink = new Uint8Array(w * h);
  let inkCount = 0;
  let inkSum = 0;
  let maxInk = 0;
  for (let y = roi.minY; y <= roi.maxY; y++) {
    const row = y * w;
    for (let x = roi.minX; x <= roi.maxX; x++) {
      const i = row + x;
      const idx = i * 4;
      const a = data[idx + 3];
      if (a < 10) continue;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const v = 255 - gray;
      if (v > 10) {
        ink[i] = v;
        inkCount++;
        inkSum += v;
        if (v > maxInk) maxInk = v;
      }
    }
  }
  if (inkCount === 0) return null;
  const meanInk = inkSum / inkCount;
  const threshold = clamp(Math.floor(Math.max(meanInk * 0.5, maxInk * 0.3)), 15, 200);
  const bin = new Uint8Array(w * h);
  for (let y = roi.minY; y <= roi.maxY; y++) {
    const row = y * w;
    for (let x = roi.minX; x <= roi.maxX; x++) {
      const i = row + x;
      bin[i] = ink[i] >= threshold ? 1 : 0;
    }
  }
  return { bin, w, h, ink, threshold, roi };
};

const findComponents = (bin: Uint8Array, w: number, h: number) => {
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const components: Component[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!bin[idx] || visited[idx]) continue;
      const mask = new Uint8Array(w * h);
      let area = 0;
      let minX = x, maxX = x, minY = y, maxY = y;
      stack.push(idx);
      visited[idx] = 1;
      mask[idx] = 1;
      while (stack.length) {
        const cur = stack.pop() as number;
        area++;
        const cy = Math.floor(cur / w);
        const cx = cur - cy * w;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (let oy = -1; oy <= 1; oy++) {
          const ny = cy + oy;
          if (ny < 0 || ny >= h) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const nx = cx + ox;
            if (nx < 0 || nx >= w) continue;
            const n = ny * w + nx;
            if (visited[n] || !bin[n]) continue;
            visited[n] = 1;
            mask[n] = 1;
            stack.push(n);
          }
        }
      }
      components.push({ mask, bbox: { minX, minY, maxX, maxY }, area });
    }
  }
  return components;
};

const componentToTensor = (component: Component, w: number, h: number): DigitSample | null => {
  const thick = dilateBinary(component.mask, w, h, 1);
  const bbox = computeBBox(thick, w, h);
  if (!bbox) return null;
  const boxW = bbox.maxX - bbox.minX + 1;
  const boxH = bbox.maxY - bbox.minY + 1;
  const boxSize = Math.max(boxW, boxH);
  const paddedSize = boxSize + 4;
  const padded = document.createElement("canvas");
  padded.width = paddedSize;
  padded.height = paddedSize;
  const pctx = padded.getContext("2d");
  if (!pctx) return null;
  pctx.fillStyle = "#000000";
  pctx.fillRect(0, 0, paddedSize, paddedSize);
  const img = pctx.createImageData(paddedSize, paddedSize);
  const offsetX = Math.floor((paddedSize - boxW) / 2);
  const offsetY = Math.floor((paddedSize - boxH) / 2);
  for (let y = 0; y < boxH; y++) {
    for (let x = 0; x < boxW; x++) {
      const srcIdx = (bbox.minY + y) * w + (bbox.minX + x);
      const v = thick[srcIdx] ? 255 : 0;
      const dx = offsetX + x;
      const dy = offsetY + y;
      const dst = (dy * paddedSize + dx) * 4;
      img.data[dst] = v;
      img.data[dst + 1] = v;
      img.data[dst + 2] = v;
      img.data[dst + 3] = 255;
    }
  }
  pctx.putImageData(img, 0, 0);
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = 28;
  finalCanvas.height = 28;
  const fctx = finalCanvas.getContext("2d");
  if (!fctx) return null;
  fctx.imageSmoothingEnabled = false;
  fctx.fillStyle = "#000000";
  fctx.fillRect(0, 0, 28, 28);
  fctx.drawImage(padded, 4, 4, 20, 20);
  const finalImageData = fctx.getImageData(0, 0, 28, 28);
  const input = new Float32Array(28 * 28);
  let sum = 0;
  let sumX = 0;
  let sumY = 0;
  let maxVal = 0;
  for (let i = 0; i < finalImageData.data.length; i += 4) {
    const v = finalImageData.data[i] / 255;
    const idx = i / 4;
    const x = idx % 28;
    const y = Math.floor(idx / 28);
    input[idx] = v;
    if (v > 0.01) {
      sum += v;
      sumX += x * v;
      sumY += y * v;
      if (v > maxVal) maxVal = v;
    }
  }
  if (sum > 0) {
    const cx = sumX / sum;
    const cy = sumY / sum;
    const shiftX = Math.round(14 - cx);
    const shiftY = Math.round(14 - cy);
    const shifted = new Float32Array(28 * 28);
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const nx = x + shiftX;
        const ny = y + shiftY;
        if (nx < 0 || nx >= 28 || ny < 0 || ny >= 28) continue;
        shifted[ny * 28 + nx] = input[y * 28 + x];
      }
    }
    for (let i = 0; i < shifted.length; i++) {
      input[i] = maxVal > 0 ? Math.min(1, shifted[i] / maxVal) : shifted[i];
    }
  }
  const centerX = (bbox.minX + bbox.maxX) / 2;
  return { tensor: tf.tensor2d(input, [28, 28]), preview: finalImageData, width: boxW, height: boxH, centerX };
};

const detectDecimalDots = (components: Component[], maxArea: number, h: number, roi: RecognitionRoi) => {
  const tuning = getBinarizeTuning(roi);
  const maxDotArea = Math.max(10, Math.floor(Math.max(maxArea * 0.04, roi.width * roi.height * tuning.decimalDotAreaRatio)));
  return components.filter((c) => {
    const bw = c.bbox.maxX - c.bbox.minX + 1;
    const bh = c.bbox.maxY - c.bbox.minY + 1;
    const minArea = c.area <= 10 ? 2 : 4;
    if (c.area < minArea) return false;
    if (c.area > maxDotArea) return false;
    if (bw > h * 0.25 || bh > h * 0.25) return false;
    if (c.bbox.minY < h * 0.35) return false;
    return true;
  });
};

const isSlashComponent = (component: Component, w: number, maxArea: number, h: number) => {
  const bw = component.bbox.maxX - component.bbox.minX + 1;
  const bh = component.bbox.maxY - component.bbox.minY + 1;
  if (bw < Math.max(8, Math.floor(h * 0.05))) return false;
  if (bh < 6) return false;
  if (Math.hypot(bw, bh) < 14) return false;
  const aspect = bw / Math.max(1, bh);
  if (aspect < 0.45 || aspect > 12) return false;
  if (component.area > Math.max(56, Math.floor(maxArea * 0.8))) return false;
  const fillRatio = component.area / (bw * bh);
  if (fillRatio > 0.8) return false;
  let n = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = component.bbox.minY; y <= component.bbox.maxY; y++) {
    for (let x = component.bbox.minX; x <= component.bbox.maxX; x++) {
      if (!component.mask[y * w + x]) continue;
      n++;
      sumX += x;
      sumY += y;
    }
  }
  if (n < 6) return false;
  const cx = sumX / n;
  const cy = sumY / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let y = component.bbox.minY; y <= component.bbox.maxY; y++) {
    for (let x = component.bbox.minX; x <= component.bbox.maxX; x++) {
      if (!component.mask[y * w + x]) continue;
      const dx = x - cx;
      const dy = y - cy;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
  }
  if (sxy >= 0) return false;
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const angleDeg = Math.abs((angle * 180) / Math.PI);
  if (Math.abs(angleDeg - 45) > 30) return false;
  const tmp = Math.sqrt((sxx - syy) * (sxx - syy) + 4 * sxy * sxy);
  const lambda1 = (sxx + syy + tmp) / 2;
  const lambda2 = (sxx + syy - tmp) / 2;
  return lambda1 / Math.max(1, lambda2) >= 3;
};

const normalizeFractionFromDigitString = (rawDigits: string, expectedAnswer: string) => {
  const expected = expectedAnswer.replace(/\s+/g, "");
  const expectedMatch = expected.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (!expectedMatch) return null;
  const expectedNumLen = expectedMatch[1].replace(/[+-]/g, "").length;
  const expectedDenLen = expectedMatch[2].replace(/[+-]/g, "").length;
  if (expectedNumLen <= 0 || expectedDenLen <= 0) return null;
  if (rawDigits.length !== expectedNumLen + expectedDenLen) return null;
  const numerator = rawDigits.slice(0, expectedNumLen);
  const denominator = rawDigits.slice(expectedNumLen);
  if (!numerator || !denominator) return null;
  return `${numerator}/${denominator}`;
};

const parseImproperFromText = (input: string) => {
  const cleaned = input.replace(/\s+/g, "");
  const match = cleaned.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (!match) return null;
  const num = Number(match[1]);
  const den = Number(match[2]);
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) return null;
  return { num, den };
};

const parseMixedFromText = (input: string) => {
  const normalized = input.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
  if (!match) return null;
  const whole = Number(match[1]);
  const num = Number(match[2]);
  const den = Number(match[3]);
  if (!Number.isInteger(whole) || !Number.isInteger(num) || !Number.isInteger(den) || den <= 0) return null;
  if (num < 0 || num >= den) return null;
  return { whole, num, den };
};

const improperToMixedLocal = (num: number, den: number) => {
  const sign = num < 0 ? -1 : 1;
  const absNum = Math.abs(num);
  const whole = Math.floor(absNum / den);
  const rem = absNum % den;
  return { whole: sign * whole, num: rem, den };
};

const normalizeMixedFractionFromDigitString = (rawDigits: string, expectedAnswer: string, expectedForm: ExpectedForm) => {
  if (expectedForm === "improper") {
    return normalizeFractionFromDigitString(rawDigits, expectedAnswer);
  }
  const mixedExpected = parseMixedFromText(expectedAnswer);
  const improperExpected = parseImproperFromText(expectedAnswer);
  const mixedCanonical = mixedExpected ?? (improperExpected ? improperToMixedLocal(improperExpected.num, improperExpected.den) : null);
  if (!mixedCanonical) return null;
  const wholeLen = String(Math.abs(mixedCanonical.whole)).length;
  const numLen = String(Math.abs(mixedCanonical.num)).length;
  const denLen = String(Math.abs(mixedCanonical.den)).length;
  if (rawDigits.length !== wholeLen + numLen + denLen) return null;
  const wholeRaw = rawDigits.slice(0, wholeLen);
  const numerator = rawDigits.slice(wholeLen, wholeLen + numLen);
  const denominator = rawDigits.slice(wholeLen + numLen);
  if (!wholeRaw || !numerator || !denominator) return null;
  return `${wholeRaw} ${numerator}/${denominator}`;
};

const normalizeDecimalFromDigitString = (rawDigits: string, expectedAnswer: string) => {
  const normalizedExpected = expectedAnswer.trim();
  const dotIndex = normalizedExpected.indexOf(".");
  if (dotIndex === -1) return null;
  const decimalPlaces = normalizedExpected.length - dotIndex - 1;
  if (decimalPlaces <= 0) return null;
  if (!/^\d+$/.test(rawDigits)) return null;
  if (rawDigits.length <= decimalPlaces) return null;
  const intPart = rawDigits.slice(0, rawDigits.length - decimalPlaces);
  const decPart = rawDigits.slice(rawDigits.length - decimalPlaces);
  if (!intPart || !decPart) return null;
  return `${intPart}.${decPart}`;
};

const inferDecimalDotFromValley = (rawDigits: string, centers: number[]) => {
  if (!/^\d+$/.test(rawDigits) || rawDigits.length <= 1 || centers.length < 2) return rawDigits;
  const usable = Math.min(rawDigits.length, centers.length);
  if (usable < 2) return rawDigits;
  let bestGap = -1;
  let bestIndex = 1;
  for (let i = 1; i < usable; i++) {
    const gap = centers[i] - centers[i - 1];
    if (gap > bestGap) {
      bestGap = gap;
      bestIndex = i;
    }
  }
  if (bestIndex <= 0 || bestIndex >= rawDigits.length) return rawDigits;
  return `${rawDigits.slice(0, bestIndex)}.${rawDigits.slice(bestIndex)}`;
};

const splitByProjection = (bin: Uint8Array, w: number, h: number, bbox: BBox, force = false, customThreshold?: number) => {
  const width = bbox.maxX - bbox.minX + 1;
  const height = bbox.maxY - bbox.minY + 1;
  if (width < 6 || height < 6) return null;
  const colSum = new Uint32Array(width);
  for (let y = bbox.minY; y <= bbox.maxY; y++) {
    const row = y * w;
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      colSum[x - bbox.minX] += bin[row + x];
    }
  }
  const leftBound = Math.floor(width * 0.3);
  const rightBound = Math.floor(width * 0.7);
  let minVal = 1000000;
  let minX = -1;
  for (let x = leftBound; x <= rightBound; x++) {
    if (colSum[x] < minVal) {
      minVal = colSum[x];
      minX = x;
    }
  }
  const splitThreshold = customThreshold ?? Math.max(2, Math.floor(height * 0.08));
  if (minX === -1) return null;
  if (!force && minVal > splitThreshold) return null;
  if (force && (minX <= 1 || minX >= width - 2)) {
    minX = Math.floor(width / 2);
  }
  const splitAt = bbox.minX + minX;
  const leftMask = new Uint8Array(w * h);
  const rightMask = new Uint8Array(w * h);
  for (let y = bbox.minY; y <= bbox.maxY; y++) {
    const row = y * w;
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      if (!bin[row + x]) continue;
      if (x <= splitAt) leftMask[row + x] = 1;
      else rightMask[row + x] = 1;
    }
  }
  const leftBox = computeBBox(leftMask, w, h);
  const rightBox = computeBBox(rightMask, w, h);
  if (!leftBox || !rightBox) return null;
  const leftArea = (leftBox.maxX - leftBox.minX + 1) * (leftBox.maxY - leftBox.minY + 1);
  const rightArea = (rightBox.maxX - rightBox.minX + 1) * (rightBox.maxY - rightBox.minY + 1);
  return [
    { mask: leftMask, bbox: leftBox, area: leftArea },
    { mask: rightMask, bbox: rightBox, area: rightArea }
  ] as Component[];
};

const splitBySpans = (bin: Uint8Array, w: number, h: number, bbox: BBox, expectedDigits: number) => {
  const width = bbox.maxX - bbox.minX + 1;
  const height = bbox.maxY - bbox.minY + 1;
  const colSum = new Uint32Array(width);
  for (let y = bbox.minY; y <= bbox.maxY; y++) {
    const row = y * w;
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      colSum[x - bbox.minX] += bin[row + x];
    }
  }
  const minInk = Math.max(2, Math.floor(height * 0.03));
  const gapMin = Math.max(2, Math.floor(width * 0.02));
  const spans: Array<{ start: number; end: number }> = [];
  let inSpan = false;
  let spanStart = 0;
  let gapCount = 0;
  for (let x = 0; x < width; x++) {
    if (colSum[x] >= minInk) {
      if (!inSpan) {
        inSpan = true;
        spanStart = x;
      }
      gapCount = 0;
    } else if (inSpan) {
      gapCount++;
      if (gapCount >= gapMin) {
        spans.push({ start: spanStart, end: x - gapCount });
        inSpan = false;
        gapCount = 0;
      }
    }
  }
  if (inSpan) spans.push({ start: spanStart, end: width - 1 });
  if (spans.length <= 1 || spans.length < expectedDigits) return null;
  const components: Component[] = [];
  for (const span of spans) {
    const mask = new Uint8Array(w * h);
    for (let y = bbox.minY; y <= bbox.maxY; y++) {
      const row = y * w;
      for (let x = bbox.minX + span.start; x <= bbox.minX + span.end; x++) {
        if (!bin[row + x]) continue;
        mask[row + x] = 1;
      }
    }
    const box = computeBBox(mask, w, h);
    if (!box) continue;
    const area = (box.maxX - box.minX + 1) * (box.maxY - box.minY + 1);
    components.push({ mask, bbox: box, area });
  }
  if (components.length <= 1) return null;
  let maxArea = 0;
  let minArea = Number.MAX_SAFE_INTEGER;
  let totalArea = 0;
  for (const c of components) {
    if (c.area > maxArea) maxArea = c.area;
    if (c.area < minArea) minArea = c.area;
    totalArea += c.area;
  }
  if (minArea / maxArea < 0.25) return null;
  if (totalArea / (width * height) < 0.12) return null;
  return components;
};

const splitComponentGreedyByProjection = (bin: Uint8Array, w: number, h: number, root: Component, targetDigits: number, splitThreshold?: number) => {
  if (targetDigits <= 1) return [root];
  const parts: Component[] = [root];
  while (parts.length < targetDigits) {
    let widestIndex = -1;
    let widest = 0;
    for (let i = 0; i < parts.length; i++) {
      const box = parts[i].bbox;
      const width = box.maxX - box.minX + 1;
      if (width > widest) {
        widest = width;
        widestIndex = i;
      }
    }
    if (widestIndex === -1 || widest < 6) break;
    const pivot = parts[widestIndex];
    const split = splitByProjection(bin, w, h, pivot.bbox, true, splitThreshold);
    if (!split || split.length < 2) break;
    parts.splice(widestIndex, 1, ...split);
  }
  return parts;
};

const shift28 = (src: Float32Array, dx: number, dy: number) => {
  const out = new Float32Array(28 * 28);
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const sx = x - dx;
      const sy = y - dy;
      if (sx < 0 || sx >= 28 || sy < 0 || sy >= 28) continue;
      out[y * 28 + x] = src[sy * 28 + sx];
    }
  }
  return out;
};

const predictDigitEnsemble = (tensor: tf.Tensor2D) => {
  const base = Float32Array.from(tensor.dataSync());
  const variants = [base, shift28(base, 1, 0), shift28(base, -1, 0), shift28(base, 0, 1), shift28(base, 0, -1)];
  const sum = new Array<number>(10).fill(0);
  let used = 0;
  for (const v of variants) {
    const t = tf.tensor2d(v, [28, 28]);
    const pred = predictMnistDigitWithProbs(t);
    t.dispose();
    if (!pred) continue;
    for (let i = 0; i < 10; i++) sum[i] += pred.probabilities[i] ?? 0;
    used++;
  }
  if (!used) return null;
  const probabilities = sum.map((v) => v / used);
  let bestIdx = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[bestIdx]) bestIdx = i;
  }
  let secondIdx = bestIdx === 0 ? 1 : 0;
  for (let i = 0; i < probabilities.length; i++) {
    if (i !== bestIdx && probabilities[i] > probabilities[secondIdx]) secondIdx = i;
  }
  const bestProb = probabilities[bestIdx] ?? 0;
  const secondProb = probabilities[secondIdx] ?? 0;
  return { predictedDigit: String(bestIdx), probabilities, bestProb, margin: bestProb - secondProb };
};

const quadrantInk = (data: Float32Array, x0: number, y0: number, x1: number, y1: number, width = 28) => {
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sum += data[y * width + x] > 0.5 ? 1 : 0;
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
};

const hasUpperLoop = (data: Float32Array, width = 28, height = 28) => {
  const half = Math.floor(height * 0.6);
  let rowsWithLoop = 0;
  for (let y = 0; y < half; y++) {
    let runs = 0;
    let inWhite = false;
    for (let x = 0; x < width; x++) {
      const v = data[y * width + x];
      if (v > 0.5) {
        if (!inWhite) {
          runs++;
          inWhite = true;
        }
      } else {
        inWhite = false;
      }
    }
    if (runs >= 2) rowsWithLoop++;
  }
  return rowsWithLoop >= 4;
};

const hasLowerLoop = (data: Float32Array, width = 28, height = 28) => {
  const start = Math.floor(height * 0.4);
  let rowsWithLoop = 0;
  for (let y = start; y < height; y++) {
    let runs = 0;
    let inWhite = false;
    for (let x = 0; x < width; x++) {
      const v = data[y * width + x];
      if (v > 0.5) {
        if (!inWhite) {
          runs++;
          inWhite = true;
        }
      } else {
        inWhite = false;
      }
    }
    if (runs >= 2) rowsWithLoop++;
  }
  return rowsWithLoop >= 4;
};

const countHoles = (data: Float32Array, width = 28, height = 28, minArea = 18) => {
  const size = width * height;
  const bg = new Uint8Array(size);
  const visited = new Uint8Array(size);
  for (let i = 0; i < size; i++) bg[i] = data[i] > 0.5 ? 0 : 1;
  const stack: number[] = [];
  const push = (idx: number) => {
    visited[idx] = 1;
    stack.push(idx);
  };
  const flood = (start: number) => {
    let area = 0;
    push(start);
    while (stack.length) {
      const idx = stack.pop()!;
      area++;
      const x = idx % width;
      const y = Math.floor(idx / width);
      if (x > 0) {
        const left = idx - 1;
        if (bg[left] && !visited[left]) push(left);
      }
      if (x < width - 1) {
        const right = idx + 1;
        if (bg[right] && !visited[right]) push(right);
      }
      if (y > 0) {
        const up = idx - width;
        if (bg[up] && !visited[up]) push(up);
      }
      if (y < height - 1) {
        const down = idx + width;
        if (bg[down] && !visited[down]) push(down);
      }
    }
    return area;
  };
  for (let x = 0; x < width; x++) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (bg[top] && !visited[top]) flood(top);
    if (bg[bottom] && !visited[bottom]) flood(bottom);
  }
  for (let y = 0; y < height; y++) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (bg[left] && !visited[left]) flood(left);
    if (bg[right] && !visited[right]) flood(right);
  }
  let holes = 0;
  for (let i = 0; i < size; i++) {
    if (bg[i] && !visited[i]) {
      const area = flood(i);
      if (area >= minArea) holes++;
    }
  }
  return holes;
};

const refineDigitPrediction = (pred: string, tensor: tf.Tensor2D, probs?: number[]) => {
  const data = Float32Array.from(tensor.dataSync());
  const hasLoop = hasUpperLoop(data);
  const holes = countHoles(data, 28, 28, 8);
  const hasLower = hasLowerLoop(data);
  const p4 = probs?.[4] ?? 0;
  const p0 = probs?.[0] ?? 0;
  const p8 = probs?.[8] ?? 0;
  const p9 = probs?.[9] ?? 0;
  const p5 = probs?.[5] ?? 0;
  const p6 = probs?.[6] ?? 0;
  let out = pred;
  if (out === "5" || out === "6") {
    if (holes >= 1) return "6";
    const lowerMid = quadrantInk(data, 8, 16, 20, 28);
    const midRight = quadrantInk(data, 16, 10, 28, 20);
    const midLeft = quadrantInk(data, 0, 10, 12, 20);
    const topBand = quadrantInk(data, 6, 0, 22, 8);
    if (hasLower && (midRight > 0.14 || lowerMid > 0.2)) return "6";
    if (!hasLower && topBand > 0.16 && midLeft >= midRight) return "5";
    if (Math.abs(p5 - p6) >= 0.08) return p6 > p5 ? "6" : "5";
  }
  if (out === "4" || out === "8" || out === "9") {
    const lowerRight = quadrantInk(data, 14, 14, 28, 28);
    const lowerLeft = quadrantInk(data, 0, 14, 14, 28);
    const center = quadrantInk(data, 10, 10, 18, 18);
    const rightMid = quadrantInk(data, 18, 8, 28, 20);
    const bestProb = Math.max(p4, p8, p9);
    if (bestProb >= 0.78) return bestProb === p8 ? "8" : bestProb === p9 ? "9" : "4";
    if (holes >= 2) return "8";
    if (holes === 0) {
      if (p9 - p4 > 0.14 && hasLower && rightMid > 0.12) return "9";
      return "4";
    }
    if (hasLoop && hasLower && center < 0.11) return "8";
    if (p8 > 0.72 && hasLoop && hasLower && lowerLeft > 0.1 && lowerRight > 0.1) return "8";
    if (hasLower && rightMid > 0.14 && lowerLeft < 0.1) return "9";
    if (hasLower && rightMid > 0.12 && lowerRight > lowerLeft + 0.05) return "9";
    if (center > 0.14 && lowerLeft < 0.12) return "4";
    if (Math.max(p4, p8, p9) === p4) return "4";
    if (Math.max(p4, p8, p9) === p9) return "9";
    return "8";
  }
  if (out === "0" || out === "8") {
    const center = quadrantInk(data, 10, 10, 18, 18);
    const midBand = quadrantInk(data, 8, 12, 20, 16);
    if (holes >= 2) return "8";
    if (holes === 1) {
      if (p8 - p0 > 0.22 && center > 0.16 && midBand > 0.12) return "8";
      if (p0 - p8 > 0.08) return "0";
      return center > 0.2 ? "8" : "0";
    }
    if (p8 > 0.9 && center > 0.22 && midBand > 0.15) return "8";
    return "0";
  }
  if (out === "9") {
    if (holes >= 2 || (hasLoop && hasLower)) out = "8";
    else if (holes === 0 || !hasLower) {
      out = quadrantInk(data, 0, 16, 14, 28) > 0.12 ? "4" : "7";
    }
  }
  if (out === "4" && hasLoop) {
    if (holes >= 2) out = "8";
    else if (holes >= 1 && hasLower) out = "9";
  }
  if (out === "8") {
    if (holes < 2) out = !hasLoop || !hasLower ? "4" : "9";
  }
  return out;
};

const maybeSplitFractionComponent = (bin: Uint8Array, w: number, h: number, component: Component, splitThreshold?: number) => {
  const bw = component.bbox.maxX - component.bbox.minX + 1;
  const bh = component.bbox.maxY - component.bbox.minY + 1;
  if (bw < 10 || bh < 8) return [component];
  if (bw / Math.max(1, bh) < 0.8) return [component];
  const split = splitBySpans(bin, w, h, component.bbox, 2) || splitByProjection(bin, w, h, component.bbox, true, splitThreshold);
  return split && split.length > 1 ? split : [component];
};

const predictSampleDigit = (sample: DigitSample): string | null => {
  const pred = predictDigitEnsemble(sample.tensor);
  if (!pred) return null;
  if (pred.bestProb < 0.34 || pred.margin < 0.04) return null;
  return refineDigitPrediction(pred.predictedDigit, sample.tensor, pred.probabilities);
};

const recognizeFractionFromCanvas = (canvas: HTMLCanvasElement, roi: RecognitionRoi): FractionRecognition | null => {
  const binData = binarizeCanvasInRoi(canvas, roi);
  if (!binData) return null;
  const { bin, w, h, ink, threshold } = binData;
  const tuning = getBinarizeTuning(roi);
  const allComponents = findComponents(bin, w, h);
  if (allComponents.length === 0) return null;
  let maxArea = 0;
  for (const c of allComponents) if (c.area > maxArea) maxArea = c.area;
  const slashCandidates = allComponents.filter((c) => c.area >= 6 && isSlashComponent(c, w, maxArea, h)).sort((a, b) => b.area - a.area);
  if (slashCandidates.length === 0) return null;
  const slash = slashCandidates[0];
  const slashCenterX = (slash.bbox.minX + slash.bbox.maxX) / 2;
  const dotThreshold = Math.max(5, Math.floor(threshold * tuning.dotThresholdRatio));
  const dotBin = new Uint8Array(w * h);
  for (let y = roi.minY; y <= roi.maxY; y++) {
    const row = y * w;
    for (let x = roi.minX; x <= roi.maxX; x++) {
      const i = row + x;
      dotBin[i] = ink[i] >= dotThreshold ? 1 : 0;
    }
  }
  const dotComponents = findComponents(dotBin, w, h);
  const dotCandidates = detectDecimalDots(dotComponents, maxArea, h, roi);
  const dotBoxes = dotCandidates.map((c) => c.bbox);
  const isDotLike = (component: Component) =>
    dotBoxes.some((box) =>
      component.bbox.minX >= box.minX - 1 &&
      component.bbox.maxX <= box.maxX + 1 &&
      component.bbox.minY >= box.minY - 1 &&
      component.bbox.maxY <= box.maxY + 1
    );
  const minKeep = Math.max(6, Math.floor(Math.max(maxArea * 0.02, roi.width * roi.height * tuning.fractionMinKeepRatio)));
  const components = allComponents.filter((c) => c !== slash && c.area >= minKeep && !isDotLike(c));
  if (components.length < 2) return null;
  const valueComponents: Component[] = [];
  for (const component of components) {
    valueComponents.push(...maybeSplitFractionComponent(bin, w, h, component, tuning.splitThreshold));
  }
  const left = valueComponents.filter((c) => (c.bbox.minX + c.bbox.maxX) / 2 < slashCenterX).sort((a, b) => a.bbox.minX - b.bbox.minX);
  const right = valueComponents.filter((c) => (c.bbox.minX + c.bbox.maxX) / 2 > slashCenterX).sort((a, b) => a.bbox.minX - b.bbox.minX);
  if (left.length === 0 || right.length === 0) return null;
  const samples: DigitSample[] = [];
  const readSide = (parts: Component[]) => {
    let out = "";
    for (const part of parts) {
      const sample = componentToTensor(part, w, h);
      if (!sample) return null;
      const digit = predictSampleDigit(sample);
      if (!digit) {
        sample.tensor.dispose();
        return null;
      }
      out += digit;
      samples.push(sample);
    }
    return out;
  };
  const numerator = readSide(left);
  if (!numerator) {
    samples.forEach((s) => s.tensor.dispose());
    return null;
  }
  const denominator = readSide(right);
  if (!denominator) {
    samples.forEach((s) => s.tensor.dispose());
    return null;
  }
  return { predictedText: `${numerator}/${denominator}`, samples };
};

const recognizeMixedFractionFromCanvas = (canvas: HTMLCanvasElement, expectedForm: ExpectedForm, roi: RecognitionRoi): FractionRecognition | null => {
  const base = recognizeFractionFromCanvas(canvas, roi);
  if (!base) return null;
  if (expectedForm === "improper") return base;
  const binData = binarizeCanvasInRoi(canvas, roi);
  if (!binData) return base;
  const { w, h, bin } = binData;
  const allComponents = findComponents(bin, w, h);
  if (allComponents.length === 0) return base;
  let maxArea = 0;
  for (const c of allComponents) if (c.area > maxArea) maxArea = c.area;
  const slashCandidates = allComponents.filter((c) => c.area >= 6 && isSlashComponent(c, w, maxArea, h)).sort((a, b) => b.area - a.area);
  if (slashCandidates.length === 0) return base;
  const slash = slashCandidates[0];
  const wholeBoundary = slash.bbox.minX - Math.max(8, Math.floor((slash.bbox.maxX - slash.bbox.minX + 1) * 0.5));
  const wholeParts = allComponents.filter((c) => c !== slash && (c.bbox.minX + c.bbox.maxX) / 2 < wholeBoundary).sort((a, b) => a.bbox.minX - b.bbox.minX);
  if (wholeParts.length === 0) return base;
  const wholeSamples: DigitSample[] = [];
  let wholeDigits = "";
  for (const part of wholeParts) {
    const sample = componentToTensor(part, w, h);
    if (!sample) continue;
    const digit = predictSampleDigit(sample);
    if (!digit) {
      sample.tensor.dispose();
      continue;
    }
    wholeDigits += digit;
    wholeSamples.push(sample);
  }
  if (!wholeDigits) {
    wholeSamples.forEach((s) => s.tensor.dispose());
    return base;
  }
  const fracMatch = base.predictedText.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (!fracMatch) {
    wholeSamples.forEach((s) => s.tensor.dispose());
    return base;
  }
  return { predictedText: `${wholeDigits} ${fracMatch[1]}/${fracMatch[2]}`, samples: [...wholeSamples, ...base.samples] };
};

const preprocessDigits = (
  canvas: HTMLCanvasElement,
  expectedDigits: number,
  roi: RecognitionRoi,
  options?: { disableForcedSplit?: boolean }
) => {
  const binData = binarizeCanvasInRoi(canvas, roi);
  if (!binData) return { samples: [], dotXs: [] };
  const { bin, w, h, ink, threshold } = binData;
  const tuning = getBinarizeTuning(roi);
  let components = findComponents(bin, w, h);
  if (components.length === 0) return { samples: [], dotXs: [] };
  let maxArea = 0;
  for (const c of components) if (c.area > maxArea) maxArea = c.area;
  const dotThreshold = Math.max(5, Math.floor(threshold * tuning.dotThresholdRatio));
  const dotBin = new Uint8Array(w * h);
  for (let y = roi.minY; y <= roi.maxY; y++) {
    const row = y * w;
    for (let x = roi.minX; x <= roi.maxX; x++) {
      const i = row + x;
      dotBin[i] = ink[i] >= dotThreshold ? 1 : 0;
    }
  }
  const dotComponents = findComponents(dotBin, w, h);
  const dotCandidates = detectDecimalDots(dotComponents, maxArea, h, roi);
  const dotXs = dotCandidates.map((c) => (c.bbox.minX + c.bbox.maxX) / 2).sort((a, b) => a - b);
  const dotSet = new Set(dotCandidates);
  const minKeep = Math.max(8, Math.floor(Math.max(maxArea * 0.06, roi.width * roi.height * tuning.integerMinKeepRatio)));
  components = components.filter((c) => c.area >= minKeep && !dotSet.has(c));
  if (components.length === 0) return { samples: [], dotXs };
  if (components.length === 1 && expectedDigits > 1 && !options?.disableForcedSplit) {
    const split = splitBySpans(bin, w, h, components[0].bbox, expectedDigits) || splitByProjection(bin, w, h, components[0].bbox, false, tuning.splitThreshold);
    if (split && split.length >= expectedDigits) components = split;
    else {
      const greedySplit = splitComponentGreedyByProjection(bin, w, h, components[0], expectedDigits, tuning.splitThreshold);
      if (greedySplit.length > 1) components = greedySplit;
    }
  }
  components.sort((a, b) => a.bbox.minX - b.bbox.minX);
  const samples: DigitSample[] = [];
  for (const component of components.slice(0, Math.max(1, expectedDigits))) {
    const sample = componentToTensor(component, w, h);
    if (sample) samples.push(sample);
  }
  return { samples, dotXs };
};

const getDrawingCanvas = (ref: any): HTMLCanvasElement | null => {
  const base = ref?.canvas;
  const candidate = base?.drawing?.canvas ?? base?.drawing ?? null;
  return candidate instanceof HTMLCanvasElement ? candidate : null;
};

export function useQuestRecognition(args: any) {
  const {
    inputMode,
    quest,
    isDrawingRef,
    isModelReady,
    cooldownUntilRef,
    isRecognizing,
    inFlightRef,
    pendingRecognizeRef,
    isStarting,
    autoJudgeEnabled,
    canvasRef,
    visibleCanvasSize,
    currentItem,
    currentType,
    forceFractionRecognitionRef,
    forceMixedRecognitionRef,
    forcedFractionAnswerRef,
    forcedExpectedFormRef,
    quadraticAnswers,
    quadraticActiveIndex,
    setQuadraticAnswers,
    setQuadraticActiveIndex,
    setRecognizedNumber,
    setPracticeResult,
    sendSessionAnswer,
    sendLearningAnswer,
    setQuestionResults,
    itemIndex,
    combo,
    setCombo,
    useFastLearningLoop,
    queueAdvanceAfterFeedback,
    autoNextEnabled,
    AUTO_ADVANCE_MS,
    autoNextTimerRef,
    autoRecognizeTimerRef,
    wrongMarkTimerRef,
    FEEDBACK_FLASH_MS,
    nextQuestion,
    isLearningSessionMode,
    setResultMark,
    setIsRecognizing,
    setPreviewImages,
    setLastAutoDrawExpected,
    setAutoDrawBatchSummary,
    lastDrawAtRef,
    forcedDigitsRef,
    getAutoJudgeDelayMs,
    resolveExpectedFormFromPrompt,
    isMixedFractionQuestion,
    isQuadraticRootsType,
    gradeAnswer,
    tf: tfOverride,
    currentQuestionIndex,
    is2DigitModelReady,
    setInput,
    recognizedNumber,
    input,
    setPreviewImagesState,
    setQuadraticFractionInputs
  } = args;
  void tfOverride;
  void currentQuestionIndex;
  void setInput;
  void recognizedNumber;
  void input;
  void setPreviewImagesState;
  void setQuadraticFractionInputs;

  const getAnswerDigits = () => {
    if (forcedDigitsRef.current) return forcedDigitsRef.current;
    if (!currentItem) return 1;
    const n = String(currentItem.answer).replace(/\D/g, "").length;
    return Math.min(4, Math.max(1, n || 1));
  };

  const handleHandwritingJudge = async (): Promise<string> => {
    setIsRecognizing(true);
    const drawingCanvas = getDrawingCanvas(canvasRef.current);
    if (!drawingCanvas) {
      setIsRecognizing(false);
      return "";
    }
    const recognitionRoi = getRecognitionRoi(drawingCanvas, visibleCanvasSize);
    const digits = getAnswerDigits();
    const promptText = currentItem?.prompt ?? "";
    const promptTex = currentItem?.prompt_tex;
    const isQuadraticQuestion = /二次方程式/.test(`${promptText} ${promptTex ?? ""}`);
    const forcedFractionAnswer = forcedFractionAnswerRef.current;
    const expectedFractionAnswer = forcedFractionAnswer ?? (currentItem?.answer.includes("/") ? currentItem.answer : null);
    const expectedForm = forcedExpectedFormRef.current ?? resolveExpectedFormFromPrompt(`${promptText} ${promptTex ?? ""}`);
    const mixedQuestion = forceMixedRecognitionRef.current || isMixedFractionQuestion(currentType?.type_id, promptText, promptTex);
    const plainFractionQuestion =
      forceFractionRecognitionRef.current || (currentType?.answer_format.kind === "frac" && Boolean(currentItem?.answer.includes("/")));
    let mixedResult: FractionRecognition | null = null;
    if (mixedQuestion) mixedResult = recognizeMixedFractionFromCanvas(drawingCanvas, expectedForm, recognitionRoi);
    let fractionResult: FractionRecognition | null = null;
    if (!mixedResult && (plainFractionQuestion || mixedQuestion)) {
      fractionResult = recognizeFractionFromCanvas(drawingCanvas, recognitionRoi);
    }
    const fallback = preprocessDigits(drawingCanvas, digits, recognitionRoi, { disableForcedSplit: isQuadraticQuestion });
    const samples = mixedResult?.samples ?? fractionResult?.samples ?? fallback.samples;
    const dotXs = mixedResult || fractionResult ? [] : fallback.dotXs;
    if (samples.length === 0) {
      canvasRef.current?.clear();
      setIsRecognizing(false);
      setPreviewImages([]);
      return "";
    }
    let predictedText = mixedResult?.predictedText ?? fractionResult?.predictedText ?? "";
    if (!predictedText) {
      const perDigitPreds = samples.map((s) => predictDigitEnsemble(s.tensor));
      const refined = perDigitPreds.map((pred, i) =>
        !pred || pred.bestProb < 0.32 || pred.margin < 0.035 ? null : refineDigitPrediction(pred.predictedDigit, samples[i].tensor, pred.probabilities)
      );
      const perDigitString = refined.some((d) => d === null) ? "" : refined.join("");
      predictedText = perDigitString;
      if (samples.length === 2 && is2DigitModelReady && dotXs.length === 0 && !isQuadraticQuestion) {
        const gap = 6;
        const width = 28 * 2 + gap;
        const composite = new Float32Array(28 * width);
        const leftData = Array.from(samples[0].tensor.dataSync());
        const rightData = Array.from(samples[1].tensor.dataSync());
        for (let y = 0; y < 28; y++) {
          for (let x = 0; x < 28; x++) {
            composite[y * width + x] = leftData[y * 28 + x];
            composite[y * width + (x + 28 + gap)] = rightData[y * 28 + x];
          }
        }
        const compositeTensor = tf.tensor2d(composite, [28, width]);
        const multi = predictMnist2DigitWithProbs(compositeTensor);
        compositeTensor.dispose();
        if (multi) {
          const maxProb = Math.max(...multi.probabilities);
          const perDigitConfidence = perDigitPreds
            .filter((pred): pred is NonNullable<typeof pred> => Boolean(pred))
            .map((pred) => pred.bestProb);
          const minPerDigitConfidence = perDigitConfidence.length > 0 ? Math.min(...perDigitConfidence) : 1;
          if (maxProb >= 0.7 && minPerDigitConfidence < 0.72 && /^\d{2}$/.test(multi.predictedValue)) {
            predictedText = multi.predictedValue;
          }
        }
      }
      if ((plainFractionQuestion || mixedQuestion) && perDigitString && expectedFractionAnswer) {
        predictedText = mixedQuestion
          ? normalizeMixedFractionFromDigitString(perDigitString, expectedFractionAnswer, expectedForm) ?? predictedText
          : normalizeFractionFromDigitString(perDigitString, expectedFractionAnswer) ?? predictedText;
      }
      if (!predictedText && currentItem?.answer?.includes(".") && perDigitString) {
        const expectedDecimal = normalizeDecimalFromDigitString(perDigitString, currentItem.answer);
        if (expectedDecimal) predictedText = expectedDecimal;
      }
    }
    if (predictedText && dotXs.length > 0) {
      const centers = samples.map((s) => s.centerX);
      let chosenDot = dotXs[0];
      if (centers.length >= 2) {
        const between = dotXs.find((x) => x > centers[0] && x < centers[1]);
        if (between !== undefined) chosenDot = between;
        else if (dotXs.length > 1) chosenDot = dotXs[dotXs.length - 1];
      }
      let insertAt = 0;
      while (insertAt < centers.length && chosenDot > centers[insertAt]) insertAt += 1;
      if (insertAt > 0 && insertAt < predictedText.length) {
        predictedText = `${predictedText.slice(0, insertAt)}.${predictedText.slice(insertAt)}`;
      }
    }
    if (predictedText && dotXs.length === 0 && currentItem?.answer?.includes(".") && /^\d+$/.test(predictedText)) {
      const centers = samples.map((s) => s.centerX);
      const byValley = inferDecimalDotFromValley(predictedText, centers);
      if (byValley.includes(".")) predictedText = byValley;
      const expectedDecimal = normalizeDecimalFromDigitString(predictedText.replace(/\D/g, ""), currentItem.answer);
      if (expectedDecimal) predictedText = expectedDecimal;
    }
    if (!predictedText) setCombo(0);
    setPreviewImages(samples.map((s) => s.preview));
    samples.forEach((s) => s.tensor.dispose());
    if (predictedText) setRecognizedNumber(predictedText);
    if (predictedText && currentItem && currentType) {
      let userInputForJudge = predictedText;
      if (isQuadraticRootsType(currentType.type_id)) {
        const nextPair: [string, string] = [...quadraticAnswers] as [string, string];
        nextPair[quadraticActiveIndex] = predictedText;
        const normalizedPair: [string, string] = [nextPair[0].trim(), nextPair[1].trim()];
        setQuadraticAnswers(normalizedPair);
        const nextActive: 0 | 1 =
          normalizedPair[0] && !normalizedPair[1] ? 1 : !normalizedPair[0] && normalizedPair[1] ? 0 : quadraticActiveIndex;
        setQuadraticActiveIndex(nextActive);
        setRecognizedNumber(normalizedPair.filter(Boolean).join(","));
        if (!normalizedPair[0] || !normalizedPair[1]) {
          canvasRef.current?.clear();
          setIsRecognizing(false);
          return predictedText;
        }
        userInputForJudge = `${normalizedPair[0]},${normalizedPair[1]}`;
      }
      const verdict = gradeAnswer(userInputForJudge, currentItem.answer, currentType.answer_format, {
        typeId: currentType.type_id,
        expectedForm
      });
      const answerText = userInputForJudge;
      setPracticeResult({ ok: verdict.ok, correctAnswer: currentItem.answer });
      await sendSessionAnswer(answerText, verdict);
      await sendLearningAnswer(answerText, verdict);
      setQuestionResults((prev: Record<number, any>) => ({
        ...prev,
        [itemIndex]: (() => {
          const prevEntry = prev[itemIndex];
          const everWrong = (prevEntry?.everWrong ?? false) || !verdict.ok;
          const firstWrongAnswer = prevEntry?.firstWrongAnswer ?? (!verdict.ok ? answerText : undefined);
          return {
            prompt: currentItem.prompt,
            promptTex: currentItem.prompt_tex,
            userAnswer: answerText,
            correct: !everWrong,
            correctAnswer: currentItem.answer,
            everWrong,
            firstWrongAnswer
          };
        })()
      }));
      if (verdict.ok) {
        setCombo(combo + 1);
        if (useFastLearningLoop) {
          queueAdvanceAfterFeedback(verdict);
        } else if (autoNextEnabled) {
          cooldownUntilRef.current = Date.now() + AUTO_ADVANCE_MS;
          if (autoNextTimerRef.current) {
            window.clearTimeout(autoNextTimerRef.current);
            autoNextTimerRef.current = null;
          }
          autoNextTimerRef.current = window.setTimeout(() => {
            autoNextTimerRef.current = null;
            if (autoRecognizeTimerRef.current) {
              window.clearTimeout(autoRecognizeTimerRef.current);
              autoRecognizeTimerRef.current = null;
            }
            pendingRecognizeRef.current = false;
            nextQuestion();
          }, AUTO_ADVANCE_MS);
        }
      } else {
        setCombo(0);
        if (useFastLearningLoop && !isLearningSessionMode) {
          queueAdvanceAfterFeedback(verdict);
        } else {
          if (wrongMarkTimerRef.current) window.clearTimeout(wrongMarkTimerRef.current);
          setResultMark("wrong");
          wrongMarkTimerRef.current = window.setTimeout(() => {
            setResultMark(null);
            wrongMarkTimerRef.current = null;
          }, FEEDBACK_FLASH_MS);
        }
      }
    }
    canvasRef.current?.clear();
    setIsRecognizing(false);
    return predictedText;
  };

  const runInference = async (): Promise<string> => {
    if (inputMode !== "handwriting") return "";
    if (quest.status !== "playing") return "";
    if (isDrawingRef.current) return "";
    if (!isModelReady) return "";
    if (Date.now() < cooldownUntilRef.current) return "";
    if (isRecognizing || inFlightRef.current) {
      pendingRecognizeRef.current = true;
      return "";
    }
    if (isStarting) {
      pendingRecognizeRef.current = true;
      return "";
    }
    inFlightRef.current = true;
    try {
      return await handleHandwritingJudge();
    } finally {
      inFlightRef.current = false;
      if (pendingRecognizeRef.current) {
        pendingRecognizeRef.current = false;
        if (autoJudgeEnabled) {
          void runInference();
        }
      }
    }
  };

  const handleResetAnswer = () => {
    canvasRef.current?.clear();
    if (!args.isQuadraticRootsQuestion) {
      setRecognizedNumber(null);
      return;
    }
    setQuadraticAnswers((prev: [string, string]) => {
      const next: [string, string] = [...prev] as [string, string];
      next[quadraticActiveIndex] = "";
      setRecognizedNumber(next.filter(Boolean).join(","));
      return next;
    });
  };

  const handleCanvasChange = () => {
    lastDrawAtRef.current = Date.now();
    if (isStarting) return;
  };

  const handleDrawStart = () => {
    isDrawingRef.current = true;
    lastDrawAtRef.current = Date.now();
    if (autoRecognizeTimerRef.current) window.clearTimeout(autoRecognizeTimerRef.current);
  };

  const handleDrawEnd = () => {
    isDrawingRef.current = false;
    lastDrawAtRef.current = Date.now();
    if (!autoJudgeEnabled) return;
    if (Date.now() < cooldownUntilRef.current) return;
    if (autoRecognizeTimerRef.current) window.clearTimeout(autoRecognizeTimerRef.current);
    const nextDelay = getAutoJudgeDelayMs(getAnswerDigits()) + (args.inkFirstMode ? 300 : 0);
    autoRecognizeTimerRef.current = window.setTimeout(() => {
      void runInference();
    }, nextDelay);
  };

  const runAutoDrawTest = async (poolOverride?: string[]) => {
    const canvas = getDrawingCanvas(canvasRef.current);
    if (!canvas) return { expected: "", predicted: "" };
    const ctx = canvas.getContext("2d");
    if (!ctx) return { expected: "", predicted: "" };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 84px monospace";
    const pool = poolOverride && poolOverride.length > 0 ? poolOverride : ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const digits = Array.from({ length: 4 }, () => pool[Math.floor(Math.random() * pool.length)]);
    const expected = digits.join("");
    setLastAutoDrawExpected(expected);
    for (let i = 0; i < digits.length; i++) {
      ctx.fillText(digits[i], 16 + i * 64, 200);
    }
    lastDrawAtRef.current = Date.now();
    setPreviewImages([]);
    forcedDigitsRef.current = 4;
    try {
      const predicted = await runInference();
      return { expected, predicted };
    } finally {
      forcedDigitsRef.current = null;
    }
  };

  const runAutoDrawDecimalTest = async (places = 1) => {
    const canvas = getDrawingCanvas(canvasRef.current);
    if (!canvas) return { expected: "", predicted: "" };
    const ctx = canvas.getContext("2d");
    if (!ctx) return { expected: "", predicted: "" };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 84px monospace";
    const digits = Array.from({ length: places + 1 }, () => String(Math.floor(Math.random() * 10)));
    const expected = `${digits[0]}.${digits.slice(1).join("")}`;
    setLastAutoDrawExpected(expected);
    for (let i = 0; i < digits.length; i++) {
      ctx.fillText(digits[i], 16 + i * 64, 200);
    }
    ctx.beginPath();
    ctx.arc(16 + 64 / 2 + 14, 220, 3, 0, Math.PI * 2);
    ctx.fill();
    lastDrawAtRef.current = Date.now();
    setPreviewImages([]);
    forcedDigitsRef.current = digits.length;
    try {
      const predicted = await runInference();
      return { expected, predicted };
    } finally {
      forcedDigitsRef.current = null;
    }
  };

  const calcDigitCount = (text: string) => text.replace(/\D/g, "").length;
  const isEmptyPrediction = (text: string) => text.trim().length === 0;
  const isOverSegmented = (expected: string, predicted: string) => calcDigitCount(predicted) > calcDigitCount(expected);
  const fmtRate = (value: number, total: number) => (total ? ((value / total) * 100).toFixed(1) : "0.0");
  const passLabel = (ok: boolean) => (ok ? "PASS" : "FAIL");

  const runAutoDrawBatchTest = async (runs: number, pool: string[], label: string) => {
    setAutoDrawBatchSummary(`${label} 実行中...`);
    let total = 0;
    let exact = 0;
    let fiveSixTotal = 0;
    let fiveSixExact = 0;
    let fourEightNineTotal = 0;
    let fourEightNineExact = 0;
    let zeroEightTotal = 0;
    let zeroEightExact = 0;
    let emptyCount = 0;
    let overSegmented = 0;
    for (let i = 0; i < runs; i++) {
      const { expected, predicted } = await runAutoDrawTest(pool);
      if (!expected) continue;
      total++;
      if (isEmptyPrediction(predicted)) emptyCount++;
      if (isOverSegmented(expected, predicted)) overSegmented++;
      if (predicted === expected) exact++;
      for (let j = 0; j < Math.min(expected.length, predicted.length); j++) {
        const e = expected[j];
        const p = predicted[j];
        if (e === "5" || e === "6") {
          fiveSixTotal++;
          if (p === e) fiveSixExact++;
        }
        if (e === "0" || e === "8") {
          zeroEightTotal++;
          if (p === e) zeroEightExact++;
        }
        if (e === "4" || e === "8" || e === "9") {
          fourEightNineTotal++;
          if (p === e) fourEightNineExact++;
        }
      }
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    const overall = fmtRate(exact, total);
    const fiveSix = fmtRate(fiveSixExact, fiveSixTotal);
    const fourEightNine = fmtRate(fourEightNineExact, fourEightNineTotal);
    const zeroEight = fmtRate(zeroEightExact, zeroEightTotal);
    const emptyRate = fmtRate(emptyCount, total);
    const overSplitRate = fmtRate(overSegmented, total);
    setAutoDrawBatchSummary(
      `${label} 完了: 全体一致 ${exact}/${total} (${overall}%, ${passLabel(Number(overall) >= 70)}) / 空判定 ${emptyCount}/${total} (${emptyRate}%, ${passLabel(Number(emptyRate) < 10)}) / 過分割 ${overSegmented}/${total} (${overSplitRate}%) / 0&8一致 ${zeroEightExact}/${zeroEightTotal} (${zeroEight}%) / 4&8&9一致 ${fourEightNineExact}/${fourEightNineTotal} (${fourEightNine}%) / 5&6一致 ${fiveSixExact}/${fiveSixTotal} (${fiveSix}%)`
    );
  };

  const runAutoDrawDecimalBatchTest = async (runs: number, label: string) => {
    setAutoDrawBatchSummary(`${label} 実行中...`);
    let total = 0;
    let exact = 0;
    let dotOk = 0;
    for (let i = 0; i < runs; i++) {
      const { expected, predicted } = await runAutoDrawDecimalTest(1);
      if (!expected) continue;
      total++;
      if (predicted === expected) exact++;
      if (predicted.includes(".")) dotOk++;
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    const overall = total ? ((exact / total) * 100).toFixed(1) : "0.0";
    const dotRate = total ? ((dotOk / total) * 100).toFixed(1) : "0.0";
    setAutoDrawBatchSummary(`${label} 完了: 全体一致 ${exact}/${total} (${overall}%) / 小数点検出 ${dotOk}/${total} (${dotRate}%)`);
  };

  const runAutoDrawFractionTest = async (expectedInput?: string) => {
    const canvas = getDrawingCanvas(canvasRef.current);
    if (!canvas) return { expected: "", predicted: "" };
    const ctx = canvas.getContext("2d");
    if (!ctx) return { expected: "", predicted: "" };
    const pool = expectedInput ? [expectedInput] : ["1/2", "2/3", "3/4", "5/6", "7/8", "9/10", "11/12"];
    const expected = pool[Math.floor(Math.random() * pool.length)];
    setLastAutoDrawExpected(expected);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 80px monospace";
    ctx.fillText(expected, 18, 198);
    lastDrawAtRef.current = Date.now();
    setPreviewImages([]);
    forcedDigitsRef.current = expected.replace(/\D/g, "").length;
    forceFractionRecognitionRef.current = true;
    forcedFractionAnswerRef.current = expected;
    try {
      const predicted = await runInference();
      return { expected, predicted };
    } finally {
      forcedDigitsRef.current = null;
      forceFractionRecognitionRef.current = false;
      forcedFractionAnswerRef.current = null;
    }
  };

  const runAutoDrawFractionBatchTest = async (runs: number, label: string) => {
    setAutoDrawBatchSummary(`${label} 実行中...`);
    let total = 0;
    let exact = 0;
    let slashDetected = 0;
    let emptyCount = 0;
    let overSegmented = 0;
    let structureFailed = 0;
    for (let i = 0; i < runs; i++) {
      const { expected, predicted } = await runAutoDrawFractionTest();
      if (!expected) continue;
      total++;
      if (isEmptyPrediction(predicted)) emptyCount++;
      if (isOverSegmented(expected, predicted)) overSegmented++;
      if (predicted === expected) exact++;
      if (predicted.includes("/")) slashDetected++;
      else structureFailed++;
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    const overall = fmtRate(exact, total);
    const slashRate = fmtRate(slashDetected, total);
    const emptyRate = fmtRate(emptyCount, total);
    const overSplitRate = fmtRate(overSegmented, total);
    const structureFailRate = fmtRate(structureFailed, total);
    setAutoDrawBatchSummary(
      `${label} 完了: 全体一致 ${exact}/${total} (${overall}%) / 空判定 ${emptyCount}/${total} (${emptyRate}%, ${passLabel(Number(emptyRate) < 10)}) / 過分割 ${overSegmented}/${total} (${overSplitRate}%) / スラッシュ検出 ${slashDetected}/${total} (${slashRate}%, ${passLabel(Number(slashRate) >= 75)}) / 構造失敗 ${structureFailed}/${total} (${structureFailRate}%)`
    );
  };

  const runAutoDrawMixedTest = async () => {
    const canvas = getDrawingCanvas(canvasRef.current);
    if (!canvas) return { expected: "", predicted: "", expectedForm: "auto" as ExpectedForm };
    const ctx = canvas.getContext("2d");
    if (!ctx) return { expected: "", predicted: "", expectedForm: "auto" as ExpectedForm };
    const scenarios: Array<{ prompt: string; answer: string; expectedForm: ExpectedForm }> = [
      { prompt: "7/3 を帯分数に", answer: "2 1/3", expectedForm: "mixed" },
      { prompt: "9/4 を帯分数に", answer: "2 1/4", expectedForm: "mixed" },
      { prompt: "11/5 を帯分数に", answer: "2 1/5", expectedForm: "mixed" },
      { prompt: "2 1/4 を仮分数に", answer: "9/4", expectedForm: "improper" },
      { prompt: "3 2/5 を仮分数に", answer: "17/5", expectedForm: "improper" },
      { prompt: "1 3/4 を仮分数に", answer: "7/4", expectedForm: "improper" }
    ];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const expected = scenario.answer;
    setLastAutoDrawExpected(`${scenario.prompt} => ${expected}`);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 80px monospace";
    ctx.fillText(expected, 18, 198);
    lastDrawAtRef.current = Date.now();
    setPreviewImages([]);
    forcedDigitsRef.current = expected.replace(/\D/g, "").length;
    forceMixedRecognitionRef.current = true;
    forcedFractionAnswerRef.current = expected;
    forcedExpectedFormRef.current = scenario.expectedForm;
    try {
      const predicted = await runInference();
      return { expected, predicted, expectedForm: scenario.expectedForm };
    } finally {
      forcedDigitsRef.current = null;
      forceMixedRecognitionRef.current = false;
      forcedFractionAnswerRef.current = null;
      forcedExpectedFormRef.current = null;
    }
  };

  const runAutoDrawMixedBatchTest = async (runs: number, label: string) => {
    setAutoDrawBatchSummary(`${label} 実行中...`);
    let total = 0;
    let exact = 0;
    let formOk = 0;
    let slashDetected = 0;
    let mixedExpected = 0;
    let mixedWholeDetected = 0;
    let emptyCount = 0;
    let overSegmented = 0;
    let structureFailed = 0;
    let wholeStructureFailed = 0;
    const isMixedFormat = (v: string) => /^-?\d+\s+\d+\/\d+$/.test(v.trim());
    const isImproperFormat = (v: string) => /^-?\d+\/-?\d+$/.test(v.replace(/\s+/g, ""));
    for (let i = 0; i < runs; i++) {
      const { expected, predicted, expectedForm } = await runAutoDrawMixedTest();
      if (!expected) continue;
      total++;
      if (isEmptyPrediction(predicted)) emptyCount++;
      if (isOverSegmented(expected, predicted)) overSegmented++;
      if (predicted === expected) exact++;
      if (predicted.includes("/")) slashDetected++;
      else structureFailed++;
      if (expectedForm === "mixed") {
        mixedExpected++;
        if (isMixedFormat(predicted)) mixedWholeDetected++;
        else wholeStructureFailed++;
      }
      const matchesForm =
        expectedForm === "mixed" ? isMixedFormat(predicted) : expectedForm === "improper" ? isImproperFormat(predicted) : predicted.includes("/");
      if (matchesForm) formOk++;
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    const overall = fmtRate(exact, total);
    const formRate = fmtRate(formOk, total);
    const slashRate = fmtRate(slashDetected, total);
    const wholeRate = fmtRate(mixedWholeDetected, mixedExpected);
    const emptyRate = fmtRate(emptyCount, total);
    const overSplitRate = fmtRate(overSegmented, total);
    const structureFailRate = fmtRate(structureFailed, total);
    const wholeFailRate = fmtRate(wholeStructureFailed, mixedExpected);
    setAutoDrawBatchSummary(
      `${label} 完了: 全体一致 ${exact}/${total} (${overall}%) / 空判定 ${emptyCount}/${total} (${emptyRate}%, ${passLabel(Number(emptyRate) < 10)}) / 過分割 ${overSegmented}/${total} (${overSplitRate}%) / 形式一致 ${formOk}/${total} (${formRate}%, ${passLabel(Number(formRate) >= 65)}) / スラッシュ検出 ${slashDetected}/${total} (${slashRate}%) / 構造失敗 ${structureFailed}/${total} (${structureFailRate}%) / 整数部検出 ${mixedWholeDetected}/${mixedExpected} (${wholeRate}%) / 整数部構造失敗 ${wholeStructureFailed}/${mixedExpected} (${wholeFailRate}%)`
    );
  };

  return {
    getAnswerDigits,
    runInference,
    handleResetAnswer,
    handleCanvasChange,
    handleDrawStart,
    handleDrawEnd,
    runAutoDrawTest,
    runAutoDrawDecimalTest,
    runAutoDrawBatchTest,
    runAutoDrawDecimalBatchTest,
    runAutoDrawFractionTest,
    runAutoDrawFractionBatchTest,
    runAutoDrawMixedTest,
    runAutoDrawMixedBatchTest
  };
}
