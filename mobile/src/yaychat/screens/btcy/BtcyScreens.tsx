/**
 * BTCY sub-app dashboard.
 *
 * A premium, read-only view of the user's Bitcoin Yay state, styled with the
 * YaysApp warm sand-and-amber theme. Every mining-related CTA deep-links into
 * the Bitcoin Yay app (falling back to the website) — no mining, ads, or
 * upgrades happen inside YaysApp, which keeps rewards and ad revenue in BTCY.
 */
import React from 'react';
import {Image, Linking, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Badge,
  Card,
  HubCta as SharedHubCta,
  ListRow,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  YayText,
} from '../../design/components';
import {colors, palette, radius, shadows, spacing} from '../../design/tokens';
import {btcyService} from '../../services';
import {useAsync} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {RootStackParamList} from '../../types/navigation';

// BTCY character art (Bitcoin Yay illustration pack). Decorative only — never
// the sole carrier of information, so a slow asset load never hides state.
const MiningCartArt = require('../../../../assets/img/btcy/mining-cart-hero.png');
const AlchemyTomeArt = require('../../../../assets/img/btcy/alchemy-tome.png');
const ReferralsCrewArt = require('../../../../assets/img/btcy/referrals-crew.png');
const MiningLanternArt = require('../../../../assets/img/btcy/mining-lantern.png');
const PromoLotteryArt = require('../../../../assets/img/btcy/promo-lottery.png');
const BitcoinYayLogo = require('../../../../assets/img/btcy/bitcoin-yay-logo.png');

const BITCOINYAY_SCHEME = 'bitcoinyay://';
const BITCOINYAY_SITE = 'https://www.bitcoinyay.com/';

/** Opens the Bitcoin Yay app at a path, falling back to the website. */
const openBitcoinYay = async (path = '') => {
  try {
    await Linking.openURL(`${BITCOINYAY_SCHEME}${path}`);
  } catch {
    Linking.openURL(BITCOINYAY_SITE).catch(() => undefined);
  }
};

/** Deep-link CTA pill; `onBrand` renders a light pill for use on the hero. */
const HubCta = ({
  label,
  onPress,
  onBrand,
}: {
  label: string;
  onPress: () => void;
  onBrand?: boolean;
}) => (
  <SharedHubCta
    label={label}
    onPress={onPress}
    background={onBrand ? colors.surface : colors.brand}
    color={onBrand ? colors.brandStrong : colors.textOnBrand}
    labelColor={onBrand ? colors.textOnBrand : colors.textPrimary}
  />
);

/** A figure we could not read renders as an em dash, never as zero. */
const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('en-US'));
const fmtBalance = (n: number) => Math.round(n).toLocaleString('en-US');

const BalanceTile = ({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: string;
  tone: 'gold' | 'orange' | 'neutral';
}) => (
  <View style={styles.balanceTile}>
    <View style={[
      styles.balanceIcon,
      tone === 'gold'
        ? styles.balanceIconGold
        : tone === 'orange'
          ? styles.balanceIconOrange
          : styles.balanceIconNeutral,
    ]}>
      <Ionicons
        name={icon}
        size={21}
        color={tone === 'gold' ? colors.gold : tone === 'orange' ? colors.brand : colors.textSecondary}
      />
    </View>
    <YayText variant="micro" color={colors.textMuted}>{label.toUpperCase()}</YayText>
    <YayText variant="heading" numberOfLines={1} adjustsFontSizeToFit>{fmtBalance(value)}</YayText>
    <YayText variant="micro" color={colors.textMuted}>{detail}</YayText>
  </View>
);

/**
 * Progress ratio, or null when either end of the fraction is unknown.
 * A bar drawn from a guessed denominator is worse than no bar.
 */
const ratio = (current: number | null, target: number | null): number | null =>
  current == null || target == null || target <= 0 ? null : current / target;

/** Difference between two figures, or null when either is unknown. */
const remaining = (target: number | null, current: number | null): number | null =>
  target == null || current == null ? null : Math.max(0, target - current);

const alchemyAmount = (value: number | null, unit: 'BTCY' | 'USD' | undefined) =>
  value == null ? '—' : unit === 'USD' ? `$${fmt(value)}` : fmt(value);

/** BTCY x YaysApp Ambassador ladder — display labels for the tier the dashboard reports. */
const AMBASSADOR_TIER_LABEL: Record<'community' | 'growth' | 'elite', string> = {
  community: 'Community Ambassador',
  growth: 'Growth Ambassador',
  elite: 'Elite Ambassador',
};

