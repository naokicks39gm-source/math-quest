
'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import CanvasDraw from 'react-canvas-draw'; // Import CanvasDraw
import * as tf from '@tensorflow/tfjs'; // Import TensorFlow.js
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { gradeAnswer, AnswerFormat } from '@/lib/grader';
import { getCatalogGrades } from '@/lib/gradeCatalog';
import {
  loadMnistModel,
  loadMnist2DigitModel,
  predictMnistDigitWithProbs,
  predictMnist2DigitWithProbs,
  isModelLoaded,
  is2DigitModelLoaded
} from '@/utils/mnistModel'; // Import MNIST model utilities

type CharacterType = 'warrior' | 'mage';

interface Question {
  val1: number;
  val2: number;
  operator: '+' | '-';
  answer: number;
}

type ExampleItem = {
  prompt: string;
  prompt_tex?: string;
  answer: string;
};

type TypeDef = {
  type_id: string;
  type_name: string;
  display_name?: string;
  answer_format: AnswerFormat;
  example_items: ExampleItem[];
};


type CategoryDef = {
  category_id: string;
  category_name: string;
  types: TypeDef[];
};

type GradeDef = {
  grade_id: string;
  grade_name: string;
  categories: CategoryDef[];
};

type QuestEntry = {
  item: ExampleItem;
  type: TypeDef;
};

const LS_ACTIVE_SESSION_ID = "mq:activeSessionId";
const LS_STUDENT_ID = "mq:studentId";
const QUESTION_POOL_SIZE = 30;

export const getAutoJudgeDelayMs = (digits: number) => {
  if (digits <= 1) return 700;
  if (digits === 2) return 1000;
  return 1300;
};

const shuffle = <T,>(list: T[]) => {
  const copied = [...list];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
};

const buildRandomQuestionSet = (source: QuestEntry[], poolSize: number, quizSize: number) => {
  if (source.length === 0) return [];
  const entryKey = (entry: QuestEntry) =>
    `${entry.type.type_id}::${entry.item.prompt_tex ?? entry.item.prompt}::${entry.item.answer}`;
  const uniqueMap = new Map<string, QuestEntry>();
  for (const entry of source) {
    uniqueMap.set(entryKey(entry), entry);
  }
  const uniqueSource = [...uniqueMap.values()];

  if (uniqueSource.length >= quizSize) {
    return shuffle(uniqueSource).slice(0, quizSize);
  }

  const pool: QuestEntry[] = [];
  if (uniqueSource.length >= poolSize) {
    pool.push(...shuffle(uniqueSource).slice(0, poolSize));
  } else {
    const shuffledBase = shuffle(uniqueSource);
    while (pool.length < poolSize) {
      const remaining = poolSize - pool.length;
      pool.push(...shuffle(shuffledBase).slice(0, Math.min(shuffledBase.length, remaining)));
    }
  }
  const shuffledPool = shuffle(pool);
  const picked: QuestEntry[] = [];
  for (const candidate of shuffledPool) {
    if (picked.length >= quizSize) break;
    const prev = picked[picked.length - 1];
    if (prev && entryKey(prev) === entryKey(candidate)) continue;
    picked.push(candidate);
  }

  // Fill shortfall while preventing immediate duplicates.
  while (picked.length < quizSize && uniqueSource.length > 0) {
    const prev = picked[picked.length - 1];
    const options = uniqueSource.filter((entry) => !prev || entryKey(prev) !== entryKey(entry));
    const bag = options.length > 0 ? options : uniqueSource;
    picked.push(bag[Math.floor(Math.random() * bag.length)]);
  }

  return picked;
};

const typeSignature = (typeId: string) => typeId.replace(/^[A-Z]\d\./, "");

const formatPrompt = (prompt: string) => {
  return prompt.replace(/を計算しなさい。$/g, "");
};

const renderPrompt = (item: ExampleItem) => {
  const tex = item.prompt_tex?.trim();
  if (tex) {
    return <InlineMath math={tex} renderError={() => <span>{formatPrompt(item.prompt)}</span>} />;
  }
  return <span>{formatPrompt(item.prompt)}</span>;
};


const CHARACTERS = {
  warrior: {
    name: 'Warrior',
    emoji: '⚔️',
    color: 'bg-red-100 text-red-800',
    hits: ['Critical Hit!', 'Smash!', 'Take this!'],
    misses: ['Borrow 10 from the neighbor!', 'Don\'t give up!', 'Close, but no cigar!'],
    win: 'Victory is ours!'
  },
  mage: {
    name: 'Mage',
    emoji: '🪄',
    color: 'bg-blue-100 text-blue-800',
    hits: ['Calculated.', 'Just as planned.', 'Logic prevails.'],
    misses: ['Check the digits.', 'Reconfirm the calculation.', 'A slight miscalculation.'],
    win: 'A logical conclusion.'
  }
};

type BBox = { minX: number; minY: number; maxX: number; maxY: number };
type DigitSample = { tensor: tf.Tensor2D; preview: ImageData; width: number; height: number; centerX: number };
type Component = { mask: Uint8Array; bbox: BBox; area: number };
type FractionRecognition = { predictedText: string; samples: DigitSample[] };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

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

const binarizeCanvas = (canvas: HTMLCanvasElement) => {
  const w = Math.max(1, Math.floor(canvas.width));
  const h = Math.max(1, Math.floor(canvas.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const ink = new Uint8Array(w * h);

  let inkCount = 0;
  let inkSum = 0;
  let maxInk = 0;
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a < 10) continue;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const gray = (r + g + b) / 3;
    const v = 255 - gray;
    if (v > 10) {
      ink[i] = v;
      inkCount++;
      inkSum += v;
      if (v > maxInk) maxInk = v;
    }
  }

  if (inkCount === 0) return null;
  const meanInk = inkSum / inkCount;
  const threshold = clamp(Math.floor(Math.max(meanInk * 0.5, maxInk * 0.3)), 15, 200);

  const bin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    bin[i] = ink[i] >= threshold ? 1 : 0;
  }
  return { bin, w, h, ink, threshold };
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

  const padded = document.createElement('canvas');
  padded.width = paddedSize;
  padded.height = paddedSize;
  const pctx = padded.getContext('2d');
  if (!pctx) return null;
  pctx.fillStyle = '#000000';
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

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = 28;
  finalCanvas.height = 28;
  const fctx = finalCanvas.getContext('2d');
  if (!fctx) return null;
  fctx.imageSmoothingEnabled = false;
  fctx.fillStyle = '#000000';
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
  return {
    tensor: tf.tensor2d(input, [28, 28]),
    preview: finalImageData,
    width: boxW,
    height: boxH,
    centerX
  };
};

