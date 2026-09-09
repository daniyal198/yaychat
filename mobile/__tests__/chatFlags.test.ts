/**
 * Mute and archive on backend-served chats (BUG-004).
 *
 * Both backend conversation mappers hardcode `muted: false, archived: false`,
 * so the only thing that can carry the user's choice across a reload is the
 * device-local flag store. These tests pin that.
 */
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
    emit: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

const GROUP = {groupId: 'g1', name: 'Bitcoin Yay General', members: ['me@example.com', 'friend@example.com']};

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
        return Promise.resolve({data: [GROUP]});
      }
      return Promise.resolve({data: {}});
    }),
    post: jest.fn(() => Promise.resolve({data: {}})),
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

import {chatService, resetChatFlags} from '../src/yaychat/services';

const GROUP_ID = 'group:g1';

afterEach(async () => {
  await resetChatFlags();
});

describe('mute and archive on backend chats', () => {
  it('reports a muted chat as muted on the next read', async () => {
    expect((await chatService.getConversation(GROUP_ID)).muted).toBe(false);

    await chatService.setMuted(GROUP_ID, true);

    // The read goes back through the backend mapper, which hardcodes
    // muted:false — so this passing is the whole fix.
    expect((await chatService.getConversation(GROUP_ID)).muted).toBe(true);
    expect((await chatService.listConversations('all'))[0].muted).toBe(true);
  });

  it('takes an archived chat out of the main list and into the archive', async () => {
    expect((await chatService.listConversations('all')).map(c => c.id)).toContain(GROUP_ID);
    expect(await chatService.listConversations('archived')).toHaveLength(0);

    await chatService.setArchived(GROUP_ID, true);

    expect((await chatService.listConversations('all')).map(c => c.id)).not.toContain(GROUP_ID);
    expect((await chatService.listConversations('archived')).map(c => c.id)).toEqual([GROUP_ID]);
  });

  it('puts an unarchived chat back in the main list', async () => {
    await chatService.setArchived(GROUP_ID, true);
    await chatService.setArchived(GROUP_ID, false);

    expect((await chatService.listConversations('all')).map(c => c.id)).toContain(GROUP_ID);
    expect(await chatService.listConversations('archived')).toHaveLength(0);
  });
});
