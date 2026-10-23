import * as Device from 'expo-device';

export type AIModelTier = 'small' | 'medium' | 'large';

export function getDeviceAIProfile() {
  const ramGB = (Device.totalMemory ?? 0) / (1024 ** 3);
  const tier: AIModelTier =
    ramGB >= 12 ? 'large' :
    ramGB >= 6 ? 'medium' : 'small';

  return {
    ramGB,
    tier,
    modelSize: tier === 'large' ? '3B' : tier === 'medium' ? '1.5B' : '0.5B',
    offlineSupported: Device.osName === 'Android',
  };
}