const detectDecimalDots = (components: Component[], maxArea: number, h: number) => {
  const maxDotArea = Math.max(12, Math.floor(maxArea * 0.03));
  return components.filter((c) => {
    const bw = c.bbox.maxX - c.bbox.minX + 1;
    const bh = c.bbox.maxY - c.bbox.minY + 1;
    const minArea = c.area <= 10 ? 3 : 6;
    if (c.area < minArea) return false;
    if (c.area > maxDotArea) return false;
    if (bw > h * 0.25 || bh > h * 0.25) return false;
    if (c.bbox.minY < h * 0.45) return false;
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
  const linearity = lambda1 / Math.max(1, lambda2);
  return linearity >= 3;
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

const maybeSplitFractionComponent = (bin: Uint8Array, w: number, h: number, component: Component) => {
  const bw = component.bbox.maxX - component.bbox.minX + 1;
  const bh = component.bbox.maxY - component.bbox.minY + 1;
  if (bw < 10 || bh < 8) return [component];
  if (bw / Math.max(1, bh) < 0.8) return [component];
  const split = splitBySpans(bin, w, h, component.bbox, 2) || splitByProjection(bin, w, h, component.bbox, true);
  return split && split.length > 1 ? split : [component];
};

const predictSampleDigit = (sample: DigitSample): string | null => {
  const pred = predictDigitEnsemble(sample.tensor);
  if (!pred) return null;
  return refineDigitPrediction(pred.predictedDigit, sample.tensor, pred.probabilities);
};

const recognizeFractionFromCanvas = (canvas: HTMLCanvasElement): FractionRecognition | null => {
  const binData = binarizeCanvas(canvas);
  if (!binData) return null;
  const { bin, w, h, ink, threshold } = binData;
  const allComponents = findComponents(bin, w, h);
  if (allComponents.length === 0) return null;

  let maxArea = 0;
  for (const c of allComponents) {
    if (c.area > maxArea) maxArea = c.area;
  }

  const slashCandidates = allComponents
    .filter((c) => c.area >= 6 && isSlashComponent(c, w, maxArea, h))
    .sort((a, b) => b.area - a.area);
  if (slashCandidates.length === 0) return null;
  const slash = slashCandidates[0];
  const slashCenterX = (slash.bbox.minX + slash.bbox.maxX) / 2;

  const dotThreshold = Math.max(5, Math.floor(threshold * 0.4));
  const dotBin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    dotBin[i] = ink[i] >= dotThreshold ? 1 : 0;
  }
  const dotComponents = findComponents(dotBin, w, h);
  const dotCandidates = detectDecimalDots(dotComponents, maxArea, h);
  const dotBoxes = dotCandidates.map((c) => c.bbox);
  const isDotLike = (component: Component) =>
    dotBoxes.some((box) =>
      component.bbox.minX >= box.minX - 1 &&
      component.bbox.maxX <= box.maxX + 1 &&
      component.bbox.minY >= box.minY - 1 &&
      component.bbox.maxY <= box.maxY + 1
    );
  const minKeep = Math.max(8, Math.floor(maxArea * 0.015));
  const components = allComponents.filter((c) => c !== slash && c.area >= minKeep && !isDotLike(c));
  if (components.length < 2) return null;

  const valueComponents: Component[] = [];
  for (const component of components) {
    valueComponents.push(...maybeSplitFractionComponent(bin, w, h, component));
  }

  const left = valueComponents
    .filter((c) => (c.bbox.minX + c.bbox.maxX) / 2 < slashCenterX)
    .sort((a, b) => a.bbox.minX - b.bbox.minX);
  const right = valueComponents
    .filter((c) => (c.bbox.minX + c.bbox.maxX) / 2 > slashCenterX)
    .sort((a, b) => a.bbox.minX - b.bbox.minX);
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

const splitByProjection = (bin: Uint8Array, w: number, h: number, bbox: BBox, force = false) => {
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

  const splitThreshold = Math.max(2, Math.floor(height * 0.08));
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

const splitComponentGreedyByProjection = (
  bin: Uint8Array,
  w: number,
  h: number,
  root: Component,
  targetDigits: number
) => {
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
    const split = splitByProjection(bin, w, h, pivot.bbox, true);
    if (!split || split.length < 2) break;
    parts.splice(widestIndex, 1, ...split);
  }
  return parts;
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

  if (spans.length <= 1) return null;
  if (spans.length < expectedDigits) return null;

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

const preprocessDigits = (
  canvas: HTMLCanvasElement,
  expectedDigits: number
): { samples: DigitSample[]; dotXs: number[] } => {
  const binData = binarizeCanvas(canvas);
  if (!binData) return { samples: [], dotXs: [] };
  const { bin, w, h, ink, threshold } = binData;

  let components = findComponents(bin, w, h);
  if (components.length === 0) return { samples: [], dotXs: [] };

  let maxArea = 0;
  for (const c of components) {
    if (c.area > maxArea) maxArea = c.area;
  }
  const dotThreshold = Math.max(5, Math.floor(threshold * 0.4));
  const dotBin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    dotBin[i] = ink[i] >= dotThreshold ? 1 : 0;
  }
  const dotComponents = findComponents(dotBin, w, h);
  const dotCandidates = detectDecimalDots(dotComponents, maxArea, h);
  const dotXs = dotCandidates.map((c) => (c.bbox.minX + c.bbox.maxX) / 2).sort((a, b) => a - b);
  const dotSet = new Set(dotCandidates);
  const minKeep = Math.max(40, Math.floor(maxArea * 0.08));
  components = components.filter((c) => c.area >= minKeep && !dotSet.has(c));

  if (components.length === 0) return { samples: [], dotXs };

  if (components.length === 1 && expectedDigits > 1) {
    const split =
      splitBySpans(bin, w, h, components[0].bbox, expectedDigits) ||
      splitByProjection(bin, w, h, components[0].bbox);
    if (split && split.length >= expectedDigits) {
      components = split;
    } else {
      const greedySplit = splitComponentGreedyByProjection(bin, w, h, components[0], expectedDigits);
      if (greedySplit.length > 1) {
        components = greedySplit;
      }
    }
  }

  components.sort((a, b) => a.bbox.minX - b.bbox.minX);

  const samples: DigitSample[] = [];
  const maxDigits = Math.max(1, expectedDigits);
  for (const component of components.slice(0, maxDigits)) {
    const sample = componentToTensor(component, w, h);
    if (sample) samples.push(sample);
  }
  return { samples, dotXs };
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

const getDrawingCanvas = (ref: any): HTMLCanvasElement | null => {
  const base = ref?.canvas;
  const candidate = base?.drawing?.canvas ?? base?.drawing ?? null;
  return candidate instanceof HTMLCanvasElement ? candidate : null;
};

const countHoles = (data: Float32Array, width = 28, height = 28, minArea = 18) => {
  const size = width * height;
  const bg = new Uint8Array(size);
  const visited = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bg[i] = data[i] > 0.5 ? 0 : 1;
  }

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
  if (out === '5' || out === '6') {
    if (holes >= 1) return '6';
    const lowerMid = quadrantInk(data, 8, 16, 20, 28);
    const midRight = quadrantInk(data, 16, 10, 28, 20);
    const midLeft = quadrantInk(data, 0, 10, 12, 20);
    const topBand = quadrantInk(data, 6, 0, 22, 8);
    if (hasLower && (midRight > 0.14 || lowerMid > 0.2)) return '6';
    if (!hasLower && topBand > 0.16 && midLeft >= midRight) return '5';
    if (Math.abs(p5 - p6) >= 0.08) return p6 > p5 ? '6' : '5';
  }

  if (out === '4' || out === '8' || out === '9') {
    const lowerRight = quadrantInk(data, 14, 14, 28, 28);
    const lowerLeft = quadrantInk(data, 0, 14, 14, 28);
    const center = quadrantInk(data, 10, 10, 18, 18);
    const rightMid = quadrantInk(data, 18, 8, 28, 20);
    const bestProb = Math.max(p4, p8, p9);
    if (bestProb >= 0.78) {
      if (bestProb === p8) return '8';
      if (bestProb === p9) return '9';
      return '4';
    }
    if (holes >= 2) return '8';
    if (holes === 0) {
      if (p9 - p4 > 0.14 && hasLower && rightMid > 0.12) return '9';
      return '4';
    }
    // holes === 1
    if (hasLoop && hasLower && center < 0.11) return '8';
    if (p8 > 0.72 && hasLoop && hasLower && lowerLeft > 0.1 && lowerRight > 0.1) return '8';
    if (hasLower && rightMid > 0.14 && lowerLeft < 0.1) return '9';
    if (hasLower && rightMid > 0.12 && lowerRight > lowerLeft + 0.05) return '9';
    if (center > 0.14 && lowerLeft < 0.12) return '4';
    if (Math.max(p4, p8, p9) === p4) return '4';
    if (Math.max(p4, p8, p9) === p9) return '9';
    return '8';
  }

  if (out === '0' || out === '8') {
    const center = quadrantInk(data, 10, 10, 18, 18);
    const midBand = quadrantInk(data, 8, 12, 20, 16);
    if (holes >= 2) return '8';
    if (holes === 1) {
      if (p8 - p0 > 0.22 && center > 0.16 && midBand > 0.12) return '8';
      if (p0 - p8 > 0.08) return '0';
      return center > 0.2 ? '8' : '0';
    }
    if (p8 > 0.9 && center > 0.22 && midBand > 0.15) return '8';
    return '0';
  }

  if (out === '9') {
    if (holes >= 2 || (hasLoop && hasLower)) out = '8';
    else if (holes === 0 || !hasLower) {
      const bottomLeft = quadrantInk(data, 0, 16, 14, 28);
      out = bottomLeft > 0.12 ? '4' : '7';
    }
  }
  if (out === '4' && hasLoop) {
    if (holes >= 2) out = '8';
    else if (holes >= 1 && hasLower) out = '9';
  }
  if (out === '8') {
    if (holes >= 2) out = '8';
    else out = !hasLoop || !hasLower ? '4' : '9';
  }
  return out;
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
  const variants = [
    base,
    shift28(base, 1, 0),
    shift28(base, -1, 0),
    shift28(base, 0, 1),
    shift28(base, 0, -1)
  ];
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
  return { predictedDigit: String(bestIdx), probabilities };
};

function QuestPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const typeFromQuery = params.get("type");
  const categoryFromQuery = params.get("category");
  const TOTAL_QUESTIONS = 5;
  const [combo, setCombo] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [history, setHistory] = useState<Array<{ id: number; text: string }>>([]);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [results, setResults] = useState<Array<{ id: number; text: string; userAnswer: string; correct: boolean }>>([]);
  const [questionResults, setQuestionResults] = useState<Record<number, { text: string; userAnswer: string; correct: boolean; correctAnswer?: string; everWrong: boolean; firstWrongAnswer?: string }>>({});
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('Battle Start!');
  const [character, setCharacter] = useState<CharacterType>('warrior');
  const [status, setStatus] = useState<'playing' | 'cleared'>('playing');
  const [inputMode, setInputMode] = useState<'numpad' | 'handwriting'>('handwriting'); // New state for input mode
  const [isRecognizing, setIsRecognizing] = useState(false); // New state for OCR loading
  const [recognizedNumber, setRecognizedNumber] = useState<string | null>(null); // To display recognized number
  const [resultMark, setResultMark] = useState<'correct' | 'wrong' | null>(null);
  const canvasRef = useRef<any>(null); // Ref for CanvasDraw component
  const [isModelReady, setIsModelReady] = useState(false); // New state for model readiness
  const [is2DigitModelReady, setIs2DigitModelReady] = useState(false);
  const autoRecognizeTimerRef = useRef<number | null>(null);
  const lastDrawAtRef = useRef<number>(0);
  const isDrawingRef = useRef(false);
  const [previewImages, setPreviewImages] = useState<ImageData[]>([]);
  const resultAdvanceTimerRef = useRef<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [startPopup, setStartPopup] = useState<'ready' | 'go' | null>(null);
  const startTimersRef = useRef<number[]>([]);
  const [autoJudgeEnabled, setAutoJudgeEnabled] = useState(true);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inFlightRef = useRef(false);
  const pendingRecognizeRef = useRef(false);
  const forcedDigitsRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const AUTO_NEXT_WAIT_MS = 900;
  const autoNextTimerRef = useRef<number | null>(null);
  const idleCheckTimerRef = useRef<number | null>(null);
  const grades = useMemo(
    () => getCatalogGrades() as GradeDef[],
    []
  );
  const defaultType = grades[0]?.categories[0]?.types[0] ?? null;
  const [selectedType, setSelectedType] = useState<TypeDef | null>(defaultType);
  const [itemIndex, setItemIndex] = useState(0);
  const [practiceResult, setPracticeResult] = useState<{ ok: boolean; correctAnswer: string } | null>(null);
  const [lastAutoDrawExpected, setLastAutoDrawExpected] = useState("");
  const [autoDrawBatchSummary, setAutoDrawBatchSummary] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionMailStatus, setSessionMailStatus] = useState<string | null>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionStartInFlightRef = useRef<Promise<string | null> | null>(null);
  const forceFractionRecognitionRef = useRef(false);
  const forcedFractionAnswerRef = useRef<string | null>(null);
  const [quizItems, setQuizItems] = useState<QuestEntry[]>([]);
  const [retryNonce, setRetryNonce] = useState(0);
  const clearResults = useMemo(
    () => Object.entries(questionResults).sort((a, b) => Number(a[0]) - Number(b[0])),
    [questionResults]
  );
  const correctCount = useMemo(
    () => clearResults.filter(([, result]) => result.everWrong !== true).length,
    [clearResults]
  );

  const postJson = async (url: string, payload: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(String(json?.error ?? "request_failed"));
    }
    return json;
  };

  // Load MNIST model on component mount
  useEffect(() => {
    const loadModel = async () => {
      await loadMnistModel();
      await loadMnist2DigitModel();
      if (isModelLoaded) {
        setIsModelReady(true);
      }
      if (is2DigitModelLoaded) {
        setIs2DigitModelReady(true);
      }
    };
    loadModel();
  }, [isModelLoaded]);

  // Initialize first question (legacy)
  useEffect(() => {
    const first = createQuestion();
    setQuestion(first);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sid = localStorage.getItem(LS_STUDENT_ID);
    const sessionId = localStorage.getItem(LS_ACTIVE_SESSION_ID);
    setStudentId(sid);
    setActiveSessionId(sessionId);
  }, []);

  const ensureActiveSession = async (): Promise<string | null> => {
    if (activeSessionId) return activeSessionId;
    if (!studentId) return null;
    if (sessionStartInFlightRef.current) {
      return sessionStartInFlightRef.current;
    }
    const promise = (async () => {
      try {
        const json = await postJson("/api/session/start", { studentId });
        const id = String(json.sessionId);
        setActiveSessionId(id);
        if (typeof window !== "undefined") {
          localStorage.setItem(LS_ACTIVE_SESSION_ID, id);
        }
        return id;
      } catch (error) {
        const message = error instanceof Error ? error.message : "session_start_failed";
        setSessionError(message);
        return null;
      } finally {
        sessionStartInFlightRef.current = null;
      }
    })();
    sessionStartInFlightRef.current = promise;
    return promise;
  };

  const endLearningSession = async () => {
    if (!activeSessionId) {
      setSessionError("セッションが開始されていません。保護者設定を保存した状態で回答すると自動開始されます。");
      return;
    }
    try {
      setSessionActionLoading(true);
      setSessionError(null);
      const json = await postJson("/api/session/end", { sessionId: activeSessionId });
      setSessionMailStatus(`メール: ${json.mail.status} (${json.mail.toMasked})`);
      setActiveSessionId(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(LS_ACTIVE_SESSION_ID);
      }
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "session_end_failed";
      setSessionError(message);
    } finally {
      setSessionActionLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (autoRecognizeTimerRef.current) {
        window.clearTimeout(autoRecognizeTimerRef.current);
      }
      if (resultAdvanceTimerRef.current) {
        window.clearTimeout(resultAdvanceTimerRef.current);
      }
      startTimersRef.current.forEach((t) => window.clearTimeout(t));
      if (autoNextTimerRef.current) {
        window.clearTimeout(autoNextTimerRef.current);
      }
      if (idleCheckTimerRef.current) {
        window.clearInterval(idleCheckTimerRef.current);
      }
    };
  }, []);

  const startReadyGo = () => {
    if (isStarting) return;
    setHasStarted(true);
    setIsStarting(true);
    setStartPopup('ready');
    setMessage("Ready...");
    const speak = (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    };
    speak('Ready');
    startTimersRef.current.forEach((t) => window.clearTimeout(t));
    const t1 = window.setTimeout(() => {
      setStartPopup('go');
      setMessage("Go!");
      speak('Go');
    }, 700);
    const t2 = window.setTimeout(() => {
      setStartPopup(null);
      setIsStarting(false);
      setMessage("Battle Start!");
      if (autoJudgeEnabled && pendingRecognizeRef.current) {
        pendingRecognizeRef.current = false;
        if (autoRecognizeTimerRef.current) {
          window.clearTimeout(autoRecognizeTimerRef.current);
        }
        const nextDelay = getAutoJudgeDelayMs(getAnswerDigits());
        autoRecognizeTimerRef.current = window.setTimeout(() => {
          runInference();
        }, nextDelay);
      }
    }, 2000);
    startTimersRef.current = [t1, t2];
  };

  useEffect(() => {
    if (idleCheckTimerRef.current) {
      window.clearInterval(idleCheckTimerRef.current);
    }
    idleCheckTimerRef.current = window.setInterval(() => {
      if (!autoJudgeEnabled) return;
      if (isStarting) return;
      if (status !== 'playing') return;
      if (isDrawingRef.current) return;
      if (Date.now() < cooldownUntilRef.current) return;
      if (isRecognizing || inFlightRef.current) return;
      const idleFor = Date.now() - lastDrawAtRef.current;
      const nextDelay = getAutoJudgeDelayMs(getAnswerDigits());
      if (idleFor >= nextDelay && lastDrawAtRef.current > 0) {
        runInference();
      }
    }, 200);
    return () => {
      if (idleCheckTimerRef.current) {
        window.clearInterval(idleCheckTimerRef.current);
      }
    };
  }, [autoJudgeEnabled, isStarting, status, isRecognizing, itemIndex]);


  useEffect(() => {
    let found: TypeDef | null = null;
    if (typeFromQuery) {
      for (const g of grades) {
        for (const c of g.categories) {
          const hit = c.types.find((t) => t.type_id === typeFromQuery);
          if (hit) {
            found = hit;
            break;
          }
        }
        if (found) break;
      }
    }
    if (found) {
      setSelectedType(found);
      setItemIndex(0);
      setPracticeResult(null);
      setResultMark(null);
      canvasRef.current?.clear();
      return;
    }
    if (categoryFromQuery) {
      const category = grades
        .flatMap((g) => g.categories)
        .find((c) => c.category_id === categoryFromQuery);
      if (category && category.types[0]) {
        setSelectedType(category.types[0]);
        setItemIndex(0);
        setPracticeResult(null);
        setResultMark(null);
        canvasRef.current?.clear();
        return;
      }
    }
    if (!selectedType && defaultType) {
      setSelectedType(defaultType);
    }
  }, [typeFromQuery, categoryFromQuery, grades, selectedType, defaultType]);

  const categoryContext = useMemo(() => {
    if (!categoryFromQuery) return null;
    for (const g of grades) {
      for (const c of g.categories) {
        if (c.category_id === categoryFromQuery) {
          return { grade: g, category: c };
        }
      }
    }
    return null;
  }, [categoryFromQuery, grades]);

  const hasTypeQuery = Boolean(typeFromQuery);
  const hasCategoryQuery = Boolean(categoryFromQuery);

  const selectedPath = (() => {
    if (!hasTypeQuery && !hasCategoryQuery) {
      return {
        gradeName: "全学年",
        typeName: "総合クエスト"
      };
    }
    if (selectedType) {
      for (const g of grades) {
        for (const c of g.categories) {
          const hit = c.types.find((t) => t.type_id === selectedType.type_id);
          if (hit) {
            return {
              gradeName: g.grade_name,
              typeName: hit.display_name ?? hit.type_name
            };
          }
        }
      }
    }
    if (categoryContext) {
      const fallbackType = categoryContext.category.types[0];
      return {
        gradeName: categoryContext.grade.grade_name,
        typeName: fallbackType?.display_name ?? fallbackType?.type_name ?? "クエスト"
      };
    }
    return null;
  })();

  const categoryItems = useMemo(
    () =>
      categoryContext
        ? categoryContext.category.types.flatMap((t) =>
            t.example_items.map((item) => ({ item, type: t }))
          )
        : [],
    [categoryContext]
  );

  const typeItems = useMemo(
    () => (selectedType ? selectedType.example_items.map((item) => ({ item, type: selectedType })) : []),
    [selectedType]
  );

  const allCategoryItems = useMemo(
    () =>
      grades.flatMap((g) =>
        g.categories.flatMap((c) =>
          c.types.flatMap((t) =>
            t.example_items.map((item) => ({ item, type: t }))
          )
        )
      ),
    [grades]
  );
  const allTypePaths = useMemo(
    () =>
      grades.flatMap((g) =>
        g.categories.flatMap((c) =>
          c.types.map((t) => ({
            typeId: t.type_id,
            categoryId: c.category_id
          }))
        )
      ),
    [grades]
  );

  const activeItems = useMemo(
    () =>
      hasTypeQuery
        ? typeItems
        : hasCategoryQuery
          ? categoryItems
          : allCategoryItems,
    [hasTypeQuery, hasCategoryQuery, typeItems, categoryItems, allCategoryItems]
  );
  const selectedTypeSignature = useMemo(() => {
    if (typeFromQuery) return typeSignature(typeFromQuery);
    if (selectedType) return typeSignature(selectedType.type_id);
    return "";
  }, [typeFromQuery, selectedType]);

  const poolCandidates = useMemo(() => {
    if (!hasTypeQuery) return activeItems;
    if (!selectedTypeSignature) return activeItems;

    const seen = new Set<string>();
    const picked: QuestEntry[] = [];
    const pushUnique = (entries: QuestEntry[]) => {
      for (const entry of entries) {
        const key = `${entry.type.type_id}::${entry.item.prompt_tex ?? entry.item.prompt}::${entry.item.answer}`;
        if (seen.has(key)) continue;
        seen.add(key);
        picked.push(entry);
        if (picked.length >= QUESTION_POOL_SIZE) return;
      }
    };

    const sameTypeAcrossGrades = allCategoryItems.filter(
      (entry) => typeSignature(entry.type.type_id) === selectedTypeSignature
    );
    pushUnique(sameTypeAcrossGrades);
    return picked.length > 0 ? picked : activeItems;
  }, [hasTypeQuery, selectedTypeSignature, activeItems, allCategoryItems]);
  const quizSize = Math.min(TOTAL_QUESTIONS, QUESTION_POOL_SIZE);
  useEffect(() => {
    const nextSet = buildRandomQuestionSet(poolCandidates, QUESTION_POOL_SIZE, quizSize);
    setQuizItems(nextSet);
    setItemIndex(0);
    setQuestionResults({});
    setStatus("playing");
    setMessage("Battle Start!");
    setPracticeResult(null);
    setResultMark(null);
    setRecognizedNumber(null);
  }, [poolCandidates, quizSize, retryNonce]);

  const safeIndex = quizItems.length > 0 ? itemIndex % quizItems.length : 0;
  const currentEntry = quizItems[safeIndex] ?? null;
  const nextEntry = quizItems.length > 0 ? quizItems[safeIndex + 1] ?? null : null;
  const currentItem = currentEntry?.item ?? null;
  const currentType = currentEntry?.type ?? selectedType;
  const nextItem = nextEntry?.item ?? null;
  const currentGradeId = currentType?.type_id.split(".")[0] ?? "";
  const isEarlyElementary = currentGradeId === "E1" || currentGradeId === "E2";
  const uiText = isEarlyElementary
    ? {
        summary: `${TOTAL_QUESTIONS}もん かんりょう / せいかい ${correctCount}もん`,
        yourAnswer: "あなた",
        correct: "⭕ せいかい",
        incorrect: "❌ ざんねん",
        nextLevel: "つぎのレベルにすすむ",
        retryLevel: "もういちど べんきょうする",
        retrySame: "もういちど おなじ もんだいを れんしゅうする",
        endWithReport: "おわりにする（レポート配信）",
        noItems: "このカテゴリ/タイプには もんだいが ありません。",
        selectType: "タイプを えらんでください。",
        judge: "はんてい",
        nextQuestion: "つぎの もんだいへ",
        reset: "けす",
        answerLabel: "こたえ"
      }
    : {
        summary: `${TOTAL_QUESTIONS}題完了 / 正解 ${correctCount}題`,
        yourAnswer: "あなた",
        correct: "⭕ 正解",
        incorrect: "❌ 不正解",
        nextLevel: "次のレベルに進む",
        retryLevel: "もう一度勉強する",
        retrySame: "同じ問題を練習する",
        endWithReport: "学習終了（レポート配信）",
        noItems: "このカテゴリ/タイプには表示できる問題がありません。",
        selectType: "タイプを選択してください。",
        judge: "判定",
        nextQuestion: "次の問題へ",
        reset: "リセット",
        answerLabel: "答え"
      };
  const emptyMessage = uiText.noItems;
  const totalQuizQuestions = Math.min(TOTAL_QUESTIONS, quizItems.length);
  const currentCardRef = useRef<HTMLDivElement | null>(null);
  const nextQuestion = () => {
    setItemIndex((v) => {
      if (v + 1 >= totalQuizQuestions) {
        setStatus('cleared');
        setMessage("クリアー！");
        return v;
      }
      return v + 1;
    });
  };
  const goToNextLevel = () => {
    if (allTypePaths.length === 0) return;
    const currentTypeId = currentType?.type_id ?? selectedType?.type_id ?? "";
    const currentIndex = allTypePaths.findIndex((entry) => entry.typeId === currentTypeId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % allTypePaths.length : 0;
    const next = allTypePaths[nextIndex];
    router.push(
      `/quest?type=${encodeURIComponent(next.typeId)}&category=${encodeURIComponent(next.categoryId)}`
    );
  };
  const restartSameLevel = () => {
    setItemIndex(0);
    setQuestionResults({});
    setPracticeResult(null);
    setResultMark(null);
    setRecognizedNumber(null);
    setPreviewImages([]);
    setCombo(0);
    setStatus("playing");
    setMessage("Battle Start!");
    canvasRef.current?.clear();
    setRetryNonce((prev) => prev + 1);
  };

  useEffect(() => {
    setPracticeResult(null);
    setResultMark(null);
    setRecognizedNumber(null);
    setPreviewImages([]);
    canvasRef.current?.clear();
  }, [itemIndex]);

  useEffect(() => {
    if (currentCardRef.current) {
      currentCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [itemIndex, selectedType]);

  function createQuestion(): Question {
    // Generate simple addition/subtraction
    const isAddition = Math.random() > 0.5;
    let val1, val2, ans;

    if (isAddition) {
      val1 = Math.floor(Math.random() * 20) + 1;
      val2 = Math.floor(Math.random() * 20) + 1;
      ans = val1 + val2;
    } else {
      val1 = Math.floor(Math.random() * 20) + 5;
      val2 = Math.floor(Math.random() * val1); // Ensure result is non-negative
      ans = val1 - val2;
    }

    return {
      val1,
      val2,
      operator: isAddition ? '+' : '-',
      answer: ans
    };
  }

  const advanceQuestion = () => {
    if (question) {
      const text = `${question.val1} ${question.operator} ${question.val2} = ${question.answer}`;
      setHistory((prev) => [...prev, { id: Date.now() + Math.random(), text }].slice(-5));
    }
    const current = createQuestion();
    setQuestion(current);
    setInput('');
    setResultMark(null);
  };

  const advanceQuestionWithDelay = (ms: number) => {
    if (resultAdvanceTimerRef.current) {
      window.clearTimeout(resultAdvanceTimerRef.current);
    }
    resultAdvanceTimerRef.current = window.setTimeout(() => {
      advanceQuestion();
    }, ms);
  };

  const recordResult = (userAnswer: string, correct: boolean) => {
    if (!question) return;
    const text = `${question.val1} ${question.operator} ${question.val2} = ${question.answer}`;
    setResults((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), text, userAnswer, correct }
    ]);
    if (questionIndex >= TOTAL_QUESTIONS) {
      setStatus('cleared');
      setMessage("クリアー！");
      return;
    }
    setQuestionIndex((prev) => prev + 1);
    advanceQuestionWithDelay(800);
  };

  const handleInput = (num: string) => {
    if (status !== 'playing' || isStarting) return;
    if (input.length < 3) {
      setInput(prev => prev + num);
      setResultMark(null);
    }
  };

  const handleDelete = () => {
    if (status !== 'playing' || isStarting) return;
    setInput(prev => prev.slice(0, -1));
    setResultMark(null);
  };

  const handleAttack = () => {
    if (status !== 'playing' || isStarting || !question) return;

    const playerAns = parseInt(input);
    
    if (isNaN(playerAns)) return;

    if (playerAns === question.answer) {
      // Correct
      setResultMark('correct');
      const newCombo = combo + 1;
      setCombo(newCombo);

      const charData = CHARACTERS[character];
      let hitMsg = charData.hits[Math.floor(Math.random() * charData.hits.length)];
      if (newCombo >= 3) {
        hitMsg += ` (Combo x${newCombo}!)`;
      }
      setMessage(hitMsg);

      recordResult(input, true);
    } else {
      // Incorrect
      setResultMark('wrong');
      setCombo(0);
      const charData = CHARACTERS[character];
      setMessage(charData.misses[Math.floor(Math.random() * charData.misses.length)]);
      
      setInput('');
    }
  };


  const toggleCharacter = () => {
    setCharacter(prev => prev === 'warrior' ? 'mage' : 'warrior');
  };

  const handleHandwritingJudge = async (): Promise<string> => {
    if (!canvasRef.current || isRecognizing || !isModelReady || isStarting) {
      return "";
    }

    setIsRecognizing(true);

    const drawingCanvas = getDrawingCanvas(canvasRef.current);
    if (!drawingCanvas) {
      setIsRecognizing(false);
      return "";
    }

    const digits = getAnswerDigits();
    const forcedFractionAnswer = forcedFractionAnswerRef.current;
    const expectedFractionAnswer =
      forcedFractionAnswer ?? (currentItem?.answer.includes("/") ? currentItem.answer : null);
    const isFractionQuestion =
      forceFractionRecognitionRef.current ||
      (currentType?.answer_format.kind === "frac" && Boolean(currentItem?.answer.includes("/")));
    let fractionResult: FractionRecognition | null = null;
    if (isFractionQuestion) {
      fractionResult = recognizeFractionFromCanvas(drawingCanvas);
    }
    const fallback = preprocessDigits(drawingCanvas, digits);
    const samples = fractionResult?.samples ?? fallback.samples;
    const dotXs = fractionResult ? [] : fallback.dotXs;

    if (samples.length === 0) {
      canvasRef.current?.clear();
      setIsRecognizing(false);
      setPreviewImages([]);
      return "";
    }

    let predictedText = fractionResult?.predictedText ?? "";
    if (!predictedText) {
      const perDigitPreds = samples.map((s) => predictDigitEnsemble(s.tensor));
      const refined = perDigitPreds.map((pred, i) =>
        !pred ? null : refineDigitPrediction(pred.predictedDigit, samples[i].tensor, pred.probabilities)
      );
      let perDigitString = refined.some((d) => d === null) ? '' : refined.join('');

      predictedText = perDigitString;
      if (samples.length === 2 && is2DigitModelReady && dotXs.length === 0) {
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
        if (multi) {
          const maxProb = Math.max(...multi.probabilities);
          if (maxProb >= 0.6) {
            predictedText = multi.predictedValue;
          }
        }
      }
      if (isFractionQuestion && perDigitString && expectedFractionAnswer) {
        const normalizedFraction = normalizeFractionFromDigitString(perDigitString, expectedFractionAnswer);
        if (normalizedFraction) {
          predictedText = normalizedFraction;
        }
      }
    }

    if (predictedText && dotXs.length > 0) {
      const centers = samples.map((s) => s.centerX);
      let chosenDot = dotXs[0];
      if (centers.length >= 2) {
        const between = dotXs.find((x) => x > centers[0] && x < centers[1]);
        if (between !== undefined) {
          chosenDot = between;
        } else if (dotXs.length > 1) {
          chosenDot = dotXs[dotXs.length - 1];
        }
      }
      let insertAt = 0;
      while (insertAt < centers.length && chosenDot > centers[insertAt]) insertAt += 1;
      if (insertAt > 0 && insertAt < predictedText.length) {
        predictedText = `${predictedText.slice(0, insertAt)}.${predictedText.slice(insertAt)}`;
      }
    }

    if (!predictedText) {
      setCombo(0);
    }

    setPreviewImages(samples.map((s) => s.preview));
    samples.forEach((s) => s.tensor.dispose());

    if (predictedText) {
      setRecognizedNumber(predictedText);
    }

    if (predictedText && currentItem && currentType) {
      const verdict = gradeAnswer(predictedText, currentItem.answer, currentType.answer_format, {
        typeId: currentType.type_id
      });
      setPracticeResult({ ok: verdict.ok, correctAnswer: currentItem.answer });
      const resultText = currentItem.prompt_tex ?? currentItem.prompt;
      const resolvedSessionId = await ensureActiveSession();
      if (resolvedSessionId) {
        void postJson("/api/session/answer", {
          sessionId: resolvedSessionId,
          typeId: currentType.type_id,
          prompt: currentItem.prompt,
          predicted: predictedText,
          correctAnswer: currentItem.answer,
          isCorrect: verdict.ok
        }).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "answer_log_failed";
          setSessionError(message);
        });
      }
      setQuestionResults((prev) => ({
        ...prev,
        [itemIndex]: (() => {
          const prevEntry = prev[itemIndex];
          const everWrong = (prevEntry?.everWrong ?? false) || !verdict.ok;
          const firstWrongAnswer =
            prevEntry?.firstWrongAnswer ??
            (!verdict.ok ? predictedText : undefined);
          return {
            text: resultText,
            userAnswer: predictedText,
            correct: !everWrong,
            correctAnswer: currentItem.answer,
            everWrong,
            firstWrongAnswer
          };
        })()
      }));

      if (verdict.ok) {
        setResultMark('correct');
        const newCombo = combo + 1;
        setCombo(newCombo);
        if (autoNextEnabled) {
          cooldownUntilRef.current = Date.now() + AUTO_NEXT_WAIT_MS;
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
          }, AUTO_NEXT_WAIT_MS);
        }
      } else {
        setResultMark('wrong');
        setCombo(0);
      }
    }

    canvasRef.current?.clear();
    setIsRecognizing(false);
    return predictedText;
  };

  const getAnswerDigits = () => {
    if (forcedDigitsRef.current) return forcedDigitsRef.current;
    if (!currentItem) return 1;
    const n = String(currentItem.answer).replace(/\D/g, '').length;
    return Math.min(4, Math.max(1, n || 1));
  };

  const runInference = async (): Promise<string> => {
    if (inputMode !== 'handwriting') return "";
    if (status !== 'playing') return "";
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
          runInference();
        }
      }
    }
  };

  const handleCanvasChange = () => {
    lastDrawAtRef.current = Date.now();
    if (isStarting) return;
    // 入力中はここでスケジュールしない（描画終了時にのみ予約）
  };

  const handleDrawStart = () => {
    isDrawingRef.current = true;
    lastDrawAtRef.current = Date.now();
    if (autoRecognizeTimerRef.current) {
      window.clearTimeout(autoRecognizeTimerRef.current);
    }
  };

  const handleDrawEnd = () => {
    isDrawingRef.current = false;
    lastDrawAtRef.current = Date.now();
    if (!autoJudgeEnabled) return;
    if (Date.now() < cooldownUntilRef.current) return;
    if (autoRecognizeTimerRef.current) {
      window.clearTimeout(autoRecognizeTimerRef.current);
    }
    const nextDelay = getAutoJudgeDelayMs(getAnswerDigits());
    autoRecognizeTimerRef.current = window.setTimeout(() => {
      runInference();
    }, nextDelay);
  };

  const runAutoDrawTest = async (poolOverride?: string[]) => {
    const canvas = getDrawingCanvas(canvasRef.current);
    if (!canvas) return { expected: "", predicted: "" };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { expected: "", predicted: "" };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 84px monospace";
    const pool = poolOverride && poolOverride.length > 0
      ? poolOverride
      : ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const digits = Array.from({ length: 4 }, () => pool[Math.floor(Math.random() * pool.length)]);
    const expected = digits.join("");
    setLastAutoDrawExpected(expected);
    const startX = 16;
    const baselineY = 200;
    const gap = 64;
    for (let i = 0; i < digits.length; i++) {
      ctx.fillText(digits[i], startX + i * gap, baselineY);
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
    const ctx = canvas.getContext('2d');
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
    const startX = 16;
    const baselineY = 200;
    const gap = 64;
    for (let i = 0; i < digits.length; i++) {
      ctx.fillText(digits[i], startX + i * gap, baselineY);
    }
    const dotX = startX + gap / 2 + 14;
    const dotY = baselineY + 20;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
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
    for (let i = 0; i < runs; i++) {
      const { expected, predicted } = await runAutoDrawTest(pool);
      if (!expected) continue;
      total++;
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
    const overall = total ? ((exact / total) * 100).toFixed(1) : "0.0";
    const fiveSix = fiveSixTotal ? ((fiveSixExact / fiveSixTotal) * 100).toFixed(1) : "0.0";
    const fourEightNine = fourEightNineTotal ? ((fourEightNineExact / fourEightNineTotal) * 100).toFixed(1) : "0.0";
    const zeroEight = zeroEightTotal ? ((zeroEightExact / zeroEightTotal) * 100).toFixed(1) : "0.0";
    setAutoDrawBatchSummary(
      `${label} 完了: 全体一致 ${exact}/${total} (${overall}%) / 0&8一致 ${zeroEightExact}/${zeroEightTotal} (${zeroEight}%) / 4&8&9一致 ${fourEightNineExact}/${fourEightNineTotal} (${fourEightNine}%) / 5&6一致 ${fiveSixExact}/${fiveSixTotal} (${fiveSix}%)`
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
    setAutoDrawBatchSummary(
      `${label} 完了: 全体一致 ${exact}/${total} (${overall}%) / 小数点検出 ${dotOk}/${total} (${dotRate}%)`
    );
  };

  const runAutoDrawFractionTest = async (expectedInput?: string) => {
    const canvas = getDrawingCanvas(canvasRef.current);
    if (!canvas) return { expected: "", predicted: "" };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { expected: "", predicted: "" };
    const pool = expectedInput
      ? [expectedInput]
      : ["1/2", "2/3", "3/4", "5/6", "7/8", "9/10", "11/12"];
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
    for (let i = 0; i < runs; i++) {
      const { expected, predicted } = await runAutoDrawFractionTest();
      if (!expected) continue;
      total++;
      if (predicted === expected) exact++;
      if (predicted.includes("/")) slashDetected++;
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    const overall = total ? ((exact / total) * 100).toFixed(1) : "0.0";
    const slashRate = total ? ((slashDetected / total) * 100).toFixed(1) : "0.0";
    setAutoDrawBatchSummary(
      `${label} 完了: 全体一致 ${exact}/${total} (${overall}%) / スラッシュ検出 ${slashDetected}/${total} (${slashRate}%)`
    );
  };

  const displayedAnswer = inputMode === 'numpad' ? input : (recognizedNumber ?? "");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-between p-4 max-w-md mx-auto border-x border-slate-200 shadow-sm relative">
      
      {/* Input Mode Toggle removed */}

      {status === 'playing' && selectedPath && (
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 text-left hover:bg-slate-50"
        >
          {selectedPath.gradeName} / {selectedPath.typeName}
        </button>
      )}
      {/* Center: Character & Message */} 
      <div className="flex flex-col items-center space-y-4 my-4 flex-1 justify-center w-full">
        {status === 'cleared' ? (
          <div className="w-full text-center rounded-3xl border-4 border-yellow-300 bg-gradient-to-br from-fuchsia-500 via-indigo-500 to-cyan-400 px-4 py-8 shadow-[0_0_60px_rgba(99,102,241,0.55)] animate-pulse">
            <div className="text-5xl md:text-6xl font-black text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.2)] tracking-wide animate-bounce">
              クリアー！
            </div>
            <div className="mt-2 text-3xl">🎉🔥✨⚡🎊</div>
            <div className="mt-4 inline-block rounded-full bg-white/95 px-5 py-2 text-indigo-700 font-black text-lg shadow-lg">
              {uiText.summary}
            </div>
            <div className="mt-5 space-y-2 max-h-[28vh] overflow-y-auto rounded-2xl bg-white/90 p-3 text-left">
              {clearResults.map(([index, r]) => {
                const finalWrong = r.everWrong === true;
                const displayedUserAnswer = finalWrong
                  ? (r.firstWrongAnswer ?? r.userAnswer)
                  : r.userAnswer;
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      finalWrong ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="font-bold text-slate-700">
                      {Number(index) + 1}. {r.text}
                      {finalWrong && (
                        <span className="ml-2 font-semibold text-slate-600">
                          / {uiText.answerLabel}: {r.correctAnswer ?? "-"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-right">
                      <span className="text-slate-600">{uiText.yourAnswer}: {displayedUserAnswer || '?'}</span>
                      <span className={finalWrong ? 'text-red-600' : 'text-green-600'}>
                        {finalWrong ? '✕' : '◯'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 w-full max-w-md mx-auto space-y-2">
              <button
                type="button"
                onClick={goToNextLevel}
                className="w-full px-6 py-3 rounded-xl bg-indigo-500 text-white font-black text-lg shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.2)]"
              >
                {uiText.nextLevel}
              </button>
              <button
                type="button"
                onClick={restartSameLevel}
                className="w-full px-6 py-3 rounded-xl bg-white text-indigo-700 border-2 border-indigo-300 font-black text-base shadow"
              >
                {uiText.retrySame}
              </button>
              <button
                type="button"
                onClick={endLearningSession}
                disabled={sessionActionLoading}
                className="w-full px-6 py-3 rounded-xl bg-emerald-600 text-white font-black text-base shadow disabled:bg-slate-300"
              >
                {uiText.endWithReport}
              </button>
              {!studentId && (
                <div className="text-xs text-slate-700 bg-white/80 rounded-lg px-3 py-2 border border-slate-200 text-left">
                  保護者設定が未保存のためレポート配信はできません。必要な場合は設定ページで保存してください。
                </div>
              )}
              {sessionMailStatus && (
                <div className="text-xs text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200 text-left">
                  {sessionMailStatus}
                </div>
              )}
              {sessionError && (
                <div className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-200 text-left">
                  {sessionError}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-h-[40vh] overflow-y-auto">
              {quizItems.length === 0 ? (
                <div className="text-slate-500 text-center">
                  {emptyMessage}
                </div>
              ) : currentItem ? (
                <div className="flex flex-col gap-3">
                  <div
                    ref={currentCardRef}
                    className="rounded-2xl border-4 border-indigo-200 bg-white px-5 py-4 text-indigo-900 text-xl font-black shadow-md"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[22px] font-extrabold">{renderPrompt(currentItem)}</div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[22px] font-bold text-slate-500">=</span>
                        <div
                          aria-label="recognized-answer"
                          style={{
                            minWidth: 120,
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "2px solid #111",
                            fontSize: 22,
                            fontWeight: 800,
                            textAlign: "right",
                            opacity: displayedAnswer ? 1 : 0.35
                          }}
                        >
                          {displayedAnswer}
                        </div>
                      </div>
                    </div>
                    {practiceResult && (
                      <div className="mt-2 flex justify-end">
                        <div
                          className={`text-xs font-bold ${
                            practiceResult.ok ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {practiceResult.ok ? uiText.correct : uiText.incorrect}
                        </div>
                      </div>
                    )}
                  </div>
                  {nextItem && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 opacity-35">
                      {renderPrompt(nextItem)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-center">{uiText.selectType}</div>
              )}
            </div>

            {/* Combo Indicator */}
            {combo >= 2 && (
              <div className="text-yellow-500 font-black text-xl animate-pulse">
                {combo} COMBO!
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom: Input Area */}
      {status === 'playing' && (inputMode === 'numpad' ? (
        <div className="w-full grid grid-cols-3 gap-3 pb-4">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((num) => (
            <button
              key={num}
              onClick={() => handleInput(num.toString())}
              disabled={status !== 'playing' || isStarting}
              className={`
                h-16 rounded-xl text-2xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all
                ${num === 0 ? 'col-span-1' : ''}
                bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50
              `}
            >
              {num}
            </button>
          ))}
          
          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={status !== 'playing' || isStarting}
            className="h-16 rounded-xl text-xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all bg-red-100 text-red-600 border-2 border-red-200 hover:bg-red-200 flex items-center justify-center"
          >
            ⌫
          </button>

          {/* Attack/Enter Button */}
          <button
            onClick={handleAttack}
            disabled={status !== 'playing' || input === '' || isStarting}
            className="h-16 rounded-xl text-xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all bg-indigo-500 text-white border-2 border-indigo-600 hover:bg-indigo-600 flex items-center justify-center"
          >
            Attack!
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-4 pb-4">
          <div className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap overflow-x-auto text-xs font-bold text-slate-700">
              <div className="flex items-center gap-1">
                <span>AUTO</span>
                <button
                  onClick={() => setAutoJudgeEnabled((prev) => !prev)}
                  className={`px-2 py-0.5 rounded-full ${
                    autoJudgeEnabled ? "bg-green-500 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {autoJudgeEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span>NEXT</span>
                <button
                  onClick={() => setAutoNextEnabled((prev) => !prev)}
                  className={`px-2 py-0.5 rounded-full ${
                    autoNextEnabled ? "bg-green-500 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {autoNextEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <button
                onClick={() => runInference()}
                disabled={isRecognizing || isStarting}
                className="px-3 py-0.5 rounded-md bg-indigo-600 text-white"
              >
                {uiText.judge}
              </button>
              <button
                data-testid="auto-draw-test"
                onClick={() => {
                  void runAutoDrawTest();
                }}
                className="px-3 py-0.5 rounded-md bg-slate-700 text-white"
              >
                AutoDraw Test
              </button>
              <button
                data-testid="auto-draw-batch"
                onClick={() =>
                  runAutoDrawBatchTest(
                    100,
                    ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
                    "Batch100"
                  )
                }
                className="px-3 py-0.5 rounded-md bg-slate-700 text-white"
              >
                Batch100
              </button>
              <button
                onClick={() => runAutoDrawDecimalBatchTest(100, "BatchDec100")}
                className="px-3 py-0.5 rounded-md bg-slate-700 text-white"
              >
                BatchDec100
              </button>
              <button
                data-testid="auto-draw-frac-batch"
                onClick={() => runAutoDrawFractionBatchTest(100, "BatchFrac100")}
                className="px-3 py-0.5 rounded-md bg-slate-700 text-white"
              >
                BatchFrac100
              </button>
              <button
                onClick={() =>
                  runAutoDrawBatchTest(
                    500,
                    ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
                    "Batch500"
                  )
                }
                className="px-3 py-0.5 rounded-md bg-slate-700 text-white"
              >
                Batch500
              </button>
              <button
                onClick={() => runAutoDrawBatchTest(200, ["0", "8"], "Batch08")}
                className="px-3 py-0.5 rounded-md bg-slate-700 text-white"
              >
                Batch08
              </button>
              <button
                onClick={() => runAutoDrawBatchTest(200, ["4", "8", "9"], "Batch489")}
                className="px-3 py-0.5 rounded-md bg-slate-700 text-white"
              >
                Batch489
              </button>
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className="ml-auto px-2 py-0.5 rounded-md bg-slate-200 text-slate-700"
              >
                ⚙︎
              </button>
            </div>
            {settingsOpen && (
              <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                <div>AUTO: 自動判定のON/OFF</div>
                <div>NEXT: 正解で自動的に次の問題へ</div>
                {lastAutoDrawExpected && <div>AutoDraw正解: {lastAutoDrawExpected}</div>}
                {autoDrawBatchSummary && <div>{autoDrawBatchSummary}</div>}
              </div>
            )}
          </div>
          <div
            onPointerDown={handleDrawStart}
            onPointerUp={handleDrawEnd}
            onPointerLeave={handleDrawEnd}
            onPointerCancel={handleDrawEnd}
            onTouchStart={handleDrawStart}
            onTouchEnd={handleDrawEnd}
            onMouseDown={handleDrawStart}
            onMouseUp={handleDrawEnd}
            className="rounded-xl relative"
          >
            <CanvasDraw
              ref={canvasRef}
              hideGrid={true}
              brushRadius={2.5}
              brushColor="#000000"
              backgroundColor="#ffffff"
              canvasWidth={300}
              canvasHeight={300}
              className="rounded-xl border-2 border-slate-300 shadow-lg"
              disabled={status !== 'playing'}
              onChange={handleCanvasChange}
            />
            {startPopup && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                <div className="px-6 py-3 rounded-full bg-white text-indigo-700 font-black text-2xl shadow-lg">
                  {startPopup === 'ready' ? 'Ready!' : 'Go!'}
                </div>
              </div>
            )}
          </div>
          {previewImages.length > 0 && (
            <div className="w-full flex justify-end">
              <div className="text-xs text-slate-500 text-right">
                入力(28x28)
                <div className="mt-1 grid grid-cols-2 gap-2 justify-end">
                  {[0, 1, 2, 3].map((idx) => (
                    <canvas
                      key={idx}
                      width={28}
                      height={28}
                      className="border border-slate-200 bg-black"
                      style={{ width: 56, height: 56, imageRendering: 'pixelated' }}
                      ref={(el) => {
                        if (!el) return;
                        const ctx = el.getContext('2d');
                        if (!ctx) return;
                        ctx.clearRect(0, 0, 28, 28);
                        if (previewImages[idx]) {
                          ctx.putImageData(previewImages[idx], 0, 0);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <button
                onClick={nextQuestion}
                disabled={status !== 'playing' || isStarting}
                className="w-full py-2 rounded-lg bg-indigo-600 text-white font-bold shadow-md active:translate-y-1 disabled:opacity-50"
              >
                {uiText.nextQuestion}
              </button>
            </div>
          </div>
          <div className="flex gap-3 w-full justify-center">
            <button
              onClick={() => canvasRef.current?.clear()}              disabled={status !== 'playing' || isRecognizing}
              className="px-6 py-2 bg-red-100 text-red-600 rounded-lg font-bold shadow-md active:translate-y-1"
            >
              {uiText.reset}
            </button>
          </div>
        </div>
      ))}

      {status === 'playing' && (
        <section className="w-full pb-4 space-y-2">
          <button
            type="button"
            onClick={endLearningSession}
            disabled={sessionActionLoading}
            className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white font-black text-base shadow disabled:bg-slate-300"
          >
            {uiText.endWithReport}
          </button>
          {!studentId && (
            <div className="text-xs text-slate-600">
              保護者設定が未保存のためレポート配信はできません。
            </div>
          )}
          {sessionMailStatus && (
            <div className="text-xs text-emerald-700 font-semibold">{sessionMailStatus}</div>
          )}
          {sessionError && (
            <div className="text-xs text-red-700">{sessionError}</div>
          )}
        </section>
      )}

    </main>
  );
}

export default function QuestPage() {
  return (
    <Suspense fallback={<div />}>
      <QuestPageInner />
    </Suspense>
  );
}
