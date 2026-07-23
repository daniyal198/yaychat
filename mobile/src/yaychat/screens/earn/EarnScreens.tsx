/**
 * Earn tab screens: YayPoints home, reward history/detail, referrals, and
 * campaign details. All data is simulated (preview build).
 */
import React, {useMemo, useState} from 'react';
import {Pressable, Share, StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  AsyncView,
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ListRow,
  MockNotice,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StatTile,
  YayText,
} from '../../design/components';
import {colors, spacing} from '../../design/tokens';
import {earnService} from '../../services';
import {useAction, useAsync} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {EarnActivity, EarnSummary, RewardEntry, RewardStatus} from '../../types/models';
import type {EarnStackParamList} from '../../types/navigation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(iso).toLocaleDateString();
};

const inDays = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) {
    return 'Ended';
  }
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return days === 1 ? 'Ends in 1 day' : `Ends in ${days} days`;
};

const statusTone: Record<RewardStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  completed: 'success',
  reversed: 'danger',
};

const statusLabel: Record<RewardStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  reversed: 'Reversed',
};

/** Navigate to a root-stack route from inside the Earn stack (tabs are nested in the root stack). */
const navigateRoot = (navigation: unknown, route: string) => {
  (navigation as {navigate: (name: string) => void}).navigate(route);
};

// ---------------------------------------------------------------------------
// EarnHomeScreen
// ---------------------------------------------------------------------------

type HomeData = {summary: EarnSummary; activities: EarnActivity[]};

