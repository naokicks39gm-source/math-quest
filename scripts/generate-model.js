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
const limit = Math.max(0, parseInt(getArg('--limit', '60000'), 10) || 60000);

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

const buildModel = () => {
  const model = tf.sequential();
  model.add(
    tf.layers.conv2d({
      inputShape: [28, 28, 1],
      kernelSize: 5,
      filters: 16,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 32,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(tf.layers.flatten());
  model.add(
    tf.layers.dense({
      units: 64,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    })
  );
  model.add(
    tf.layers.dense({
      units: 10,
      kernelInitializer: 'varianceScaling',
      activation: 'softmax',
    })
  );

  model.compile({
    optimizer: tf.train.adam(),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  return model;
};

const createDataset = (images, labels, limitCount) => {
  const total = Math.min(limitCount, images.count, labels.count);
  const imageSize = images.rows * images.cols;
  const xs = new Float32Array(total * imageSize);
  const ys = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    ys[i] = labels.data[i];
    const offset = i * imageSize;
    for (let p = 0; p < imageSize; p++) {
      xs[offset + p] = images.data[offset + p] / 255;
    }
  }

  const xTensor = tf.tensor4d(xs, [total, 28, 28, 1]);
  const yTensor = tf.oneHot(tf.tensor1d(ys, 'int32'), 10);
  return { xTensor, yTensor, total };
};

async function createAndSaveModel() {
  await ensureMnistFiles();

  const trainImages = readImages(trainImagesPath);
  const trainLabels = readLabels(trainLabelsPath);
  const testImages = readImages(testImagesPath);
  const testLabels = readLabels(testLabelsPath);

  const model = buildModel();
  const { xTensor: trainX, yTensor: trainY, total: trainTotal } = createDataset(
    trainImages,
    trainLabels,
    limit
  );
  const { xTensor: testX, yTensor: testY } = createDataset(testImages, testLabels, 10000);

  console.log(`Training on ${trainTotal} samples (epochs=${epochs}, batch=${batchSize})`);
  await model.fit(trainX, trainY, {
    epochs,
    batchSize,
    validationData: [testX, testY],
  });

  const modelDir = path.join(__dirname, '../public/models/mnist');
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  await model.save(`file://${modelDir}`);
  console.log('Model trained and saved to public/models/mnist');

  trainX.dispose();
  trainY.dispose();
  testX.dispose();
  testY.dispose();
}

createAndSaveModel().catch((err) => {
  console.error(err);
  process.exit(1);
});
