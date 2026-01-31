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
  path.join(__dirname, '..', 'public', 'models', 'mnist-2digit', 'model.json')
);

const limit = Math.max(100, parseInt(getArg('--limit', '3000'), 10) || 3000);
const batchSize = Math.max(16, parseInt(getArg('--batch', '128'), 10) || 128);
const gapMin = Math.max(1, parseInt(getArg('--gap-min', '2'), 10) || 2);
const gapMax = Math.max(gapMin, parseInt(getArg('--gap-max', '6'), 10) || 6);
const jitter = Math.max(0, parseInt(getArg('--jitter', '2'), 10) || 2);

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

const composePair = (imgA, imgB, gapSize, yJitter, width) => {
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
  return out;
};

const main = async () => {
  ensureFiles();
  const images = readImages(imagesPath);
  const labels = readLabels(labelsPath);
  const model = await loadModel();
  const width = 28 * 2 + gapMax;
  const imageSize = 28 * width;

  let correct = 0;
  let seen = 0;

  for (let i = 0; i < limit; i += batchSize) {
    const batchCount = Math.min(batchSize, limit - i);
    const xs = new Float32Array(batchCount * imageSize);
    const ys = new Uint8Array(batchCount);

    for (let b = 0; b < batchCount; b++) {
      const a = Math.floor(Math.random() * images.count);
      const c = Math.floor(Math.random() * images.count);
      const labelA = labels.data[a];
      const labelB = labels.data[c];
      const imgA = getImage(images, a);
      const imgB = getImage(images, c);
      const gap = gapMin + Math.floor(Math.random() * (gapMax - gapMin + 1));
      const pair = composePair(imgA, imgB, gap, jitter, width);
      ys[b] = labelA * 10 + labelB;
      const offset = b * imageSize;
      for (let p = 0; p < imageSize; p++) {
        xs[offset + p] = pair[p];
      }
    }

    const preds = tf.tidy(() => {
      const input = tf.tensor4d(xs, [batchCount, 28, width, 1]);
      const logits = model.predict(input);
      return logits.argMax(-1).dataSync();
    });

    for (let b = 0; b < batchCount; b++) {
      if (preds[b] === ys[b]) correct++;
    }
    seen += batchCount;
    process.stdout.write(`\rProcessed ${seen}/${limit}  Acc: ${((correct / seen) * 100).toFixed(2)}%`);
  }

  console.log(`\nAccuracy: ${((correct / seen) * 100).toFixed(2)}%`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
