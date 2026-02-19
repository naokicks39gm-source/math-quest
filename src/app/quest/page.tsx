
'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import * as tf from '@tensorflow/tfjs'; // Import TensorFlow.js
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { gradeAnswer, AnswerFormat } from '@/lib/grader';
import { getCatalogGrades } from '@/lib/gradeCatalog';
import { buildUniqueQuestSet } from '@/lib/questItemFactory';
import SecondaryExplanationPanel from "@/components/SecondaryExplanationPanel";
import { getSecondaryLearningAid } from "@/lib/secondaryExplanations";
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
  type_name?: string;
  display_name?: string;
  generation_params?: {
    pattern_id?: string;
    a_digits?: number;
    b_digits?: number;
    carry?: boolean | null;
    borrow?: boolean | null;
    decimal_places?: number;
    quotient_digits?: number;
  };
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

type QuestionResultEntry = {
  prompt: string;
  promptTex?: string;
  userAnswer: string;
  correct: boolean;
  correctAnswer?: string;
  everWrong: boolean;
  firstWrongAnswer?: string;
};

type FractionEditorPart = "num" | "den";
type FractionEditorState = {
  enabled: boolean;
  num: string;
  den: string;
  part: FractionEditorPart;
};

const LS_ACTIVE_SESSION_ID = "mq:activeSessionId";
const LS_STUDENT_ID = "mq:studentId";
const QUESTION_POOL_SIZE = 50;
const OUTER_MARGIN = 8;
const DEFAULT_VISIBLE_CANVAS_SIZE = 300;
const FRACTION_AUTO_MOVE_DELAY_MS = 800;
const EMPTY_FRACTION_EDITOR: FractionEditorState = { enabled: false, num: "", den: "", part: "num" };
const MIN_MEMO_ZOOM = 0.1;
const MAX_MEMO_ZOOM = 2.5;
const MEMO_BRUSH_WIDTH = 2.0;
const MEMO_WORKSPACE_SCALE = 1.6;

export const getAutoJudgeDelayMs = (digits: number) => {
  if (digits <= 1) return 700;
  if (digits === 2) return 1000;
  return 1300;
};

const typeSignature = (typeId: string) => typeId.replace(/^[A-Z]\d\./, "");

const trimTrailingEquationEquals = (text: string) => text.replace(/\s*[=＝]\s*$/u, "");

const formatPrompt = (prompt: string) => {
  return trimTrailingEquationEquals(prompt.replace(/を計算しなさい。$/g, ""));
};

const MIXED_FRACTION_TYPE_IDS = new Set<string>([
  "E4.NA.FRAC.FRAC_IMPROPER_TO_MIXED",
  "E4.NA.FRAC.FRAC_MIXED_TO_IMPROPER"
]);

type ExpectedForm = "mixed" | "improper" | "auto";

const resolveExpectedFormFromPrompt = (prompt: string): ExpectedForm => {
  if (prompt.includes("帯分数に")) return "mixed";
  if (prompt.includes("仮分数に")) return "improper";
  return "auto";
};

const isMixedFractionQuestion = (
  typeId: string | undefined,
  prompt: string,
  promptTex?: string
) => {
  if (typeId && MIXED_FRACTION_TYPE_IDS.has(typeId)) return true;
  const merged = `${prompt} ${promptTex ?? ""}`;
  return merged.includes("帯分数") || merged.includes("仮分数");
};

const isQuadraticRootsType = (typeId?: string) => Boolean(typeId && /^H\d\.AL\.EQ\.QUAD_ROOTS$/.test(typeId));

const INTEGER_FRACTION_PATTERN = /([+-]?\d+)\/([+-]?\d+)/g;
const EXPONENT_FRACTION_PATTERN = /([A-Za-z0-9(){}+\-^]+)\s*\/\s*([A-Za-z0-9(){}+\-^]+)/g;

const isAsciiLetter = (ch: string) => /[A-Za-z]/.test(ch);

type FractionMatch = { start: number; end: number; raw: string; num: string; den: string };

const findDisplayFractionMatches = (text: string) => {
  const candidates: FractionMatch[] = [];
  INTEGER_FRACTION_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INTEGER_FRACTION_PATTERN.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    const prev = start > 0 ? text[start - 1] : "";
    const next = end < text.length ? text[end] : "";
    if (isAsciiLetter(prev) || isAsciiLetter(next)) continue;
    candidates.push({ start, end, raw: match[0], num: match[1], den: match[2] });
  }
  EXPONENT_FRACTION_PATTERN.lastIndex = 0;
  while ((match = EXPONENT_FRACTION_PATTERN.exec(text))) {
    const raw = match[0];
    if (!raw.includes("^")) continue;
    const start = match.index;
    const end = start + raw.length;
    const prev = start > 0 ? text[start - 1] : "";
    const next = end < text.length ? text[end] : "";
    if (isAsciiLetter(prev) || isAsciiLetter(next)) continue;
    candidates.push({
      start,
      end,
      raw,
      num: match[1].trim(),
      den: match[2].trim()
    });
  }
  candidates.sort((a, b) => a.start - b.start || b.end - a.end);
  const deduped: FractionMatch[] = [];
  for (const candidate of candidates) {
    const overlapped = deduped.some((m) => candidate.start < m.end && m.start < candidate.end);
    if (!overlapped) deduped.push(candidate);
  }
  return deduped;
};

const toFractionTexInText = (text: string) => {
  const matches = findDisplayFractionMatches(text);
  if (matches.length === 0) return text;
  let cursor = 0;
  let out = "";
  for (const match of matches) {
    out += text.slice(cursor, match.start);
    out += `\\frac{${match.num}}{${match.den}}`;
    cursor = match.end;
  }
  out += text.slice(cursor);
  return out;
};

const EQUATION_OPERATOR_PATTERN = /[=+\-*/×÷]/;

const toEquationTex = (text: string) =>
  toFractionTexInText(text)
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ");

