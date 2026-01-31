const path = require('path');
const fs = require('fs');
const https = require('https');
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

const dataDir = path.join(__dirname, '..', 'data', 'mnist');
const trainImagesPath = path.join(dataDir, 'train-images-idx3-ubyte');
const trainLabelsPath = path.join(dataDir, 'train-labels-idx1-ubyte');
const testImagesPath = path.join(dataDir, 't10k-images-idx3-ubyte');
const testLabelsPath = path.join(dataDir, 't10k-labels-idx1-ubyte');

const epochs = Math.max(1, parseInt(getArg('--epochs', '6'), 10) || 6);
const batchSize = Math.max(16, parseInt(getArg('--batch', '128'), 10) || 128);
const trainSteps = Math.max(50, parseInt(getArg('--steps', '600'), 10) || 600);
const valSteps = Math.max(10, parseInt(getArg('--val-steps', '100'), 10) || 100);
const gapMin = Math.max(1, parseInt(getArg('--gap-min', '2'), 10) || 2);
const gapMax = Math.max(gapMin, parseInt(getArg('--gap-max', '6'), 10) || 6);
const jitter = Math.max(0, parseInt(getArg('--jitter', '2'), 10) || 2);

const downloadFile = (url, dest) =>
  new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });

const ensureMnistFiles = async () => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const files = [
    { path: trainImagesPath, url: 'https://storage.googleapis.com/cvdf-datasets/mnist/train-images-idx3-ubyte.gz' },
    { path: trainLabelsPath, url: 'https://storage.googleapis.com/cvdf-datasets/mnist/train-labels-idx1-ubyte.gz' },
    { path: testImagesPath, url: 'https://storage.googleapis.com/cvdf-datasets/mnist/t10k-images-idx3-ubyte.gz' },
    { path: testLabelsPath, url: 'https://storage.googleapis.com/cvdf-datasets/mnist/t10k-labels-idx1-ubyte.gz' },
  ];

  for (const f of files) {
    if (fs.existsSync(f.path)) continue;
    const gzPath = `${f.path}.gz`;
    if (!fs.existsSync(gzPath)) {
      console.log(`Downloading ${path.basename(gzPath)}...`);
      await downloadFile(f.url, gzPath);
    }
    console.log(`Unpacking ${path.basename(gzPath)}...`);
    const zlib = require('zlib');
    const data = fs.readFileSync(gzPath);
    const out = zlib.gunzipSync(data);
    fs.writeFileSync(f.path, out);
  }
};

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
  const width = 28 * 2 + gapMax;
  const height = 28;
  const out = new Float32Array(width * height);

  const actualGap = gapSize;
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
      const bx = x + 28 + actualGap;
      if (yb >= 0 && yb < height) {
        out[yb * width + bx] = Math.max(out[yb * width + bx], vB);
      }
    }
  }
  return { data: out, width, height };
};

const buildModel = () => {
  const width = 28 * 2 + gapMax;
  const model = tf.sequential();
  model.add(
    tf.layers.conv2d({
      inputShape: [28, width, 1],
      kernelSize: 3,
      filters: 32,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(
    tf.layers.conv2d({
      kernelSize: 3,
      filters: 64,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 128, activation: 'relu', kernelInitializer: 'varianceScaling' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 100, activation: 'softmax', kernelInitializer: 'varianceScaling' }));

  model.compile({
    optimizer: tf.train.adam(),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  return model;
};

const createBatch = (images, labels, batchCount) => {
  const width = 28 * 2 + gapMax;
  const imageSize = 28 * width;
  const xs = new Float32Array(batchCount * imageSize);
  const ys = new Uint8Array(batchCount);

  for (let i = 0; i < batchCount; i++) {
    const a = Math.floor(Math.random() * images.count);
    const b = Math.floor(Math.random() * images.count);
    const labelA = labels.data[a];
    const labelB = labels.data[b];
    const imgA = getImage(images, a);
    const imgB = getImage(images, b);
    const gap = gapMin + Math.floor(Math.random() * (gapMax - gapMin + 1));
    const pair = composePair(imgA, imgB, gap, jitter);
    ys[i] = labelA * 10 + labelB;
    const offset = i * imageSize;
    for (let p = 0; p < imageSize; p++) {
      xs[offset + p] = pair.data[p];
    }
  }

  const xTensor = tf.tensor4d(xs, [batchCount, 28, width, 1]);
  const yTensor = tf.oneHot(tf.tensor1d(ys, 'int32'), 100);
  return { xTensor, yTensor };
};

async function createAndSaveModel() {
  await ensureMnistFiles();
  const trainImages = readImages(trainImagesPath);
  const trainLabels = readLabels(trainLabelsPath);
  const testImages = readImages(testImagesPath);
  const testLabels = readLabels(testLabelsPath);

  const model = buildModel();
  const width = 28 * 2 + gapMax;

  console.log(
    `Training 2-digit model (epochs=${epochs}, batch=${batchSize}, steps=${trainSteps}, valSteps=${valSteps}, width=${width})`
  );

  for (let epoch = 0; epoch < epochs; epoch++) {
    let epochLoss = 0;
    let epochAcc = 0;

    for (let step = 0; step < trainSteps; step++) {
      const { xTensor, yTensor } = createBatch(trainImages, trainLabels, batchSize);
      const history = await model.fit(xTensor, yTensor, { epochs: 1, batchSize, verbose: 0 });
      epochLoss += history.history.loss[0];
      epochAcc += history.history.acc ? history.history.acc[0] : history.history.accuracy[0];
      xTensor.dispose();
      yTensor.dispose();
    }

    let valLoss = 0;
    let valAcc = 0;
    for (let step = 0; step < valSteps; step++) {
      const { xTensor, yTensor } = createBatch(testImages, testLabels, batchSize);
      const evalRes = model.evaluate(xTensor, yTensor, { batchSize, verbose: 0 });
      const lossVal = evalRes[0].dataSync()[0];
      const accVal = evalRes[1].dataSync()[0];
      valLoss += lossVal;
      valAcc += accVal;
      xTensor.dispose();
      yTensor.dispose();
    }

    const avgLoss = epochLoss / trainSteps;
    const avgAcc = epochAcc / trainSteps;
    const avgValLoss = valLoss / valSteps;
    const avgValAcc = valAcc / valSteps;
    console.log(
      `Epoch ${epoch + 1}/${epochs} - loss=${avgLoss.toFixed(4)} acc=${avgAcc.toFixed(4)} val_loss=${avgValLoss.toFixed(
        4
      )} val_acc=${avgValAcc.toFixed(4)}`
    );
  }

  const modelDir = path.join(__dirname, '..', 'public', 'models', 'mnist-2digit');
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  await model.save(`file://${modelDir}`);
  console.log('2-digit model trained and saved to public/models/mnist-2digit');
}

createAndSaveModel().catch((err) => {
  console.error(err);
  process.exit(1);
});
