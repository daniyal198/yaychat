/**
 * Earn tab screens: IndexxPoints home, reward history/detail, referrals, and
 * campaign details. All data is simulated (preview build).
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Clipboard, Pressable, Share, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
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
  ListSkeleton,
  MockNotice,
  Oval,
  ProgressBar,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  Spacer,
  StatTile,
  StateView,
  TextField,
  YayText,
} from '../../design/components';
import {colors, radius, spacing} from '../../design/tokens';
import {
  activationRewardPoints,
  earnService,
  errorMessage,
  inviteService,
  referralService,
  rewardAlerts,
} from '../../services';
import type {ContactsPermissionStatus, InvitableContact, OnYaysAppContact, ReferralSummary} from '../../services';
import {useAction, useAsync} from '../../state/hooks';
import {useRewardToast, useToast} from '../../state/AppProviders';
import type {EarnActivity, EarnSummary, RewardEntry, RewardStatus, User} from '../../types/models';
import type {EarnStackParamList} from '../../types/navigation';

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const {showReward} = useRewardToast();
  const {data, setData, loading, refreshing, error, offline, reload, refresh} =
    useAsync<HomeData>(async () => {
      const [summary, activities] = await Promise.all([
        earnService.summary(),
        earnService.activities(),
      ]);
      return {summary, activities};
    });
  const checkInAction = useAction();

  // Rewards the backend credited while this device was closed — the BTCY x
  // YaysApp activation reward, a referral qualifying, an Ambassador tier —
  // get their pop-up here, the first moment there is a screen to show it on.
  useFocusEffect(
    useCallback(() => {
      rewardAlerts.checkForNew().then(rewards => {
        rewards.forEach((r, i) => setTimeout(() => showReward(r.amount, r.activity), i * 1400));
      });
    }, [showReward]),
  );

  const handleCheckIn = async () => {
    const balanceBefore = data?.summary.balance ?? 0;
    const summary = await checkInAction.perform(
      () => earnService.checkIn(),
      message => toast.show(message, 'error'),
    );
    if (summary) {
      rewardAlerts.markSeenNow();
      showReward(Math.max(0, summary.balance - balanceBefore), 'Daily check-in');
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
      toast.show('Use aiainai in the AI tab to progress', 'info');
      return;
    }
    toast.show(`Keep going — ${activity.reward} when you complete this.`, 'info');
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice module="rewards" text="Preview rewards — IndexxPoints here are simulated and have no monetary value." />
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
                  IndexxPoints
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
                Daily limit: {summary.earnedToday} / {summary.dailyLimit} IndexxPoints
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

            {/* BTCY progression — points → nuggets → Alchemy → tokens */}
            <SectionHeader title="From points to BTCY" />
            <Card>
              <Row gap={spacing.xxs} style={{alignItems: 'center', flexWrap: 'wrap'}}>
                {['IndexxPoints', 'Nuggets', 'Alchemy', 'BTCY tokens'].map((stage, i) => (
                  <Row key={stage} gap={spacing.xxs} style={{alignItems: 'center'}}>
                    {i > 0 ? (
                      <Ionicons name="arrow-forward" size={12} color={colors.textFaint} />
                    ) : null}
                    <View style={styles.stagePill}>
                      <YayText variant="micro" color={colors.brandStrong}>
                        {stage}
                      </YayText>
                    </View>
                  </Row>
                ))}
              </Row>
              <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
                When rewards go live, IndexxPoints convert to BTCY nuggets, and nuggets refine into
                BTCY tokens through Bitcoin Yay's Alchemy tiers.
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
                      <Oval size={40} color={colors.brandSoft}>
                        <Ionicons name={activity.icon} size={20} color={colors.brand} />
                      </Oval>
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
                subtitle="Every IndexxPoint you earned"
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
      <MockNotice module="rewards" text="Preview rewards — IndexxPoints here are simulated and have no monetary value." />
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
        emptyMessage="Check in daily and complete activities to start earning IndexxPoints.">
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
      <MockNotice module="rewards" text="Preview rewards — IndexxPoints here are simulated and have no monetary value." />
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

/** Steps quote the live reward amounts so the screen never promises a stale figure. */
const referralSteps = (summary: ReferralSummary): string[] => [
  'Share your invite code with a friend.',
  'They sign up with your code and verify their account.',
  `They get ${summary.welcomeBonus} IndexxPoints, and you get ${summary.rewardPerReferral} once they send their first message.`,
];

const AMBASSADOR_TIER_LABEL: Record<string, string> = {
  community: 'Community Ambassador',
  growth: 'Growth Ambassador',
  elite: 'Elite Ambassador',
};

