/**
 * BTCY sub-app dashboard.
 *
 * A premium, read-only view of the user's Bitcoin Yay state, styled with the
 * YaysApp warm sand-and-amber theme. Every mining-related CTA deep-links into
 * the Bitcoin Yay app (falling back to the website) — no mining, ads, or
 * upgrades happen inside YaysApp, which keeps rewards and ad revenue in BTCY.
 */
import React from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Badge,
  Card,
  HubCta as SharedHubCta,
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
import {colors, palette, radius, shadows, spacing} from '../../design/tokens';
import {btcyService} from '../../services';
import {useAsync} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {RootStackParamList} from '../../types/navigation';

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

const fmt = (n: number) => n.toLocaleString('en-US');

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
      <MockNotice text="Preview — figures are simulated. Live data comes from your Bitcoin Yay account." />
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {d => {
          const alchemyPct = d.alchemy.current / d.alchemy.target;
          const referralsLeft = d.referrals.target - d.referrals.active;
          return (
            <>
              {/* Mining Status — hero */}
              <View style={styles.hero}>
                <Row style={{justifyContent: 'space-between'}}>
                  <YayText variant="heading" color={colors.textOnBrand}>
                    Mining status
                  </YayText>
                  <View style={styles.liveBadge}>
                    <View
                      style={[
                        styles.liveDot,
                        {backgroundColor: d.mining.active ? colors.success : colors.textFaint},
                      ]}
                    />
                    <YayText variant="micro" color={colors.textOnBrand}>
                      {d.mining.active ? 'Active' : 'Paused'}
                    </YayText>
                  </View>
                </Row>
                <Spacer size={spacing.sm} />
                <YayText variant="micro" color={palette.ember100}>
                  CURRENT SPEED
                </YayText>
                <YayText variant="display" color={colors.textOnBrand}>
                  {d.mining.speed}
                </YayText>
                <Spacer size={spacing.xs} />
                <Row gap={spacing.xxs}>
                  <Ionicons name="time-outline" size={14} color={palette.ember100} />
                  <YayText variant="caption" color={palette.ember100}>
                    Next mining ends in {d.mining.endsIn}
                  </YayText>
                </Row>
                <Spacer size={spacing.md} />
                <HubCta label="Continue Mining" onBrand onPress={() => openBitcoinYay('mine')} />
              </View>

              {/* Portfolio */}
              <SectionHeader title="Portfolio" />
              <Card>
                <Row gap={spacing.xs} style={{alignItems: 'stretch'}}>
                  <StatTile label="BTCY Nuggets" value={fmt(d.portfolio.nuggets)} icon="sparkles" tone={colors.gold} />
                  <StatTile label="BTCY Tokens" value={fmt(d.portfolio.tokens)} icon="logo-bitcoin" />
                </Row>
                <Spacer size={spacing.sm} />
                <Row style={{justifyContent: 'space-between', marginBottom: spacing.xxs}}>
                  <YayText variant="caption" color={colors.textSecondary}>
                    Estimated progress towards Alchemy
                  </YayText>
                  <YayText variant="bodyStrong" color={colors.brandStrong}>
                    {Math.round(alchemyPct * 100)}%
                  </YayText>
                </Row>
                <ProgressBar value={alchemyPct} />
              </Card>

              {/* Alchemy */}
              <SectionHeader title="Alchemy progress" />
              <Card>
                <Row style={{justifyContent: 'space-between'}}>
                  <YayText variant="bodyStrong">
                    {`${fmt(d.alchemy.current)} / ${fmt(d.alchemy.target)}`}
                  </YayText>
                  <Badge label={`${fmt(d.alchemy.target - d.alchemy.current)} to go`} tone="brand" />
                </Row>
                <Spacer size={spacing.xs} />
                <ProgressBar value={alchemyPct} tone={colors.gold} />
                <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
                  {`${fmt(d.alchemy.target - d.alchemy.current)} nuggets remaining until your next refine.`}
                </YayText>
                <Spacer size={spacing.sm} />
                <HubCta label="Open Alchemy" onPress={() => openBitcoinYay('alchemy')} />
              </Card>

              {/* Referrals */}
              <SectionHeader title="Referral progress" />
              <Card>
                <Row style={{justifyContent: 'space-between'}}>
                  <YayText variant="caption" color={colors.textSecondary}>
                    Active referrals
                  </YayText>
                  <YayText variant="bodyStrong">
                    {`${d.referrals.active} / ${d.referrals.target}`}
                  </YayText>
                </Row>
                <Spacer size={spacing.xs} />
                <ProgressBar value={d.referrals.active / d.referrals.target} />
                <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
                  {d.station.unlocked
                    ? 'Mining Station Owner — unlocked ✅'
                    : `${referralsLeft} more needed to unlock the Mining Station.`}
                </YayText>
              </Card>

              {/* Mining Station */}
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
                    label={d.station.unlocked ? 'ACTIVE' : `Unlocks at ${d.referrals.target} referrals`}
                    tone={d.station.unlocked ? 'success' : 'neutral'}
                  />
                </Row>
                <Spacer size={spacing.sm} />
                {d.station.benefits.map(b => (
                  <Row key={b} gap={spacing.xs} style={{marginTop: spacing.xxs}}>
                    <Ionicons
                      name={d.station.unlocked ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={18}
                      color={d.station.unlocked ? colors.success : colors.textFaint}
                    />
                    <YayText color={d.station.unlocked ? colors.textPrimary : colors.textMuted}>
                      {b}
                    </YayText>
                  </Row>
                ))}
              </Card>

              {/* Watch & Earn */}
              <SectionHeader title="Watch & earn" />
              <Card>
                <Row style={{justifyContent: 'space-between'}}>
                  <YayText variant="caption" color={colors.textSecondary}>
                    Today's ads
                  </YayText>
                  <YayText variant="bodyStrong">
                    {`${d.watchEarn.watched} / ${d.watchEarn.total}`}
                  </YayText>
                </Row>
                <Spacer size={spacing.xs} />
                <ProgressBar value={d.watchEarn.watched / d.watchEarn.total} />
                <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
                  {`${d.watchEarn.nuggetsToday} nuggets earned today. Ads play in the Bitcoin Yay app.`}
                </YayText>
                <Spacer size={spacing.sm} />
                <HubCta label="Complete" onPress={() => openBitcoinYay('watch-earn')} />
              </Card>

              {/* News */}
              <SectionHeader title="📢 BTCY news" />
              <View style={{gap: spacing.sm}}>
                {d.news.map(n => (
                  <Card key={n.id}>
                    <Row gap={spacing.xs}>
                      <Badge label={n.hot ? `🔥 ${n.tag}` : n.tag} tone={n.hot ? 'brand' : 'neutral'} />
                      <YayText variant="bodyStrong" style={{flex: 1}} numberOfLines={1}>
                        {n.title}
                      </YayText>
                    </Row>
                    <YayText
                      variant="caption"
                      color={colors.textSecondary}
                      style={{marginTop: spacing.xxs}}>
                      {n.detail}
                    </YayText>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openBitcoinYay('news')}
                      hitSlop={8}
                      style={{marginTop: spacing.xs, alignSelf: 'flex-start'}}>
                      <Row gap={4}>
                        <YayText variant="bodyStrong" color={colors.brand}>
                          Read more
                        </YayText>
                        <Ionicons name="arrow-forward" size={14} color={colors.brand} />
                      </Row>
                    </Pressable>
                  </Card>
                ))}
              </View>

              {/* Promotions */}
              <SectionHeader title="Promotions" />
              <View style={styles.promo}>
                <Row style={{justifyContent: 'space-between'}}>
                  <Badge label="🔥 Limited offer" tone="warning" />
                  <YayText variant="micro" color={colors.textSecondary}>
                    Ends in {d.promo.endsIn}
                  </YayText>
                </Row>
                <YayText variant="title" color={colors.brandStrong} style={{marginTop: spacing.xs}}>
                  {d.promo.headline}
                </YayText>
                <YayText variant="caption" color={colors.textSecondary}>
                  {d.promo.subtitle}
                </YayText>
                <Spacer size={spacing.sm} />
                <HubCta label="Upgrade" onPress={() => openBitcoinYay('power-mining')} />
              </View>

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
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  promo: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
