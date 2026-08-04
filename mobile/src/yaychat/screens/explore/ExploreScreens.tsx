/**
 * Explore tab — the YaysApp home. A grid of the Indexx ecosystem products;
 * each opens a detail page describing the product with a CTA that links out to
 * the product's website. All content is preview-stage.
 */
import React, {useEffect, useState} from 'react';
import {Linking, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  AsyncView,
  Avatar,
  Badge,
  Banner,
  Oval,
  Button,
  Card,
  ProductBrandLogo,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  Spacer,
  Wordmark,
  YayText,
} from '../../design/components';
import {colors, palette, radius, shadows, spacing} from '../../design/tokens';
import {ecosystemService, errorMessage, socialService} from '../../services';
import {useAsync} from '../../state/hooks';
import {formatUnreadBadge, useAuth, useToast, useUnread} from '../../state/AppProviders';
import type {EcosystemProduct, SocialAccount} from '../../types/models';
import type {ExploreStackParamList} from '../../types/navigation';

const QUICK_ACTIONS: {icon: string; label: string; route: string; tone: string}[] = [
  {icon: 'chatbubbles', label: 'Chats', route: 'ChatsTab', tone: colors.brand},
  {icon: 'sparkles', label: 'aiainai', route: 'AiTab', tone: palette.aiainaiRed},
  {icon: 'gift', label: 'Earn', route: 'EarnTab', tone: '#7b5cb8'},
  {icon: 'wallet', label: 'Wallet', route: 'WalletOverview', tone: colors.success},
];

/** Products with an in-app hub dashboard (see screens/btcy, emmm, shoperpal). */
const HUB_ROUTES: Record<string, string> = {
  p_btcy: 'BtcyHub',
  p_emmm: 'EmmmHub',
  p_shopper: 'ShoperpalHub',
  p_rehuman: 'RehumanHub',
};

const availabilityBadge = (a: EcosystemProduct['availability']) =>
  a === 'available'
    ? {label: 'Live', tone: 'success' as const}
    : a === 'preview'
    ? {label: 'Preview', tone: 'brand' as const}
    : {label: 'Coming soon', tone: 'neutral' as const};

// ---------------------------------------------------------------------------
// ExploreHome — the grid
// ---------------------------------------------------------------------------

