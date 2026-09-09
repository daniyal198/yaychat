/**
 * Invite-link capture (BUG-003).
 *
 * The recipient of an invite has no session, so the deep link never reaches
 * React Navigation's route table. These pin the code surviving anyway.
 */
import {
  capturePendingInviteCode,
  clearPendingInviteCode,
  parseInviteCode,
  pendingInviteCode,
  takePendingInviteCode,
} from '../src/yaychat/services/inviteLinks';

afterEach(async () => {
  await clearPendingInviteCode();
});

describe('parseInviteCode', () => {
  it('reads the path form on both the scheme and the https twin', () => {
    expect(parseInviteCode('yaychat://invite/ABC123')).toBe('ABC123');
    expect(parseInviteCode('https://yay.chat/invite/ABC123')).toBe('ABC123');
  });

  it('uppercases so a link typed or mangled in lowercase still matches', () => {
    expect(parseInviteCode('https://yay.chat/invite/abc123')).toBe('ABC123');
  });

  it('reads the query forms a web landing page would bounce back', () => {
    expect(parseInviteCode('https://yay.chat/?invite=ABC123')).toBe('ABC123');
    expect(parseInviteCode('https://yay.chat/join?ref=ABC123&utm_source=x')).toBe('ABC123');
  });

  it('ignores links that are not invites', () => {
    expect(parseInviteCode('https://yay.chat/c/btcy-learners')).toBeNull();
    expect(parseInviteCode('yaychat://chat/dm:friend@example.com')).toBeNull();
    expect(parseInviteCode(null)).toBeNull();
  });

  it('rejects a code that is not shaped like one', () => {
    expect(parseInviteCode('https://yay.chat/invite/not-a-code!')).toBeNull();
    expect(parseInviteCode('https://yay.chat/invite/AB')).toBeNull();
  });
});

describe('pending invite code', () => {
  it('holds a code from a link opened with no session', async () => {
    await capturePendingInviteCode('https://yay.chat/invite/ABC123');
    expect(await pendingInviteCode()).toBe('ABC123');
  });

  it('lets a later invite win', async () => {
    await capturePendingInviteCode('https://yay.chat/invite/ABC123');
    await capturePendingInviteCode('https://yay.chat/invite/XYZ789');
    expect(await pendingInviteCode()).toBe('XYZ789');
  });

  it('leaves a held code alone when a non-invite link arrives', async () => {
    await capturePendingInviteCode('https://yay.chat/invite/ABC123');
    expect(await capturePendingInviteCode('yaychat://chat/dm:a@b.com')).toBeNull();
    expect(await pendingInviteCode()).toBe('ABC123');
  });

  it('hands the code over exactly once', async () => {
    await capturePendingInviteCode('https://yay.chat/invite/ABC123');
    expect(await takePendingInviteCode()).toBe('ABC123');
    expect(await takePendingInviteCode()).toBeNull();
  });
});