export const EarnHomeScreen = ({
  navigation,
}: NativeStackScreenProps<EarnStackParamList, 'EarnHome'>) => {
  const toast = useToast();
  const {data, setData, loading, refreshing, error, offline, reload, refresh} =
    useAsync<HomeData>(async () => {
      const [summary, activities] = await Promise.all([
        earnService.summary(),
        earnService.activities(),
      ]);
      return {summary, activities};
    });
  const checkInAction = useAction();

  const handleCheckIn = async () => {
    const summary = await checkInAction.perform(
      () => earnService.checkIn(),
      message => toast.show(message, 'error'),
    );
    if (summary) {
      setData(prev =>
        prev
          ? {
              summary,
              activities: prev.activities.map(a =>
                a.id === 'act_checkin' ? {...a, status: 'completed_today' as const} : a,
              ),
            }
          : prev,
      );
      toast.show('+20 YayPoints', 'success');
    }
  };

  const handleActivityPress = (activity: EarnActivity) => {
    const title = activity.title.toLowerCase();
    if (title.includes('invite') || title.includes('referral')) {
      navigation.navigate('Referral');
      return;
    }
    if (title.includes('chat')) {
      toast.show('Send messages in Chats to progress', 'info');
      return;
    }
    if (title.includes('ai')) {
      toast.show('Use Yay AI in the AI tab to progress', 'info');
      return;
    }
    toast.show(`Keep going — ${activity.reward} when you complete this.`, 'info');
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice text="Preview rewards — YayPoints here are simulated and have no monetary value." />
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}>
        {({summary, activities}) => (
          <>
            {/* Balance hero */}
            <Card style={styles.heroCard}>
              <YayText variant="caption" color={colors.textMuted}>
                Your balance
              </YayText>
              <Row gap={spacing.xs} style={{alignItems: 'flex-end'}}>
                <YayText variant="display" color={colors.brandStrong}>
                  {summary.balance.toLocaleString()}
                </YayText>
                <YayText variant="bodyStrong" color={colors.textMuted} style={{marginBottom: 4}}>
                  YayPoints
                </YayText>
              </Row>
              <Spacer size={spacing.sm} />
              <Row gap={spacing.xs} style={{alignItems: 'stretch'}}>
                <StatTile label="Day streak" value={String(summary.streakDays)} icon="flame" tone={colors.accent} />
                <StatTile label="Earned today" value={`+${summary.earnedToday}`} icon="trending-up" />
                <StatTile label="Daily limit" value={String(summary.dailyLimit)} icon="speedometer" tone={colors.gold} />
              </Row>
            </Card>

            <Spacer size={spacing.md} />

            {/* Daily check-in */}
            <Card>
              <Row gap={spacing.xs} style={{marginBottom: spacing.xs}}>
                <Ionicons name="calendar" size={18} color={colors.brand} />
                <YayText variant="heading">Daily check-in</YayText>
              </Row>
              {summary.checkedInToday ? (
                <Row gap={spacing.xs}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  <YayText variant="bodyStrong" color={colors.success}>
                    Checked in — day {summary.streakDays}
                  </YayText>
                </Row>
              ) : (
                <>
                  <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.sm}}>
                    Check in every day to keep your streak alive.
                  </YayText>
                  <Button
                    label="Check in (+20)"
                    icon="sparkles"
                    onPress={handleCheckIn}
                    loading={checkInAction.busy}
                  />
                </>
              )}
              <Spacer size={spacing.md} />
              <YayText variant="caption" color={colors.textSecondary} style={{marginBottom: spacing.xxs}}>
                Daily limit: {summary.earnedToday} / {summary.dailyLimit} YayPoints
              </YayText>
              <ProgressBar
                value={summary.dailyLimit > 0 ? summary.earnedToday / summary.dailyLimit : 0}
                tone={summary.earnedToday >= summary.dailyLimit ? colors.warning : colors.brand}
              />
              <YayText variant="micro" color={colors.textFaint} style={{marginTop: spacing.xxs}}>
                Limits keep rewards fair. Automated or abusive activity is not rewarded and may be
                reversed.
              </YayText>
            </Card>

            {/* Activities */}
            <SectionHeader title="Ways to earn" />
            <View style={{gap: spacing.sm}}>
              {activities.map(activity => {
                const interactive = activity.status === 'available';
                return (
                  <Card
                    key={activity.id}
                    onPress={interactive ? () => handleActivityPress(activity) : undefined}>
                    <Row gap={spacing.sm} style={{alignItems: 'flex-start'}}>
                      <View style={styles.activityIcon}>
                        <Ionicons name={activity.icon} size={20} color={colors.brand} />
                      </View>
                      <View style={{flex: 1}}>
                        <Row style={{justifyContent: 'space-between'}}>
                          <YayText variant="bodyStrong" style={{flex: 1}} numberOfLines={1}>
                            {activity.title}
                          </YayText>
                          {activity.status === 'completed_today' ? (
                            <Badge label="Done today" tone="success" />
                          ) : activity.status === 'coming_soon' ? (
                            <Badge label="Coming soon" tone="neutral" />
                          ) : activity.status === 'limit_reached' ? (
                            <Badge label="Limit reached" tone="warning" />
                          ) : (
                            <Badge label={activity.reward} tone="brand" />
                          )}
                        </Row>
                        <YayText variant="caption" color={colors.textMuted}>
                          {activity.description}
                        </YayText>
                        {activity.progress ? (
                          <View style={{marginTop: spacing.xs, gap: spacing.xxs}}>
                            <ProgressBar
                              value={
                                activity.progress.target > 0
                                  ? activity.progress.current / activity.progress.target
                                  : 0
                              }
                            />
                            <YayText variant="micro" color={colors.textMuted}>
                              {activity.progress.current}/{activity.progress.target}
                            </YayText>
                          </View>
                        ) : null}
                      </View>
                      {interactive ? (
                        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                      ) : null}
                    </Row>
                  </Card>
                );
              })}
            </View>

            {/* Campaigns */}
            {summary.campaigns.length > 0 ? (
              <>
                <SectionHeader title="Campaigns" />
                <View style={{gap: spacing.sm}}>
                  {summary.campaigns.map(campaign => (
                    <Card
                      key={campaign.id}
                      onPress={() =>
                        navigation.navigate('CampaignDetail', {campaignId: campaign.id})
                      }>
                      <Row style={{justifyContent: 'space-between', marginBottom: spacing.xxs}}>
                        <YayText variant="bodyStrong" style={{flex: 1}} numberOfLines={1}>
                          {campaign.title}
                        </YayText>
                        <Badge label={campaign.reward} tone="gold" />
                      </Row>
                      <YayText variant="caption" color={colors.textMuted} numberOfLines={2}>
                        {campaign.description}
                      </YayText>
                      <YayText variant="micro" color={colors.textFaint} style={{marginTop: spacing.xxs}}>
                        {inDays(campaign.endsAt)}
                      </YayText>
                    </Card>
                  ))}
                </View>
              </>
            ) : null}

            {/* Links */}
            <SectionHeader title="More" />
            <Card style={{paddingVertical: spacing.xxs}}>
              <ListRow
                title="Reward history"
                subtitle="Every YayPoint you earned"
                icon="time"
                onPress={() => navigation.navigate('RewardHistory')}
              />
              <Divider />
              <ListRow
                title="Invite friends"
                subtitle={`Your code: ${summary.referralCode}`}
                icon="gift"
                onPress={() => navigation.navigate('Referral')}
              />
              <Divider />
              <ListRow
                title="Wallet preview"
                subtitle="See simulated balances"
                icon="wallet"
                onPress={() => navigateRoot(navigation, 'WalletOverview')}
              />
            </Card>
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// RewardHistoryScreen
// ---------------------------------------------------------------------------

const HISTORY_FILTERS = ['All', 'Pending', 'Completed', 'Reversed'] as const;

export const RewardHistoryScreen = ({
  navigation,
}: NativeStackScreenProps<EarnStackParamList, 'RewardHistory'>) => {
  const [filter, setFilter] = useState<(typeof HISTORY_FILTERS)[number]>('All');
  const {data, loading, refreshing, error, offline, reload, refresh} = useAsync<RewardEntry[]>(
    () => earnService.history(),
  );

  const filtered = useMemo(() => {
    if (!data) {
      return [];
    }
    if (filter === 'All') {
      return data;
    }
    return data.filter(r => r.status === filter.toLowerCase());
  }, [data, filter]);

  const hasReversed = (data ?? []).some(r => r.status === 'reversed');

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice text="Preview rewards — YayPoints here are simulated and have no monetary value." />
      <Row gap={spacing.xs} style={{marginBottom: spacing.sm}}>
        {HISTORY_FILTERS.map(f => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </Row>
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={data?.length === 0}
        emptyTitle="No rewards yet"
        emptyMessage="Check in daily and complete activities to start earning YayPoints.">
        {() => (
          <>
            {hasReversed ? (
              <Banner
                tone="warning"
                text="Some rewards were reversed — automated or abusive activity is not rewarded."
              />
            ) : null}
            {filtered.length === 0 ? (
              <EmptyState
                title={`No ${filter.toLowerCase()} rewards`}
                message="Try a different filter."
                icon="funnel-outline"
              />
            ) : (
              <Card style={{paddingVertical: spacing.xxs}}>
                {filtered.map((entry, i) => (
                  <View key={entry.id}>
                    {i > 0 ? <Divider /> : null}
                    <Pressable
                      onPress={() => navigation.navigate('RewardDetail', {rewardId: entry.id})}
                      style={({pressed}) => [
                        styles.historyRow,
                        pressed && {backgroundColor: colors.surfaceSunken},
                      ]}>
                      <View style={{flex: 1}}>
                        <YayText variant="bodyStrong" numberOfLines={1}>
                          {entry.activity}
                        </YayText>
                        <YayText variant="caption" color={colors.textMuted}>
                          {timeAgo(entry.createdAt)}
                        </YayText>
                      </View>
                      <View style={{alignItems: 'flex-end', gap: spacing.xxs}}>
                        <YayText
                          variant="bodyStrong"
                          color={entry.status === 'reversed' ? colors.danger : colors.success}
                          style={
                            entry.status === 'reversed'
                              ? {textDecorationLine: 'line-through'}
                              : undefined
                          }>
                          +{entry.amount}
                        </YayText>
                        <Badge label={statusLabel[entry.status]} tone={statusTone[entry.status]} />
                      </View>
                    </Pressable>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// RewardDetailScreen
// ---------------------------------------------------------------------------

export const RewardDetailScreen = ({
  route,
}: NativeStackScreenProps<EarnStackParamList, 'RewardDetail'>) => {
  const {rewardId} = route.params;
  const {data, loading, error, offline, reload} = useAsync<RewardEntry>(
    () => earnService.rewardDetail(rewardId),
    [rewardId],
  );

  return (
    <Screen>
      <MockNotice text="Preview rewards — YayPoints here are simulated and have no monetary value." />
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {reward => (
          <>
            <Card style={{alignItems: 'center', paddingVertical: spacing.xl}}>
              <YayText variant="caption" color={colors.textMuted}>
                {reward.activity}
              </YayText>
              <YayText
                variant="display"
                color={reward.status === 'reversed' ? colors.danger : colors.brandStrong}
                style={
                  reward.status === 'reversed' ? {textDecorationLine: 'line-through'} : undefined
                }>
                +{reward.amount}
              </YayText>
              <YayText variant="bodyStrong" color={colors.textMuted}>
                {reward.unit}
              </YayText>
              <Spacer size={spacing.sm} />
              <Badge label={statusLabel[reward.status]} tone={statusTone[reward.status]} />
              <Spacer size={spacing.sm} />
              <YayText variant="caption" color={colors.textSecondary}>
                {new Date(reward.createdAt).toLocaleString()}
              </YayText>
              <YayText variant="micro" color={colors.textFaint} style={{marginTop: spacing.xxs}}>
                Reward ID: {reward.id}
              </YayText>
            </Card>
            {reward.note ? (
              <>
                <Spacer size={spacing.md} />
                <Banner
                  tone={reward.status === 'reversed' ? 'danger' : 'info'}
                  text={reward.note}
                />
              </>
            ) : null}
            <Spacer size={spacing.md} />
            <Card>
              <YayText variant="heading" style={{marginBottom: spacing.xs}}>
                How rewards work
              </YayText>
              <YayText variant="caption" color={colors.textSecondary}>
                New rewards start as pending while we verify the activity. Once verified they
                become completed and count toward your balance. Rewards from automated, duplicate,
                or abusive activity are reversed. Daily limits cap how much you can earn each day
                so rewards stay fair for everyone.
              </YayText>
            </Card>
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ReferralScreen
// ---------------------------------------------------------------------------

const REFERRAL_STEPS = [
  'Share your invite code with a friend.',
  'They sign up and verify their account.',
  'You both earn YayPoints once they send their first message.',
];

export const ReferralScreen = ({}: NativeStackScreenProps<EarnStackParamList, 'Referral'>) => {
  const toast = useToast();
  const {data, loading, refreshing, error, offline, reload, refresh} = useAsync<EarnSummary>(
    () => earnService.summary(),
  );

  const handleShare = async (code: string) => {
    try {
      await Share.share({
        message: `Join me on Yay-chat! Use my invite code ${code} when you sign up. https://yay.chat/invite/${code}`,
      });
    } catch {
      toast.show('Could not open share sheet', 'error');
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice text="Preview rewards — YayPoints here are simulated and have no monetary value." />
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {summary => (
          <>
            <Card style={{alignItems: 'center', paddingVertical: spacing.xl}}>
              <YayText variant="caption" color={colors.textMuted}>
                Your invite code
              </YayText>
              <YayText variant="display" color={colors.brandStrong} style={{letterSpacing: 2}}>
                {summary.referralCode}
              </YayText>
              <Spacer size={spacing.md} />
              <Row gap={spacing.xs}>
                <Button
                  label="Copy"
                  kind="secondary"
                  icon="copy"
                  onPress={() => toast.show('Code copied', 'success')}
                />
                <Button
                  label="Share"
                  icon="share-social"
                  onPress={() => handleShare(summary.referralCode)}
                />
              </Row>
            </Card>

            <SectionHeader title="How it works" />
            <Card>
              {REFERRAL_STEPS.map((step, i) => (
                <Row key={step} gap={spacing.sm} style={{paddingVertical: spacing.xs, alignItems: 'flex-start'}}>
                  <View style={styles.stepBubble}>
                    <YayText variant="micro" color={colors.textOnBrand}>
                      {i + 1}
                    </YayText>
                  </View>
                  <YayText variant="caption" color={colors.textSecondary} style={{flex: 1}}>
                    {step}
                  </YayText>
                </Row>
              ))}
            </Card>

            <SectionHeader title={`Your referrals (${summary.referrals.length})`} />
            {summary.referrals.length === 0 ? (
              <EmptyState
                title="No referrals yet"
                message="Share your code — you both earn when a friend joins."
                icon="gift-outline"
              />
            ) : (
              <Card style={{paddingVertical: spacing.xxs}}>
                {summary.referrals.map((ref, i) => (
                  <View key={`${ref.name}-${i}`}>
                    {i > 0 ? <Divider /> : null}
                    <ListRow
                      title={ref.name}
                      subtitle={`Joined ${timeAgo(ref.joinedAt)}`}
                      avatarName={ref.name}
                      chevron={false}
                      right={
                        <View style={{alignItems: 'flex-end', gap: spacing.xxs}}>
                          <YayText
                            variant="bodyStrong"
                            color={ref.status === 'reversed' ? colors.danger : colors.success}>
                            +{ref.reward}
                          </YayText>
                          <Badge label={statusLabel[ref.status]} tone={statusTone[ref.status]} />
                        </View>
                      }
                    />
                  </View>
                ))}
              </Card>
            )}
            <Spacer size={spacing.md} />
            <Banner tone="warning" text="Self-invites and fake accounts are reversed." />
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// CampaignDetailScreen
// ---------------------------------------------------------------------------

const ELIGIBILITY = [
  'Your account is verified.',
  'Your activity stays within daily earning limits.',
  'No automated, duplicate, or abusive behavior.',
];

export const CampaignDetailScreen = ({
  route,
}: NativeStackScreenProps<EarnStackParamList, 'CampaignDetail'>) => {
  const {campaignId} = route.params;
  const toast = useToast();
  const {data, loading, error, offline, reload} = useAsync<EarnSummary>(
    () => earnService.summary(),
    [campaignId],
  );

  const campaign = data?.campaigns.find(c => c.id === campaignId) ?? null;

  return (
    <Screen>
      <MockNotice text="Preview rewards — YayPoints here are simulated and have no monetary value." />
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data ? campaign : null}
        isEmpty={data != null && campaign == null}
        emptyTitle="Campaign not found"
        emptyMessage="This campaign may have ended or is no longer available.">
        {c => (
          <>
            <Card style={{paddingVertical: spacing.xl}}>
              <Row style={{justifyContent: 'space-between', marginBottom: spacing.xs}}>
                <YayText variant="title" style={{flex: 1}}>
                  {c.title}
                </YayText>
                <Badge label={c.reward} tone="gold" />
              </Row>
              <YayText variant="body" color={colors.textSecondary}>
                {c.description}
              </YayText>
              <Spacer size={spacing.sm} />
              <Row gap={spacing.xxs}>
                <Ionicons name="hourglass" size={14} color={colors.warning} />
                <YayText variant="caption" color={colors.warning}>
                  {inDays(c.endsAt)}
                </YayText>
              </Row>
            </Card>
            <SectionHeader title="Eligibility" />
            <Card>
              {ELIGIBILITY.map(item => (
                <Row key={item} gap={spacing.xs} style={{paddingVertical: spacing.xxs, alignItems: 'flex-start'}}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{marginTop: 2}} />
                  <YayText variant="caption" color={colors.textSecondary} style={{flex: 1}}>
                    {item}
                  </YayText>
                </Row>
              ))}
            </Card>
            <Spacer size={spacing.lg} />
            <Button
              label="Start earning"
              icon="rocket"
              onPress={() =>
                toast.show(`Complete "${c.title}" activities from the Earn tab to qualify.`, 'info')
              }
            />
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    borderRadius: 12,
  },
  stepBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
