/* Jest setup for Yay-chat frontend tests. */
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    API_BASE_URL: 'http://localhost:3000',
    YAYCHAT_USE_BACKEND: 'false',
  },
  API_BASE_URL: 'http://localhost:3000',
  YAYCHAT_USE_BACKEND: 'false',
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicon');
