/**
 * Settings and notification preferences survive a relaunch
 * (BUG-005 / BUG-006 / BUG-007).
 *
 * All three reported the same thing — a switch that moves and then forgets.
 * The cause was shared: both preference stores lived in memory only, so the
 * write "succeeded" and the next process start showed the old value. These
 * tests simulate a relaunch by dropping the module registry, which resets
 * every in-memory cache while leaving AsyncStorage intact.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const freshServices = () => {
  let services: typeof import('../src/yaychat/services');
  jest.isolateModules(() => {
    services = require('../src/yaychat/services');
  });
  return services!;
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('settings persistence', () => {
  it('keeps a privacy switch across a relaunch (BUG-006)', async () => {
    const first = freshServices();
    const before = await first.settingsService.get();
    expect(before.privacy.readReceipts).toBe(true);

    await first.settingsService.update({
      ...before,
      privacy: {...before.privacy, readReceipts: false},
    });

    // A new process: every module-level cache is gone, only disk survives.
    const after = await freshServices().settingsService.get();
    expect(after.privacy.readReceipts).toBe(false);
  });

  it('keeps a community switch across a relaunch (BUG-007)', async () => {
    const first = freshServices();
    const before = await first.settingsService.get();
    expect(before.community.trendingDigests).toBe(false);

    await first.settingsService.update({
      ...before,
      community: {...before.community, trendingDigests: true, invites: false},
    });

    const after = await freshServices().settingsService.get();
    expect(after.community.trendingDigests).toBe(true);
    expect(after.community.invites).toBe(false);
  });

  it('leaves sections an older build never wrote at their defaults', async () => {
    await AsyncStorage.setItem(
      'yaysapp.settings.v1',
      JSON.stringify({privacy: {lastSeen: false}}),
    );
    const settings = await freshServices().settingsService.get();
    expect(settings.privacy.lastSeen).toBe(false);
    // Not present in the stored record — must not come back undefined.
    expect(settings.community.invites).toBe(true);
    expect(settings.chat.fontScale).toBe('default');
  });

  it('keeps a notification category across a relaunch (BUG-005)', async () => {
    const first = freshServices();
    expect((await first.notificationService.preferences()).rewards).toBe(true);

    await first.notificationService.updatePreferences({rewards: false});

    const after = await freshServices().notificationService.preferences();
    expect(after.rewards).toBe(false);
  });

  it('keeps a per-conversation mute across a relaunch', async () => {
    const first = freshServices();
    await first.notificationService.setConversationMuted('group:g1', true);

    const after = await freshServices().notificationService.preferences();
    expect(after.mutedConversationIds).toContain('group:g1');
  });
});
