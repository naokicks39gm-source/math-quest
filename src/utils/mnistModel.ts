import * as tf from '@tensorflow/tfjs';

let model: tf.LayersModel | null = null;
let _isModelLoading = false; // Internal loading state

export const isModelLoading = () => _isModelLoading;

export const loadMnistModel = async () => {
  if (model) {
    return model;
  }
  if (_isModelLoading) {
    // If already loading, wait for it to complete
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    return model;
  }

  _isModelLoading = true;
  try {
    // Try loading from local path first (assuming user places it here)
    try {
      model = await tf.loadLayersModel('/models/mnist/model.json');
      console.log('MNIST model loaded successfully from local path.');
    } catch (localError) {
      console.warn('Local MNIST model not found or failed to load, attempting remote:', localError);
      // Fallback to a publicly hosted model
      // This is a simple 1-layer MNIST model from a TensorFlow.js example
      model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mnist_cnn_v1/model.json');
      console.log('MNIST model loaded successfully from remote URL.');
    }
    return model;
  } catch (error) {
    console.error('Error loading MNIST model from any source:', error);
    return null;
  } finally {
    _isModelLoading = false;
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