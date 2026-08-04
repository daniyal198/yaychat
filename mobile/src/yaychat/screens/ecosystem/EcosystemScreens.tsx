/**
 * Indexx ecosystem discovery screens.
 *
 * Progressive-disclosure surface: one account across Indexx products, with
 * previews and coming-soon states. Deep integrations ship in Milestone 8.
 */
import React, {useLayoutEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Badge,
  Banner,
  Button,
  Card,
  ProductBrandLogo,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StateView,
  YayText,
} from '../../design/components';
import {colors, radius, spacing} from '../../design/tokens';
import {ecosystemService} from '../../services';
import {useAsync} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {EcosystemProduct} from '../../types/models';
import type {RootStackParamList} from '../../types/navigation';

/** Products with an in-app hub dashboard (see screens/btcy, emmm, shoperpal). */
const HUB_ROUTES: Record<string, string> = {
  p_btcy: 'BtcyHub',
  p_emmm: 'EmmmHub',
  p_shopper: 'ShoperpalHub',
  p_rehuman: 'RehumanHub',
};

const availabilityBadge = (availability: EcosystemProduct['availability']) => {
  switch (availability) {
    case 'available':
      return <Badge label="Available" tone="success" />;
    case 'preview':
      return <Badge label="Preview" tone="brand" />;
    default:
      return <Badge label="Coming soon" tone="neutral" />;
  }
};

// ---------------------------------------------------------------------------
// Ecosystem home
// ---------------------------------------------------------------------------

export const EcosystemScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Ecosystem'>) => {
  const {data, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => ecosystemService.products(),
    [],
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card style={styles.introCard}>
        <View style={styles.introIcon}>
          <Ionicons name="planet-outline" size={26} color={colors.brand} />
        </View>
        <YayText variant="heading" style={{textAlign: 'center'}}>
          One account. Every Indexx product.
        </YayText>
        <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
          Your YaysApp identity gradually unlocks the wider Indexx ecosystem as integrations
          roll out.
        </YayText>
      </Card>

      <SectionHeader title="Products" />
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={data != null && data.length === 0}
        emptyTitle="Nothing to discover yet"
        emptyMessage="Ecosystem products will appear here as they roll out.">
        {products => (
          <View style={{gap: spacing.sm}}>
            {products.map(product => (
              <Card
                key={product.id}
                onPress={() => navigation.navigate('ProductPreview', {productId: product.id})}>
                <Row gap={spacing.sm}>
                  <View style={styles.productIcon}>
                    <ProductBrandLogo productId={product.id} icon={product.icon} size={30} />
                  </View>
                  <View style={{flex: 1}}>
                    <Row gap={spacing.xs}>
                      <YayText variant="bodyStrong" numberOfLines={1} style={{flexShrink: 1}}>
                        {product.name}
                      </YayText>
                      {availabilityBadge(product.availability)}
                    </Row>
                    <YayText variant="caption" color={colors.textMuted} numberOfLines={1}>
                      {product.tagline}
                    </YayText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Row>
                <Row gap={spacing.xxs} style={{marginTop: spacing.xs}}>
                  <Ionicons name="gift-outline" size={14} color={colors.accent} />
                  <YayText variant="caption" color={colors.textSecondary}>
                    {product.earnAction}
                  </YayText>
                </Row>
              </Card>
            ))}
          </View>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Product preview
// ---------------------------------------------------------------------------

export const ProductPreviewScreen = ({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'ProductPreview'>) => {
  const toast = useToast();
  const {productId} = route.params;
  const {data, loading, error, offline, reload} = useAsync(
    () => ecosystemService.product(productId),
    [productId],
  );

  useLayoutEffect(() => {
    if (data) {
      navigation.setOptions({title: data.name});
    }
  }, [navigation, data]);

  return (
    <Screen>
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {product => (
          <View>
            <Card style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <ProductBrandLogo productId={product.id} icon={product.icon} size={48} />
              </View>
              <YayText variant="title" style={{textAlign: 'center'}}>
                {product.name}
              </YayText>
              <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
                {product.tagline}
              </YayText>
            </Card>

            {product.id === 'p_emmm' ? (
              <View style={{marginTop: spacing.md}}>
                <Banner tone="info" icon="globe-outline" text="Not available in all regions." />
              </View>
            ) : null}

            <SectionHeader title="What it is" />
            <Card>
              <YayText color={colors.textSecondary}>{product.purpose}</YayText>
            </Card>

            <SectionHeader title="What you get" />
            <Card>
              <YayText color={colors.textSecondary}>{product.benefit}</YayText>
            </Card>

            <SectionHeader title="Earn with it" />
            <Card>
              <Row gap={spacing.xs}>
                <Ionicons name="gift-outline" size={18} color={colors.accent} />
                <YayText variant="bodyStrong">{product.earnAction}</YayText>
              </Row>
              <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
                Part of X-to-Earn: everyday actions across Indexx products can generate rewards
                over time.
              </YayText>
            </Card>

            <Spacer size={spacing.lg} />
            {HUB_ROUTES[product.id] ? (
              <Button
                label={`Open ${product.name} dashboard`}
                icon="speedometer-outline"
                onPress={() =>
                  (navigation as unknown as {navigate: (r: string) => void}).navigate(
                    HUB_ROUTES[product.id],
                  )
                }
              />
            ) : product.availability === 'coming_soon' ? (
              <Card>
                <StateView
                  compact
                  icon="hourglass-outline"
                  title="Coming soon"
                  message={`${product.name} is not integrated yet.`}
                />
                <Button
                  label="Notify me"
                  kind="secondary"
                  icon="notifications-outline"
                  onPress={() => toast.show("We'll let you know!", 'success')}
                />
              </Card>
            ) : null}

            <Spacer size={spacing.lg} />
            <YayText variant="caption" color={colors.textFaint} style={{textAlign: 'center'}}>
              Integrations ship in Milestone 8. Availability may vary by region.
            </YayText>
          </View>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  introCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  introIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
