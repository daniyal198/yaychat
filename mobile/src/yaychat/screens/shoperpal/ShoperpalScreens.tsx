/**
 * ShoperPal sub-app dashboard, with Buyer and Supplier views.
 *
 * Read-only view of the user's ShoperPal state in YaysApp-themed cards, with
 * ShoperPal's indigo brand on the heroes. Every shopping/selling CTA
 * deep-links into the ShoperPal app (website fallback) — no checkout or
 * listing management happens inside YaysApp.
 */
import React, {useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Badge,
  Card,
  HubCta,
  ListRow,
  MockNotice,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  SegmentedTabs,
  Spacer,
  StatTile,
  YayText,
} from '../../design/components';
import {colors, radius, shadows, spacing} from '../../design/tokens';
import {shoperpalService} from '../../services';
import {useAsync} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {ShoperpalDashboard} from '../../types/models';
import type {RootStackParamList} from '../../types/navigation';

const SHOPERPAL_SCHEME = 'shoperpal://';
const SHOPERPAL_SITE = 'http://test.shoperpal.com/';
// ShoperPal brand (from their site): indigo primary.
const SP_INDIGO = '#4f46e5';
const SP_INDIGO_SOFT = '#c7d2fe';

/** Opens the ShoperPal app at a path, falling back to the website. */
const openShoperpal = async (path = '') => {
  try {
    await Linking.openURL(`${SHOPERPAL_SCHEME}${path}`);
  } catch {
    Linking.openURL(SHOPERPAL_SITE).catch(() => undefined);
  }
};

const fmt = (n: number) => n.toLocaleString('en-US');

const LEVEL_EMOJI: Record<string, string> = {Bronze: '🥉', Silver: '🥈', Gold: '🥇'};

