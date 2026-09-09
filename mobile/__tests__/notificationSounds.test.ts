import {NativeModules} from 'react-native';
import {notificationSoundService} from '../src/yaychat/services/notificationSounds';

describe('foreground notification sounds', () => {
  const play = jest.fn();

  beforeEach(() => {
    play.mockClear();
    (NativeModules as any).NotificationSound = {play};
    notificationSoundService.reset();
  });

  it('plays the cue matching the event kind', () => {
    notificationSoundService.play('message', 'm1');
    notificationSoundService.play('reward', 'r1');
    expect(play).toHaveBeenNthCalledWith(1, 'message');
    expect(play).toHaveBeenNthCalledWith(2, 'reward');
  });

  it('deduplicates one event observed by push and realtime', () => {
    notificationSoundService.play('message', 'm1');
    notificationSoundService.play('message', 'm1');
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('honours the Sounds notification preference', () => {
    notificationSoundService.setEnabled(false);
    notificationSoundService.play('community', 'announcement-1');
    expect(play).not.toHaveBeenCalled();
  });

  it('degrades safely when an old binary has no native sound module', () => {
    delete (NativeModules as any).NotificationSound;
    expect(() => notificationSoundService.play('system', 'n1')).not.toThrow();
  });
});
