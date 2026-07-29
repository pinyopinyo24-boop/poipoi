import { vi } from 'vitest';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    clear: vi.fn(() => Promise.resolve()),
  },
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
      post: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
      put: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
      delete: vi.fn(() => Promise.resolve({ status: 200, data: {} })),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
      defaults: {
        headers: {
          common: {},
        },
      },
    })),
  },
}));

// Mock React Native modules
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  TouchableOpacity: 'TouchableOpacity',
  SafeAreaView: 'SafeAreaView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Dimensions: {
    get: vi.fn(() => ({ width: 375, height: 812 })),
  },
}));

// Mock Expo modules
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

vi.mock('expo-camera', () => ({
  Camera: 'Camera',
  CameraType: {},
}));

vi.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: vi.fn(() => Promise.resolve({ granted: true })),
    setAudioModeAsync: vi.fn(() => Promise.resolve()),
  },
  Video: 'Video',
}));

vi.mock('expo-notifications', () => ({
  requestPermissionsAsync: vi.fn(() => Promise.resolve({ granted: true })),
  setNotificationHandler: vi.fn(),
}));

vi.mock('expo-speech', () => ({
  speak: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  readAsStringAsync: vi.fn(() => Promise.resolve('mock content')),
  writeAsStringAsync: vi.fn(() => Promise.resolve()),
  deleteAsync: vi.fn(() => Promise.resolve()),
}));

// Mock React Navigation
vi.mock('@react-navigation/native', () => ({
  NavigationContainer: 'NavigationContainer',
  useNavigation: vi.fn(() => ({
    navigate: vi.fn(),
    goBack: vi.fn(),
  })),
  useRoute: vi.fn(() => ({
    params: {},
  })),
}));

vi.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: vi.fn(() => ({
    Navigator: 'Navigator',
    Screen: 'Screen',
  })),
}));

// Suppress console errors during tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