const BuyerView = ({d}: {d: ShoperpalDashboard['buyer']}) => {
  const levelPct = d.monthSpend / d.nextLevelAt;
  const remaining = d.nextLevelAt - d.monthSpend;
  return (
    <>
      {/* Shopper Level — hero */}
      <View style={styles.hero}>
        <Row style={{justifyContent: 'space-between'}}>
          <YayText variant="heading" color={colors.textOnBrand}>
            Shopper level
          </YayText>
          <View style={styles.heroBadge}>
            <YayText variant="micro" color={colors.textOnBrand}>
              {`${LEVEL_EMOJI[d.level] ?? ''} ${d.level}`}
            </YayText>
          </View>
        </Row>
        <Spacer size={spacing.sm} />
        <YayText variant="micro" color={SP_INDIGO_SOFT}>
          CURRENT EARN RATE
        </YayText>
        <YayText variant="display" color={colors.textOnBrand}>
          {d.earnRate}
        </YayText>
        <Spacer size={spacing.xs} />
        <YayText variant="caption" color={SP_INDIGO_SOFT}>
          {`This month's spend: $${fmt(d.monthSpend)} / $${fmt(d.nextLevelAt)} to ${d.nextLevel}`}
        </YayText>
        <Spacer size={spacing.md} />
        <HubCta
          label="Shop Now"
          background={colors.surface}
          color={SP_INDIGO}
          labelColor={colors.textOnBrand}
          onPress={() => openShoperpal('shop')}
        />
      </View>

      {/* Portfolio */}
      <SectionHeader title="Portfolio" />
      <Card>
        <Row gap={spacing.xs} style={{alignItems: 'stretch'}}>
          <StatTile label="Released nuggets" value={fmt(d.nuggets.released)} icon="sparkles" tone={colors.gold} />
          <StatTile label="Pending" value={fmt(d.nuggets.pending)} icon="hourglass-outline" tone={colors.warning} />
        </Row>
        <Spacer size={spacing.xs} />
        <Row gap={spacing.xs} style={{alignItems: 'stretch'}}>
          <StatTile label="In your BTCY wallet" value={fmt(d.nuggets.wallet)} icon="wallet" />
          <StatTile label="Lifetime earned" value={fmt(d.nuggets.lifetime)} icon="trophy" tone={colors.accent} />
        </Row>
      </Card>

      {/* Level progress */}
      <SectionHeader title="Level progress" />
      <Card>
        <Row style={{justifyContent: 'space-between'}}>
          <YayText variant="bodyStrong">{`$${fmt(d.monthSpend)} / $${fmt(d.nextLevelAt)}`}</YayText>
          <Badge label={`$${fmt(remaining)} to ${d.nextLevel}`} tone="brand" />
        </Row>
        <Spacer size={spacing.xs} />
        <ProgressBar value={levelPct} tone={SP_INDIGO} />
        <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
          {`Spend $${fmt(remaining)} more this month to reach ${d.nextLevel} and a higher earn rate.`}
        </YayText>
        <Spacer size={spacing.sm} />
        <HubCta label="View Levels" background={SP_INDIGO} onPress={() => openShoperpal('levels')} />
      </Card>

      {/* Group buys */}
      <SectionHeader title="Group buys" />
      <Card>
        <Row gap={spacing.sm}>
          <Ionicons name="people" size={22} color={SP_INDIGO} />
          <View style={{flex: 1}}>
            <YayText variant="bodyStrong">Earn more by shopping together</YayText>
            <YayText variant="caption" color={colors.textMuted}>
              Start or join a group buy for a better price + bonus nuggets.
            </YayText>
          </View>
        </Row>
        <Spacer size={spacing.sm} />
        <HubCta label="Explore Group Buys" background={SP_INDIGO} onPress={() => openShoperpal('group-buys')} />
      </Card>

      {/* Flash deals */}
      <SectionHeader title="Flash deals" />
      <View style={styles.promo}>
        <Row style={{justifyContent: 'space-between'}}>
          <Badge label="⚡ Flash deals" tone="warning" />
          <YayText variant="micro" color={colors.textSecondary}>
            Ends in {d.flash.endsIn}
          </YayText>
        </Row>
        <YayText variant="title" color={colors.brandStrong} style={{marginTop: spacing.xs}}>
          {d.flash.title}
        </YayText>
        <Spacer size={spacing.sm} />
        <HubCta label="Shop Flash Deals" background={SP_INDIGO} onPress={() => openShoperpal('flash-deals')} />
      </View>
    </>
  );
};