export const ExploreHomeScreen = ({
  navigation,
}: NativeStackScreenProps<ExploreStackParamList, 'ExploreHome'>) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const {session} = useAuth();
  const {total: unreadTotal} = useUnread();
  const firstName = (session?.user.name ?? 'there').split(' ')[0];
  const go = (route: string) => (navigation as unknown as {navigate: (r: string) => void}).navigate(route);
  const {data, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => ecosystemService.products(),
    [],
  );

  const featured = data?.find(p => p.id === 'p_aiainai') ?? data?.[0];

  // Social platform linking — chips show status only; connecting happens on
  // the SocialConnect screen, so refresh whenever this screen regains focus.
  const socialsAsync = useAsync(() => socialService.accounts(), []);
  const socials = socialsAsync.data ?? [];
  useEffect(
    () => navigation.addListener('focus', () => void socialsAsync.reload()),
    // socialsAsync.reload wraps a stable callback; subscribe once per navigator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigation],
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {/* Brand */}
      <Row style={{marginTop: insets.top + spacing.xs}}>
        <Wordmark height={42} />
      </Row>

      <Spacer size={spacing.md} />
      {/* Greeting */}
      <Row style={{justifyContent: 'space-between'}}>
        <View style={{flex: 1}}>
          <YayText variant="caption" color={colors.textMuted}>
            Welcome back
          </YayText>
          <YayText variant="title">Hi {firstName} 👋</YayText>
        </View>
        <Avatar name={session?.user.name ?? 'You'} size={44} />
      </Row>

      <Spacer size={spacing.md} />
      <Pressable onPress={() => go('ChatsTab')} accessibilityRole="search">
        <View pointerEvents="none">
          <SearchBar value="" onChangeText={() => {}} placeholder="Search chats, people, products" />
        </View>
      </Pressable>

      {/* Quick actions */}
      <Row style={{marginTop: spacing.lg, justifyContent: 'space-between'}} gap={spacing.xs}>
        {QUICK_ACTIONS.map(a => (
          <Pressable
            key={a.label}
            onPress={() => go(a.route)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={({pressed}) => [styles.quick, pressed && {opacity: 0.7}]}>
            <View>
              <Oval size={54} color={a.tone}>
                <Ionicons name={a.icon} size={22} color={colors.textOnBrand} />
              </Oval>
              {a.label === 'Chats' && unreadTotal > 0 ? (
                <View style={styles.quickBadge}>
                  <YayText variant="micro" color={colors.textOnBrand} style={styles.quickBadgeText}>
                    {formatUnreadBadge(unreadTotal)}
                  </YayText>
                </View>
              ) : null}
            </View>
            <YayText variant="micro" color={colors.textSecondary}>
              {a.label}
            </YayText>
          </Pressable>
        ))}
      </Row>

      {/* Featured */}
      {featured ? (
        <>
          <SectionHeader title="Featured" />
          <Pressable
            onPress={() => navigation.navigate('ProductDetail', {productId: featured.id})}
            style={({pressed}) => [styles.featured, {backgroundColor: colors.tileSoft}, pressed && {opacity: 0.9}]}>
            <View style={{flex: 1, paddingRight: spacing.sm}}>
              <Badge label={availabilityBadge(featured.availability).label} tone={availabilityBadge(featured.availability).tone} />
              <YayText variant="heading" style={{marginTop: spacing.xs}}>
                {featured.name}
              </YayText>
              <YayText variant="caption" color={colors.textSecondary}>
                {featured.purpose}
              </YayText>
            </View>
            <ProductBrandLogo productId={featured.id} icon={featured.icon} size={64} />
          </Pressable>
        </>
      ) : null}

      {/* Ecosystem grid */}
      <SectionHeader title="Your ecosystem" />
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={!!data && data.length === 0}>
        {products => (
          <View style={styles.grid}>
            {products.map(p => {
              const badge = availabilityBadge(p.availability);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name} — ${p.tagline}`}
                  onPress={() => navigation.navigate('ProductDetail', {productId: p.id})}
                  style={({pressed}) => [styles.tile, {backgroundColor: colors.tileSoft}, pressed && {opacity: 0.85}]}>
                  <View style={styles.tileIcon}>
                    <ProductBrandLogo productId={p.id} icon={p.icon} size={38} />
                  </View>
                  <YayText variant="bodyStrong" numberOfLines={1}>
                    {p.name}
                  </YayText>
                  <YayText variant="micro" color={colors.textSecondary} numberOfLines={2}>
                    {p.tagline}
                  </YayText>
                  <View style={styles.tileBadge}>
                    <Badge label={badge.label} tone={badge.tone} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </AsyncView>

      {/* Social linking */}
      <SectionHeader title="Connect your socials" />
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.sm}}>
        Link your accounts to invite friends, share wins, and unlock rewards.
      </YayText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap: spacing.md, paddingRight: spacing.md}}>
        {socials.map(s => {
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={
                s.connected ? `${s.name}, linked as ${s.handle}` : `Connect ${s.name}`
              }
              onPress={() => navigation.navigate('SocialConnect', {socialId: s.id})}
              style={({pressed}) => [styles.social, pressed && {opacity: 0.6}]}>
              <View>
                <View style={[styles.socialCircle, {backgroundColor: s.brandColor}]}>
                  <Ionicons name={s.icon} size={26} color={colors.textOnBrand} />
                </View>
                {s.connected ? (
                  <View style={styles.socialCheck}>
                    <Ionicons name="checkmark" size={11} color={colors.textOnBrand} />
                  </View>
                ) : null}
              </View>
              <YayText variant="micro" color={colors.textSecondary} style={{marginTop: spacing.xxs}}>
                {s.name}
              </YayText>
              <YayText variant="micro" color={s.connected ? colors.success : colors.textFaint}>
                {s.connected ? 'Linked' : 'Connect'}
              </YayText>
            </Pressable>
          );
        })}
      </ScrollView>

      <Spacer size={spacing.md} />
      <Banner
        tone="info"
        icon="information-circle"
        text="Tap any product to learn what it does. Links open the product's website. Preview build — details are illustrative."
      />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ProductDetail — one product, with website CTA
// ---------------------------------------------------------------------------

export const ProductDetailScreen = ({
  route,
  navigation,
}: NativeStackScreenProps<ExploreStackParamList, 'ProductDetail'>) => {
  const toast = useToast();
  const {data, loading, error, offline, reload} = useAsync(
    () => ecosystemService.product(route.params.productId),
    [route.params.productId],
  );

  React.useEffect(() => {
    if (data) {
      navigation.setOptions({title: data.name});
    }
  }, [data, navigation]);

  const openSite = async (url: string, name: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        toast.show(`Could not open ${name}.`, 'error');
        return;
      }
      await Linking.openURL(url);
    } catch {
      toast.show(`Could not open ${name}.`, 'error');
    }
  };

  return (
    <Screen>
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {p => {
          const badge = availabilityBadge(p.availability);
          return (
            <>
              {/* Hero */}
              <Card style={{alignItems: 'center', backgroundColor: colors.tileSoft, borderColor: colors.borderSoft}}>
                <Oval size={72} color={colors.surface}>
                  <ProductBrandLogo productId={p.id} icon={p.icon} size={52} />
                </Oval>
                <YayText variant="title" style={{marginTop: spacing.sm}}>
                  {p.name}
                </YayText>
                <YayText variant="caption" color={colors.textSecondary}>
                  {p.tagline}
                </YayText>
                <View style={{marginTop: spacing.sm}}>
                  <Badge label={badge.label} tone={badge.tone} />
                </View>
              </Card>

              <SectionHeader title="What it is" />
              <Card>
                <YayText color={colors.textSecondary}>{p.purpose}</YayText>
              </Card>

              <SectionHeader title="What you get" />
              <Card>
                <Row gap={spacing.sm} style={{alignItems: 'flex-start'}}>
                  <Ionicons name="gift" size={20} color={p.tileColor} />
                  <YayText color={colors.textSecondary} style={{flex: 1}}>
                    {p.benefit}
                  </YayText>
                </Row>
              </Card>

              <SectionHeader title="Earn with it" />
              <Card>
                <Row gap={spacing.sm} style={{alignItems: 'flex-start'}}>
                  <Ionicons name="sparkles" size={20} color={colors.brand} />
                  <View style={{flex: 1}}>
                    <YayText variant="bodyStrong">{p.earnAction}</YayText>
                    <YayText variant="caption" color={colors.textMuted}>
                      Activity in {p.name} can earn YayPoints once rewards go live (Milestone 6).
                    </YayText>
                  </View>
                </Row>
              </Card>

              <Spacer size={spacing.lg} />
              {HUB_ROUTES[p.id] ? (
                <>
                  <Button
                    label={`Open ${p.name} dashboard`}
                    icon="speedometer-outline"
                    onPress={() =>
                      (navigation as unknown as {navigate: (r: string) => void}).navigate(
                        HUB_ROUTES[p.id],
                      )
                    }
                  />
                  <Spacer size={spacing.sm} />
                </>
              ) : null}
              <Button label={p.ctaLabel} icon="open-outline" onPress={() => openSite(p.url, p.name)} />
              <YayText
                variant="micro"
                color={colors.textFaint}
                style={{textAlign: 'center', marginTop: spacing.xs}}>
                Opens {p.url.replace(/^https?:\/\//, '')} in your browser.
              </YayText>
              <Spacer size={spacing.md} />
              <Banner
                tone="warning"
                icon="flask"
                text="Preview build — product details are illustrative and the destination site is external to YaysApp."
              />
            </>
          );
        }}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// SocialConnect — how linking a platform works and what it unlocks
// ---------------------------------------------------------------------------

/** Per-platform walkthrough of the (simulated) linking flow. */
const connectSteps = (s: SocialAccount): string[] =>
  s.id === 's_whatsapp'
    ? [
        'We open WhatsApp on your phone with a prefilled verification message.',
        'You send the message — that confirms the number belongs to you.',
        'Your WhatsApp is linked for invites and sharing.',
      ]
    : [
        `We open ${s.name}'s secure sign-in page — your password stays with ${s.name}.`,
        'You approve YaysApp’s request. We only see your public profile and handle.',
        'Your handle is verified and shows on your YaysApp profile.',
      ];

export const SocialConnectScreen = ({
  navigation,
  route,
}: NativeStackScreenProps<ExploreStackParamList, 'SocialConnect'>) => {
  const {socialId} = route.params;
  const toast = useToast();
  const {data, setData, loading, error, offline, reload} = useAsync(
    () => socialService.account(socialId),
    [socialId],
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      navigation.setOptions({title: data.name});
    }
  }, [navigation, data]);

  const toggle = async (account: SocialAccount) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const updated = await socialService.toggle(account.id);
      setData(updated);
      toast.show(
        updated.connected
          ? `${updated.name} connected as ${updated.handle}`
          : `${updated.name} disconnected`,
        updated.connected ? 'success' : undefined,
      );
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {s => (
          <>
            {/* Hero */}
            <Card style={{alignItems: 'center', backgroundColor: s.brandColor, borderColor: s.brandColor}}>
              <View style={styles.socialHeroIcon}>
                <Ionicons name={s.icon} size={40} color={s.brandColor} />
              </View>
              <YayText variant="title" color={colors.textOnBrand} style={{marginTop: spacing.sm}}>
                {s.name}
              </YayText>
              <YayText
                variant="caption"
                color={colors.textOnBrand}
                style={{opacity: 0.92, textAlign: 'center'}}>
                {s.blurb}
              </YayText>
              <View style={{marginTop: spacing.sm}}>
                <Badge
                  label={s.connected ? `Linked as ${s.handle}` : 'Not connected'}
                  tone={s.connected ? 'success' : 'neutral'}
                />
              </View>
            </Card>

            <SectionHeader title="How connecting works" />
            <Card>
              {connectSteps(s).map((step, i) => (
                <Row
                  key={step}
                  gap={spacing.sm}
                  style={{alignItems: 'flex-start', marginTop: i === 0 ? 0 : spacing.sm}}>
                  <View style={[styles.stepDot, {backgroundColor: s.brandColor}]}>
                    <YayText variant="micro" color={colors.textOnBrand}>
                      {i + 1}
                    </YayText>
                  </View>
                  <YayText color={colors.textSecondary} style={{flex: 1}}>
                    {step}
                  </YayText>
                </Row>
              ))}
            </Card>

            <SectionHeader title="What happens next" />
            <Card>
              {s.unlocks.map((item, i) => (
                <Row
                  key={item}
                  gap={spacing.sm}
                  style={{alignItems: 'flex-start', marginTop: i === 0 ? 0 : spacing.sm}}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <YayText color={colors.textSecondary} style={{flex: 1}}>
                    {item}
                  </YayText>
                </Row>
              ))}
            </Card>

            <Spacer size={spacing.lg} />
            {s.connected ? (
              <Button
                label={`Disconnect ${s.name}`}
                kind="danger"
                icon="unlink"
                loading={busy}
                onPress={() => toggle(s)}
              />
            ) : (
              <Button
                label={`Connect ${s.name}`}
                icon="link"
                loading={busy}
                onPress={() => toggle(s)}
              />
            )}
            <YayText
              variant="micro"
              color={colors.textFaint}
              style={{textAlign: 'center', marginTop: spacing.xs}}>
              {s.connected
                ? 'Disconnecting removes the badge and stops sharing to this platform.'
                : 'You can disconnect at any time from this screen or Profile.'}
            </YayText>
            <Spacer size={spacing.md} />
            <Banner
              tone="warning"
              icon="flask"
              text={`Preview build — the connection is simulated. The real flow will open ${s.name} and ask for your approval there.`}
            />
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  quickBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.notify,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBadgeText: {
    fontWeight: '700',
    lineHeight: 14,
  },
  featured: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  tile: {
    width: '48.5%',
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 132,
    justifyContent: 'flex-end',
    gap: 2,
    ...shadows.card,
  },
  tileIcon: {
    marginBottom: spacing.xs,
  },
  social: {
    width: 60,
    alignItems: 'center',
  },
  socialCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  socialHeroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  socialCheck: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
});
