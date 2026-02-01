
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from "next/navigation";
import CanvasDraw from 'react-canvas-draw'; // Import CanvasDraw
import * as tf from '@tensorflow/tfjs'; // Import TensorFlow.js
import data from '@/content/mvp_e3_e6_types.json';
import { gradeAnswer, AnswerFormat } from '@/lib/grader';
import { isSupportedType } from "@/lib/questSupport";
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
  answer: string;
};

type TypeDef = {
  type_id: string;
  type_name: string;
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

const formatPrompt = (prompt: string) => {
  return prompt.replace(/を計算しなさい。$/g, "");
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
type DigitSample = { tensor: tf.Tensor2D; preview: ImageData; width: number; height: number };
type Component = { mask: Uint8Array; bbox: BBox; area: number };

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
  return { bin, w, h };
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

  return {
    tensor: tf.tensor2d(input, [28, 28]),
    preview: finalImageData,
    width: boxW,
    height: boxH
  };
};

const splitByProjection = (bin: Uint8Array, w: number, h: number, bbox: BBox) => {
  const width = bbox.maxX - bbox.minX + 1;
  const height = bbox.maxY - bbox.minY + 1;
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
  if (minX === -1 || minVal > splitThreshold) return null;

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
  return [
    { mask: leftMask, bbox: leftBox, area: leftBox ? 1 : 0 },
    { mask: rightMask, bbox: rightBox, area: rightBox ? 1 : 0 }
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

const preprocessDigits = (canvas: HTMLCanvasElement, expectedDigits: number): DigitSample[] => {
  const binData = binarizeCanvas(canvas);
  if (!binData) return [];
  const { bin, w, h } = binData;

  let components = findComponents(bin, w, h);
  if (components.length === 0) return [];

  let maxArea = 0;
  for (const c of components) {
    if (c.area > maxArea) maxArea = c.area;
  }
  const minKeep = Math.max(40, Math.floor(maxArea * 0.08));
  components = components.filter((c) => c.area >= minKeep);

  if (components.length === 0) return [];

  if (components.length === 1 && expectedDigits > 1) {
    const split = splitBySpans(bin, w, h, components[0].bbox, expectedDigits) || splitByProjection(bin, w, h, components[0].bbox);
    if (split && split.length >= expectedDigits) {
      components = split;
    }
  }

  components.sort((a, b) => a.bbox.minX - b.bbox.minX);

  const samples: DigitSample[] = [];
  const maxDigits = Math.max(1, expectedDigits);
  for (const component of components.slice(0, maxDigits)) {
    const sample = componentToTensor(component, w, h);
    if (sample) samples.push(sample);
  }
  return samples;
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

export default function QuestPage() {
  const params = useSearchParams();
  const typeFromQuery = params.get("type");
  const categoryFromQuery = params.get("category");
  const TOTAL_QUESTIONS = 10;
  const [combo, setCombo] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [history, setHistory] = useState<Array<{ id: number; text: string }>>([]);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [results, setResults] = useState<Array<{ id: number; text: string; userAnswer: string; correct: boolean }>>([]);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('Battle Start!');
  const [character, setCharacter] = useState<CharacterType>('warrior');
  const [status, setStatus] = useState<'playing' | 'cleared' | 'finished'>('playing');
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
  const delayMs = 1500;
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inFlightRef = useRef(false);
  const pendingRecognizeRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const AUTO_NEXT_WAIT_MS = 700;
  const [statusMsg, setStatusMsg] = useState<string>("");
  const autoNextTimerRef = useRef<number | null>(null);
  const idleCheckTimerRef = useRef<number | null>(null);
  const grades = useMemo(
    () =>
      (data.grades as GradeDef[])
        .map((grade) => ({
          ...grade,
          categories: grade.categories
            .map((cat) => ({
              ...cat,
              types: cat.types.filter(isSupportedType)
            }))
            .filter((cat) => cat.types.length > 0)
        }))
        .filter((grade) => grade.categories.length > 0),
    []
  );
  const defaultType = grades[0]?.categories[0]?.types[0] ?? null;
  const [selectedType, setSelectedType] = useState<TypeDef | null>(defaultType);
  const [itemIndex, setItemIndex] = useState(0);
  const [practiceResult, setPracticeResult] = useState<{ ok: boolean; correctAnswer: string } | null>(null);

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
        autoRecognizeTimerRef.current = window.setTimeout(() => {
          runInference();
        }, delayMs);
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
      if (Date.now() < cooldownUntilRef.current) return;
      if (isRecognizing || inFlightRef.current) return;
      const idleFor = Date.now() - lastDrawAtRef.current;
      if (idleFor >= delayMs && lastDrawAtRef.current > 0) {
        runInference();
      }
    }, 200);
    return () => {
      if (idleCheckTimerRef.current) {
        window.clearInterval(idleCheckTimerRef.current);
      }
    };
  }, [autoJudgeEnabled, delayMs, isStarting, status, isRecognizing]);


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

  const categoryContext = (() => {
    if (!categoryFromQuery) return null;
    for (const g of grades) {
      for (const c of g.categories) {
        if (c.category_id === categoryFromQuery) {
          return { grade: g, category: c };
        }
      }
    }
    return null;
  })();

  const selectedPath = (() => {
    if (categoryContext) {
      const typeName = selectedType?.type_name ?? "カテゴリ内";
      return {
        gradeName: categoryContext.grade.grade_name,
        categoryName: categoryContext.category.category_name,
        typeName
      };
    }
    if (!selectedType) return null;
    for (const g of grades) {
      for (const c of g.categories) {
        const hit = c.types.find((t) => t.type_id === selectedType.type_id);
        if (hit) {
          return {
            gradeName: g.grade_name,
            categoryName: c.category_name,
            typeName: hit.type_name
          };
        }
      }
    }
    return null;
  })();

  const categoryItems = categoryContext
    ? categoryContext.category.types.flatMap((t) =>
        t.example_items
          .filter((item) => /^\d{1,4}$/.test(item.answer))
          .map((item) => ({ item, type: t }))
      )
    : [];

  const typeItems = selectedType
    ? selectedType.example_items
        .filter((item) => /^\d{1,4}$/.test(item.answer))
        .map((item) => ({ item, type: selectedType }))
    : [];

  const activeItems = categoryItems.length > 0 ? categoryItems : typeItems;
  const usingCategory = categoryItems.length > 0;
  const emptyMessage = usingCategory
    ? "このカテゴリは4桁超が混ざるので未対応です。"
    : "このタイプは4桁超が混ざるので未対応です。";
  const safeIndex = activeItems.length > 0 ? itemIndex % activeItems.length : 0;
  const currentEntry = activeItems[safeIndex] ?? null;
  const prevEntry = activeItems.length > 0 ? activeItems[(safeIndex - 1 + activeItems.length) % activeItems.length] : null;
  const nextEntry = activeItems.length > 0 ? activeItems[(safeIndex + 1) % activeItems.length] : null;
  const currentItem = currentEntry?.item ?? null;
  const currentType = currentEntry?.type ?? selectedType;
  const prevItem = prevEntry?.item ?? null;
  const nextItem = nextEntry?.item ?? null;
  const currentCardRef = useRef<HTMLDivElement | null>(null);

  const nextQuestion = () => {
    setItemIndex((v) => v + 1);
  };

  useEffect(() => {
    setStatusMsg("");
    setPracticeResult(null);
    setResultMark(null);
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
      setStatus('finished');
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

  const handleHandwritingJudge = async () => {
    if (!canvasRef.current || isRecognizing || !isModelReady || isStarting) {
      return;
    }

    setIsRecognizing(true);

    const drawingCanvas = getDrawingCanvas(canvasRef.current);
    if (!drawingCanvas) {
      setIsRecognizing(false);
      return;
    }

    const digits = 4;
    const samples = preprocessDigits(drawingCanvas, digits);

    if (samples.length === 0) {
      canvasRef.current?.clear();
      setIsRecognizing(false);
      setPreviewImages([]);
      return;
    }

    const perDigitPreds = samples.map((s) => {
      const pred = predictMnistDigitWithProbs(s.tensor.clone());
      return pred ? pred.predictedDigit : null;
    });
    let perDigitString = perDigitPreds.some((d) => d === null) ? '' : perDigitPreds.join('');

    if (perDigitString.length === 1 && samples.length === 1) {
      const raw = samples[0].tensor.dataSync();
      const data = Float32Array.from(raw);
      const hasLoop = hasUpperLoop(data);
      const holes = countHoles(data, 28, 28, 8);
      const hasLower = hasLowerLoop(data);
      if (perDigitString === '9') {
        if (holes >= 2 || (hasLoop && hasLower)) perDigitString = '8';
        else if (holes === 0 || !hasLower) {
          const bottomLeft = quadrantInk(data, 0, 16, 14, 28);
          perDigitString = bottomLeft > 0.12 ? '4' : '7';
        }
      }
      if (perDigitString === '4' && hasLoop) {
        if (holes >= 2) perDigitString = '8';
        else if (holes >= 1 && hasLower) perDigitString = '9';
      }
      if (perDigitString === '8') {
        if (holes >= 2) {
          perDigitString = '8';
        } else {
          if (!hasLoop || !hasLower) perDigitString = '4';
          else perDigitString = '9';
        }
      }
    }

    let predictedText = perDigitString;
    if (samples.length === 2 && is2DigitModelReady) {
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

    if (!predictedText) {
      setCombo(0);
    }

    setPreviewImages(samples.map((s) => s.preview));
    samples.forEach((s) => s.tensor.dispose());

    if (predictedText) {
      setRecognizedNumber(predictedText);
    }

    if (predictedText && currentItem && currentType) {
      const verdict = gradeAnswer(predictedText, currentItem.answer, currentType.answer_format);
      setPracticeResult({ ok: verdict.ok, correctAnswer: currentItem.answer });

      if (verdict.ok) {
        setStatusMsg("✅ 合っている");
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
        setStatusMsg("❌ ちがう");
        setResultMark('wrong');
        setCombo(0);
      }
    }

    canvasRef.current?.clear();
    setIsRecognizing(false);
  };

  const getAnswerDigits = () => 1;

  const runInference = async () => {
    if (inputMode !== 'handwriting') return;
    if (status !== 'playing') return;
    if (!isModelReady) return;
    if (Date.now() < cooldownUntilRef.current) return;
    if (isRecognizing || inFlightRef.current) {
      pendingRecognizeRef.current = true;
      return;
    }
    if (isStarting) {
      pendingRecognizeRef.current = true;
      return;
    }

    inFlightRef.current = true;
    try {
      await handleHandwritingJudge();
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
    autoRecognizeTimerRef.current = window.setTimeout(() => {
      runInference();
    }, delayMs);
  };

  const runAutoDrawTest = async () => {
    const canvas = getDrawingCanvas(canvasRef.current);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const drawDigit = (digit: "1" | "2" | "3", x: number, y: number, w: number, h: number) => {
      ctx.beginPath();
      if (digit === "1") {
        ctx.moveTo(x + w * 0.5, y + h * 0.1);
        ctx.lineTo(x + w * 0.5, y + h * 0.9);
      } else if (digit === "2") {
        ctx.moveTo(x + w * 0.15, y + h * 0.25);
        ctx.lineTo(x + w * 0.5, y + h * 0.05);
        ctx.lineTo(x + w * 0.85, y + h * 0.25);
        ctx.lineTo(x + w * 0.15, y + h * 0.85);
        ctx.lineTo(x + w * 0.85, y + h * 0.85);
      } else {
        ctx.moveTo(x + w * 0.2, y + h * 0.2);
        ctx.lineTo(x + w * 0.8, y + h * 0.2);
        ctx.lineTo(x + w * 0.5, y + h * 0.5);
        ctx.lineTo(x + w * 0.8, y + h * 0.8);
        ctx.lineTo(x + w * 0.2, y + h * 0.8);
      }
      ctx.stroke();
    };
    const boxW = 70;
    const boxH = 140;
    const startX = 30;
    const startY = 60;
    const gap = 25;
    drawDigit("1", startX, startY, boxW, boxH);
    drawDigit("2", startX + boxW + gap, startY, boxW, boxH);
    drawDigit("3", startX + (boxW + gap) * 2, startY, boxW, boxH);
    lastDrawAtRef.current = Date.now();
    setPreviewImages([]);
    await runInference();
  };

  const displayedAnswer = inputMode === 'numpad' ? input : (recognizedNumber ?? "");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-between p-4 max-w-md mx-auto border-x border-slate-200 shadow-sm relative">
      
      {/* Input Mode Toggle removed */}

      {selectedPath && (
        <div className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600">
          {selectedPath.gradeName} / {selectedPath.categoryName} / {selectedPath.typeName}
        </div>
      )}

      {/* Center: Character & Message */} 
      <div className="flex flex-col items-center space-y-4 my-4 flex-1 justify-center w-full">
        {status === 'cleared' ? (
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-yellow-600">STAGE CLEAR!</h2>
            <button 
              onClick={() => window.location.reload()}              className="mt-4 px-6 py-2 bg-yellow-500 text-white rounded-lg font-bold shadow-md active:translate-y-1"
            >
              Play Again
            </button>
          </div>
        ) : status === 'finished' ? (
          <div className="w-full bg-white p-6 rounded-2xl shadow-lg border-4 border-indigo-100">
            <h2 className="text-2xl font-black text-indigo-900 mb-4 text-center">結果一覧</h2>
            <div className="space-y-3 max-h-[45vh] overflow-y-auto">
              {results.map((r, idx) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    r.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="font-bold text-slate-700">{idx + 1}. {r.text}</div>
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-600">あなた: {r.userAnswer || '?'}</span>
                    <span className={r.correct ? 'text-green-600' : 'text-red-600'}>
                      {r.correct ? '◯' : '✕'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full px-6 py-2 bg-indigo-500 text-white rounded-lg font-bold shadow-md active:translate-y-1"
            >
              もう一度
            </button>
          </div>
        ) : (
          <>
            <div className="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-h-[40vh] overflow-y-auto">
              {activeItems.length === 0 ? (
                <div className="text-slate-500 text-center">
                  {emptyMessage}
                </div>
              ) : currentItem ? (
                <div className="flex flex-col gap-3">
                  {prevItem && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 opacity-60">
                      {formatPrompt(prevItem.prompt)}
                    </div>
                  )}
                  <div
                    ref={currentCardRef}
                    className="rounded-2xl border-4 border-indigo-200 bg-white px-5 py-4 text-indigo-900 text-xl font-black shadow-md"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[22px] font-extrabold">{formatPrompt(currentItem.prompt)}</div>
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
                      <div className={`mt-2 text-xs font-bold ${practiceResult.ok ? "text-green-600" : "text-red-600"}`}>
                        {practiceResult.ok ? "正解" : "不正解"}
                      </div>
                    )}
                  </div>
                  {statusMsg && (
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, opacity: 0.85 }}>
                      {statusMsg}
                    </div>
                  )}
                  {nextItem && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 opacity-35">
                      {formatPrompt(nextItem.prompt)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-center">タイプを選択してください。</div>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 w-full text-center text-slate-700">
              {practiceResult && (
                <div className={`text-sm font-bold ${practiceResult.ok ? "text-green-600" : "text-red-600"}`}>
                  {practiceResult.ok ? "正解！" : "不正解"}
                  <span className="ml-2 text-slate-600">正答: {practiceResult.correctAnswer}</span>
                  <span className="ml-2 text-slate-600">入力: {displayedAnswer || "?"}</span>
                </div>
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
      {inputMode === 'numpad' ? (
        <div className="w-full grid grid-cols-3 gap-3 pb-4">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((num) => (
            <button
              key={num}
              onClick={() => handleInput(num.toString())}
              disabled={status === 'cleared' || isStarting}
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
            disabled={status === 'cleared' || isStarting}
            className="h-16 rounded-xl text-xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all bg-red-100 text-red-600 border-2 border-red-200 hover:bg-red-200 flex items-center justify-center"
          >
            ⌫
          </button>

          {/* Attack/Enter Button */}
          <button
            onClick={handleAttack}
            disabled={status === 'cleared' || input === '' || isStarting}
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
                判定
              </button>
              <button
                data-testid="auto-draw-test"
                onClick={runAutoDrawTest}
                className="px-3 py-0.5 rounded-md bg-slate-700 text-white"
              >
                AutoDraw Test
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
              brushRadius={4}
              brushColor="#000000"
              backgroundColor="#ffffff"
              canvasWidth={300}
              canvasHeight={300}
              className="rounded-xl border-2 border-slate-300 shadow-lg"
              disabled={status === 'cleared'}
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
                disabled={status === 'cleared' || isStarting}
                className="w-full py-2 rounded-lg bg-indigo-600 text-white font-bold shadow-md active:translate-y-1 disabled:opacity-50"
              >
                次の問題へ
              </button>
            </div>
          </div>
          <div className="flex gap-3 w-full justify-center">
            <button
              onClick={() => canvasRef.current?.clear()}              disabled={status === 'cleared' || isRecognizing}
              className="px-6 py-2 bg-red-100 text-red-600 rounded-lg font-bold shadow-md active:translate-y-1"
            >
              リセット
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
