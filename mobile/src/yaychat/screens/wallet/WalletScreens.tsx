/**
 * Wallet preview screens (Milestone 4 scope).
 *
 * IMPORTANT: everything here is simulated. Every screen opens with a
 * <MockNotice /> and no copy or control may imply real money movement.
 * Real wallet functionality ships in a later milestone after security review.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Avatar,
  Badge,
  Banner,
  BottomSheet,
  Button,
  Card,
  Chip,
  Divider,
  MockNotice,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StateView,
  TextField,
  YayText,
} from '../../design/components';
import {colors, radius, spacing} from '../../design/tokens';
import {featureFlags, walletService} from '../../services';
import {useAsync} from '../../state/hooks';
import {useAuth, useToast} from '../../state/AppProviders';
import type {WalletAsset, WalletTransaction} from '../../types/models';
import type {RootStackParamList} from '../../types/navigation';

const WALLET_NOTICE =
  'Wallet preview — no real assets, balances, or transactions. Real wallet functionality arrives in a later milestone after security review.';

// ---------------------------------------------------------------------------
// Formatting helpers (local — preview only)
// ---------------------------------------------------------------------------

const formatFiat = (value: number): string =>
  `$${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

const formatBalance = (value: number): string =>
  value.toLocaleString('en-US', {maximumFractionDigits: 6});

const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
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
  return new Date(iso).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
};

const fullDate = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const TX_META: Record<
  WalletTransaction['type'],
  {icon: string; label: string; sign: '+' | '-' | ''}
> = {
  send: {icon: 'arrow-up-circle', label: 'Send', sign: '-'},
  receive: {icon: 'arrow-down-circle', label: 'Receive', sign: '+'},
  reward: {icon: 'gift', label: 'Reward', sign: '+'},
  conversion: {icon: 'swap-horizontal', label: 'Conversion', sign: ''},
};

const txAmountColor = (type: WalletTransaction['type']): string => {
  if (type === 'send') {
    return colors.danger;
  }
  if (type === 'receive' || type === 'reward') {
    return colors.success;
  }
  return colors.textPrimary;
};

const signedAmount = (t: WalletTransaction): string => {
  const sign = TX_META[t.type].sign;
  return `${sign === '-' ? '−' : sign}${formatBalance(t.amount)}`;
};

// ---------------------------------------------------------------------------
// Wallet overview
// ---------------------------------------------------------------------------

export const WalletOverviewScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'WalletOverview'>) => {
  const toast = useToast();
  const {data, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => walletService.assets(),
    [],
  );

  if (!featureFlags.isEnabled('wallet_preview')) {
    return (
      <Screen scroll={false}>
        <StateView
          icon="lock-closed-outline"
          title="Wallet unavailable"
          message="The wallet preview is not enabled for this build. Check back in a later release."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice text={WALLET_NOTICE} />
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={data != null && data.length === 0}
        emptyTitle="No preview assets"
        emptyMessage="Preview balances will appear here.">
        {assets => {
          const total = assets.reduce((sum, a) => sum + a.fiatValue, 0);
          return (
            <View>
              <Card style={styles.totalCard}>
                <YayText variant="caption" color={colors.textMuted}>
                  Total preview value
                </YayText>
                <YayText variant="display">{`≈ ${formatFiat(total)}`}</YayText>
                <YayText variant="caption" color={colors.textMuted}>
                  Preview balances
                </YayText>
              </Card>

              <Spacer size={spacing.sm} />
              <Banner
                tone="warning"
                icon="shield-checkmark"
                text="Never share recovery phrases. Yay-chat staff will never DM you first."
              />

              <Row gap={spacing.xs} style={styles.actionsRow}>
                <Button
                  label="Send preview"
                  kind="secondary"
                  icon="arrow-up-circle-outline"
                  onPress={() => navigation.navigate('SendPreview')}
                  style={styles.actionButton}
                />
                <Button
                  label="Receive preview"
                  kind="secondary"
                  icon="arrow-down-circle-outline"
                  onPress={() => navigation.navigate('ReceivePreview')}
                  style={styles.actionButton}
                />
                <Button
                  label="Activity"
                  kind="secondary"
                  icon="time-outline"
                  onPress={() => navigation.navigate('WalletTransactions')}
                  style={styles.actionButton}
                />
              </Row>

              <SectionHeader title="Assets" />
              <View style={{gap: spacing.sm}}>
                {assets.map(asset => (
                  <AssetCard key={asset.symbol} asset={asset} />
                ))}
              </View>

              <SectionHeader title="Wallet setup" />
              <Card>
                <View style={styles.setupBody}>
                  <View style={styles.setupIcon}>
                    <Ionicons name="construct-outline" size={24} color={colors.brand} />
                  </View>
                  <YayText variant="bodyStrong" style={{textAlign: 'center'}}>
                    Full wallet setup arrives with Milestone 7
                  </YayText>
                  <YayText
                    variant="caption"
                    color={colors.textMuted}
                    style={{textAlign: 'center'}}>
                    Key management, backups, and real balances land after the security review.
                  </YayText>
                </View>
                <Button
                  label="Set up wallet (coming soon)"
                  kind="secondary"
                  icon="lock-closed-outline"
                  style={{opacity: 0.55}}
                  onPress={() =>
                    toast.show('Wallet setup arrives in a later milestone.', 'info')
                  }
                />
              </Card>
            </View>
          );
        }}
      </AsyncView>
    </Screen>
  );
};

const AssetCard = ({asset}: {asset: WalletAsset}) => {
  const isBtcy = asset.symbol === 'BTCY';
  const isNuggets = asset.symbol === 'NUG';
  return (
    <Card style={isBtcy ? styles.btcyCard : undefined}>
      <Row gap={spacing.sm}>
        <Avatar name={asset.symbol} size={40} />
        <View style={{flex: 1}}>
          <Row gap={spacing.xs}>
            <YayText variant="bodyStrong">{asset.name}</YayText>
            <Badge label="Preview" tone="brand" />
          </Row>
          <YayText variant="caption" color={colors.textMuted}>
            {`${formatBalance(asset.balance)} ${asset.symbol}`}
          </YayText>
        </View>
        <YayText variant="bodyStrong">{formatFiat(asset.fiatValue)}</YayText>
      </Row>
      {isBtcy ? (
        <YayText variant="caption" color={colors.brandStrong} style={styles.assetFootnote}>
          Powered by the BTCY economy
        </YayText>
      ) : null}
      {isNuggets ? (
        <YayText variant="caption" color={colors.textMuted} style={styles.assetFootnote}>
          Convert to BTCY — coming soon
        </YayText>
      ) : null}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Transactions list
// ---------------------------------------------------------------------------

type TxFilter = 'All' | 'Sent' | 'Received' | 'Rewards';
const TX_FILTERS: TxFilter[] = ['All', 'Sent', 'Received', 'Rewards'];

const matchesFilter = (t: WalletTransaction, filter: TxFilter): boolean => {
  switch (filter) {
    case 'Sent':
      return t.type === 'send';
    case 'Received':
      return t.type === 'receive';
    case 'Rewards':
      return t.type === 'reward';
    default:
      return true;
  }
};

export const WalletTransactionsScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'WalletTransactions'>) => {
  const [filter, setFilter] = useState<TxFilter>('All');
  const {data, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => walletService.transactions(),
    [],
  );

  const filtered = useMemo(
    () => (data ?? []).filter(t => matchesFilter(t, filter)),
    [data, filter],
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice text={WALLET_NOTICE} />
      <Row gap={spacing.xs} style={{marginBottom: spacing.sm}}>
        {TX_FILTERS.map(f => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </Row>
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={data != null && filtered.length === 0}
        emptyTitle="No preview activity"
        emptyMessage="Simulated transactions matching this filter will show up here.">
        {() => (
          <Card style={{paddingVertical: spacing.xxs}}>
            {filtered.map((t, index) => (
              <View key={t.id}>
                {index > 0 ? <Divider /> : null}
                <TransactionRow
                  transaction={t}
                  onPress={() =>
                    navigation.navigate('TransactionDetail', {transactionId: t.id})
                  }
                />
              </View>
            ))}
          </Card>
        )}
      </AsyncView>
    </Screen>
  );
};

const TransactionRow = ({
  transaction,
  onPress,
}: {
  transaction: WalletTransaction;
  onPress: () => void;
}) => {
  const meta = TX_META[transaction.type];
  return (
    <Card onPress={onPress} style={styles.txRowCard}>
      <Row gap={spacing.sm}>
        <View style={styles.txIcon}>
          <Ionicons name={meta.icon} size={20} color={colors.brand} />
        </View>
        <View style={{flex: 1}}>
          <Row gap={spacing.xs}>
            <YayText variant="bodyStrong" numberOfLines={1} style={{flexShrink: 1}}>
              {transaction.counterparty}
            </YayText>
            <Badge label="Preview" tone="brand" />
          </Row>
          <YayText variant="caption" color={colors.textMuted}>
            {`${meta.label} · ${timeAgo(transaction.createdAt)}`}
          </YayText>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <YayText variant="bodyStrong" color={txAmountColor(transaction.type)}>
            {signedAmount(transaction)}
          </YayText>
          <YayText variant="caption" color={colors.textMuted}>
            {transaction.asset}
          </YayText>
        </View>
      </Row>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Transaction detail
// ---------------------------------------------------------------------------

export const TransactionDetailScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'TransactionDetail'>) => {
  const toast = useToast();
  const {transactionId} = route.params;
  const {data, loading, error, offline, reload} = useAsync(
    () => walletService.transaction(transactionId),
    [transactionId],
  );

  return (
    <Screen>
      <MockNotice text={WALLET_NOTICE} />
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {t => {
          const meta = TX_META[t.type];
          return (
            <View>
              <Card>
                <View style={styles.detailHero}>
                  <View style={styles.txIconLarge}>
                    <Ionicons name={meta.icon} size={28} color={colors.brand} />
                  </View>
                  <YayText variant="title" color={txAmountColor(t.type)}>
                    {`${signedAmount(t)} ${t.asset}`}
                  </YayText>
                </View>
                <Divider />
                <DetailRow label="Type" value={meta.label} />
                <DetailRow label="Asset" value={t.asset} />
                <DetailRow label="Amount" value={formatBalance(t.amount)} />
                <DetailRow label="Counterparty" value={t.counterparty} />
                <DetailRow label="Date" value={fullDate(t.createdAt)} />
                {t.memo ? <DetailRow label="Memo" value={t.memo} /> : null}
                <View style={styles.detailRow}>
                  <YayText variant="caption" color={colors.textMuted}>
                    Status
                  </YayText>
                  <Badge label="Preview" tone="brand" />
                </View>
              </Card>
              <Spacer size={spacing.md} />
              <Banner tone="info" text="This is simulated history for stakeholder review." />
              <Button
                label="Report a problem"
                kind="ghost"
                icon="flag-outline"
                onPress={() =>
                  toast.show('Thanks — feedback noted for the preview team.', 'success')
                }
              />
            </View>
          );
        }}
      </AsyncView>
    </Screen>
  );
};

const DetailRow = ({label, value}: {label: string; value: string}) => (
  <View style={styles.detailRow}>
    <YayText variant="caption" color={colors.textMuted}>
      {label}
    </YayText>
    <YayText variant="bodyStrong" style={styles.detailValue} numberOfLines={2}>
      {value}
    </YayText>
  </View>
);

// ---------------------------------------------------------------------------
// Send preview (modal)
// ---------------------------------------------------------------------------

export const SendPreviewScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'SendPreview'>) => {
  const {data, loading, error, offline, reload} = useAsync(() => walletService.assets(), []);
  const [symbol, setSymbol] = useState('BTCY');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Screen scroll={false}>
        <View style={{flex: 1, justifyContent: 'center'}}>
          <StateView
            icon="checkmark-circle-outline"
            title="Preview complete"
            message="No real transfer occurred. This flow demonstrates the send experience only."
          />
          <Button label="Done" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  const validate = (assets: WalletAsset[]): boolean => {
    const selected = assets.find(a => a.symbol === symbol);
    let ok = true;
    if (recipient.trim().length === 0) {
      setRecipientError('Enter a recipient username or address.');
      ok = false;
    } else {
      setRecipientError(null);
    }
    const parsed = Number(amount);
    if (!amount.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setAmountError('Enter an amount greater than 0.');
      ok = false;
    } else if (selected && parsed > selected.balance) {
      setAmountError(
        `Amount exceeds your preview balance of ${formatBalance(selected.balance)} ${symbol}.`,
      );
      ok = false;
    } else {
      setAmountError(null);
    }
    return ok;
  };

  return (
    <Screen>
      <MockNotice text={WALLET_NOTICE} />
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {assets => {
          const selected = assets.find(a => a.symbol === symbol) ?? assets[0];
          return (
            <View>
              <YayText variant="caption" color={colors.textSecondary} style={{marginBottom: spacing.xxs}}>
                Asset
              </YayText>
              <Row gap={spacing.xs} style={{flexWrap: 'wrap', marginBottom: spacing.md}}>
                {assets.map(a => (
                  <Chip
                    key={a.symbol}
                    label={a.symbol}
                    active={a.symbol === symbol}
                    onPress={() => setSymbol(a.symbol)}
                  />
                ))}
              </Row>
              {selected ? (
                <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.md}}>
                  {`Preview balance: ${formatBalance(selected.balance)} ${selected.symbol}`}
                </YayText>
              ) : null}
              <TextField
                label="Recipient"
                placeholder="@username or preview address"
                value={recipient}
                onChangeText={setRecipient}
                autoCapitalize="none"
                error={recipientError}
              />
              <TextField
                label="Amount"
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                error={amountError}
              />
              <TextField
                label="Memo (optional)"
                placeholder="Add a note"
                value={memo}
                onChangeText={setMemo}
              />
              <Button
                label="Preview send"
                icon="arrow-up-circle-outline"
                onPress={() => {
                  if (validate(assets)) {
                    setSheetVisible(true);
                  }
                }}
              />
              <BottomSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                title="Confirm preview send">
                <Banner tone="warning" text="No real transfer will occur" />
                <DetailRow label="From" value="My wallet (preview)" />
                <DetailRow label="To" value={recipient.trim() || '—'} />
                <DetailRow label="Amount" value={`${amount} ${symbol}`} />
                <DetailRow label="Fee" value="0 — preview" />
                {memo.trim() ? <DetailRow label="Memo" value={memo.trim()} /> : null}
                <Spacer size={spacing.sm} />
                <Button
                  label="Confirm preview"
                  onPress={() => {
                    setSheetVisible(false);
                    setDone(true);
                  }}
                />
                <Button
                  label="Cancel"
                  kind="ghost"
                  onPress={() => setSheetVisible(false)}
                  style={{marginTop: spacing.xs}}
                />
              </BottomSheet>
            </View>
          );
        }}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Receive preview (modal)
// ---------------------------------------------------------------------------

const QR_SIZE = 12;

/** Deterministic bit for a fake-QR cell, derived from the username. */
const qrBit = (seed: string, index: number): boolean => {
  let hash = 7;
  const input = `${seed}:${index}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) % 65521;
  }
  return hash % 2 === 0;
};

const FakeQr = ({seed}: {seed: string}) => (
  <View style={styles.qrGrid}>
    {Array.from({length: QR_SIZE}).map((_, row) => (
      <View key={row} style={{flexDirection: 'row'}}>
        {Array.from({length: QR_SIZE}).map((__, col) => (
          <View
            key={col}
            style={[
              styles.qrCell,
              {backgroundColor: qrBit(seed, row * QR_SIZE + col) ? '#1c2a22' : '#ffffff'},
            ]}
          />
        ))}
      </View>
    ))}
  </View>
);

export const ReceivePreviewScreen = (
  _props: NativeStackScreenProps<RootStackParamList, 'ReceivePreview'>,
) => {
  const toast = useToast();
  const {session} = useAuth();
  const username = session?.user.username ?? 'preview';
  const address = 'yay1qjordan...preview';

  return (
    <Screen>
      <MockNotice text={WALLET_NOTICE} />
      <Card style={styles.qrCard}>
        <FakeQr seed={username} />
        <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
          Placeholder code — not scannable
        </YayText>
      </Card>
      <Spacer size={spacing.md} />
      <Card>
        <YayText variant="caption" color={colors.textMuted}>
          Preview address
        </YayText>
        <YayText variant="bodyStrong" style={{marginTop: spacing.xxs}}>
          {address}
        </YayText>
        <Spacer size={spacing.sm} />
        <Row gap={spacing.xs}>
          <Button
            label="Copy"
            kind="secondary"
            icon="copy-outline"
            style={{flex: 1}}
            onPress={() => toast.show('Preview address copied.', 'success')}
          />
          <Button
            label="Share"
            kind="secondary"
            icon="share-outline"
            style={{flex: 1}}
            onPress={() => toast.show('Sharing is disabled in this preview build.', 'info')}
          />
        </Row>
      </Card>
      <Spacer size={spacing.md} />
      <Banner tone="info" text="Receiving is disabled in this preview build." />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  totalCard: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xl,
  },
  actionsRow: {
    marginTop: spacing.xs,
    alignItems: 'stretch',
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  btcyCard: {
    borderColor: colors.brand,
    borderWidth: 1.5,
    backgroundColor: colors.brandSoft,
  },
  assetFootnote: {
    marginTop: spacing.xs,
  },
  setupBody: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  setupIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txRowCard: {
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconLarge: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  qrCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: '#ffffff',
  },
  qrGrid: {
    padding: spacing.xs,
    backgroundColor: '#ffffff',
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  qrCell: {
    width: 14,
    height: 14,
  },
});
