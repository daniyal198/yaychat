/**
 * AI settings tolerates a malformed payload (BUG-008).
 *
 * Both endpoints used to be cast straight off the wire (`body as AiUsage`), so
 * a response missing a field handed the screen `undefined` and the first
 * `costUsd.toFixed(2)` threw during render — which terminates the process in a
 * release build. That is the "opening AI settings crashes the app" report.
 */
jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {API_BASE_URL: 'http://localhost:3000', YAYCHAT_USE_BACKEND: 'true'},
  API_BASE_URL: 'http://localhost:3000',
  YAYCHAT_USE_BACKEND: 'true',
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({connected: true, emit: jest.fn(), on: jest.fn(), disconnect: jest.fn()})),
}));

// Deliberately impoverished: an `/ai/usage` and `/ai/consent` that answer 200
// with nothing useful in them, which is what a partly-deployed backend does.
jest.mock('../src/services/api', () => ({
  __esModule: true,
  baseAPIURL: 'http://localhost:3000',
  default: {
    get: jest.fn((path: string) => {
      if (path.includes('/ai/usage')) {
        return Promise.resolve({data: {}});
      }
      if (path.includes('/ai/consent')) {
        return Promise.resolve({data: {}});
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

import {aiService} from '../src/yaychat/services';

describe('AI settings payloads', () => {
  it('gives usage real numbers when the server sends none', async () => {
    const usage = await aiService.usage();

    // The exact call that used to throw mid-render.
    expect(() => usage.costUsd.toFixed(2)).not.toThrow();
    expect(Number.isFinite(usage.costUsd)).toBe(true);
    expect(Number.isFinite(usage.tokensIn + usage.tokensOut)).toBe(true);
    expect(typeof usage.planLabel).toBe('string');
    expect(typeof usage.resetsAt).toBe('string');
  });

  it('defaults consent to not-shared rather than undefined', async () => {
    const consent = await aiService.consent();

    // Never undefined: an undefined here also makes each Switch uncontrolled.
    expect(consent.shareChatContent).toBe(false);
    expect(consent.shareCommunityContent).toBe(false);
    expect(consent.saveHistory).toBe(false);
    expect(consent.personalization).toBe(false);
  });
});
