const mockSocketHandlers: Record<string, Function> = {};
const mockEmit = jest.fn();

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    API_BASE_URL: 'http://localhost:3000',
    YAYCHAT_USE_BACKEND: 'true',
  },
  API_BASE_URL: 'http://localhost:3000',
  YAYCHAT_USE_BACKEND: 'true',
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connected: true,
    emit: mockEmit,
    on: jest.fn((event: string, handler: Function) => {
      mockSocketHandlers[event] = handler;
    }),
    disconnect: jest.fn(),
  })),
}));

jest.mock('../src/services/api', () => ({
  __esModule: true,
  baseAPIURL: 'http://localhost:3000',
  default: {
    get: jest.fn((path: string) => {
      if (path.includes('/counts/unread')) {
        return Promise.resolve({data: {total: 0, direct: {perPeer: []}, groups: {perGroup: []}}});
      }
      if (path.includes('/lastmessages/')) {
        return Promise.resolve({data: []});
      }
      if (path.includes('/groups')) {
        return Promise.resolve({data: []});
      }
      return Promise.resolve({data: {}});
    }),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../src/yaychat/services/client', () => {
  const actual = jest.requireActual('../src/yaychat/services/client');
  return {
    ...actual,
    secureTokenStore: {
      load: jest.fn(() =>
        Promise.resolve(
          JSON.stringify({
            token: 'access-token',
            user: {email: 'me@example.com', id: 'me@example.com', name: 'Me'},
            onboarded: true,
          }),
        ),
      ),
      save: jest.fn(),
      clear: jest.fn(),
    },
  };
});

describe('backend realtime chat adapter', () => {
  it('maps socket message events to chat service events', async () => {
    let listener: jest.Mock;
    let unsubscribe: () => void;
    jest.isolateModules(() => {
      const {chatService} = require('../src/yaychat/services');
      listener = jest.fn();
      unsubscribe = chatService.subscribe(listener);
    });

    await new Promise(resolve => setImmediate(resolve));
    try {
      mockSocketHandlers.connect?.();
      mockSocketHandlers['message:new']?.({
        messageId: 'm1',
        email: 'friend@example.com',
        receiverEmail: 'me@example.com',
        message: 'Realtime hello',
        timestamp: '2026-08-12T15:00:00.000Z',
      });

      expect(listener!).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message.upsert',
          conversationId: 'dm:friend@example.com',
          message: expect.objectContaining({
            id: 'm1',
            text: 'Realtime hello',
            senderId: 'friend@example.com',
          }),
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith('counts:pull');
    } finally {
      unsubscribe!();
    }
  });
});
