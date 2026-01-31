const fs = require('fs');
const path = require('path');
const util = require('util');
const tf = require('@tensorflow/tfjs-node');

if (typeof util.isNullOrUndefined !== 'function') {
  util.isNullOrUndefined = (v) => v === null || v === undefined;
}

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
};

const imagesPath = getArg(
  '--images',
  path.join(__dirname, '..', 'data', 'mnist', 't10k-images-idx3-ubyte')
);
const labelsPath = getArg(
  '--labels',
  path.join(__dirname, '..', 'data', 'mnist', 't10k-labels-idx1-ubyte')
);
const modelPath = getArg(
  '--model',
  path.join(__dirname, '..', 'public', 'models', 'mnist', 'model.json')
);

const limit = Math.max(100, parseInt(getArg('--limit', '2000'), 10) || 2000);
const gap = Math.max(0, parseInt(getArg('--gap', '4'), 10) || 4);
const jitter = Math.max(0, parseInt(getArg('--jitter', '2'), 10) || 2);
const sweep = args.includes('--sweep');

const readImages = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const magic = buffer.readUInt32BE(0);
  if (magic !== 2051) {
    throw new Error(`Invalid image file magic: ${magic}`);
  }
  const count = buffer.readUInt32BE(4);
  const rows = buffer.readUInt32BE(8);
  const cols = buffer.readUInt32BE(12);
  const data = buffer.slice(16);
  return { count, rows, cols, data };
};

const readLabels = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const magic = buffer.readUInt32BE(0);
  if (magic !== 2049) {
    throw new Error(`Invalid label file magic: ${magic}`);
  }
  const count = buffer.readUInt32BE(4);
  const data = buffer.slice(8);
  return { count, data };
};

const ensureFiles = () => {
  const missing = [];
  if (!fs.existsSync(imagesPath)) missing.push(imagesPath);
  if (!fs.existsSync(labelsPath)) missing.push(labelsPath);
  if (!fs.existsSync(modelPath)) missing.push(modelPath);
  if (missing.length) {
    console.error('Missing files:');
    missing.forEach((p) => console.error(`- ${p}`));
    process.exit(1);
  }
};

const loadModel = async () => {
  const url = `file://${modelPath}`;
  return tf.loadLayersModel(url);
};

const getImage = (images, index) => {
  const size = images.rows * images.cols;
  const start = index * size;
  const out = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    out[i] = images.data[start + i] / 255;
  }
  return out;
};

const composePair = (imgA, imgB, gapSize, yJitter) => {
  const width = 28 * 2 + gapSize;
  const height = 28;
  const out = new Float32Array(width * height);

  const offsetA = Math.max(-yJitter, Math.min(yJitter, (Math.random() * (yJitter * 2 + 1) - yJitter) | 0));
  const offsetB = Math.max(-yJitter, Math.min(yJitter, (Math.random() * (yJitter * 2 + 1) - yJitter) | 0));

  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const vA = imgA[y * 28 + x];
      const vB = imgB[y * 28 + x];
      const ya = y + offsetA;
      const yb = y + offsetB;
      if (ya >= 0 && ya < height) {
        out[ya * width + x] = Math.max(out[ya * width + x], vA);
      }
      const bx = x + 28 + gapSize;
      if (yb >= 0 && yb < height) {
        out[yb * width + bx] = Math.max(out[yb * width + bx], vB);
      }
    }
  }
  return { data: out, width, height };
};

const segmentByProjection = (bin, w, h, minInk, gapMin) => {
  const colSum = new Uint32Array(w);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      colSum[x] += bin[row + x];
    }
  }

  const spans = [];
  let inSpan = false;
  let spanStart = 0;
  let gapCount = 0;
  for (let x = 0; x < w; x++) {
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
  if (inSpan) spans.push({ start: spanStart, end: w - 1 });
  spans.sort((a, b) => (a.end - a.start) - (b.end - b.start));
  if (spans.length > 2) {
    return spans.slice(-2);
  }
  return spans;
};

