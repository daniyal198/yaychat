/**
 * EMMM (Eeny Meeny Miny Moe) sub-app dashboard.
 *
 * Read-only view of the user's EMMM prediction-market state, in clean cards
 * matching the YaysApp theme, with EMMM's dark-navy-and-orange brand on the
 * hero. Every play/bet CTA deep-links into the EMMM app (website fallback) —
 * no betting happens inside YaysApp.
 */
import React from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Banner,
  Badge,
  Card,
  HubCta,
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
import {colors, radius, shadows, spacing} from '../../design/tokens';
import {emmmService} from '../../services';
import {useAsync, useLiveData} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {RootStackParamList} from '../../types/navigation';

const EMMM_SCHEME = 'emmm://';
const EMMM_SITE = 'https://emmm.io/';
// EMMM brand (from emmm.io): dark navy surface, bright orange accent.
const EMMM_NAVY = '#0d1321';
const EMMM_ORANGE = '#ff852f';

/** Opens the EMMM app at a path, falling back to the website. */
const openEmmm = async (path = '') => {
  try {
    await Linking.openURL(`${EMMM_SCHEME}${path}`);
  } catch {
    Linking.openURL(EMMM_SITE).catch(() => undefined);
  }
};

export const EmmmHubScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'EmmmHub'>) => {
  const toast = useToast();
  const {data, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => emmmService.dashboard(),
    [],
  );
  const live = useLiveData('ecosystem');

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {live ? (
        <Banner
          tone="info"
          icon="information-circle"
          text="Connected account data is live. Missing numeric values appear as 0."
        />
      ) : (
        <MockNotice text="Preview — figures are simulated. Live data comes from your EMMM account." />
      )}
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {d => (
          <>
            {/* Slate Status — hero */}
            <View style={styles.hero}>
              <Row style={{justifyContent: 'space-between'}}>
                <YayText variant="heading" color={colors.textOnBrand}>
                  Slate status
                </YayText>
                <View style={styles.liveBadge}>
                  <View
                    style={[
                      styles.liveDot,
                      {backgroundColor: d.slate.open ? colors.success : colors.textFaint},
                    ]}
                  />
                  <YayText variant="micro" color={colors.textOnBrand}>
                    {d.slate.open ? 'Open' : 'Closed'}
                  </YayText>
                </View>
              </Row>
              <Spacer size={spacing.sm} />
              <YayText variant="micro" color={EMMM_ORANGE}>
                {d.slate.draw.toUpperCase()}
              </YayText>
              <YayText variant="display" color={colors.textOnBrand}>
                {d.slate.jackpot}
              </YayText>
              <Spacer size={spacing.xs} />
              <Row gap={spacing.xxs}>
                <Ionicons name="time-outline" size={14} color={EMMM_ORANGE} />
                <YayText variant="caption" color={EMMM_ORANGE}>
                  Closes in {d.slate.closesIn}
                </YayText>
              </Row>
              <Spacer size={spacing.md} />
              <HubCta
                label="Play Lottery"
                background={EMMM_ORANGE}
                color={EMMM_NAVY}
                labelColor={colors.textOnBrand}
                onPress={() => openEmmm('slate')}
              />
            </View>

            {/* Portfolio */}
            <SectionHeader title="Portfolio" />
            <Card>
              <Row gap={spacing.xs} style={{alignItems: 'stretch'}}>
                <StatTile label="Portfolio value" value={d.portfolio.value} icon="pie-chart" />
                <StatTile label="BTCY Nuggets" value={d.portfolio.nuggets} icon="sparkles" tone={colors.gold} />
              </Row>
              <Spacer size={spacing.xs} />
              <YayText variant="caption" color={colors.textMuted}>
                {`Cash + USDT balance: ${d.portfolio.cash} + ${d.portfolio.usdt}`}
              </YayText>
            </Card>

            {/* Accuracy */}
            <SectionHeader title="Prediction accuracy" />
            <Card>
              <Row gap={spacing.xs} style={{alignItems: 'stretch'}}>
                <StatTile label="Overall" value={d.accuracy.overall} icon="analytics" />
                <StatTile label="This week" value={d.accuracy.thisWeek} icon="trending-up" />
                <StatTile label="Brier score" value={d.accuracy.brier} icon="stats-chart" tone={colors.info} />
              </Row>
              <Spacer size={spacing.sm} />
              <HubCta label="View Accuracy" onPress={() => openEmmm('accuracy')} />
            </Card>

            {/* Active ticket */}
            <SectionHeader title="Active ticket" />
            <Card>
              <Row style={{justifyContent: 'space-between'}}>
                <YayText variant="bodyStrong" style={{flex: 1}} numberOfLines={1}>
                  {d.ticket.title}
                </YayText>
                <Badge label={`Prize tier: ${d.ticket.tier}`} tone="brand" />
              </Row>
              <Spacer size={spacing.xs} />
              <Row style={{justifyContent: 'space-between', marginBottom: spacing.xxs}}>
                <YayText variant="caption" color={colors.textSecondary}>
                  Matched
                </YayText>
                <YayText variant="bodyStrong">
                  {`${d.ticket.matched} / ${d.ticket.total}`}
                </YayText>
              </Row>
              <ProgressBar value={d.ticket.total > 0 ? d.ticket.matched / d.ticket.total : 0} tone={EMMM_ORANGE} />
              <Spacer size={spacing.sm} />
              <HubCta label="Track Ticket" onPress={() => openEmmm('tickets')} />
            </Card>

            {/* Promotions */}
            <SectionHeader title="Promotions" />
            <View style={styles.promo}>
              <Badge label="🔥 Bet to Earn" tone="warning" />
              <YayText variant="title" color={colors.brandStrong} style={{marginTop: spacing.xs}}>
                {d.promo.headline}
              </YayText>
              <YayText variant="caption" color={colors.textSecondary}>
                {d.promo.subtitle}
              </YayText>
              <Spacer size={spacing.sm} />
              <HubCta label="Start Betting" onPress={() => openEmmm('markets')} />
            </View>

            {/* Quick actions */}
            <SectionHeader title="Quick actions" />
            <Card style={{paddingVertical: spacing.xxs}}>
              <ListRow icon="ticket" title="Open EMMM app" onPress={() => openEmmm()} />
              <ListRow
                icon="globe-outline"
                title="Open website"
                onPress={() => Linking.openURL(EMMM_SITE).catch(() => toast.show('Could not open the website.', 'error'))}
              />
              <ListRow
                icon="person-add-outline"
                title="Invite friends"
                subtitle="Your referral code and invites"
                onPress={() => navigation.navigate('InviteFriends')}
              />
              <ListRow icon="help-buoy-outline" title="Support" onPress={() => openEmmm('support')} />
              <ListRow
                icon="people-outline"
                title="Community"
                subtitle="Opens the EMMM community"
                onPress={() => openEmmm('community')}
              />
            </Card>
            <Spacer size={spacing.md} />
            <YayText variant="micro" color={colors.textFaint} style={{textAlign: 'center'}}>
              Prediction markets are not available in all regions.
            </YayText>
            <Spacer size={spacing.md} />
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: EMMM_NAVY,
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
  promo: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