const SupplierView = ({d}: {d: ShoperpalDashboard['supplier']}) => (
  <>
    {/* Plan status — hero */}
    <View style={styles.hero}>
      <Row style={{justifyContent: 'space-between'}}>
        <YayText variant="heading" color={colors.textOnBrand}>
          Plan status
        </YayText>
        <View style={styles.heroBadge}>
          <YayText variant="micro" color={colors.textOnBrand}>
            {d.plan}
          </YayText>
        </View>
      </Row>
      <Spacer size={spacing.sm} />
      <YayText variant="micro" color={SP_INDIGO_SOFT}>
        PRODUCTS LISTED
      </YayText>
      <YayText variant="display" color={colors.textOnBrand}>
        {`${d.productsListed} / ${d.productsLimit}`}
      </YayText>
      <Spacer size={spacing.xs} />
      <YayText variant="caption" color={SP_INDIGO_SOFT}>
        {`Commission rate: ${d.commission}`}
      </YayText>
      <Spacer size={spacing.md} />
      <HubCta
        label="Upgrade Plan"
        background={colors.surface}
        color={SP_INDIGO}
        labelColor={colors.textOnBrand}
        onPress={() => openShoperpal('supplier/plans')}
      />
    </View>

    {/* AI credits */}
    <SectionHeader title="AI credits" />
    <Card>
      <Row style={{justifyContent: 'space-between'}}>
        <YayText variant="bodyStrong">{`${d.aiCredits.used} / ${d.aiCredits.total} used`}</YayText>
        <Badge label={`Resets in ${d.aiCredits.resetsIn}`} tone="neutral" />
      </Row>
      <Spacer size={spacing.xs} />
      <ProgressBar value={d.aiCredits.used / d.aiCredits.total} tone={SP_INDIGO} />
      <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
        AI listing copy, photos, and pricing suggestions for your products.
      </YayText>
      <Spacer size={spacing.sm} />
      <HubCta label="Use AI Tools" background={SP_INDIGO} onPress={() => openShoperpal('supplier/ai-tools')} />
    </Card>

    {/* Earnings */}
    <SectionHeader title="Earnings" />
    <Card>
      <Row gap={spacing.xs} style={{alignItems: 'stretch'}}>
        <StatTile label="Gross sales" value={d.earnings.gross} icon="cash-outline" />
        <StatTile label="Platform fee" value={d.earnings.fee} icon="remove-circle-outline" tone={colors.warning} />
        <StatTile label="For payout" value={d.earnings.payout} icon="checkmark-circle-outline" tone={colors.success} />
      </Row>
      <Spacer size={spacing.sm} />
      <HubCta label="View Payouts" background={SP_INDIGO} onPress={() => openShoperpal('supplier/payouts')} />
    </Card>

    {/* Boosts */}
    <SectionHeader title="Product boost" />
    <Card>
      <Row gap={spacing.sm}>
        <Ionicons name="rocket" size={22} color={SP_INDIGO} />
        <View style={{flex: 1}}>
          <YayText variant="bodyStrong">{`${d.boosts.active} products featured`}</YayText>
          <YayText variant="caption" color={colors.textMuted}>
            {`Active boosts · ${d.boosts.daysRemaining} days remaining`}
          </YayText>
        </View>
      </Row>
      <Spacer size={spacing.sm} />
      <HubCta label="Boost a Product" background={SP_INDIGO} onPress={() => openShoperpal('supplier/boost')} />
    </Card>
  </>
);

export const ShoperpalHubScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'ShoperpalHub'>) => {
  const toast = useToast();
  const [view, setView] = useState('Buyer');
  const {data, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => shoperpalService.dashboard(),
    [],
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice text="Preview — figures are simulated. Live data comes from your ShoperPal account." />
      <Spacer size={spacing.sm} />
      <SegmentedTabs tabs={['Buyer', 'Supplier']} active={view} onChange={setView} />
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {d => (
          <>
            {view === 'Buyer' ? <BuyerView d={d.buyer} /> : <SupplierView d={d.supplier} />}

            {/* Quick actions */}
            <SectionHeader title="Quick actions" />
            <Card style={{paddingVertical: spacing.xxs}}>
              {view === 'Buyer' ? (
                <>
                  <ListRow icon="cart" title="Open ShoperPal app" onPress={() => openShoperpal()} />
                  <ListRow
                    icon="globe-outline"
                    title="Open website"
                    onPress={() => Linking.openURL(SHOPERPAL_SITE).catch(() => toast.show('Could not open the website.', 'error'))}
                  />
                  <ListRow
                    icon="person-add-outline"
                    title="Invite friends"
                    subtitle="Your referral code and invites"
                    onPress={() => navigation.navigate('InviteFriends')}
                  />
                  <ListRow icon="help-buoy-outline" title="Support" onPress={() => openShoperpal('support')} />
                  <ListRow
                    icon="people-outline"
                    title="Community"
                    subtitle="Opens the ShoperPal community"
                    onPress={() => openShoperpal('community')}
                  />
                </>
              ) : (
                <>
                  <ListRow icon="storefront" title="Open supplier dashboard" onPress={() => openShoperpal('supplier')} />
                  <ListRow icon="cube-outline" title="Manage products" onPress={() => openShoperpal('supplier/products')} />
                  <ListRow icon="help-buoy-outline" title="Support" onPress={() => openShoperpal('support')} />
                  <ListRow
                    icon="people-outline"
                    title="Community"
                    subtitle="Opens the ShoperPal community"
                    onPress={() => openShoperpal('community')}
                  />
                </>
              )}
            </Card>
            <Spacer size={spacing.md} />
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: SP_INDIGO,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  promo: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
