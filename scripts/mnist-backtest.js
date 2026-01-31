const fs = require('fs');
const path = require('path');
const util = require('util');

if (typeof util.isNullOrUndefined !== 'function') {
  util.isNullOrUndefined = (v) => v === null || v === undefined;
}

const tf = require('@tensorflow/tfjs-node');

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
const limitArg = getArg('--limit', '10000');
const batchArg = getArg('--batch', '256');
const invert = args.includes('--invert');

const limit = Math.max(1, parseInt(limitArg, 10) || 10000);
const batchSize = Math.max(1, parseInt(batchArg, 10) || 256);

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
    console.error('\nPlace MNIST IDX files at data/mnist or pass --images/--labels.');
    process.exit(1);
  }
};

const loadModel = async () => {
  const url = `file://${modelPath}`;
  return tf.loadLayersModel(url);
};

const main = async () => {
  ensureFiles();
  const images = readImages(imagesPath);
  const labels = readLabels(labelsPath);

  const total = Math.min(limit, images.count, labels.count);
  const imageSize = images.rows * images.cols;

  if (images.rows !== 28 || images.cols !== 28) {
    throw new Error(`Expected 28x28 images, got ${images.rows}x${images.cols}`);
  }

  const model = await loadModel();
  let correct = 0;
  let seen = 0;
  const confusion = Array.from({ length: 10 }, () => Array(10).fill(0));

  for (let i = 0; i < total; i += batchSize) {
    const batchCount = Math.min(batchSize, total - i);
    const batchImages = new Float32Array(batchCount * imageSize);
    const batchLabels = new Uint8Array(batchCount);

    for (let b = 0; b < batchCount; b++) {
      const imgOffset = (i + b) * imageSize;
      const label = labels.data[i + b];
      batchLabels[b] = label;
      for (let p = 0; p < imageSize; p++) {
        const v = images.data[imgOffset + p] / 255;
        batchImages[b * imageSize + p] = invert ? 1 - v : v;
      }
    }

    const { predicted, batchCorrect } = tf.tidy(() => {
      const input = tf.tensor4d(batchImages, [batchCount, 28, 28, 1]);
      const logits = model.predict(input);
      const preds = logits.argMax(-1);
      const predArray = preds.dataSync();
      let localCorrect = 0;
      for (let b = 0; b < batchCount; b++) {
        if (predArray[b] === batchLabels[b]) localCorrect++;
      }
      return { predicted: predArray, batchCorrect: localCorrect };
    });

    for (let b = 0; b < batchCount; b++) {
      confusion[batchLabels[b]][predicted[b]] += 1;
    }

    correct += batchCorrect;
    seen += batchCount;
    const acc = (correct / seen) * 100;
    process.stdout.write(`\rProcessed ${seen}/${total}  Acc: ${acc.toFixed(2)}%`);
  }

  console.log('\n\nConfusion matrix (rows=label, cols=pred):');
  for (let r = 0; r < 10; r++) {
    console.log(`${r}: ${confusion[r].map((v) => v.toString().padStart(4, ' ')).join(' ')}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
