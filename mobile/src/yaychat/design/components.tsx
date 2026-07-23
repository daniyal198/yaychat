/**
 * Yay-chat reusable component kit.
 * Every screen must build from these primitives so states and styling stay
 * consistent. See docs/yaychat-component-inventory.md.
 */
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch as RNSwitch,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {avatarColorFor, colors, radius, shadows, spacing, typography} from './tokens';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type Variant = keyof Pick<
  typeof typography,
  'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'micro'
>;

export const YayText = ({
  variant = 'body',
  color = colors.textPrimary,
  style,
  children,
  ...rest
}: {
  variant?: Variant;
  color?: string;
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
} & React.ComponentProps<typeof Text>) => (
  <Text
    {...rest}
    style={[
      {fontFamily: typography.bodyFamily, color},
      typography[variant] as TextStyle,
      style as TextStyle,
    ]}>
    {children}
  </Text>
);

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const Screen = ({
  children,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
}) => {
  const inner: ViewStyle = {
    flexGrow: 1,
    padding: padded ? spacing.md : 0,
    paddingBottom: spacing.xxl,
  };
  if (!scroll) {
    return (
      <View style={[styles.screen, padded && {padding: spacing.md}, style]}>{children}</View>
    );
  }
  return (
    <ScrollView
      style={[styles.screen, style]}
      contentContainerStyle={inner}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        ) : undefined
      }>
      {children}
    </ScrollView>
  );
};

export const Card = ({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) => {
  const body = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) {
    return body;
  }
  return (
    <Pressable onPress={onPress} style={({pressed}) => [{opacity: pressed ? 0.85 : 1}]}>
      {body}
    </Pressable>
  );
};

export const SectionHeader = ({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <YayText variant="heading">{title}</YayText>
    {actionLabel ? (
      <Pressable onPress={onAction} hitSlop={8}>
        <YayText variant="bodyStrong" color={colors.brand}>
          {actionLabel}
        </YayText>
      </Pressable>
    ) : null}
  </View>
);

export const Divider = () => <View style={styles.divider} />;

export const Spacer = ({size = spacing.md}: {size?: number}) => <View style={{height: size}} />;

export const Row = ({
  children,
  style,
  gap = spacing.sm,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  gap?: number;
}) => <View style={[{flexDirection: 'row', alignItems: 'center', gap}, style]}>{children}</View>;

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export const Button = ({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
}) => {
  const kindStyle: Record<string, {bg: string; fg: string; border?: string}> = {
    primary: {bg: colors.brand, fg: colors.textOnBrand},
    secondary: {bg: colors.brandSoft, fg: colors.brandStrong, border: colors.brandBorder},
    ghost: {bg: 'transparent', fg: colors.brandStrong},
    danger: {bg: colors.dangerSoft, fg: colors.danger},
  };
  const k = kindStyle[kind];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        {backgroundColor: k.bg, borderColor: k.border ?? 'transparent'},
        k.border ? {borderWidth: 1} : null,
        (disabled || loading) && {opacity: 0.5},
        pressed && {opacity: 0.8},
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={k.fg} />
      ) : (
        <Row gap={spacing.xs}>
          {icon ? <Ionicons name={icon} size={17} color={k.fg} /> : null}
          <YayText variant="bodyStrong" color={k.fg}>
            {label}
          </YayText>
        </Row>
      )}
    </Pressable>
  );
};

export const IconButton = ({
  icon,
  onPress,
  color = colors.textSecondary,
  size = 22,
  label,
}: {
  icon: string;
  onPress?: () => void;
  color?: string;
  size?: number;
  label?: string;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label ?? icon}
    onPress={onPress}
    hitSlop={10}
    style={({pressed}) => [styles.iconButton, pressed && {opacity: 0.6}]}>
    <Ionicons name={icon} size={size} color={color} />
  </Pressable>
);

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export const TextField = ({
  label,
  error,
  hint,
  style,
  ...inputProps
}: {
  label?: string;
  error?: string | null;
  hint?: string;
  style?: ViewStyle;
} & React.ComponentProps<typeof TextInput>) => (
  <View style={[{marginBottom: spacing.md}, style]}>
    {label ? (
      <YayText variant="caption" color={colors.textSecondary} style={{marginBottom: spacing.xxs}}>
        {label}
      </YayText>
    ) : null}
    <TextInput
      placeholderTextColor={colors.textFaint}
      {...inputProps}
      style={[styles.input, error ? {borderColor: colors.danger} : null]}
    />
    {error ? (
      <YayText variant="caption" color={colors.danger} style={{marginTop: spacing.xxs}}>
        {error}
      </YayText>
    ) : hint ? (
      <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xxs}}>
        {hint}
      </YayText>
    ) : null}
  </View>
);