const renderMaybeMath = (text: string): ReactNode => {
  const isEquationText = EQUATION_OPERATOR_PATTERN.test(text);
  if (isEquationText) {
    const tex = toEquationTex(text);
    return (
      <span className="inline-flex max-w-full items-center overflow-x-auto whitespace-nowrap align-middle">
        <InlineMath math={tex} renderError={() => <span>{text}</span>} />
      </span>
    );
  }

  const matches = findDisplayFractionMatches(text);
  if (matches.length === 0) return <span className="whitespace-nowrap">{text}</span>;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (cursor < match.start) {
      nodes.push(<span key={`text-${cursor}`}>{text.slice(cursor, match.start)}</span>);
    }
    nodes.push(
      <InlineMath
        key={`frac-${match.start}-${match.end}`}
        math={toFractionTexInText(match.raw)}
        renderError={() => <span>{match.raw}</span>}
      />
    );
    cursor = match.end;
  }
  if (cursor < text.length) {
    nodes.push(<span key={`text-${cursor}`}>{text.slice(cursor)}</span>);
  }
  return (
    <span className="inline-flex max-w-full items-center overflow-x-auto whitespace-nowrap align-middle">
      {nodes}
    </span>
  );
};
const renderPrompt = (item: ExampleItem) => {
  const tex = item.prompt_tex?.trim();
  if (tex) {
    const displayTex = trimTrailingEquationEquals(tex);
    return (
      <span className="inline-flex max-w-full items-center overflow-x-auto whitespace-nowrap align-middle">
        <InlineMath math={toEquationTex(displayTex)} renderError={() => <span>{formatPrompt(item.prompt)}</span>} />
      </span>
    );
  }
  return renderMaybeMath(formatPrompt(item.prompt));
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

const DIGIT_KEYPAD_TOKENS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const SYMBOL_KEYPAD_TOKENS = ["/", ".", "-"] as const;

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
type MemoPoint = { x: number; y: number };
type MemoStroke = { points: MemoPoint[] };

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
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
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

const binarizeCanvasInRoi = (canvas: HTMLCanvasElement, roi: RecognitionRoi): BinarizedCanvas | null => {
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
  for (let y = roi.minY; y <= roi.maxY; y++) {
    const row = y * w;
    for (let x = roi.minX; x <= roi.maxX; x++) {
      const i = row + x;
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

const normalizeMixedFractionFromDigitString = (
  rawDigits: string,
  expectedAnswer: string,
  expectedForm: ExpectedForm
) => {
  if (expectedForm === "improper") {
    return normalizeFractionFromDigitString(rawDigits, expectedAnswer);
  }
  const mixedExpected = parseMixedFromText(expectedAnswer);
  const improperExpected = parseImproperFromText(expectedAnswer);
  const mixedCanonical =
    mixedExpected ??
    (improperExpected ? improperToMixedLocal(improperExpected.num, improperExpected.den) : null);
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
  if (!/^\d+$/.test(rawDigits)) return rawDigits;
  if (rawDigits.length <= 1) return rawDigits;
  if (centers.length < 2) return rawDigits;
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

const maybeSplitFractionComponent = (
  bin: Uint8Array,
  w: number,
  h: number,
  component: Component,
  splitThreshold?: number
) => {
  const bw = component.bbox.maxX - component.bbox.minX + 1;
  const bh = component.bbox.maxY - component.bbox.minY + 1;
  if (bw < 10 || bh < 8) return [component];
  if (bw / Math.max(1, bh) < 0.8) return [component];
  const split =
    splitBySpans(bin, w, h, component.bbox, 2) ||
    splitByProjection(bin, w, h, component.bbox, true, splitThreshold);
  return split && split.length > 1 ? split : [component];
};

const predictSampleDigit = (sample: DigitSample): string | null => {
  const pred = predictDigitEnsemble(sample.tensor);
  if (!pred) return null;
  if (pred.bestProb < 0.34 || pred.margin < 0.04) return null;
  return refineDigitPrediction(pred.predictedDigit, sample.tensor, pred.probabilities);
};

const recognizeFractionFromCanvas = (
  canvas: HTMLCanvasElement,
  roi: RecognitionRoi
): FractionRecognition | null => {
  const binData = binarizeCanvasInRoi(canvas, roi);
  if (!binData) return null;
  const { bin, w, h, ink, threshold } = binData;
  const tuning = getBinarizeTuning(roi);
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
  const minKeep = Math.max(
    6,
    Math.floor(Math.max(maxArea * 0.02, roi.width * roi.height * tuning.fractionMinKeepRatio))
  );
  const components = allComponents.filter((c) => c !== slash && c.area >= minKeep && !isDotLike(c));
  if (components.length < 2) return null;

  const valueComponents: Component[] = [];
  for (const component of components) {
    valueComponents.push(...maybeSplitFractionComponent(bin, w, h, component, tuning.splitThreshold));
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

const recognizeMixedFractionFromCanvas = (
  canvas: HTMLCanvasElement,
  expectedForm: ExpectedForm,
  roi: RecognitionRoi
): FractionRecognition | null => {
  const base = recognizeFractionFromCanvas(canvas, roi);
  if (!base) return null;
  if (expectedForm === "improper") return base;

  const binData = binarizeCanvasInRoi(canvas, roi);
  if (!binData) return base;
  const { w, h, bin } = binData;
  const allComponents = findComponents(bin, w, h);
  if (allComponents.length === 0) return base;

  let maxArea = 0;
  for (const c of allComponents) {
    if (c.area > maxArea) maxArea = c.area;
  }
  const slashCandidates = allComponents
    .filter((c) => c.area >= 6 && isSlashComponent(c, w, maxArea, h))
    .sort((a, b) => b.area - a.area);
  if (slashCandidates.length === 0) return base;
  const slash = slashCandidates[0];
  const slashCenterY = (slash.bbox.minY + slash.bbox.maxY) / 2;
  const wholeBoundary = slash.bbox.minX - Math.max(8, Math.floor((slash.bbox.maxX - slash.bbox.minX + 1) * 0.5));

  const wholeParts = allComponents
    .filter((c) => c !== slash && (c.bbox.minX + c.bbox.maxX) / 2 < wholeBoundary)
    .sort((a, b) => a.bbox.minX - b.bbox.minX);
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

  const numeratorCenterY = wholeParts.length > 0
    ? slashCenterY - 1
    : slashCenterY;
  const predictedText = `${wholeDigits} ${fracMatch[1]}/${fracMatch[2]}`;
  const combined = [...wholeSamples, ...base.samples];
  // numeratorCenterY uses slash position to avoid TS unused var warning in shape tuning stage
  void numeratorCenterY;
  return { predictedText, samples: combined };
};

const splitByProjection = (
  bin: Uint8Array,
  w: number,
  h: number,
  bbox: BBox,
  force = false,
  customThreshold?: number
) => {
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

const splitComponentGreedyByProjection = (
  bin: Uint8Array,
  w: number,
  h: number,
  root: Component,
  targetDigits: number,
  splitThreshold?: number
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
    const split = splitByProjection(bin, w, h, pivot.bbox, true, splitThreshold);
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
  expectedDigits: number,
  roi: RecognitionRoi,
  options?: { disableForcedSplit?: boolean }
): { samples: DigitSample[]; dotXs: number[] } => {
  const binData = binarizeCanvasInRoi(canvas, roi);
  if (!binData) return { samples: [], dotXs: [] };
  const { bin, w, h, ink, threshold } = binData;
  const tuning = getBinarizeTuning(roi);

  let components = findComponents(bin, w, h);
  if (components.length === 0) return { samples: [], dotXs: [] };

  let maxArea = 0;
  for (const c of components) {
    if (c.area > maxArea) maxArea = c.area;
  }
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
  const minKeep = Math.max(
    8,
    Math.floor(Math.max(maxArea * 0.06, roi.width * roi.height * tuning.integerMinKeepRatio))
  );
  components = components.filter((c) => c.area >= minKeep && !dotSet.has(c));

  if (components.length === 0) return { samples: [], dotXs };

  if (components.length === 1 && expectedDigits > 1 && !options?.disableForcedSplit) {
    const split =
      splitBySpans(bin, w, h, components[0].bbox, expectedDigits) ||
      splitByProjection(bin, w, h, components[0].bbox, false, tuning.splitThreshold);
    if (split && split.length >= expectedDigits) {
      components = split;
    } else {
      const greedySplit = splitComponentGreedyByProjection(
        bin,
        w,
        h,
        components[0],
        expectedDigits,
        tuning.splitThreshold
      );
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
  let secondIdx = bestIdx === 0 ? 1 : 0;
  for (let i = 0; i < probabilities.length; i++) {
    if (i === bestIdx) continue;
    if (probabilities[i] > probabilities[secondIdx]) secondIdx = i;
  }
  const bestProb = probabilities[bestIdx] ?? 0;
  const secondProb = probabilities[secondIdx] ?? 0;
  return {
    predictedDigit: String(bestIdx),
    probabilities,
    bestProb,
    margin: bestProb - secondProb
  };
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
  const [questionResults, setQuestionResults] = useState<Record<number, QuestionResultEntry>>({});
  const [input, setInput] = useState('');
  const [fractionInput, setFractionInput] = useState<FractionEditorState>(EMPTY_FRACTION_EDITOR);
  const [message, setMessage] = useState('Battle Start!');
  const [character, setCharacter] = useState<CharacterType>('warrior');
  const [status, setStatus] = useState<'playing' | 'cleared'>('playing');
  const [inputMode] = useState<'numpad' | 'handwriting'>('numpad');
  const [isRecognizing, setIsRecognizing] = useState(false); // New state for OCR loading
  const [recognizedNumber, setRecognizedNumber] = useState<string | null>(null); // To display recognized number
  const [quadraticAnswers, setQuadraticAnswers] = useState<[string, string]>(["", ""]);
  const [quadraticFractionInputs, setQuadraticFractionInputs] = useState<[FractionEditorState, FractionEditorState]>([
    { ...EMPTY_FRACTION_EDITOR },
    { ...EMPTY_FRACTION_EDITOR }
  ]);
  const [quadraticActiveIndex, setQuadraticActiveIndex] = useState<0 | 1>(0);
  const [resultMark, setResultMark] = useState<'correct' | 'wrong' | null>(null);
  const canvasRef = useRef<any>(null); // Ref for legacy handwriting canvas adapter
  const memoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawAreaRef = useRef<HTMLDivElement | null>(null);
  const currentCardRef = useRef<HTMLDivElement | null>(null);
  const qaRowRef = useRef<HTMLDivElement | null>(null);
  const qaPromptRef = useRef<HTMLDivElement | null>(null);
  const qaPromptContentRef = useRef<HTMLSpanElement | null>(null);
  const qaAnswerRef = useRef<HTMLDivElement | null>(null);
  const qaAnswerContentRef = useRef<HTMLDivElement | null>(null);
  const memoCanvasHostRef = useRef<HTMLDivElement | null>(null);
  const [isModelReady, setIsModelReady] = useState(false); // New state for model readiness
  const [is2DigitModelReady, setIs2DigitModelReady] = useState(false);
  const autoRecognizeTimerRef = useRef<number | null>(null);
  const fractionAutoMoveTimerRef = useRef<number | null>(null);
  const quadraticFractionAutoMoveTimerRefs = useRef<[number | null, number | null]>([null, null]);
  const lastDrawAtRef = useRef<number>(0);
  const isDrawingRef = useRef(false);
  const [previewImages, setPreviewImages] = useState<ImageData[]>([]);
  const resultAdvanceTimerRef = useRef<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [startPopup, setStartPopup] = useState<'ready' | 'go' | null>(null);
  const startTimersRef = useRef<number[]>([]);
  const [inkFirstMode, setInkFirstMode] = useState(true);
  const [showRecognitionGuides, setShowRecognitionGuides] = useState(false);
  const [autoJudgeEnabled, setAutoJudgeEnabled] = useState(false);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inFlightRef = useRef(false);
  const pendingRecognizeRef = useRef(false);
  const forcedDigitsRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const AUTO_NEXT_WAIT_MS = 600;
  const WRONG_MARK_WAIT_MS = 380;
  const autoNextTimerRef = useRef<number | null>(null);
  const wrongMarkTimerRef = useRef<number | null>(null);
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
  const forceMixedRecognitionRef = useRef(false);
  const forcedFractionAnswerRef = useRef<string | null>(null);
  const forcedExpectedFormRef = useRef<ExpectedForm | null>(null);
  const [quizItems, setQuizItems] = useState<QuestEntry[]>([]);
  const [retryNonce, setRetryNonce] = useState(0);
  const [visibleCanvasSize, setVisibleCanvasSize] = useState(DEFAULT_VISIBLE_CANVAS_SIZE);
  const [memoCanvasSize, setMemoCanvasSize] = useState({ width: DEFAULT_VISIBLE_CANVAS_SIZE, height: DEFAULT_VISIBLE_CANVAS_SIZE });
  const [calcZoom, setCalcZoom] = useState(1);
  const [calcPan, setCalcPan] = useState({ x: 0, y: 0 });
  const [useSingleLineQa, setUseSingleLineQa] = useState(false);
  const [isPinchingMemo, setIsPinchingMemo] = useState(false);
  const [memoStrokes, setMemoStrokes] = useState<MemoStroke[]>([]);
  const [memoRedoStack, setMemoRedoStack] = useState<MemoStroke[]>([]);
  const memoStrokesRef = useRef<MemoStroke[]>([]);
  const memoActiveStrokeRef = useRef<MemoStroke | null>(null);
  const memoActivePointerIdRef = useRef<number | null>(null);
  const memoDrawRafRef = useRef<number | null>(null);
  const memoPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const memoPinchStartRef = useRef<{
    distance: number;
    zoom: number;
    mid: { x: number; y: number };
    pan: { x: number; y: number };
  } | null>(null);
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
      if (wrongMarkTimerRef.current) {
        window.clearTimeout(wrongMarkTimerRef.current);
      }
      if (idleCheckTimerRef.current) {
        window.clearInterval(idleCheckTimerRef.current);
      }
      clearAllFractionAutoMoveTimers();
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
    const el = memoCanvasHostRef.current;
    if (!el || status !== "playing") return;
    const updateSize = () => {
      const width = Math.max(180, Math.floor(el.clientWidth));
      const height = Math.max(180, Math.floor(el.clientHeight));
      setMemoCanvasSize({ width, height });
      setVisibleCanvasSize(Math.max(180, Math.min(width, height)));
    };
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(el);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    const row = qaRowRef.current;
    const prompt = qaPromptRef.current;
    const promptContent = qaPromptContentRef.current;
    const answer = qaAnswerRef.current;
    const answerContent = qaAnswerContentRef.current;
    if (!row || !prompt || !answer || !answerContent || status !== "playing" || !quizItems[itemIndex]) return;

    const updateLayout = () => {
      const available = row.clientWidth;
      if (available <= 0) return;
      const promptWidth = promptContent?.scrollWidth ?? prompt.scrollWidth;
      const answerWidth = answerContent.scrollWidth;
      const gap = 18;
      const buffer = 10;
      setUseSingleLineQa(promptWidth + answerWidth + gap + buffer <= available);
    };

    updateLayout();
    const observer = new ResizeObserver(() => updateLayout());
    observer.observe(row);
    observer.observe(prompt);
    observer.observe(answer);
    if (promptContent) observer.observe(promptContent);
    observer.observe(answerContent);
    window.addEventListener("resize", updateLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, [
    status,
    quizItems,
    itemIndex,
    input,
    quadraticAnswers
  ]);

  useEffect(() => {
    scheduleMemoRedraw();
  }, [memoCanvasSize.width, memoCanvasSize.height, memoStrokes, calcZoom, calcPan, status]);

  useEffect(() => {
    return () => {
      if (memoDrawRafRef.current) {
        window.cancelAnimationFrame(memoDrawRafRef.current);
        memoDrawRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    memoStrokesRef.current = memoStrokes;
  }, [memoStrokes]);

  useEffect(() => {
    if (inkFirstMode) {
      setAutoJudgeEnabled(false);
    }
  }, [inkFirstMode]);

  useEffect(() => {
    if (idleCheckTimerRef.current) {
      window.clearInterval(idleCheckTimerRef.current);
    }
    if (inkFirstMode) return;
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
  }, [inkFirstMode, autoJudgeEnabled, isStarting, status, isRecognizing, itemIndex]);


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
      clearAllFractionAutoMoveTimers();
      setSelectedType(found);
      setItemIndex(0);
      setPracticeResult(null);
      setResultMark(null);
      setInput("");
      setFractionInput({ ...EMPTY_FRACTION_EDITOR });
      setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
      canvasRef.current?.clear();
      return;
    }
    if (categoryFromQuery) {
      const category = grades
        .flatMap((g) => g.categories)
        .find((c) => c.category_id === categoryFromQuery);
      if (category && category.types[0]) {
        clearAllFractionAutoMoveTimers();
        setSelectedType(category.types[0]);
        setItemIndex(0);
        setPracticeResult(null);
        setResultMark(null);
        setInput("");
        setFractionInput({ ...EMPTY_FRACTION_EDITOR });
        setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
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
        categoryName: "全カテゴリ",
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
              categoryName: c.category_name,
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
        categoryName: categoryContext.category.category_name,
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
    clearAllFractionAutoMoveTimers();
    const nextSet = buildUniqueQuestSet({
      source: poolCandidates,
      poolSize: QUESTION_POOL_SIZE,
      quizSize
    });
    setQuizItems(nextSet);
    setItemIndex(0);
    setQuestionResults({});
    setStatus("playing");
    setMessage("Battle Start!");
    setPracticeResult(null);
    setResultMark(null);
    setRecognizedNumber(null);
    setInput("");
    setFractionInput({ ...EMPTY_FRACTION_EDITOR });
    setQuadraticAnswers(["", ""]);
    setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
    setQuadraticActiveIndex(0);
  }, [poolCandidates, quizSize, retryNonce]);

  const safeIndex = quizItems.length > 0 ? itemIndex % quizItems.length : 0;
  const currentEntry = quizItems[safeIndex] ?? null;
  const currentItem = currentEntry?.item ?? null;
  const currentType = currentEntry?.type ?? selectedType;
  const currentAid = useMemo(
    () =>
      getSecondaryLearningAid({
        gradeId: currentType?.type_id.split(".")[0] ?? "",
        typeId: currentType?.type_id,
        patternId: currentType?.generation_params?.pattern_id
      }),
    [currentType?.type_id, currentType?.generation_params?.pattern_id]
  );
  const isQuadraticRootsQuestion = isQuadraticRootsType(currentType?.type_id);
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
    clearAllFractionAutoMoveTimers();
    setItemIndex(0);
    setQuestionResults({});
    setPracticeResult(null);
    setResultMark(null);
    setRecognizedNumber(null);
    setInput("");
    setFractionInput({ ...EMPTY_FRACTION_EDITOR });
    setQuadraticAnswers(["", ""]);
    setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
    setQuadraticActiveIndex(0);
    setPreviewImages([]);
    setCombo(0);
    setStatus("playing");
    setMessage("Battle Start!");
    canvasRef.current?.clear();
    setRetryNonce((prev) => prev + 1);
  };

  useEffect(() => {
    clearAllFractionAutoMoveTimers();
    setPracticeResult(null);
    setResultMark(null);
    setRecognizedNumber(null);
    setInput("");
    setFractionInput({ ...EMPTY_FRACTION_EDITOR });
    setQuadraticAnswers(["", ""]);
    setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
    setQuadraticActiveIndex(0);
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

  const clearFractionAutoMoveTimer = () => {
    if (fractionAutoMoveTimerRef.current) {
      window.clearTimeout(fractionAutoMoveTimerRef.current);
      fractionAutoMoveTimerRef.current = null;
    }
  };

  const clearQuadraticFractionAutoMoveTimer = (index: 0 | 1) => {
    const timer = quadraticFractionAutoMoveTimerRefs.current[index];
    if (timer) {
      window.clearTimeout(timer);
      quadraticFractionAutoMoveTimerRefs.current[index] = null;
    }
  };

  const clearAllFractionAutoMoveTimers = () => {
    clearFractionAutoMoveTimer();
    clearQuadraticFractionAutoMoveTimer(0);
    clearQuadraticFractionAutoMoveTimer(1);
  };

  const isFractionPartTokenValid = (current: string, token: string) => {
    if (/^\d$/.test(token)) return true;
    if (token === "-") return current.length === 0;
    return false;
  };

  const isFractionPartReady = (value: string) => /^-?\d+$/.test(value);
  const isFractionEditorReady = (editor: FractionEditorState) =>
    editor.enabled && isFractionPartReady(editor.num) && isFractionPartReady(editor.den);
  const fractionEditorToAnswerText = (editor: FractionEditorState) => `${editor.num}/${editor.den}`;

  const renderFractionEditorValue = (editor: FractionEditorState) => {
    const renderPart = (text: string, active: boolean) => (
      <span className="inline-flex items-center justify-center min-h-[1.1em] min-w-[1.2em]">
        <span>{text || "\u2007"}</span>
        {active && (
          <span className="inline-block ml-0.5 h-[0.9em] w-[2px] bg-current animate-pulse align-middle" />
        )}
      </span>
    );
    return (
      <span className="inline-flex flex-col items-center leading-none">
        <span>{renderPart(editor.num, editor.part === "num")}</span>
        <span className="my-0.5 block h-[2px] w-[1.8em] rounded bg-current/80" />
        <span>{renderPart(editor.den, editor.part === "den")}</span>
      </span>
    );
  };

  const handleInput = (num: string) => {
    if (status !== 'playing' || isStarting) return;
    const currentText = isQuadraticRootsQuestion ? quadraticAnswers[quadraticActiveIndex] : input;
    const isDigit = /^\d$/.test(num);

    if (num === "/") {
      if (isQuadraticRootsQuestion) {
        clearQuadraticFractionAutoMoveTimer(quadraticActiveIndex);
        setQuadraticFractionInputs((prev) => {
          if (prev[quadraticActiveIndex].enabled) return prev;
          const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
          next[quadraticActiveIndex] = { enabled: true, num: "", den: "", part: "num" };
          return next;
        });
        setQuadraticAnswers((prev) => {
          const next: [string, string] = [...prev] as [string, string];
          next[quadraticActiveIndex] = "";
          return next;
        });
      } else {
        clearFractionAutoMoveTimer();
        setFractionInput((prev) => (prev.enabled ? prev : { enabled: true, num: "", den: "", part: "num" }));
        setInput("");
      }
      setResultMark(null);
      return;
    }

    if (isQuadraticRootsQuestion && quadraticFractionInputs[quadraticActiveIndex].enabled) {
      const currentEditor = quadraticFractionInputs[quadraticActiveIndex];
      const currentPartValue = currentEditor.part === "num" ? currentEditor.num : currentEditor.den;
      if (!isFractionPartTokenValid(currentPartValue, num)) return;
      setQuadraticFractionInputs((prev) => {
        const target = prev[quadraticActiveIndex];
        const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
        const part = target.part;
        const maxLen = isDigit ? 6 : 7;
        const nextPartValue = `${part === "num" ? target.num : target.den}${num}`;
        if (nextPartValue.length > maxLen) return prev;
        next[quadraticActiveIndex] = {
          ...target,
          num: part === "num" ? nextPartValue : target.num,
          den: part === "den" ? nextPartValue : target.den
        };
        return next;
      });
      if (currentEditor.part === "num") {
        clearQuadraticFractionAutoMoveTimer(quadraticActiveIndex);
        quadraticFractionAutoMoveTimerRefs.current[quadraticActiveIndex] = window.setTimeout(() => {
          setQuadraticFractionInputs((prev) => {
            const target = prev[quadraticActiveIndex];
            if (!target.enabled || target.part !== "num" || target.num.length === 0 || target.den.length > 0) return prev;
            const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
            next[quadraticActiveIndex] = { ...target, part: "den" };
            return next;
          });
          quadraticFractionAutoMoveTimerRefs.current[quadraticActiveIndex] = null;
        }, FRACTION_AUTO_MOVE_DELAY_MS);
      }
      setResultMark(null);
      return;
    }

    if (!isQuadraticRootsQuestion && fractionInput.enabled) {
      const currentPartValue = fractionInput.part === "num" ? fractionInput.num : fractionInput.den;
      if (!isFractionPartTokenValid(currentPartValue, num)) return;
      setFractionInput((prev) => {
        const part = prev.part;
        const maxLen = isDigit ? 12 : 13;
        const nextPartValue = `${part === "num" ? prev.num : prev.den}${num}`;
        if (nextPartValue.length > maxLen) return prev;
        return {
          ...prev,
          num: part === "num" ? nextPartValue : prev.num,
          den: part === "den" ? nextPartValue : prev.den
        };
      });
      if (fractionInput.part === "num") {
        clearFractionAutoMoveTimer();
        fractionAutoMoveTimerRef.current = window.setTimeout(() => {
          setFractionInput((prev) => {
            if (!prev.enabled || prev.part !== "num" || prev.num.length === 0 || prev.den.length > 0) return prev;
            return { ...prev, part: "den" };
          });
          fractionAutoMoveTimerRef.current = null;
        }, FRACTION_AUTO_MOVE_DELAY_MS);
      }
      setResultMark(null);
      return;
    }

    const canAppendToken = (text: string, token: string) => {
      if (/^\d$/.test(token)) return true;
      if (token === "-") return text.length === 0;
      if (token === ".") {
        if (text.includes(".")) return false;
        if (text === "" || text === "-") return false;
        return true;
      }
      return false;
    };
    if (!canAppendToken(currentText, num)) return;

    if (isQuadraticRootsQuestion) {
      setQuadraticAnswers((prev) => {
        const next: [string, string] = [...prev] as [string, string];
        const maxLen = isDigit ? 6 : 7;
        if (next[quadraticActiveIndex].length >= maxLen) return prev;
        next[quadraticActiveIndex] = `${next[quadraticActiveIndex]}${num}`;
        return next;
      });
      setResultMark(null);
      return;
    }
    if (input.length >= 12) return;
    setInput((prev) => `${prev}${num}`);
    setResultMark(null);
  };

  const handleDelete = () => {
    if (status !== 'playing' || isStarting) return;
    if (isQuadraticRootsQuestion && quadraticFractionInputs[quadraticActiveIndex].enabled) {
      clearQuadraticFractionAutoMoveTimer(quadraticActiveIndex);
      setQuadraticFractionInputs((prev) => {
        const target = prev[quadraticActiveIndex];
        const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
        if (target.part === "den") {
          if (target.den.length > 0) {
            next[quadraticActiveIndex] = { ...target, den: target.den.slice(0, -1) };
          } else {
            next[quadraticActiveIndex] = { ...target, part: "num" };
          }
          return next;
        }
        if (target.num.length > 0) {
          next[quadraticActiveIndex] = { ...target, num: target.num.slice(0, -1) };
          return next;
        }
        next[quadraticActiveIndex] = { ...EMPTY_FRACTION_EDITOR };
        return next;
      });
      setResultMark(null);
      return;
    }
    if (!isQuadraticRootsQuestion && fractionInput.enabled) {
      clearFractionAutoMoveTimer();
      setFractionInput((prev) => {
        if (prev.part === "den") {
          if (prev.den.length > 0) return { ...prev, den: prev.den.slice(0, -1) };
          return { ...prev, part: "num" };
        }
        if (prev.num.length > 0) return { ...prev, num: prev.num.slice(0, -1) };
        return { ...EMPTY_FRACTION_EDITOR };
      });
      setResultMark(null);
      return;
    }
    if (isQuadraticRootsQuestion) {
      setQuadraticAnswers((prev) => {
        const next: [string, string] = [...prev] as [string, string];
        next[quadraticActiveIndex] = next[quadraticActiveIndex].slice(0, -1);
        return next;
      });
      setResultMark(null);
      return;
    }
    setInput(prev => prev.slice(0, -1));
    setResultMark(null);
  };

  const handleAttack = () => {
    if (status !== 'playing' || isStarting || !currentItem || !currentType) return;
    const answerText = isQuadraticRootsQuestion
      ? `${quadraticFractionInputs[0].enabled ? fractionEditorToAnswerText(quadraticFractionInputs[0]) : quadraticAnswers[0]},${quadraticFractionInputs[1].enabled ? fractionEditorToAnswerText(quadraticFractionInputs[1]) : quadraticAnswers[1]}`
      : (fractionInput.enabled ? fractionEditorToAnswerText(fractionInput) : input);
    if (!answerText.trim()) return;

    const verdict = gradeAnswer(answerText, currentItem.answer, currentType.answer_format, {
      typeId: currentType.type_id,
      expectedForm: resolveExpectedFormFromPrompt(`${currentItem.prompt} ${currentItem.prompt_tex ?? ""}`)
    });
    setPracticeResult({ ok: verdict.ok, correctAnswer: currentItem.answer });
    setQuestionResults((prev) => ({
      ...prev,
      [itemIndex]: (() => {
        const prevEntry = prev[itemIndex];
        const everWrong = (prevEntry?.everWrong ?? false) || !verdict.ok;
        const firstWrongAnswer =
          prevEntry?.firstWrongAnswer ??
          (!verdict.ok ? answerText : undefined);
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
    void ensureActiveSession().then((resolvedSessionId) => {
      if (!resolvedSessionId) return;
      return postJson("/api/session/answer", {
        sessionId: resolvedSessionId,
        typeId: currentType.type_id,
        prompt: currentItem.prompt,
        predicted: answerText,
        correctAnswer: currentItem.answer,
        isCorrect: verdict.ok
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "answer_log_failed";
        setSessionError(message);
      });
    });

    if (verdict.ok) {
      if (wrongMarkTimerRef.current) {
        window.clearTimeout(wrongMarkTimerRef.current);
        wrongMarkTimerRef.current = null;
      }
      setResultMark('correct');
      const newCombo = combo + 1;
      setCombo(newCombo);
      const charData = CHARACTERS[character];
      let hitMsg = charData.hits[Math.floor(Math.random() * charData.hits.length)];
      if (newCombo >= 3) hitMsg += ` (Combo x${newCombo}!)`;
      setMessage(hitMsg);
      if (autoNextEnabled) {
        cooldownUntilRef.current = Date.now() + AUTO_NEXT_WAIT_MS;
        if (autoNextTimerRef.current) window.clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          autoNextTimerRef.current = null;
          nextQuestion();
        }, AUTO_NEXT_WAIT_MS);
      }
    } else {
      if (wrongMarkTimerRef.current) {
        window.clearTimeout(wrongMarkTimerRef.current);
      }
      setResultMark('wrong');
      wrongMarkTimerRef.current = window.setTimeout(() => {
        setResultMark(null);
        wrongMarkTimerRef.current = null;
      }, WRONG_MARK_WAIT_MS);
      setCombo(0);
      const charData = CHARACTERS[character];
      setMessage(charData.misses[Math.floor(Math.random() * charData.misses.length)]);
    }

    if (isQuadraticRootsQuestion) {
      clearQuadraticFractionAutoMoveTimer(0);
      clearQuadraticFractionAutoMoveTimer(1);
      setQuadraticAnswers(["", ""]);
      setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
      setQuadraticActiveIndex(0);
    } else {
      clearFractionAutoMoveTimer();
      setInput('');
      setFractionInput({ ...EMPTY_FRACTION_EDITOR });
    }
  };

  const keypadAnswerKind: AnswerFormat["kind"] = isQuadraticRootsQuestion
    ? "pair"
    : (currentType?.answer_format.kind ?? "int");
  const canUseKeyToken = (token: string) => {
    if (/^\d$/.test(token)) return true;
    if (token === "-") return true;
    if (token === ".") return true;
    if (token === "/") return true;
    return false;
  };
  const renderKeyLabel = (token: string): ReactNode => {
    if (token === "/") return "分数";
    if (token === ".") return "小数点";
    if (token === "-") {
      return (
        <span className="inline-flex flex-col items-center leading-[0.9]">
          <span>マイ</span>
          <span>ナス</span>
        </span>
      );
    }
    return token;
  };
  const isValidAnswerText = (text: string, kind: AnswerFormat["kind"]) => {
    const t = text.trim();
    if (!t) return false;
    if (kind === "int" || kind === "pair") return /^-?\d+$/.test(t);
    if (kind === "dec") return /^-?\d+(\.\d+)?$/.test(t);
    if (kind === "frac") return /^-?\d+\/-?\d+$/.test(t);
    return true;
  };
  const canSubmitCurrentAnswer = isQuadraticRootsQuestion
    ? (
      ((quadraticFractionInputs[0].enabled ? isFractionEditorReady(quadraticFractionInputs[0]) : isValidAnswerText(quadraticAnswers[0], "pair")) &&
        (quadraticFractionInputs[1].enabled ? isFractionEditorReady(quadraticFractionInputs[1]) : isValidAnswerText(quadraticAnswers[1], "pair"))) ||
      (quadraticAnswers[0].trim().length > 0 && quadraticAnswers[1].trim().length > 0 &&
        (quadraticAnswers[0].includes("/") || quadraticAnswers[1].includes("/")))
    )
    : (
      (fractionInput.enabled ? isFractionEditorReady(fractionInput) : isValidAnswerText(input, keypadAnswerKind)) ||
      (keypadAnswerKind !== "frac" && input.trim().length > 0 && input.includes("/"))
    );

  const resultOverlay = resultMark ? (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
      {resultMark === "correct" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 120 120"
          className="h-24 w-24 sm:h-28 sm:w-28 text-red-700 drop-shadow-[0_3px_0_rgba(0,0,0,0.28)]"
        >
          <path
            d="M16 61 C18 30, 48 10, 82 17 C108 24, 114 69, 93 93 C66 116, 23 102, 16 61"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M20 60 C23 35, 47 20, 74 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.62"
          />
        </svg>
      ) : (
        <div className="relative flex items-center justify-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="h-24 w-24 sm:h-28 sm:w-28 text-red-700 drop-shadow-[0_3px_0_rgba(0,0,0,0.28)]"
          >
            <path
              d="M20 22 L100 96"
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d="M97 20 L26 99"
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d="M30 34 L86 84"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
        </div>
      )}
    </div>
  ) : null;


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
    const recognitionRoi = getRecognitionRoi(drawingCanvas, visibleCanvasSize);

    const digits = getAnswerDigits();
    const promptText = currentItem?.prompt ?? "";
    const promptTex = currentItem?.prompt_tex;
    const isQuadraticQuestion = /二次方程式/.test(`${promptText} ${promptTex ?? ""}`);
    const forcedFractionAnswer = forcedFractionAnswerRef.current;
    const expectedFractionAnswer =
      forcedFractionAnswer ?? (currentItem?.answer.includes("/") ? currentItem.answer : null);
    const expectedForm =
      forcedExpectedFormRef.current ?? resolveExpectedFormFromPrompt(`${promptText} ${promptTex ?? ""}`);
    const mixedQuestion =
      forceMixedRecognitionRef.current ||
      isMixedFractionQuestion(currentType?.type_id, promptText, promptTex);
    const plainFractionQuestion =
      forceFractionRecognitionRef.current ||
      (currentType?.answer_format.kind === "frac" && Boolean(currentItem?.answer.includes("/")));
    let mixedResult: FractionRecognition | null = null;
    if (mixedQuestion) {
      mixedResult = recognizeMixedFractionFromCanvas(drawingCanvas, expectedForm, recognitionRoi);
    }
    let fractionResult: FractionRecognition | null = null;
    if (!mixedResult && (plainFractionQuestion || mixedQuestion)) {
      fractionResult = recognizeFractionFromCanvas(drawingCanvas, recognitionRoi);
    }
    const fallback = preprocessDigits(drawingCanvas, digits, recognitionRoi, {
      disableForcedSplit: isQuadraticQuestion
    });
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
        !pred || pred.bestProb < 0.32 || pred.margin < 0.035
          ? null
          : refineDigitPrediction(pred.predictedDigit, samples[i].tensor, pred.probabilities)
      );
      let perDigitString = refined.some((d) => d === null) ? '' : refined.join('');

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
          const canAdopt2Digit =
            maxProb >= 0.7 &&
            minPerDigitConfidence < 0.72 &&
            /^\d{2}$/.test(multi.predictedValue);
          if (canAdopt2Digit) {
            predictedText = multi.predictedValue;
          }
        }
      }
      if ((plainFractionQuestion || mixedQuestion) && perDigitString && expectedFractionAnswer) {
        if (mixedQuestion) {
          const normalizedMixed = normalizeMixedFractionFromDigitString(
            perDigitString,
            expectedFractionAnswer,
            expectedForm
          );
          if (normalizedMixed) {
            predictedText = normalizedMixed;
          }
        } else {
          const normalizedFraction = normalizeFractionFromDigitString(perDigitString, expectedFractionAnswer);
          if (normalizedFraction) {
            predictedText = normalizedFraction;
          }
        }
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
    if (
      predictedText &&
      dotXs.length === 0 &&
      currentItem?.answer?.includes(".") &&
      /^\d+$/.test(predictedText)
    ) {
      const centers = samples.map((s) => s.centerX);
      const byValley = inferDecimalDotFromValley(predictedText, centers);
      if (byValley.includes(".")) {
        predictedText = byValley;
      }
      const expectedDecimal = normalizeDecimalFromDigitString(predictedText.replace(/\D/g, ""), currentItem.answer);
      if (expectedDecimal) {
        predictedText = expectedDecimal;
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
      let userInputForJudge = predictedText;
      if (isQuadraticRootsType(currentType.type_id)) {
        const nextPair: [string, string] = [...quadraticAnswers] as [string, string];
        nextPair[quadraticActiveIndex] = predictedText;
        const normalizedPair: [string, string] = [nextPair[0].trim(), nextPair[1].trim()];
        setQuadraticAnswers(normalizedPair);
        const nextActive: 0 | 1 =
          normalizedPair[0] && !normalizedPair[1]
            ? 1
            : !normalizedPair[0] && normalizedPair[1]
              ? 0
              : quadraticActiveIndex;
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
      setPracticeResult({ ok: verdict.ok, correctAnswer: currentItem.answer });
      const resolvedSessionId = await ensureActiveSession();
      if (resolvedSessionId) {
        void postJson("/api/session/answer", {
          sessionId: resolvedSessionId,
          typeId: currentType.type_id,
          prompt: currentItem.prompt,
          predicted: userInputForJudge,
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
            (!verdict.ok ? userInputForJudge : undefined);
          return {
            prompt: currentItem.prompt,
            promptTex: currentItem.prompt_tex,
            userAnswer: userInputForJudge,
            correct: !everWrong,
            correctAnswer: currentItem.answer,
            everWrong,
            firstWrongAnswer
          };
        })()
      }));

      if (verdict.ok) {
        if (wrongMarkTimerRef.current) {
          window.clearTimeout(wrongMarkTimerRef.current);
          wrongMarkTimerRef.current = null;
        }
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
        if (wrongMarkTimerRef.current) {
          window.clearTimeout(wrongMarkTimerRef.current);
        }
        setResultMark('wrong');
        wrongMarkTimerRef.current = window.setTimeout(() => {
          setResultMark(null);
          wrongMarkTimerRef.current = null;
        }, WRONG_MARK_WAIT_MS);
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

  const handleResetAnswer = () => {
    canvasRef.current?.clear();
    if (!isQuadraticRootsQuestion) {
      setRecognizedNumber(null);
      return;
    }
    setQuadraticAnswers((prev) => {
      const next: [string, string] = [...prev] as [string, string];
      next[quadraticActiveIndex] = "";
      setRecognizedNumber(next.filter(Boolean).join(","));
      return next;
    });
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
    const nextDelay = getAutoJudgeDelayMs(getAnswerDigits()) + (inkFirstMode ? 300 : 0);
    autoRecognizeTimerRef.current = window.setTimeout(() => {
      runInference();
    }, nextDelay);
  };
  const memoLogicalWidth = Math.ceil((memoCanvasSize.width / MIN_MEMO_ZOOM) * MEMO_WORKSPACE_SCALE) + OUTER_MARGIN * 2;
  const memoLogicalHeight = Math.ceil((memoCanvasSize.height / MIN_MEMO_ZOOM) * MEMO_WORKSPACE_SCALE) + OUTER_MARGIN * 2;
  const memoOffsetX = memoCanvasSize.width / 2 - (memoLogicalWidth * calcZoom) / 2 + calcPan.x;
  const memoOffsetY = memoCanvasSize.height / 2 - (memoLogicalHeight * calcZoom) / 2 + calcPan.y;
  const memoDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const memoMidpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  });
  const getMemoLogicalPoint = (clientX: number, clientY: number): MemoPoint | null => {
    const host = drawAreaRef.current;
    if (!host) return null;
    const rect = host.getBoundingClientRect();
    const x = (clientX - rect.left - memoOffsetX) / calcZoom;
    const y = (clientY - rect.top - memoOffsetY) / calcZoom;
    return {
      x: clamp(x, 0, memoLogicalWidth),
      y: clamp(y, 0, memoLogicalHeight)
    };
  };
  const drawMemoCanvas = () => {
    const canvas = memoCanvasRef.current;
    if (!canvas) return;
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(memoCanvasSize.width));
    const height = Math.max(1, Math.floor(memoCanvasSize.height));
    const pixelWidth = Math.max(1, Math.floor(width * dpr));
    const pixelHeight = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(memoOffsetX, memoOffsetY);
    ctx.scale(calcZoom, calcZoom);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = MEMO_BRUSH_WIDTH;
    const drawStroke = (stroke: MemoStroke) => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        ctx.lineTo(p.x, p.y);
      }
      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.lineTo(p.x + 0.01, p.y + 0.01);
      }
      ctx.stroke();
    };
    memoStrokesRef.current.forEach(drawStroke);
    if (memoActiveStrokeRef.current) {
      drawStroke(memoActiveStrokeRef.current);
    }
    ctx.restore();
  };
  const scheduleMemoRedraw = () => {
    if (memoDrawRafRef.current) return;
    memoDrawRafRef.current = window.requestAnimationFrame(() => {
      memoDrawRafRef.current = null;
      drawMemoCanvas();
    });
  };
  const clearMemo = () => {
    memoActiveStrokeRef.current = null;
    memoActivePointerIdRef.current = null;
    memoStrokesRef.current = [];
    setCalcPan({ x: 0, y: 0 });
    setMemoRedoStack([]);
    setMemoStrokes([]);
    drawMemoCanvas();
  };
  const undoMemo = () => {
    const current = memoStrokesRef.current;
    if (current.length === 0) return;
    const next = current.slice(0, -1);
    const last = current[current.length - 1];
    memoStrokesRef.current = next;
    setMemoRedoStack((redo) => [...redo, last]);
    setMemoStrokes(next);
    drawMemoCanvas();
  };
  const handleMemoPointerDown = (e: any) => {
    if (e.pointerType === "touch") {
      e.preventDefault();
      memoPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (memoPointersRef.current.size === 2) {
        const [p1, p2] = [...memoPointersRef.current.values()];
        if (!p1 || !p2) return;
        if (memoActiveStrokeRef.current?.points.length) {
          const stroke = memoActiveStrokeRef.current;
          memoActiveStrokeRef.current = null;
          memoActivePointerIdRef.current = null;
          memoStrokesRef.current = [...memoStrokesRef.current, stroke];
          setMemoStrokes(memoStrokesRef.current);
        }
        memoPinchStartRef.current = {
          distance: Math.max(1, memoDistance(p1, p2)),
          zoom: calcZoom,
          mid: memoMidpoint(p1, p2),
          pan: calcPan
        };
        setIsPinchingMemo(true);
        drawMemoCanvas();
        return;
      }
      if (memoPointersRef.current.size > 1) return;
    }
    if (isPinchingMemo) return;
    const point = getMemoLogicalPoint(e.clientX, e.clientY);
    if (!point) return;
    memoActivePointerIdRef.current = e.pointerId;
    memoActiveStrokeRef.current = { points: [point] };
    setMemoRedoStack([]);
    drawMemoCanvas();
  };
  const handleMemoPointerMove = (e: any) => {
    if (e.pointerType === "touch" && memoPointersRef.current.has(e.pointerId)) {
      memoPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (memoPointersRef.current.size >= 2 && memoPinchStartRef.current) {
      e.preventDefault();
      const [p1, p2] = [...memoPointersRef.current.values()];
      if (!p1 || !p2) return;
      const dist = Math.max(1, memoDistance(p1, p2));
      const mid = memoMidpoint(p1, p2);
      const start = memoPinchStartRef.current;
      const zoomRatio = dist / start.distance;
      const nextZoom = clamp(start.zoom * zoomRatio, MIN_MEMO_ZOOM, MAX_MEMO_ZOOM);
      const nextPan = {
        x: start.pan.x + (mid.x - start.mid.x),
        y: start.pan.y + (mid.y - start.mid.y)
      };
      setCalcZoom(nextZoom);
      setCalcPan(nextPan);
      scheduleMemoRedraw();
      return;
    }
    if (memoActivePointerIdRef.current !== e.pointerId) return;
    const point = getMemoLogicalPoint(e.clientX, e.clientY);
    if (!point || !memoActiveStrokeRef.current) return;
    memoActiveStrokeRef.current.points.push(point);
    drawMemoCanvas();
  };
  const handleMemoPointerEnd = (e: any) => {
    if (e.pointerType === "touch") {
      memoPointersRef.current.delete(e.pointerId);
    }
    if (memoActivePointerIdRef.current === e.pointerId && memoActiveStrokeRef.current) {
      const stroke = memoActiveStrokeRef.current;
      if (stroke.points.length > 0) {
        memoStrokesRef.current = [...memoStrokesRef.current, stroke];
        setMemoStrokes(memoStrokesRef.current);
      }
      memoActiveStrokeRef.current = null;
      memoActivePointerIdRef.current = null;
      drawMemoCanvas();
    }
    if (memoPointersRef.current.size < 2) {
      memoPinchStartRef.current = null;
      setIsPinchingMemo(false);
    }
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

  const calcDigitCount = (text: string) => text.replace(/\D/g, "").length;
  const isEmptyPrediction = (text: string) => text.trim().length === 0;
  const isOverSegmented = (expected: string, predicted: string) =>
    calcDigitCount(predicted) > calcDigitCount(expected);
  const fmtRate = (value: number, total: number) =>
    total ? ((value / total) * 100).toFixed(1) : "0.0";
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
    const overallPass = Number(overall) >= 70;
    const emptyPass = Number(emptyRate) < 10;
    setAutoDrawBatchSummary(
      `${label} 完了: 全体一致 ${exact}/${total} (${overall}%, ${passLabel(overallPass)}) / 空判定 ${emptyCount}/${total} (${emptyRate}%, ${passLabel(emptyPass)}) / 過分割 ${overSegmented}/${total} (${overSplitRate}%) / 0&8一致 ${zeroEightExact}/${zeroEightTotal} (${zeroEight}%) / 4&8&9一致 ${fourEightNineExact}/${fourEightNineTotal} (${fourEightNine}%) / 5&6一致 ${fiveSixExact}/${fiveSixTotal} (${fiveSix}%)`
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
    const slashPass = Number(slashRate) >= 75;
    const emptyPass = Number(emptyRate) < 10;
    setAutoDrawBatchSummary(
      `${label} 完了: 全体一致 ${exact}/${total} (${overall}%) / 空判定 ${emptyCount}/${total} (${emptyRate}%, ${passLabel(emptyPass)}) / 過分割 ${overSegmented}/${total} (${overSplitRate}%) / スラッシュ検出 ${slashDetected}/${total} (${slashRate}%, ${passLabel(slashPass)}) / 構造失敗 ${structureFailed}/${total} (${structureFailRate}%)`
    );
  };

  const runAutoDrawMixedTest = async () => {
    const canvas = getDrawingCanvas(canvasRef.current);
    if (!canvas) return { expected: "", predicted: "", expectedForm: "auto" as ExpectedForm };
    const ctx = canvas.getContext('2d');
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
        expectedForm === "mixed"
          ? isMixedFormat(predicted)
          : expectedForm === "improper"
            ? isImproperFormat(predicted)
            : predicted.includes("/");
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
    const formPass = Number(formRate) >= 65;
    const emptyPass = Number(emptyRate) < 10;
    setAutoDrawBatchSummary(
      `${label} 完了: 全体一致 ${exact}/${total} (${overall}%) / 空判定 ${emptyCount}/${total} (${emptyRate}%, ${passLabel(emptyPass)}) / 過分割 ${overSegmented}/${total} (${overSplitRate}%) / 形式一致 ${formOk}/${total} (${formRate}%, ${passLabel(formPass)}) / スラッシュ検出 ${slashDetected}/${total} (${slashRate}%) / 構造失敗 ${structureFailed}/${total} (${structureFailRate}%) / 整数部検出 ${mixedWholeDetected}/${mixedExpected} (${wholeRate}%) / 整数部構造失敗 ${wholeStructureFailed}/${mixedExpected} (${wholeFailRate}%)`
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
          className="w-full bg-white border-2 border-slate-200 rounded-2xl px-3 py-2 text-[11px] font-bold text-slate-700 text-left hover:bg-slate-50 whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {selectedPath.gradeName} / {selectedPath.typeName}
        </button>
      )}
      {/* Center: Character & Message */} 
      <div className="flex flex-col items-center space-y-3 my-2 flex-1 justify-start w-full">
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
                      {Number(index) + 1}.{" "}
                      {r.promptTex?.trim()
                        ? (
                          <span className="inline-flex max-w-full items-center overflow-x-auto whitespace-nowrap align-middle">
                            <InlineMath math={toEquationTex(trimTrailingEquationEquals(r.promptTex.trim()))} renderError={() => <span>{formatPrompt(r.prompt)}</span>} />
                          </span>
                        )
                        : renderMaybeMath(formatPrompt(r.prompt))}
                      {finalWrong && (
                        <span className="ml-2 font-semibold text-slate-600">
                          / {uiText.answerLabel}: {r.correctAnswer ? renderMaybeMath(r.correctAnswer) : "-"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-right">
                      <span className="text-slate-600">{uiText.yourAnswer}:</span>
                      <span className="text-slate-600">
                        {displayedUserAnswer ? renderMaybeMath(displayedUserAnswer) : "?"}
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
            <div className="w-full max-h-[48vh] overflow-y-auto">
              {quizItems.length === 0 ? (
                <div className="text-slate-500 text-center">
                  {emptyMessage}
                </div>
              ) : currentItem ? (
                <div className="flex flex-col gap-3">
                  <div
                    ref={currentCardRef}
                    className="relative overflow-hidden rounded-2xl border-x-[10px] border-t-[10px] border-b-[14px] border-x-amber-700 border-t-amber-700 border-b-slate-300 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-6 pt-4 pb-8 text-emerald-50 text-2xl font-black shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08),inset_0_0_45px_rgba(0,0,0,0.45),0_10px_28px_rgba(0,0,0,0.35)] h-[200px] sm:h-[185px] flex flex-col justify-between"
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.10),transparent_34%),repeating-linear-gradient(12deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_8px)]" />
                    {combo >= 2 && (
                      <div className="pointer-events-none absolute top-2 right-2 -rotate-12 rounded-md border border-yellow-200/70 bg-yellow-300/90 px-2 py-0.5 text-[10px] sm:text-xs font-black tracking-wide text-emerald-950 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                        {combo} COMBO!
                      </div>
                    )}
                    <div className="pointer-events-none absolute bottom-0 left-3 flex items-end gap-2">
                      <div aria-label="board-eraser" className="h-6 w-12 rounded-md border border-amber-900 bg-gradient-to-b from-amber-200 to-amber-500 shadow-[0_2px_0_rgba(0,0,0,0.28)]" />
                      <div className="flex items-end gap-1">
                        <div aria-label="board-chalk-white" className="h-2.5 w-7 rounded-full border border-slate-300 bg-white shadow-[0_1px_0_rgba(0,0,0,0.2)]" />
                        <div aria-label="board-chalk-pink" className="h-2.5 w-6 rounded-full border border-pink-300 bg-pink-100 shadow-[0_1px_0_rgba(0,0,0,0.2)]" />
                        <div aria-label="board-chalk-blue" className="h-2.5 w-6 rounded-full border border-sky-300 bg-sky-100 shadow-[0_1px_0_rgba(0,0,0,0.2)]" />
                      </div>
                    </div>
                    <div
                      ref={qaRowRef}
                      className={
                        useSingleLineQa
                          ? "flex items-center justify-between gap-3 sm:gap-4"
                          : "flex flex-col justify-between gap-3 sm:gap-4"
                      }
                    >
                      <div
                        ref={qaPromptRef}
                        className={
                          useSingleLineQa
                            ? "min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[28px] sm:text-[32px] leading-tight font-extrabold text-emerald-50"
                            : "min-w-0 w-full overflow-x-auto whitespace-nowrap text-[28px] sm:text-[32px] leading-tight font-extrabold text-emerald-50"
                        }
                      >
                        <span ref={qaPromptContentRef} className="inline-block align-middle">
                          {renderPrompt(currentItem)}
                        </span>
                      </div>
                      {isQuadraticRootsQuestion ? (
                        <div
                          ref={qaAnswerRef}
                          className={
                            useSingleLineQa
                              ? "w-auto shrink-0 flex items-center gap-2 overflow-x-auto whitespace-nowrap"
                              : "w-full sm:w-auto ml-10 sm:ml-10 flex items-center gap-2 overflow-x-auto whitespace-nowrap"
                          }
                        >
                          <div ref={qaAnswerContentRef} className="relative inline-flex items-center gap-2 overflow-visible">
                            <span className="text-[20px] sm:text-[24px] font-bold text-emerald-100">x1 =</span>
                            <button
                              type="button"
                              onClick={() => setQuadraticActiveIndex(0)}
                              aria-label="recognized-answer-1"
                              className={`w-[72px] sm:w-[84px] shrink-0 h-[48px] sm:h-[56px] px-2 sm:px-3 rounded-xl border-2 text-[22px] sm:text-[26px] font-extrabold text-center overflow-x-auto whitespace-nowrap flex items-center justify-center ${
                                quadraticActiveIndex === 0 ? "border-emerald-300 bg-emerald-100 text-emerald-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"
                              }`}
                              style={{ opacity: quadraticAnswers[0] ? 1 : 0.35 }}
                            >
                              {quadraticFractionInputs[0].enabled
                                ? renderFractionEditorValue(quadraticFractionInputs[0])
                                : (quadraticAnswers[0] || "\u2007")}
                            </button>
                            <span className="text-[20px] sm:text-[24px] font-bold text-emerald-100">x2 =</span>
                            <button
                              type="button"
                              onClick={() => setQuadraticActiveIndex(1)}
                              aria-label="recognized-answer-2"
                              className={`w-[72px] sm:w-[84px] shrink-0 h-[48px] sm:h-[56px] px-2 sm:px-3 rounded-xl border-2 text-[22px] sm:text-[26px] font-extrabold text-center overflow-x-auto whitespace-nowrap flex items-center justify-center ${
                                quadraticActiveIndex === 1 ? "border-emerald-300 bg-emerald-100 text-emerald-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"
                              }`}
                              style={{ opacity: quadraticAnswers[1] ? 1 : 0.35 }}
                            >
                              {quadraticFractionInputs[1].enabled
                                ? renderFractionEditorValue(quadraticFractionInputs[1])
                                : (quadraticAnswers[1] || "\u2007")}
                            </button>
                            {resultOverlay}
                          </div>
                        </div>
                      ) : (
                        <div
                          ref={qaAnswerRef}
                          className={
                            useSingleLineQa
                              ? "relative w-auto shrink-0 flex items-center gap-2 overflow-visible"
                              : "relative w-full sm:w-auto ml-10 sm:ml-10 flex items-center gap-2 overflow-visible"
                          }
                        >
                          <div ref={qaAnswerContentRef} className="relative inline-flex items-center gap-2 overflow-visible">
                            <span className="text-[26px] sm:text-[30px] font-bold text-emerald-100">=</span>
                            <div className="relative w-[150px] sm:w-[180px] overflow-visible">
                              <div
                                aria-label="recognized-answer"
                                className="w-[150px] sm:w-[180px] shrink-0 max-w-full h-[56px] sm:h-[64px] px-2 sm:px-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-900 text-[26px] sm:text-[30px] font-extrabold text-center overflow-x-auto whitespace-nowrap flex items-center justify-center"
                                style={{ opacity: fractionInput.enabled ? 1 : (displayedAnswer ? 1 : 0.35) }}
                              >
                                {fractionInput.enabled
                                  ? renderFractionEditorValue(fractionInput)
                                  : (displayedAnswer || "\u2007")}
                              </div>
                              {resultOverlay}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 h-5" />
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-center">{uiText.selectType}</div>
              )}
            </div>

            {currentAid && <SecondaryExplanationPanel aid={currentAid} />}

            <section className="w-full rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-md">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-800">
                <span>計算メモ（2本指ピンチで縮小）</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={undoMemo}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-700"
                  >
                    1つ戻る
                  </button>
                  <button
                    type="button"
                    onClick={clearMemo}
                    className="px-2 py-1 rounded-md bg-slate-700 text-white"
                  >
                    メモ消去
                  </button>
                </div>
              </div>
              <div ref={memoCanvasHostRef} className="relative h-[40vh] min-h-[260px] w-full">
                <div
                  ref={drawAreaRef}
                  data-testid="calc-memo-area"
                  className="relative h-full w-full overflow-hidden bg-white"
                  style={{
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                    WebkitTapHighlightColor: "transparent"
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onSelectStart={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onPointerDown={handleMemoPointerDown}
                  onPointerMove={handleMemoPointerMove}
                  onPointerUp={handleMemoPointerEnd}
                  onPointerCancel={handleMemoPointerEnd}
                  onPointerLeave={handleMemoPointerEnd}
                >
                  <canvas
                    ref={memoCanvasRef}
                    className="block h-full w-full select-none"
                    aria-label="calc-memo-canvas"
                    draggable={false}
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Bottom: Input + Calc Memo */}
      {status === 'playing' && (
        <div className="w-full pt-2 pb-3 sticky bottom-0 bg-slate-50/95 backdrop-blur-sm z-20 space-y-2">
          <div className="w-full space-y-1 pb-1">
            <div className="w-full grid grid-cols-10 gap-1">
              {DIGIT_KEYPAD_TOKENS.map((token) => (
                <button
                  key={token}
                  onClick={() => handleInput(token)}
                  disabled={status !== 'playing' || isStarting || !canUseKeyToken(token)}
                  className={`
                    h-9 w-full rounded-md text-sm font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all border
                    ${canUseKeyToken(token) ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50" : "bg-slate-100 text-slate-400 border-slate-200"}
                  `}
                >
                  {renderKeyLabel(token)}
                </button>
              ))}
            </div>
            <div className="w-full grid grid-cols-12 gap-1">
              {SYMBOL_KEYPAD_TOKENS.map((token) => (
                <button
                  key={token}
                  onClick={() => handleInput(token)}
                  disabled={status !== 'playing' || isStarting || !canUseKeyToken(token)}
                  className={`
                    col-span-2 h-9 w-full rounded-md text-xs font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all border
                    ${canUseKeyToken(token) ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50" : "bg-slate-100 text-slate-400 border-slate-200"}
                  `}
                >
                  {renderKeyLabel(token)}
                </button>
              ))}
              <button
                onClick={handleDelete}
                disabled={status !== 'playing' || isStarting}
                className="col-span-2 h-9 w-full rounded-md text-xs font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 flex items-center justify-center"
              >
                ⌫
              </button>
              <button
                onClick={handleAttack}
                disabled={status !== 'playing' || isStarting || !canSubmitCurrentAnswer}
                className="col-span-2 h-9 w-full rounded-md text-xs font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-700 flex items-center justify-center"
              >
                {uiText.judge}
              </button>
              <button
                type="button"
                onClick={endLearningSession}
                disabled={sessionActionLoading}
                className="col-span-2 h-9 w-full rounded-md text-xs font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 disabled:bg-slate-300 flex items-center justify-center"
              >
                おわり
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'playing' && (
        <section className="w-full pb-1 space-y-1">
          {!studentId && (
            <div className="text-[10px] text-right text-slate-600 bg-white/90 border border-slate-200 rounded px-2 py-1">
              保護者設定が未保存のためレポート配信はできません。
            </div>
          )}
          {sessionMailStatus && (
            <div className="text-[10px] text-right text-emerald-700 font-semibold bg-emerald-50/95 border border-emerald-200 rounded px-2 py-1">{sessionMailStatus}</div>
          )}
          {sessionError && (
            <div className="text-[10px] text-right text-red-700 bg-red-50/95 border border-red-200 rounded px-2 py-1">{sessionError}</div>
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
