'use client';

import { useEffect, useRef, useState } from 'react';
import CanvasDraw from 'react-canvas-draw';
import * as tf from '@tensorflow/tfjs';
import {
  loadMnistModel,
  loadMnist2DigitModel,
  predictMnistDigitWithProbs,
  predictMnist2DigitWithProbs,
  isModelLoaded,
  is2DigitModelLoaded
} from '@/utils/mnistModel';

type BBox = { minX: number; minY: number; maxX: number; maxY: number };
type DigitSample = { tensor: tf.Tensor2D; preview: ImageData };
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

  return { tensor: tf.tensor2d(input, [28, 28]), preview: finalImageData };
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
  let minVal = Number.MAX_SAFE_INTEGER;
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

const splitBySpans = (bin: Uint8Array, w: number, h: number, bbox: BBox) => {
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
  return components.length > 1 ? components : null;
};

const preprocessDigits = (canvas: HTMLCanvasElement): DigitSample[] => {
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

  if (components.length === 1) {
    const split = splitBySpans(bin, w, h, components[0].bbox) || splitByProjection(bin, w, h, components[0].bbox);
    if (split && split.length >= 2) {
      components = split;
    }
  }

  components.sort((a, b) => a.bbox.minX - b.bbox.minX);

  const samples: DigitSample[] = [];
  for (const component of components.slice(0, 4)) {
    const sample = componentToTensor(component, w, h);
    if (sample) samples.push(sample);
  }
  return samples;
};
const invertTensor = (input: tf.Tensor2D) => {
  const inverted = tf.sub(1, input);
  return inverted as tf.Tensor2D;
};

export default function HandwritingTestPage() {
  const canvasRef = useRef<any>(null);
  const previewRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const [isModelReady, setIsModelReady] = useState(false);
  const [is2DigitModelReady, setIs2DigitModelReady] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedNumber, setRecognizedNumber] = useState<string>('');
  const [message, setMessage] = useState('モデル読み込み中...');
  const [topCandidates, setTopCandidates] = useState<Array<{ digit: number; prob: number }>>([]);
  const [multiCandidates, setMultiCandidates] = useState<Array<{ value: string; prob: number }>>([]);

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
      if (isModelLoaded && is2DigitModelLoaded) {
        setMessage('モデルがロードされました');
      } else {
        setMessage('MNISTモデルの読み込みに失敗しました');
      }
    };
    loadModel();
  }, []);

  const handleRecognize = () => {
    if (!canvasRef.current || !isModelReady || isRecognizing) return;
    setIsRecognizing(true);
    setMessage('判定中...');

    const drawingCanvas = canvasRef.current?.canvas?.drawing as HTMLCanvasElement | undefined;
    if (!drawingCanvas) {
      setMessage('描画キャンバスの取得に失敗しました');
      setIsRecognizing(false);
      return;
    }

    const samples = preprocessDigits(drawingCanvas);
    if (samples.length === 0) {
      setMessage('手書き数字が見つかりませんでした');
      setIsRecognizing(false);
      return;
    }

    if (samples.length === 1) {
      const normalInput = samples[0].tensor.clone();
      const normal = predictMnistDigitWithProbs(normalInput);
      if (!normal) {
        setMessage('数字を認識できませんでした');
        setRecognizedNumber('');
        setTopCandidates([]);
      } else {
        const invertedTensor = invertTensor(samples[0].tensor.clone());
        const inverted = predictMnistDigitWithProbs(invertedTensor);
        const normalMax = Math.max(...normal.probabilities);
        const invertedMax = inverted ? Math.max(...inverted.probabilities) : -1;
        const chosen = inverted && invertedMax > normalMax ? inverted : normal;

        const ranked = chosen.probabilities
          .map((prob, digit) => ({ digit, prob }))
          .sort((a, b) => b.prob - a.prob)
          .slice(0, 3);

        setRecognizedNumber(chosen.predictedDigit.toString());
        setTopCandidates(ranked);
        setMultiCandidates([]);
        setMessage('判定完了');
      }

      previewRefs.current.forEach((ref, idx) => {
        const ctx = ref?.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, 28, 28);
        if (idx === 0) ctx.putImageData(samples[0].preview, 0, 0);
      });
    } else {
      const digits: number[] = [];
      for (const sample of samples) {
        const pred = predictMnistDigitWithProbs(sample.tensor.clone());
        if (pred) digits.push(pred.predictedDigit);
      }
      let fallback = digits.length ? digits.join('') : '';

      let chosenValue = fallback;
      const multiRanked: Array<{ value: string; prob: number }> = [];
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
          chosenValue = multi.predictedValue;
          const ranked = multi.probabilities
            .map((prob, idx) => ({ value: idx.toString().padStart(2, '0'), prob }))
            .sort((a, b) => b.prob - a.prob)
            .slice(0, 3);
          multiRanked.push(...ranked);
        }
      }

      setRecognizedNumber(chosenValue);
      setTopCandidates([]);
      setMultiCandidates(multiRanked);
      setMessage('判定完了');

      previewRefs.current.forEach((ref, idx) => {
        const ctx = ref?.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, 28, 28);
        if (samples[idx]) ctx.putImageData(samples[idx].preview, 0, 0);
      });
    }

    samples.forEach((s) => s.tensor.dispose());
    setIsRecognizing(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="text-xl font-black text-slate-800">手書き数字 判定テスト</h1>
        <p className="text-sm text-slate-600">{message}</p>

        <CanvasDraw
          ref={canvasRef}
          hideGrid={true}
          brushRadius={7}
          brushColor="#000000"
          backgroundColor="#ffffff"
          canvasWidth={320}
          canvasHeight={320}
          className="rounded-xl border-2 border-slate-300 shadow-sm"
        />

        <div className="flex gap-3">
          <button
            onClick={() => canvasRef.current?.clear()}
            className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold"
          >
            クリア
          </button>
          <button
            onClick={handleRecognize}
            disabled={!isModelReady || isRecognizing}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50"
          >
            {isRecognizing ? '判定中...' : '判定'}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
          <div className="text-4xl font-mono text-indigo-700">
            {recognizedNumber ? `= ${recognizedNumber}` : '—'}
          </div>
          <div className="text-xs text-slate-500 text-right">
            入力(28x28)
            <div className="mt-1 grid grid-cols-2 gap-2 justify-end">
              {[0, 1, 2, 3].map((idx) => (
                <canvas
                  key={idx}
                  ref={(el) => {
                    previewRefs.current[idx] = el;
                  }}
                  width={28}
                  height={28}
                  className="border border-slate-200 bg-black"
                  style={{ width: 56, height: 56, imageRendering: 'pixelated' }}
                />
              ))}
            </div>
          </div>
        </div>
        {topCandidates.length > 0 && (
          <div className="text-xs text-slate-600">
            候補: {topCandidates.map((c) => `${c.digit} (${(c.prob * 100).toFixed(1)}%)`).join(' / ')}
          </div>
        )}
        {multiCandidates.length > 0 && (
          <div className="text-xs text-slate-600">
            2桁候補: {multiCandidates.map((c) => `${c.value} (${(c.prob * 100).toFixed(1)}%)`).join(' / ')}
          </div>
        )}
      </div>
    </main>
  );
}
