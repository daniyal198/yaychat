#import <AVFoundation/AVFoundation.h>
#import <React/RCTBridgeModule.h>

@interface NotificationSound : NSObject <RCTBridgeModule>
@property(nonatomic, strong) AVAudioPlayer *player;
@end

@implementation NotificationSound

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

RCT_EXPORT_METHOD(play:(NSString *)kind)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *filename = @"yays_message";
    if ([kind isEqualToString:@"reward"]) {
      filename = @"yays_reward";
    } else if ([kind isEqualToString:@"community"] || [kind isEqualToString:@"system"]) {
      filename = @"yays_event";
    } else if ([kind isEqualToString:@"call"]) {
      filename = @"yays_call";
    }

    NSURL *url = [[NSBundle mainBundle] URLForResource:filename withExtension:@"wav"];
    if (url == nil) return;

    NSError *categoryError = nil;
    [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryAmbient error:&categoryError];
    self.player = [[AVAudioPlayer alloc] initWithContentsOfURL:url error:nil];
    [self.player prepareToPlay];
    [self.player play];
  });
}

@end
