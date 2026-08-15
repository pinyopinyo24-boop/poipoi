/**
 * Mock for @tensorflow-models/face-detection
 * Used in tests to avoid requiring the actual TensorFlow package
 */

export const SupportedModels = {
  MediaPipeFaceDetector: 'MediaPipeFaceDetector',
};

export async function createDetector() {
  return {
    estimateFaces: async () => [],
    dispose: () => {},
  };
}

export default { SupportedModels, createDetector };