export const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search',
  autoFocus,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) => (
  <View style={styles.searchBar}>
    <Ionicons name="search" size={18} color={colors.textMuted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      autoFocus={autoFocus}
      autoCapitalize="none"
      style={styles.searchInput}
      accessibilityLabel={placeholder}
    />
    {value.length > 0 ? (
      <Pressable onPress={() => onChangeText('')} hitSlop={8}>
        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
      </Pressable>
    ) : null}
  </View>
);

export const SwitchRow = ({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) => (
  <View style={styles.switchRow}>
    <View style={{flex: 1, paddingRight: spacing.md}}>
      <YayText variant="bodyStrong">{label}</YayText>
      {description ? (
        <YayText variant="caption" color={colors.textMuted}>
          {description}
        </YayText>
      ) : null}
    </View>
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      trackColor={{true: colors.brand, false: colors.border}}
      thumbColor={colors.surfaceRaised}
    />
  </View>
);

export const CheckRow = ({
  label,
  checked,
  onToggle,
  kind = 'checkbox',
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  kind?: 'checkbox' | 'radio';
}) => (
  <Pressable onPress={onToggle} style={styles.checkRow} accessibilityRole={kind === 'radio' ? 'radio' : 'checkbox'}>
    <Ionicons
      name={
        kind === 'radio'
          ? checked
            ? 'radio-button-on'
            : 'radio-button-off'
          : checked
          ? 'checkbox'
          : 'square-outline'
      }
      size={22}
      color={checked ? colors.brand : colors.textMuted}
    />
    <YayText style={{flex: 1}}>{label}</YayText>
  </Pressable>
);

export const SegmentedTabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) => (
  <View style={styles.segmented}>
    {tabs.map(tab => {
      const isActive = tab === active;
      return (
        <Pressable
          key={tab}
          onPress={() => onChange(tab)}
          style={[styles.segment, isActive && styles.segmentActive]}>
          <YayText
            variant="caption"
            color={isActive ? colors.textOnBrand : colors.textSecondary}
            style={{fontWeight: '700'}}>
            {tab}
          </YayText>
        </Pressable>
      );
    })}
  </View>
);

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const Avatar = ({
  name,
  size = 44,
  online,
}: {
  name: string;
  size?: number;
  online?: boolean;
}) => {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2.6,
          backgroundColor: avatarColorFor(name),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <YayText
          variant="bodyStrong"
          color={colors.textOnBrand}
          style={{fontSize: size * 0.36, lineHeight: size * 0.44}}>
          {initials || '?'}
        </YayText>
      </View>
      {online !== undefined ? (
        <View
          style={[
            styles.presenceDot,
            {backgroundColor: online ? colors.success : colors.textFaint},
          ]}
        />
      ) : null}
    </View>
  );
};

export const Badge = ({
  label,
  tone = 'brand',
}: {
  label: string;
  tone?: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';
}) => {
  const tones: Record<string, {bg: string; fg: string}> = {
    brand: {bg: colors.brandSoft, fg: colors.brandStrong},
    accent: {bg: colors.accentSoft, fg: colors.accent},
    success: {bg: colors.successSoft, fg: colors.success},
    warning: {bg: colors.warningSoft, fg: colors.warning},
    danger: {bg: colors.dangerSoft, fg: colors.danger},
    info: {bg: colors.infoSoft, fg: colors.info},
    gold: {bg: colors.goldSoft, fg: colors.gold},
    neutral: {bg: colors.surfaceSunken, fg: colors.textSecondary},
  };
  const t = tones[tone];
  return (
    <View style={[styles.badge, {backgroundColor: t.bg}]}>
      <YayText variant="micro" color={t.fg}>
        {label}
      </YayText>
    </View>
  );
};

