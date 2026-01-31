import * as tf from '@tensorflow/tfjs';

let model: tf.LayersModel | null = null;
let modelPromise: Promise<tf.LayersModel | null> | null = null;
let model2Digit: tf.LayersModel | null = null;
let model2DigitPromise: Promise<tf.LayersModel | null> | null = null;
export let isModelLoaded: boolean = false;
export let is2DigitModelLoaded: boolean = false;

export const loadMnistModel = async (): Promise<tf.LayersModel | null> => {
  if (model) {
    return model;
  }
  if (modelPromise) {
    return modelPromise;
  }

  modelPromise = new Promise<tf.LayersModel | null>(async (resolve) => {
    try {
      try {
        model = await tf.loadLayersModel('/models/mnist/model.json');
        console.log('MNIST model loaded successfully from local path.');
      } catch (localError) {
        console.warn('Local MNIST model not found or failed to load, attempting remote:', localError);
        model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mnist_cnn_v1/model.json');
        console.log('MNIST model loaded successfully from remote URL.');
      }
      isModelLoaded = true;
      resolve(model);
    } catch (error) {
      console.error('Error loading MNIST model from any source:', error);
      isModelLoaded = false;
      resolve(null);
    } finally {
      // modelPromise = null; // Removed this line, as it could cause race conditions if multiple calls are made quickly
    }
  });

  return modelPromise;
};

export const loadMnist2DigitModel = async (): Promise<tf.LayersModel | null> => {
  if (model2Digit) {
    return model2Digit;
  }
  if (model2DigitPromise) {
    return model2DigitPromise;
  }

  model2DigitPromise = new Promise<tf.LayersModel | null>(async (resolve) => {
    try {
      model2Digit = await tf.loadLayersModel('/models/mnist-2digit/model.json');
      console.log('2-digit MNIST model loaded successfully from local path.');
      is2DigitModelLoaded = true;
      resolve(model2Digit);
    } catch (error) {
      console.error('Error loading 2-digit MNIST model:', error);
      is2DigitModelLoaded = false;
      resolve(null);
    }
  });

  return model2DigitPromise;
};

export const predictMnistDigit = (input: tf.Tensor<tf.Rank>) => {
  if (!model) {
    console.error('MNIST model not loaded.');
    return null;
  }

  const reshapedInput = input.expandDims(0).expandDims(-1);
  
  const prediction = model.predict(reshapedInput) as tf.Tensor;
  const probabilities = Array.from(prediction.dataSync());
  const predictedDigit = probabilities.indexOf(Math.max(...probabilities));

  input.dispose();
  reshapedInput.dispose();
  prediction.dispose();

  return predictedDigit;
};

export const predictMnistDigitWithProbs = (input: tf.Tensor<tf.Rank>) => {
  if (!model) {
    console.error('MNIST model not loaded.');
    return null;
  }

  const reshapedInput = input.expandDims(0).expandDims(-1);
  const prediction = model.predict(reshapedInput) as tf.Tensor;
  const probabilities = Array.from(prediction.dataSync());
  const predictedDigit = probabilities.indexOf(Math.max(...probabilities));

  input.dispose();
  reshapedInput.dispose();
  prediction.dispose();

  return { predictedDigit, probabilities };
};

export const predictMnist2DigitWithProbs = (input: tf.Tensor2D) => {
  if (!model2Digit) {
    console.error('2-digit MNIST model not loaded.');
    return null;
  }

  const reshapedInput = input.expandDims(0).expandDims(-1);
  const prediction = model2Digit.predict(reshapedInput) as tf.Tensor;
  const probabilities = Array.from(prediction.dataSync());
  const predicted = probabilities.indexOf(Math.max(...probabilities));

  input.dispose();
  reshapedInput.dispose();
  prediction.dispose();

  const tens = Math.floor(predicted / 10);
  const ones = predicted % 10;
  return { predictedValue: `${tens}${ones}`, probabilities };
};
