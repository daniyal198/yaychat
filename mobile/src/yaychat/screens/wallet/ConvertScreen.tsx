/**
 * Convert IndexxPoints into BTCY Nuggets.
 *
 * The one screen in YaysApp where a balance leaves the app and lands in another
 * product. Two things follow from that, and both shape the layout:
 *
 *  - **Nothing is implied that the backend does not apply.** The rate, the
 *    minimum, and both balances all come from `conversionService`; the button
 *    quotes the exact pair the server will write.
 *  - **A conversion is one-way and cannot be undone from here.** So the amount
 *    is confirmed against the real numbers in a sheet before anything moves,
 *    and the resulting balances are shown afterwards rather than the user
 *    being sent back to guess whether it worked.
 *
 * The per-keystroke figure is computed locally against the same rules the
 * server uses, so typing never waits on the network; the committed numbers
 * always come back from the server's own response.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Badge,
  Banner,
  BottomSheet,
  Button,
  Card,
  Chip,
  MockNotice,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  TextField,
  YayText,
} from '../../design/components';
import {colors, radius, spacing} from '../../design/tokens';
import {conversionKey, conversionService, priceConversion} from '../../services';
import {useAction, useAsync, useLiveData} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {ConversionQuote, ConversionResult} from '../../types/models';
import type {RootStackParamList} from '../../types/navigation';

const fmt = (value: number): string =>
  value.toLocaleString('en-US', {maximumFractionDigits: 5});

/** Balance pill — one side of the conversion. */
const BalanceTile = ({
  label,
  value,
  unit,
  icon,
  tone,
}: {
  label: string;
  value: number;
  unit: string;
  icon: string;
  tone: 'points' | 'nuggets';
}) => (
  <View style={styles.balanceTile}>
    <View style={[styles.balanceIcon, tone === 'nuggets' && styles.balanceIconGold]}>
      <Ionicons
        name={icon}
        size={18}
        color={tone === 'nuggets' ? colors.gold : colors.brand}
      />
    </View>
    <YayText variant="micro" color={colors.textMuted}>
      {label.toUpperCase()}
    </YayText>
    <YayText variant="heading" numberOfLines={1} adjustsFontSizeToFit>
      {fmt(value)}
    </YayText>
    <YayText variant="micro" color={colors.textMuted}>
      {unit}
    </YayText>
  </View>
);