export const CountBubble = ({count}: {count: number}) =>
  count > 0 ? (
    <View style={styles.countBubble}>
      <YayText variant="micro" color={colors.textOnBrand}>
        {count > 99 ? '99+' : String(count)}
      </YayText>
    </View>
  ) : null;

export const Chip = ({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, active && {backgroundColor: colors.brand, borderColor: colors.brand}]}>
    {icon ? (
      <Ionicons
        name={icon}
        size={14}
        color={active ? colors.textOnBrand : colors.textSecondary}
      />
    ) : null}
    <YayText variant="caption" color={active ? colors.textOnBrand : colors.textSecondary}>
      {label}
    </YayText>
  </Pressable>
);

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export const ListRow = ({
  title,
  subtitle,
  icon,
  iconTone = colors.brand,
  avatarName,
  online,
  right,
  onPress,
  chevron = true,
  testID,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  iconTone?: string;
  avatarName?: string;
  online?: boolean;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  testID?: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={!onPress}
    style={({pressed}) => [styles.listRow, pressed && {backgroundColor: colors.surfaceSunken}]}>
    {avatarName ? (
      <Avatar name={avatarName} online={online} />
    ) : icon ? (
      <View style={[styles.rowIcon, {backgroundColor: colors.brandSoft}]}>
        <Ionicons name={icon} size={19} color={iconTone} />
      </View>
    ) : null}
    <View style={{flex: 1}}>
      <YayText variant="bodyStrong" numberOfLines={1}>
        {title}
      </YayText>
      {subtitle ? (
        <YayText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {subtitle}
        </YayText>
      ) : null}
    </View>
    {right}
    {onPress && chevron ? (
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    ) : null}
  </Pressable>
);

// ---------------------------------------------------------------------------
// Feedback and states
// ---------------------------------------------------------------------------

export const Banner = ({
  text,
  tone = 'info',
  icon,
}: {
  text: string;
  tone?: 'info' | 'warning' | 'danger' | 'success';
  icon?: string;
}) => {
  const toneMap = {
    info: {bg: colors.infoSoft, fg: colors.info, defaultIcon: 'information-circle'},
    warning: {bg: colors.warningSoft, fg: colors.warning, defaultIcon: 'alert-circle'},
    danger: {bg: colors.dangerSoft, fg: colors.danger, defaultIcon: 'warning'},
    success: {bg: colors.successSoft, fg: colors.success, defaultIcon: 'checkmark-circle'},
  } as const;
  const t = toneMap[tone];
  return (
    <View style={[styles.banner, {backgroundColor: t.bg}]}>
      <Ionicons name={icon ?? t.defaultIcon} size={18} color={t.fg} />
      <YayText variant="caption" color={t.fg} style={{flex: 1}}>
        {text}
      </YayText>
    </View>
  );
};

/** Marks screens whose data is simulated. Required on wallet/reward previews. */
export const MockNotice = ({text}: {text?: string}) => (
  <Banner
    tone="warning"
    icon="flask"
    text={text ?? 'Preview build — data shown here is simulated. No real balances, rewards, or transactions.'}
  />
);

export const StateView = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: {
  icon: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) => (
  <View style={[styles.stateView, compact && {paddingVertical: spacing.xl}]}>
    <View style={styles.stateIcon}>
      <Ionicons name={icon} size={30} color={colors.brand} />
    </View>
    <YayText variant="heading" style={{textAlign: 'center'}}>
      {title}
    </YayText>
    {message ? (
      <YayText
        variant="caption"
        color={colors.textMuted}
        style={{textAlign: 'center', maxWidth: 280}}>
        {message}
      </YayText>
    ) : null}
    {actionLabel ? (
      <Button label={actionLabel} onPress={onAction} kind="secondary" style={{marginTop: spacing.sm}} />
    ) : null}
  </View>
);

export const EmptyState = (props: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}) => <StateView icon={props.icon ?? 'leaf-outline'} {...props} />;