const bboxFromSpan = (bin, w, h, span) => {
  let minY = h;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = span.start; x <= span.end; x++) {
      if (bin[y * w + x]) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxY < 0) return null;
  return { minX: span.start, maxX: span.end, minY, maxY };
};

const extractAndResize = (bin, w, h, box) => {
  const boxW = box.maxX - box.minX + 1;
  const boxH = box.maxY - box.minY + 1;
  const size = Math.max(boxW, boxH);
  const padded = size + 4;
  const temp = new Float32Array(padded * padded);

  const offsetX = Math.floor((padded - boxW) / 2);
  const offsetY = Math.floor((padded - boxH) / 2);
  for (let y = 0; y < boxH; y++) {
    for (let x = 0; x < boxW; x++) {
      const src = (box.minY + y) * w + (box.minX + x);
      const dst = (offsetY + y) * padded + (offsetX + x);
      temp[dst] = bin[src] ? 1 : 0;
    }
  }

  const out = new Float32Array(28 * 28);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const srcX = Math.floor((x / 20) * padded);
      const srcY = Math.floor((y / 20) * padded);
      const v = temp[srcY * padded + srcX];
      const dst = (y + 4) * 28 + (x + 4);
      out[dst] = v;
    }
  }
  return out;
};

const predictDigit = (model, input28) =>
  tf.tidy(() => {
    const t = tf.tensor4d(input28, [1, 28, 28, 1]);
    const logits = model.predict(t);
    const pred = logits.argMax(-1).dataSync()[0];
    return pred;
  });

const runOnce = async (minInk, gapMin) => {
  const images = readImages(imagesPath);
  const labels = readLabels(labelsPath);
  const model = await loadModel();

  let correct = 0;
  let segmented = 0;
  for (let i = 0; i < limit; i++) {
    const a = Math.floor(Math.random() * images.count);
    const b = Math.floor(Math.random() * images.count);
    const labelA = labels.data[a];
    const labelB = labels.data[b];
    const imgA = getImage(images, a);
    const imgB = getImage(images, b);
    const pair = composePair(imgA, imgB, gap, jitter);

    const bin = new Uint8Array(pair.width * pair.height);
    for (let p = 0; p < bin.length; p++) {
      bin[p] = pair.data[p] > 0.2 ? 1 : 0;
    }
    const spans = segmentByProjection(bin, pair.width, pair.height, minInk, gapMin);
    if (spans.length !== 2) continue;
    const boxA = bboxFromSpan(bin, pair.width, pair.height, spans[0]);
    const boxB = bboxFromSpan(bin, pair.width, pair.height, spans[1]);
    if (!boxA || !boxB) continue;
    segmented++;
    const inputA = extractAndResize(bin, pair.width, pair.height, boxA);
    const inputB = extractAndResize(bin, pair.width, pair.height, boxB);
    const predA = predictDigit(model, inputA);
    const predB = predictDigit(model, inputB);
    if (predA === labelA && predB === labelB) correct++;
  }

  return {
    accuracy: segmented ? correct / segmented : 0,
    segmented,
  };
};

const main = async () => {
  ensureFiles();

  if (sweep) {
    const candidates = [
      { minInk: 1, gapMin: 2 },
      { minInk: 2, gapMin: 2 },
      { minInk: 2, gapMin: 3 },
      { minInk: 3, gapMin: 3 },
      { minInk: 3, gapMin: 4 },
    ];
    let best = null;
    for (const c of candidates) {
      const res = await runOnce(c.minInk, c.gapMin);
      const score = res.accuracy;
      if (!best || score > best.score) {
        best = { ...c, score, segmented: res.segmented };
      }
      console.log(
        `minInk=${c.minInk} gapMin=${c.gapMin} acc=${(score * 100).toFixed(2)}% segmented=${res.segmented}/${limit}`
      );
    }
    console.log(`\nBest: minInk=${best.minInk} gapMin=${best.gapMin} acc=${(best.score * 100).toFixed(2)}%`);
    return;
  }

  const res = await runOnce(2, 3);
  console.log(`Accuracy: ${(res.accuracy * 100).toFixed(2)}%  (segmented ${res.segmented}/${limit})`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