export const ConvertPointsScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'ConvertPoints'>) => {
  const toast = useToast();
  const live = useLiveData('rewards');
  const [amount, setAmount] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [receipt, setReceipt] = useState<ConversionResult | null>(null);
  const convertAction = useAction();

  // The attempt's idempotency key. Created when the confirm sheet opens and
  // held until that attempt resolves, so a retry after a dropped response is
  // the *same* conversion rather than a second one.
  const [attemptKey, setAttemptKey] = useState<string | null>(null);

  const {data, loading, error, offline, reload, refreshing, refresh, setData} =
    useAsync<ConversionQuote>(() => conversionService.quote(0), []);

  const points = Math.floor(Number(amount.replace(/[^0-9]/g, '')) || 0);

  // Priced locally against the loaded balances: the same arithmetic the server
  // applies, so the preview cannot drift from what the button will do.
  const quote = useMemo(
    () =>
      data
        ? priceConversion(points, data.pointsBalance, data.nuggetBalance)
        : null,
    [data, points],
  );

  const openConfirm = () => {
    setAttemptKey(conversionKey());
    setConfirming(true);
  };

  const handleConvert = async () => {
    if (!quote?.eligible) {
      return;
    }
    const result = await convertAction.perform(
      () => conversionService.convert(quote.points, attemptKey ?? conversionKey()),
      message => {
        setConfirming(false);
        toast.show(message, 'error');
      },
    );
    if (!result) {
      return;
    }
    setConfirming(false);
    setAttemptKey(null);
    setAmount('');
    setReceipt(result);
    // The server's own post-conversion balances, not a local subtraction.
    setData(prev =>
      prev
        ? {...prev, pointsBalance: result.pointsBalance, nuggetBalance: result.nuggetBalance}
        : prev,
    );
    toast.show(
      result.duplicate
        ? 'That conversion had already gone through.'
        : `${fmt(result.nuggetsCredited)} BTCY Nuggets added.`,
      'success',
    );
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice
        module="rewards"
        text="Preview conversion — IndexxPoints and Nuggets here are simulated and no real balance moves."
      />
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}>
        {rules => (
          <View>
            {/* The rate, stated the way the rule is written. */}
            <Card style={styles.rateCard}>
              <Row gap={spacing.sm}>
                <View style={styles.rateIcon}>
                  <Ionicons name="swap-horizontal" size={22} color={colors.textOnBrand} />
                </View>
                <View style={{flex: 1}}>
                  <YayText variant="bodyStrong" color={colors.textOnBrand}>
                    {`${fmt(rules.referencePoints)} IndexxPoints = ${fmt(rules.referenceNuggets)} BTCY Nuggets`}
                  </YayText>
                  <YayText variant="caption" color={colors.textOnBrand} style={{opacity: 0.85}}>
                    {`Minimum ${fmt(rules.minimumPoints)} IndexxPoints per conversion`}
                  </YayText>
                </View>
              </Row>
            </Card>

            <Spacer size={spacing.sm} />
            <Row gap={spacing.sm}>
              <BalanceTile
                label="You have"
                value={rules.pointsBalance}
                unit="IndexxPoints"
                icon="star"
                tone="points"
              />
              <BalanceTile
                label="You hold"
                value={rules.nuggetBalance}
                unit="BTCY Nuggets"
                icon="sparkles"
                tone="nuggets"
              />
            </Row>

            <SectionHeader title="Convert" />
            <Card>
              <TextField
                label="IndexxPoints to convert"
                value={amount}
                onChangeText={text => setAmount(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder={String(rules.minimumPoints)}
                error={amount.length > 0 && quote && !quote.eligible ? quote.reason : null}
                style={{marginBottom: spacing.sm}}
              />

              <Row gap={spacing.xs} style={{flexWrap: 'wrap', marginBottom: spacing.sm}}>
                <Chip
                  label={fmt(rules.minimumPoints)}
                  onPress={() => setAmount(String(rules.minimumPoints))}
                />
                <Chip
                  label={fmt(rules.referencePoints)}
                  onPress={() => setAmount(String(rules.referencePoints))}
                />
                <Chip
                  label="Half"
                  onPress={() => setAmount(String(Math.floor(rules.pointsBalance / 2)))}
                />
                <Chip label="Max" onPress={() => setAmount(String(Math.floor(rules.pointsBalance)))} />
              </Row>

              <View style={styles.receiveRow}>
                <YayText variant="caption" color={colors.textSecondary}>
                  You receive
                </YayText>
                <Row gap={spacing.xs}>
                  <Ionicons name="sparkles" size={16} color={colors.gold} />
                  <YayText variant="heading">{`${fmt(quote?.nuggets ?? 0)} Nuggets`}</YayText>
                </Row>
              </View>

              <Spacer size={spacing.sm} />
              <Button
                label="Convert"
                icon="swap-horizontal"
                disabled={!quote?.eligible || convertAction.busy}
                loading={convertAction.busy}
                onPress={openConfirm}
              />
            </Card>

            {receipt ? (
              <>
                <SectionHeader title="Last conversion" />
                <Card>
                  <Row style={{justifyContent: 'space-between'}}>
                    <Row gap={spacing.xs}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <YayText variant="bodyStrong">
                        {`${fmt(receipt.pointsSpent)} → ${fmt(receipt.nuggetsCredited)}`}
                      </YayText>
                    </Row>
                    <Badge label="Converted" tone="success" />
                  </Row>
                  <Spacer size={spacing.xs} />
                  <YayText variant="caption" color={colors.textMuted}>
                    {`Balances now ${fmt(receipt.pointsBalance)} IndexxPoints and ${fmt(receipt.nuggetBalance)} BTCY Nuggets.`}
                  </YayText>
                  <Spacer size={spacing.sm} />
                  <Button
                    label="View in Bitcoin Yay"
                    kind="secondary"
                    icon="logo-bitcoin"
                    onPress={() => navigation.navigate('BtcyHub')}
                  />
                </Card>
              </>
            ) : null}

            <Spacer size={spacing.sm} />
            <Banner
              tone="info"
              icon="information-circle-outline"
              text={
                live
                  ? 'Converting is one-way: Nuggets cannot be turned back into IndexxPoints. Converted Nuggets land in your Bitcoin Yay mining balance.'
                  : 'Converting is one-way. In this preview build no real balance moves.'
              }
            />
            <Spacer size={spacing.md} />
          </View>
        )}
      </AsyncView>

      <BottomSheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        title="Confirm conversion">
        <YayText variant="body" color={colors.textSecondary}>
          {`Convert ${fmt(quote?.points ?? 0)} IndexxPoints into ${fmt(quote?.nuggets ?? 0)} BTCY Nuggets?`}
        </YayText>
        <Spacer size={spacing.xs} />
        <YayText variant="caption" color={colors.textMuted}>
          This cannot be undone — Nuggets do not convert back into IndexxPoints.
        </YayText>
        <Spacer size={spacing.md} />
        <Button
          label="Convert"
          loading={convertAction.busy}
          disabled={convertAction.busy}
          onPress={handleConvert}
        />
        <Spacer size={spacing.xs} />
        <Button label="Cancel" kind="ghost" onPress={() => setConfirming(false)} />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  rateCard: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  rateIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  balanceTile: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  balanceIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  balanceIconGold: {
    backgroundColor: colors.goldSoft,
  },
  receiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
  },
});
