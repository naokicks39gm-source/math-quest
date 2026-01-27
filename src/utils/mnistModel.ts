import * as tf from '@tensorflow/tfjs';

let model: tf.LayersModel | null = null;

export const loadMnistModel = async () => {
  if (model) {
    return model;
  }
  try {
    // Assuming the model is hosted in the public directory under /models/mnist/
    model = await tf.loadLayersModel('/models/mnist/model.json');
    console.log('MNIST model loaded successfully.');
    return model;
  } catch (error) {
    console.error('Error loading MNIST model:', error);
    return null;
  }
};

export const predictMnistDigit = (input: tf.Tensor<tf.Rank>) => {
  if (!model) {
    console.error('MNIST model not loaded.');
    return null;
  }

  // The model expects a batch of images, so we add a batch dimension
  // The input should be a 28x28 grayscale image, reshaped to [1, 28, 28, 1]
  const reshapedInput = input.expandDims(0).expandDims(-1); // [28, 28] -> [1, 28, 28, 1]
  
  const prediction = model.predict(reshapedInput) as tf.Tensor;
  const probabilities = Array.from(prediction.dataSync());
  const predictedDigit = probabilities.indexOf(Math.max(...probabilities));

  // Dispose of the tensors to free up GPU memory
  input.dispose();
  reshapedInput.dispose();
  prediction.dispose();

  return predictedDigit;
};