export const BtcyHubScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'BtcyHub'>) => {
  const toast = useToast();
  const {data, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => btcyService.dashboard(),
    [],
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={data?.hasAccount === false}
        emptyTitle="No Bitcoin Yay account data yet"
        emptyMessage="Sign in with the same email you use for Bitcoin Yay, or open Bitcoin Yay to create your mining account."
        emptyAction={{label: 'Open Bitcoin Yay', onPress: () => openBitcoinYay()}}>
        {d => {
          const alchemyPct = ratio(d.alchemy?.current ?? null, d.alchemy?.target ?? null);
          const alchemyLeft = remaining(d.alchemy?.target ?? null, d.alchemy?.current ?? null);
          const referralsLeft =
            d.referrals?.target != null && d.referrals.active != null
              ? Math.max(0, d.referrals.target - d.referrals.active)
              : null;
          return (
            <>
              {/* BTCY account hero */}
              <View style={styles.hero}>
                <View style={styles.heroGlowLarge} />
                <View style={styles.heroGlowSmall} />
                <Image
                  source={MiningCartArt}
                  style={styles.heroArt}
                  resizeMode="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <View style={styles.heroCopy}>
                  <View style={styles.heroLogoWrap}>
                    <Image source={BitcoinYayLogo} style={styles.heroLogo} resizeMode="contain" accessibilityLabel="Bitcoin Yay" />
                  </View>
                  <Spacer size={spacing.xs} />
                  <YayText variant="display" color={colors.textOnBrand}>
                    {d.mining?.active ? 'Mining is live' : 'Your BTCY account'}
                  </YayText>
                  <YayText variant="caption" color={palette.ember100} style={styles.heroDescription}>
                    Your Bitcoin Yay balances and mining activity, synced in YaysApp.
                  </YayText>
                  {d.mining?.active != null ? <View style={styles.liveBadge}>
                    <View
                      style={[
                        styles.liveDot,
                        {backgroundColor: d.mining.active ? colors.success : palette.ember100},
                      ]}
                    />
                    <YayText variant="micro" color={colors.textOnBrand}>
                      {d.mining.active ? 'MINING ACTIVE' : 'MINING PAUSED'}
                    </YayText>
                  </View> : null}
                  {d.mining ? <View style={styles.miningFacts}>
                    {d.mining.speed != null ? <View style={styles.miningFact}>
                      <YayText variant="micro" color={palette.ember100}>SPEED</YayText>
                      <YayText variant="bodyStrong" color={colors.textOnBrand}>{d.mining.speed}</YayText>
                    </View> : null}
                    {d.mining.plan ? <View style={styles.miningFact}>
                      <YayText variant="micro" color={palette.ember100}>PLAN</YayText>
                      <YayText variant="bodyStrong" color={colors.textOnBrand}>{d.mining.plan}</YayText>
                    </View> : null}
                    {d.mining.streakDays != null ? <View style={styles.miningFact}>
                      <YayText variant="micro" color={palette.ember100}>STREAK</YayText>
                      <YayText variant="bodyStrong" color={colors.textOnBrand}>{d.mining.streakDays}d</YayText>
                    </View> : null}
                  </View> : null}
                  {d.mining?.endsIn != null ? <Row gap={spacing.xxs} style={{marginTop: spacing.xs}}>
                    <Ionicons name="time-outline" size={14} color={palette.ember100} />
                    <YayText variant="caption" color={palette.ember100}>
                      {d.mining.active ? `Mining ends in ${d.mining.endsIn}` : 'No active mining session'}
                    </YayText>
                  </Row> : null}
                  <Spacer size={spacing.md} />
                  <HubCta label={d.mining?.active ? 'Continue Mining' : 'Open Bitcoin Yay'} onBrand onPress={() => openBitcoinYay('mine')} />
                </View>
              </View>

              {/* Portfolio */}
              {d.portfolio && Object.values(d.portfolio).some(value => value != null) ? <>
              <SectionHeader title="Your portfolio" />
              <View style={styles.balanceGrid}>
                {d.portfolio.nuggets != null ? <BalanceTile label="BTCY Nugget" value={d.portfolio.nuggets} detail="Mining balance" icon="sparkles" tone="gold" /> : null}
                {d.portfolio.withdraw != null ? <BalanceTile label="Withdraw" value={d.portfolio.withdraw} detail="Stellar wallet" icon="wallet-outline" tone="neutral" /> : null}
                {d.portfolio.tokens != null ? <BalanceTile label="BTCY Token" value={d.portfolio.tokens} detail="Ying Yang Chain" icon="logo-bitcoin" tone="orange" /> : null}
              </View>
              </> : null}

              <SectionHeader title="Explore Bitcoin Yay" />
              <Card style={styles.exploreCard}>
                <Image source={PromoLotteryArt} style={styles.exploreArt} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" />
                <View style={styles.exploreCopy}>
                  <YayText variant="heading">Your BTCY world</YayText>
                  <YayText variant="caption" color={colors.textSecondary}>
                    Mining, wallets, Alchemy, stations and rewards continue in Bitcoin Yay.
                  </YayText>
                </View>
                <Spacer size={spacing.sm} />
                <HubCta label="Explore Bitcoin Yay" onPress={() => openBitcoinYay()} />
              </Card>

              {/* Alchemy */}
              {d.alchemy ? <>
              <SectionHeader title="Alchemy progress" />
              <Card>
                <Row style={{alignItems: 'flex-start'}} gap={spacing.sm}>
                  <View style={{flex: 1}}>
                    <Row style={{justifyContent: 'space-between'}}>
                      <YayText variant="bodyStrong">
                        {[d.alchemy.current, d.alchemy.target]
                          .filter(value => value != null)
                          .map(value => alchemyAmount(value ?? null, d.alchemy?.unit))
                          .join(' / ')}
                      </YayText>
                      {alchemyLeft != null ? <Badge label={`${alchemyAmount(alchemyLeft, d.alchemy.unit)} to go`} tone="brand" /> : null}
                    </Row>
                    {alchemyPct != null ? <><Spacer size={spacing.xs} /><ProgressBar value={alchemyPct} tone={colors.gold} /></> : null}
                    {alchemyLeft != null ? <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
                      {`${alchemyAmount(alchemyLeft, d.alchemy.unit)} remaining to unlock Alchemy.`}
                    </YayText> : null}
                  </View>
                  <Image
                    source={AlchemyTomeArt}
                    style={styles.alchemyArt}
                    resizeMode="contain"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                </Row>
                <Spacer size={spacing.sm} />
                <HubCta label="Open Alchemy" onPress={() => openBitcoinYay('alchemy')} />
              </Card>
              </> : null}

              {/* Referrals */}
              {d.referrals ? <>
              <SectionHeader title="Referral progress" />
              <Card>
                <Row style={{justifyContent: 'space-between'}}>
                  <YayText variant="caption" color={colors.textSecondary}>
                    Active referrals
                  </YayText>
                  <YayText variant="bodyStrong">
                    {d.referrals.target == null ? d.referrals.active : `${d.referrals.active ?? 0} / ${d.referrals.target}`}
                  </YayText>
                </Row>
                {d.referrals.active != null && d.referrals.target != null && d.referrals.target > 0
                  ? <><Spacer size={spacing.xs} /><ProgressBar value={d.referrals.active / d.referrals.target} /></>
                  : null}
                {referralsLeft != null ? <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
                  {`${referralsLeft} more needed to reach the referral target.`}
                </YayText> : null}
                <Image
                  source={ReferralsCrewArt}
                  style={styles.referralsArt}
                  resizeMode="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Card>
              </> : null}

              {/* Mining Station */}
              {d.station?.unlocked != null ? <>
              <SectionHeader title="Mining station" />
              <Card style={d.station.unlocked ? styles.stationUnlocked : undefined}>
                <Row style={{justifyContent: 'space-between'}}>
                  <Row gap={spacing.xs}>
                    <Ionicons
                      name={d.station.unlocked ? 'flash' : 'lock-closed'}
                      size={18}
                      color={d.station.unlocked ? colors.success : colors.textMuted}
                    />
                    <YayText variant="bodyStrong">Status</YayText>
                  </Row>
                  <Badge
                    label={d.station.unlocked ? 'ACTIVE' : 'LOCKED'}
                    tone={d.station.unlocked ? 'success' : 'neutral'}
                  />
                </Row>
                <Image
                  source={MiningLanternArt}
                  style={styles.lanternArt}
                  resizeMode="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Card>
              </> : null}

              {/* Ambassador ladder */}
              {d.ambassador ? <>
              <SectionHeader title="Ambassador ladder" />
              <Card>
                <Row style={{justifyContent: 'space-between'}}>
                  <Row gap={spacing.xs}>
                    <Ionicons
                      name={d.ambassador.tier ? 'ribbon' : 'ribbon-outline'}
                      size={18}
                      color={d.ambassador.tier ? colors.gold : colors.textMuted}
                    />
                    <YayText variant="bodyStrong">
                      {d.ambassador.tier ? AMBASSADOR_TIER_LABEL[d.ambassador.tier] : 'Ambassador'}
                    </YayText>
                  </Row>
                  {d.ambassador.nextTierAt != null ? (
                    <Badge label={`Next: ${d.ambassador.nextTierAt} referrals`} tone="neutral" />
                  ) : null}
                </Row>
              </Card>
              </> : null}

              {/* Watch & Earn */}
              {d.watchEarn && Object.values(d.watchEarn).some(value => value != null) ? <>
              <SectionHeader title="Watch & earn" />
              <Card>
                <Row style={{justifyContent: 'space-between'}}>
                  <YayText variant="caption" color={colors.textSecondary}>
                    Current ad set
                  </YayText>
                  <YayText variant="bodyStrong">
                    {d.watchEarn.total == null ? d.watchEarn.watched : `${d.watchEarn.watched ?? 0} / ${d.watchEarn.total}`}
                  </YayText>
                </Row>
                {d.watchEarn.total != null && d.watchEarn.watched != null
                  ? <><Spacer size={spacing.xs} /><ProgressBar value={ratio(d.watchEarn.watched, d.watchEarn.total) ?? 0} /></>
                  : null}
                {d.watchEarn.rewardAmount != null ? <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
                  {`${fmt(d.watchEarn.rewardAmount)} nuggets returned by Bitcoin Yay.`}
                </YayText> : null}
                <Spacer size={spacing.sm} />
                <HubCta label="Complete" onPress={() => openBitcoinYay('watch-earn')} />
              </Card>
              </> : null}

              {/* Quick actions */}
              <SectionHeader title="Quick actions" />
              <Card style={{paddingVertical: spacing.xxs}}>
                <ListRow
                  icon="logo-bitcoin"
                  title="Open Bitcoin Yay app"
                  onPress={() => openBitcoinYay()}
                />
                <ListRow
                  icon="globe-outline"
                  title="Open website"
                  onPress={() => Linking.openURL(BITCOINYAY_SITE).catch(() => toast.show('Could not open the website.', 'error'))}
                />
                <ListRow
                  icon="swap-horizontal"
                  title="Convert IndexxPoints to Nuggets"
                  subtitle="Turn what you earn in YaysApp into BTCY Nuggets"
                  onPress={() => navigation.navigate('ConvertPoints')}
                />
                <ListRow
                  icon="person-add-outline"
                  title="Invite friends"
                  subtitle="Your referral code and invites"
                  onPress={() => navigation.navigate('InviteFriends')}
                />
                <ListRow
                  icon="help-buoy-outline"
                  title="Support"
                  onPress={() => openBitcoinYay('support')}
                />
                <ListRow
                  icon="people-outline"
                  title="Community"
                  subtitle="Opens the BTCY community in Bitcoin Yay"
                  onPress={() => openBitcoinYay('community')}
                />
              </Card>
              <Spacer size={spacing.md} />
            </>
          );
        }}
      </AsyncView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    minHeight: 340,
    overflow: 'hidden',
    ...shadows.card,
  },
  heroCopy: {
    width: '72%',
    zIndex: 2,
  },
  heroDescription: {
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  heroLogoWrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  heroLogo: {
    width: 142,
    height: 41,
  },
  heroArt: {
    position: 'absolute',
    right: -46,
    bottom: -18,
    width: 230,
    height: 280,
    opacity: 0.88,
    pointerEvents: 'none',
  },
  heroGlowLarge: {
    position: 'absolute',
    right: -80,
    top: -65,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroGlowSmall: {
    position: 'absolute',
    right: 80,
    bottom: -50,
    width: 135,
    height: 135,
    borderRadius: 68,
    backgroundColor: 'rgba(138,74,18,0.15)',
  },
  miningFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  miningFact: {
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.md,
    backgroundColor: 'rgba(90,35,7,0.12)',
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  balanceTile: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 154,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  balanceIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
  },
  balanceIconGold: {backgroundColor: colors.goldSoft},
  balanceIconOrange: {backgroundColor: colors.brandSoft},
  balanceIconNeutral: {backgroundColor: colors.surfaceSunken},
  exploreCard: {
    minHeight: 220,
    overflow: 'hidden',
    backgroundColor: palette.ember50,
    borderColor: palette.ember100,
  },
  exploreCopy: {
    width: '62%',
    zIndex: 2,
  },
  exploreArt: {
    position: 'absolute',
    right: -28,
    top: 10,
    width: 190,
    height: 125,
    opacity: 0.95,
  },
  alchemyArt: {
    width: 56,
    height: 54,
  },
  referralsArt: {
    width: 140,
    height: 81,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  lanternArt: {
    width: 30,
    height: 41,
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stationUnlocked: {
    borderColor: colors.success,
    borderWidth: 1,
  },
});