export const ErrorState = ({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <StateView
    icon="cloud-offline-outline"
    title="Something went wrong"
    message={message ?? 'We could not load this right now.'}
    actionLabel={onRetry ? 'Try again' : undefined}
    onAction={onRetry}
  />
);

export const OfflineState = ({onRetry}: {onRetry?: () => void}) => (
  <StateView
    icon="wifi-outline"
    title="You are offline"
    message="Check your connection. Yay-chat will pick up where you left off."
    actionLabel={onRetry ? 'Retry' : undefined}
    onAction={onRetry}
  />
);

export const Skeleton = ({
  height = 16,
  width = '100%',
  round,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  round?: boolean;
  style?: ViewStyle;
}) => {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 1, duration: 650, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 0.45, duration: 650, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={[
        {
          height,
          width,
          borderRadius: round ? height / 2 : radius.xs,
          backgroundColor: colors.skeleton,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
};

export const ListSkeleton = ({rows = 6}: {rows?: number}) => (
  <View style={{gap: spacing.md, paddingVertical: spacing.sm}}>
    {Array.from({length: rows}).map((_, i) => (
      <Row key={i} gap={spacing.sm}>
        <Skeleton height={44} width={44} round />
        <View style={{flex: 1, gap: spacing.xs}}>
          <Skeleton height={13} width="55%" />
          <Skeleton height={11} width="85%" />
        </View>
      </Row>
    ))}
  </View>
);

/**
 * Standard async wrapper: renders skeleton while loading, typed error /
 * offline states with retry, and empty state when the resolver says so.
 */
export const AsyncView = <T,>({
  loading,
  error,
  offline,
  onRetry,
  isEmpty,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyAction,
  data,
  children,
  skeleton,
}: {
  loading: boolean;
  error?: string | null;
  offline?: boolean;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: {label: string; onPress: () => void};
  data: T | null;
  children: (data: T) => React.ReactNode;
  skeleton?: React.ReactNode;
}) => {
  if (loading) {
    return <>{skeleton ?? <ListSkeleton />}</>;
  }
  if (offline) {
    return <OfflineState onRetry={onRetry} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }
  if (isEmpty || data == null) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={emptyAction?.label}
        onAction={emptyAction?.onPress}
      />
    );
  }
  return <>{children(data)}</>;
};

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

export const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.sheetBackdrop} onPress={onClose} />
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      {title ? (
        <YayText variant="heading" style={{marginBottom: spacing.sm}}>
          {title}
        </YayText>
      ) : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {children}
      </KeyboardAvoidingView>
    </View>
  </Modal>
);

export const ConfirmSheet = ({
  visible,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) => (
  <BottomSheet visible={visible} onClose={onClose} title={title}>
    {message ? (
      <YayText color={colors.textSecondary} style={{marginBottom: spacing.lg}}>
        {message}
      </YayText>
    ) : null}
    <Button
      label={confirmLabel}
      kind={destructive ? 'danger' : 'primary'}
      onPress={() => {
        onConfirm();
        onClose();
      }}
    />
    <Button label="Cancel" kind="ghost" onPress={onClose} style={{marginTop: spacing.xs}} />
  </BottomSheet>
);

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const ProgressBar = ({value, tone = colors.brand}: {value: number; tone?: string}) => (
  <View style={styles.progressTrack}>
    <View
      style={[
        styles.progressFill,
        {width: `${Math.max(0, Math.min(100, value * 100))}%`, backgroundColor: tone},
      ]}
    />
  </View>
);

export const StatTile = ({
  label,
  value,
  icon,
  tone = colors.brand,
}: {
  label: string;
  value: string;
  icon?: string;
  tone?: string;
}) => (
  <View style={styles.statTile}>
    {icon ? <Ionicons name={icon} size={18} color={tone} /> : null}
    <YayText variant="title" style={{marginTop: spacing.xxs}}>
      {value}
    </YayText>
    <YayText variant="caption" color={colors.textMuted}>
      {label}
    </YayText>
  </View>
);

export const BrandMark = ({size = 64}: {size?: number}) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2.6,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.raised,
    }}>
    <Ionicons name="chatbubble-ellipses" size={size * 0.5} color={colors.textOnBrand} />
    <View
      style={{
        position: 'absolute',
        right: -size * 0.06,
        top: -size * 0.06,
        width: size * 0.32,
        height: size * 0.32,
        borderRadius: size * 0.16,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name="sparkles" size={size * 0.18} color={colors.textOnBrand} />
    </View>
  </View>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: spacing.xs,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    fontFamily: typography.bodyFamily,
    color: colors.textPrimary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.bodyFamily,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.brand,
  },
  presenceDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  countBubble: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    borderRadius: radius.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  stateView: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  stateIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
  },
});