export const ReferralScreen = ({
  route,
  navigation,
}: NativeStackScreenProps<EarnStackParamList, 'Referral'>) => {
  const toast = useToast();
  const {showReward} = useRewardToast();
  const {data, loading, refreshing, error, offline, reload, refresh} =
    useAsync<ReferralSummary>(() => referralService.summary());

  // A code can arrive from an invite deep link (`yaysapp://invite/ABC123`)
  // before there is a session to attach it to, so the screen pre-fills it and
  // the member confirms rather than it being applied silently.
  const [enteredCode, setEnteredCode] = useState(route.params?.code ?? '');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const redeem = useAction();

  // Covers a deep-linked open of this screen that skips the Earn tab, so a
  // referral/Ambassador reward earned while the app was closed still gets
  // its pop-up. A no-op if EarnHomeScreen's own check already consumed it.
  useFocusEffect(
    useCallback(() => {
      rewardAlerts.checkForNew().then(rewards => {
        rewards.forEach((r, i) => setTimeout(() => showReward(r.amount, r.activity), i * 1400));
      });
    }, [showReward]),
  );

  const handleShare = async (code: string) => {
    try {
      await Share.share({
        message: `Join me on YaysApp! Use my invite code ${code} when you sign up. https://yay.chat/invite/${code}`,
      });
    } catch {
      toast.show('Could not open share sheet', 'error');
    }
  };

  const handleRedeem = async () => {
    setRedeemError(null);
    const result = await redeem.perform(
      () => referralService.redeem(enteredCode, 'referral_screen'),
      setRedeemError,
    );
    if (result) {
      setEnteredCode('');
      rewardAlerts.markSeenNow();
      showReward(result.welcomeBonus, 'Invite code applied');
      reload();
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice module="rewards" text="Preview rewards — IndexxPoints here are simulated and have no monetary value." />
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {summary => (
          <>
            <Card style={{alignItems: 'center', paddingVertical: spacing.xl}}>
              <YayText variant="caption" color={colors.textMuted}>
                Your invite code
              </YayText>
              <YayText variant="display" color={colors.brandStrong} style={{letterSpacing: 2}}>
                {summary.code}
              </YayText>
              <Spacer size={spacing.md} />
              <Row gap={spacing.xs}>
                <Button
                  label="Copy"
                  kind="secondary"
                  icon="copy"
                  onPress={() => {
                    Clipboard.setString(summary.code);
                    toast.show('Code copied', 'success');
                  }}
                />
                <Button
                  label="Share"
                  icon="share-social"
                  onPress={() => handleShare(summary.code)}
                />
              </Row>
              <Spacer size={spacing.sm} />
              <Button
                label="Invite from contacts"
                kind="secondary"
                icon="people"
                onPress={() => navigation.navigate('InviteContacts')}
              />
            </Card>

            <Row gap={spacing.xs} style={{marginBottom: spacing.sm}}>
              <StatTile label="Joined" value={String(summary.stats.active)} />
              <StatTile label="Pending" value={String(summary.stats.pending)} />
              <StatTile label="Points earned" value={String(summary.stats.pointsEarned)} />
            </Row>

            {summary.activationCompletedAt ? (
              <Banner
                tone="success"
                text={`Verified activation reward claimed — +${activationRewardPoints()} IndexxPoints.`}
              />
            ) : (
              <Banner
                tone="info"
                text={`Verify your account and join a BTCY community to claim a one-time ${activationRewardPoints()} IndexxPoints activation reward.`}
              />
            )}
            <Spacer size={spacing.sm} />

            <SectionHeader title="How it works" />
            <Card>
              {referralSteps(summary).map((step, i) => (
                <Row key={step} gap={spacing.sm} style={{paddingVertical: spacing.xs, alignItems: 'flex-start'}}>
                  <Oval size={22} style={styles.stepBubble}>
                    <YayText variant="micro" color={colors.textOnBrand}>
                      {i + 1}
                    </YayText>
                  </Oval>
                  <YayText variant="caption" color={colors.textSecondary} style={{flex: 1}}>
                    {step}
                  </YayText>
                </Row>
              ))}
            </Card>

            <SectionHeader title="BTCY x YaysApp Ambassador ladder" />
            <Card>
              {summary.ambassador.tiers.map((tier, i) => {
                const reached =
                  summary.ambassador.currentTier != null &&
                  summary.ambassador.tiers.findIndex(t => t.tier === summary.ambassador.currentTier) >= i;
                return (
                  <View key={tier.tier}>
                    {i > 0 ? <Divider /> : null}
                    <ListRow
                      title={tier.label}
                      subtitle={
                        tier.bonusPoints > 0
                          ? `${tier.verifiedReferralsRequired} verified referrals — Mining Station + ${tier.bonusPoints} IndexxPoints`
                          : `${tier.verifiedReferralsRequired} verified referrals — Mining Station Ownership`
                      }
                      chevron={false}
                      icon={reached ? 'ribbon' : 'ribbon-outline'}
                      iconTone={reached ? colors.brandStrong : colors.textFaint}
                      right={reached ? <Badge label="REACHED" tone="success" /> : undefined}
                    />
                  </View>
                );
              })}
              {summary.ambassador.nextTier ? (
                <>
                  <Divider />
                  <YayText variant="caption" color={colors.textSecondary} style={{padding: spacing.sm}}>
                    {`${summary.ambassador.nextTier.referralsRemaining} more verified referral${
                      summary.ambassador.nextTier.referralsRemaining === 1 ? '' : 's'
                    } to reach ${AMBASSADOR_TIER_LABEL[summary.ambassador.nextTier.tier] ?? 'the next tier'}.`}
                  </YayText>
                </>
              ) : null}
            </Card>

            <SectionHeader title="Were you invited?" />
            <Card>
              <YayText variant="caption" color={colors.textSecondary}>
                {`Enter a friend's code to claim your ${summary.welcomeBonus} IndexxPoints welcome bonus. You can only do this once.`}
              </YayText>
              <Spacer size={spacing.sm} />
              <TextField
                label="Invite code"
                value={enteredCode}
                onChangeText={text => {
                  setEnteredCode(text.toUpperCase());
                  setRedeemError(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                error={redeemError ?? undefined}
                placeholder="ABCD1234"
              />
              <Button
                label="Apply code"
                icon="gift"
                loading={redeem.busy}
                disabled={enteredCode.trim().length === 0}
                onPress={handleRedeem}
              />
            </Card>

            <SectionHeader title={`Your referrals (${summary.items.length})`} />
            {summary.items.length === 0 ? (
              <EmptyState
                title="No referrals yet"
                message="Share your code — you both earn when a friend joins."
                icon="gift-outline"
              />
            ) : (
              <Card style={{paddingVertical: spacing.xxs}}>
                {summary.items.map((ref, i) => (
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
// InviteContactsScreen
//
// Two ways to find someone: read the device address book and split it into
// "already on YaysApp" and "not yet" with an Invite button on the latter, or
// type a single email and get the same split for just that one address.
// Registered under both the Earn and Profile stacks (via `Invite from
// contacts` on the Referral screen, and the Friends list banner), since
// neither route carries params this needs.
// ---------------------------------------------------------------------------

export const InviteContactsScreen = () => {
  const toast = useToast();
  const [permission, setPermission] = useState<ContactsPermissionStatus | 'checking'>('checking');
  const [contactsState, setContactsState] = useState<{
    loading: boolean;
    error: string | null;
    onYaysApp: OnYaysAppContact[];
    invitable: InvitableContact[];
  }>({loading: false, error: null, onYaysApp: [], invitable: []});

  const loadContacts = useCallback(async () => {
    setContactsState(s => ({...s, loading: true, error: null}));
    try {
      const result = await inviteService.findFromContacts();
      setContactsState({loading: false, error: null, ...result});
    } catch (e) {
      setContactsState(s => ({...s, loading: false, error: errorMessage(e)}));
    }
  }, []);

  const refreshPermission = useCallback(async () => {
    const status = await inviteService.permissionStatus();
    setPermission(status);
    if (status === 'granted') {
      loadContacts();
    }
  }, [loadContacts]);

  useFocusEffect(
    useCallback(() => {
      refreshPermission();
    }, [refreshPermission]),
  );

  const handleAllow = async () => {
    const status = await inviteService.requestPermission();
    setPermission(status);
    if (status === 'granted') {
      loadContacts();
    } else if (status === 'denied') {
      toast.show('You can allow contacts access any time from Settings.', 'info');
    }
  };

  const handleInvite = async (contact: InvitableContact) => {
    const target = contact.email || contact.phone || '';
    try {
      await Share.share({
        message: `Join me on YaysApp! ${target ? `Hey ${contact.name}, ` : ''}Download the app: https://yay.chat`,
      });
    } catch {
      toast.show('Could not open share sheet', 'error');
    }
  };

  // --- email search --------------------------------------------------------

  const [emailQuery, setEmailQuery] = useState('');
  const [emailResult, setEmailResult] = useState<
    {exists: boolean; user?: User} | null
  >(null);
  const [emailSearching, setEmailSearching] = useState(false);

  useEffect(() => {
    const trimmed = emailQuery.trim();
    if (!EMAIL_LIKE.test(trimmed)) {
      setEmailResult(null);
      setEmailSearching(false);
      return;
    }
    setEmailSearching(true);
    const t = setTimeout(() => {
      inviteService
        .lookupEmail(trimmed)
        .then(setEmailResult)
        .finally(() => setEmailSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [emailQuery]);

  const handleInviteEmail = async () => {
    const email = emailQuery.trim();
    try {
      await Share.share({
        message: `Join me on YaysApp! Download the app and sign up with ${email}: https://yay.chat`,
      });
    } catch {
      toast.show('Could not open share sheet', 'error');
    }
  };

  return (
    <Screen>
      <SearchBar value={emailQuery} onChangeText={setEmailQuery} placeholder="Search by email" />
      {EMAIL_LIKE.test(emailQuery.trim()) ? (
        <>
          <Spacer size={spacing.sm} />
          <Card>
            {emailSearching ? (
              <ListSkeleton rows={1} />
            ) : emailResult?.exists && emailResult.user ? (
              <ListRow
                avatarName={emailResult.user.name}
                avatarImageUri={emailResult.user.profilePic}
                title={emailResult.user.name}
                subtitle="Already on YaysApp"
                chevron={false}
                right={<Badge label="On YaysApp" tone="success" />}
              />
            ) : (
              <ListRow
                icon="mail-outline"
                title={emailQuery.trim()}
                subtitle="Not on YaysApp yet"
                chevron={false}
                right={<Button label="Invite" icon="paper-plane" kind="secondary" onPress={handleInviteEmail} />}
              />
            )}
          </Card>
        </>
      ) : null}

      <Spacer size={spacing.md} />
      <SectionHeader title="From your contacts" />

      {permission === 'checking' ? (
        <ListSkeleton rows={3} />
      ) : permission === 'undetermined' ? (
        <Card style={{alignItems: 'center', paddingVertical: spacing.lg}}>
          <Ionicons name="people-circle-outline" size={40} color={colors.brand} />
          <Spacer size={spacing.sm} />
          <YayText variant="bodyStrong">Find friends already on YaysApp</YayText>
          <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center', marginTop: spacing.xxs}}>
            YaysApp checks your contacts against existing accounts. Numbers and emails are matched,
            never stored or shown to anyone else.
          </YayText>
          <Spacer size={spacing.md} />
          <Button label="Allow contacts access" icon="people" onPress={handleAllow} />
        </Card>
      ) : permission === 'denied' || permission === 'unavailable' ? (
        <Card style={{alignItems: 'center', paddingVertical: spacing.lg}}>
          <Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />
          <Spacer size={spacing.sm} />
          <YayText variant="bodyStrong">Contacts access is off</YayText>
          <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center', marginTop: spacing.xxs}}>
            Turn it on in Settings to find friends already on YaysApp and invite the rest.
          </YayText>
          <Spacer size={spacing.md} />
          <Button label="Open Settings" icon="settings-outline" kind="secondary" onPress={inviteService.openSettings} />
        </Card>
      ) : contactsState.loading ? (
        <ListSkeleton rows={5} />
      ) : contactsState.error ? (
        <StateView icon="alert-circle-outline" title="Couldn't read contacts" message={contactsState.error} />
      ) : contactsState.onYaysApp.length === 0 && contactsState.invitable.length === 0 ? (
        <EmptyState
          title="No contacts found"
          message="Add phone numbers or emails to your contacts to find friends here."
          icon="people-outline"
        />
      ) : (
        <>
          {contactsState.onYaysApp.length > 0 ? (
            <>
              <Card style={{paddingVertical: spacing.xxs}}>
                {contactsState.onYaysApp.map((c, i) => (
                  <View key={c.localId}>
                    {i > 0 ? <Divider /> : null}
                    <ListRow
                      avatarName={c.name}
                      title={c.name}
                      subtitle={c.email}
                      chevron={false}
                      right={<Badge label="On YaysApp" tone="success" />}
                    />
                  </View>
                ))}
              </Card>
              <Spacer size={spacing.md} />
            </>
          ) : null}

          {contactsState.invitable.length > 0 ? (
            <>
              <SectionHeader title={`Invite (${contactsState.invitable.length})`} />
              <Card style={{paddingVertical: spacing.xxs}}>
                {contactsState.invitable.map((c, i) => (
                  <View key={c.localId}>
                    {i > 0 ? <Divider /> : null}
                    <ListRow
                      avatarName={c.name}
                      title={c.name}
                      subtitle={c.phone || c.email}
                      chevron={false}
                      right={<Button label="Invite" kind="secondary" onPress={() => handleInvite(c)} />}
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
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
      <MockNotice module="rewards" text="Preview rewards — IndexxPoints here are simulated and have no monetary value." />
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
  stagePill: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    borderRadius: radius.sm,
  },
  stepBubble: {
    marginTop: 1,
  },
});
