/**
 * YaysApp reusable component kit.
 * Every screen must build from these primitives so states and styling stay
 * consistent. See docs/yaychat-component-inventory.md.
 */
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
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
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  Image as SvgImage,
} from 'react-native-svg';
import {
  avatarColorFor,
  colors,
  OVAL_ASPECT,
  OVAL_GEOMETRY,
  OVAL_SOURCE,
  palette,
  radius,
  shadows,
  spacing,
  typography,
  MAX_FONT_SCALE,
} from './tokens';
import {dataMode, DataModule} from '../services/dataMode';

// ---------------------------------------------------------------------------
// Oval — the brand oval image, used for every oval in the app
// ---------------------------------------------------------------------------

/**
 * Renders the exact brand oval image (assets/oval.png) at any size, with
 * content centered on top. Pass `color` to tint the same image (avatar DPs,
 * unread bubbles, presence dots); omit it for the original orange artwork.
 *
 * - `size` sets the height; width follows the image's native aspect ratio so
 *   the silhouette is never distorted.
 * - Omit `size` and give min-dimensions/padding via `style` for content-driven
 *   ovals (e.g. text buttons) — the image stretches to fit.
 */
export const Oval = ({
  size,
  minSize,
  color,
  style,
  children,
}: {
  size?: number;
  /** Minimum oval height when sizing to content. */
  minSize?: number;
  color?: string;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}) => {
  // The oval is NEVER stretched away from the artwork's native aspect ratio.
  // With `size`, dimensions are known up front. Without it, the content is
  // measured and the smallest oval (at native proportions) that the content
  // rectangle fits inside is computed: for an ellipse with width/height ratio
  // R, a centered w×h rectangle fits when W >= sqrt(w² + (h·R)²).
  // The image also always gets explicit pixel dimensions — with edge or
  // percentage constraints it can fall back to its intrinsic pixel size
  // (1133x1052) and flood the screen.
  const [content, setContent] = useState<{width: number; height: number} | null>(null);
  let ovalW: number | undefined;
  let ovalH: number | undefined;
  if (size) {
    ovalW = Math.round(size * OVAL_ASPECT);
    ovalH = size;
  } else if (content) {
    // 1.18 leaves breathing room; the artwork's tilt means the usable inner
    // rectangle is slightly smaller than a true axis-aligned ellipse's.
    let w =
      Math.sqrt(content.width ** 2 + (content.height * OVAL_ASPECT) ** 2) * 1.18;
    if (minSize) {
      w = Math.max(w, minSize * OVAL_ASPECT);
    }
    ovalW = Math.ceil(w);
    ovalH = Math.ceil(w / OVAL_ASPECT);
  }
  return (
    <View
      style={[
        ovalW && ovalH ? {width: ovalW, height: ovalH} : null,
        {alignItems: 'center', justifyContent: 'center'},
        style as ViewStyle,
      ]}>
      {color === 'transparent' || !ovalW || !ovalH ? null : (
        <Image
          source={OVAL_SOURCE}
          style={[
            {position: 'absolute' as const, top: 0, left: 0, width: ovalW, height: ovalH},
            color ? {tintColor: color} : null,
          ]}
          resizeMode="stretch"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
      {size ? (
        children
      ) : (
        <View
          onLayout={e => {
            const {width, height} = e.nativeEvent.layout;
            if (content?.width !== width || content?.height !== height) {
              setContent({width, height});
            }
          }}
          style={{alignItems: 'center', justifyContent: 'center'}}>
          {children}
        </View>
      )}
    </View>
  );
};

let ovalClipSeq = 0;

/**
 * A tiny bleed past the oval's bounding box.
 *
 * The clip edge is anti-aliased, so a photo sized to exactly meet it can still
 * leave a hairline of whatever sits underneath — which on an avatar is the
 * tinted placeholder oval, and reads as a grey rim around the picture.
 */
const OVAL_IMAGE_OVERSCAN = 1.02;

/**
 * Aspect ratios already resolved, keyed by uri.
 *
 * A chat list mounts the same handful of avatars over and over as it scrolls,
 * and an unresolved ratio falls back to the fit that leaves the oval's tips
 * bare — so without this the grey crescents flash back on every recycle.
 * Ratios are immutable per uri, so the entry never needs invalidating.
 */
const ovalImageAspects = new Map<string, number>();

/**
 * A photo clipped to the brand oval silhouette: the image covers the whole
 * oval (cropped, never letterboxed or distorted) instead of sitting in a
 * smaller shape inside it. Used for every profile picture.
 *
 * The cover rectangle is computed here from the photo's own proportions rather
 * than delegated to `preserveAspectRatio="slice"`. The declarative version
 * left the oval's tips uncovered — the placeholder tint showed through as grey
 * crescents — so the geometry is done explicitly and the image is handed exact
 * dimensions it cannot reinterpret.
 */
export const OvalImage = ({
  uri,
  width,
  height,
  label,
  background,
  style,
}: {
  uri: string;
  width: number;
  height: number;
  label?: string;
  /** Tint shown under the photo while it loads. Clipped to the same ellipse. */
  background?: string;
  style?: ViewStyle | ViewStyle[];
}) => {
  // Clip-path ids share one document per platform, so each instance needs its
  // own or several avatars on a screen would clip through the same path.
  const clipId = useRef(`ovalClip${(ovalClipSeq += 1)}`).current;
  const {viewBoxWidth: vw, viewBoxHeight: vh, rx, ry, rotation} = OVAL_GEOMETRY;

  // The photo's aspect ratio, which only the decoded image knows. Null until
  // it resolves, and on failure it stays null and the slice fallback applies.
  const [aspect, setAspect] = useState<number | null>(
    () => ovalImageAspects.get(uri) ?? null,
  );
  useEffect(() => {
    const known = ovalImageAspects.get(uri);
    if (known) {
      setAspect(known);
      return;
    }
    let cancelled = false;
    setAspect(null);
    Image.getSize(
      uri,
      (w, h) => {
        if (w > 0 && h > 0) {
          ovalImageAspects.set(uri, w / h);
          if (!cancelled) {
            setAspect(w / h);
          }
        }
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  // Cover: scale so the *smaller* overflow wins, then centre. Because the box
  // is given the photo's exact ratio, `preserveAspectRatio="none"` cannot
  // distort it — it just stops the renderer refitting what is already right.
  let box: {x: number; y: number; width: number; height: number} = {
    x: 0,
    y: 0,
    width: vw,
    height: vh,
  };
  if (aspect) {
    const scale = Math.max(vw / aspect, vh) * OVAL_IMAGE_OVERSCAN;
    const w = aspect * scale;
    box = {x: (vw - w) / 2, y: (vh - scale) / 2, width: w, height: scale};
  }

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${vw} ${vh}`}
      style={style as ViewStyle}
      accessibilityLabel={label}>
      <Defs>
        <ClipPath id={clipId}>
          <Ellipse
            cx={vw / 2}
            cy={vh / 2}
            rx={rx}
            ry={ry}
            transform={`rotate(${rotation} ${vw / 2} ${vh / 2})`}
          />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {/* The placeholder lives inside the clip, not behind the SVG. Painted
            as a separate layer underneath, its own anti-aliased edge peeked
            out past the photo as a coloured rim around the oval. */}
        {background ? (
          <Ellipse
            cx={vw / 2}
            cy={vh / 2}
            rx={rx}
            ry={ry}
            transform={`rotate(${rotation} ${vw / 2} ${vh / 2})`}
            fill={background}
          />
        ) : null}
        <SvgImage
          href={{uri}}
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          preserveAspectRatio={aspect ? 'none' : 'xMidYMid slice'}
        />
      </G>
    </Svg>
  );
};

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
    maxFontSizeMultiplier={MAX_FONT_SCALE}
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
  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.card, style, pressed && {opacity: 0.85}]}>
      {children}
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
  // Primary buttons use the oval artwork untinted (its exact orange); other
  // kinds tint the same image so the silhouette never changes.
  const ovalColor = kind === 'primary' ? undefined : k.bg;
  // Buttons never put text inside the oval: the icon sits in a fixed-size
  // oval badge (the exact artwork, never stretched) with the label centered
  // beneath it.
  const badgeIcon = icon ?? 'arrow-forward';
  const labelColor = kind === 'danger' ? colors.danger : colors.textPrimary;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({pressed}) => [
        styles.longButton,
        (disabled || loading) && {opacity: 0.5},
        pressed && {opacity: 0.8},
        style,
      ]}>
      <Oval size={58} color={ovalColor}>
        {loading ? (
          <ActivityIndicator color={k.fg} />
        ) : (
          <Ionicons name={badgeIcon} size={24} color={k.fg} />
        )}
      </Oval>
      <YayText variant="caption" color={labelColor} style={{fontWeight: '700', textAlign: 'center'}}>
        {label}
      </YayText>
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
  secureTextEntry,
  ...inputProps
}: {
  label?: string;
  error?: string | null;
  hint?: string;
  style?: ViewStyle;
} & React.ComponentProps<typeof TextInput>) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = !!secureTextEntry;
  return (
    <View style={[{marginBottom: spacing.md}, style]}>
      {label ? (
        <YayText variant="caption" color={colors.textSecondary} style={{marginBottom: spacing.xxs}}>
          {label}
        </YayText>
      ) : null}
      {isPassword ? (
        <View style={[styles.passwordInputWrap, error ? {borderColor: colors.danger} : null]}>
          <TextInput
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            placeholderTextColor={colors.textFaint}
            {...inputProps}
            secureTextEntry={!passwordVisible}
            autoCapitalize={inputProps.autoCapitalize ?? 'none'}
            autoCorrect={inputProps.autoCorrect ?? false}
            textContentType={inputProps.textContentType ?? 'password'}
            style={[styles.input, styles.passwordInput]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setPasswordVisible(v => !v)}
            hitSlop={8}
            style={styles.passwordToggle}>
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={21}
              color={colors.textMuted}
            />
          </Pressable>
        </View>
      ) : (
        <TextInput
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          placeholderTextColor={colors.textFaint}
          {...inputProps}
          style={[styles.input, error ? {borderColor: colors.danger} : null]}
        />
      )}
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
};

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
      maxFontSizeMultiplier={MAX_FONT_SCALE}
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
  color,
  imageUri,
}: {
  name: string;
  size?: number;
  online?: boolean;
  color?: string;
  imageUri?: string;
}) => {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (imageUri) {
    const ovalWidth = Math.round(size * OVAL_ASPECT);
    return (
      <View style={{width: ovalWidth, height: size}}>
        {/* One shape, not two: the silhouette and the placeholder are both
            drawn by the SVG, so nothing can show at the photo's edge. */}
        <OvalImage
          uri={imageUri}
          width={ovalWidth}
          height={size}
          label={`${name} profile picture`}
          background={color ?? avatarColorFor(name)}
          style={styles.avatarOvalLayer}
        />
        {online !== undefined ? (
          <Oval
            size={11}
            color={online ? colors.success : colors.textFaint}
            style={styles.presenceDot}
          />
        ) : null}
      </View>
    );
  }
  return (
    <Oval size={size} color={color ?? avatarColorFor(name)}>
      <YayText
        variant="bodyStrong"
        color={colors.textOnBrand}
        style={{
          fontSize: size * 0.36,
          lineHeight: size * 0.44,
        }}>
        {initials || '?'}
      </YayText>
      {online !== undefined ? (
        <Oval
          size={11}
          color={online ? colors.success : colors.textFaint}
          style={styles.presenceDot}
        />
      ) : null}
    </Oval>
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

export const CountBubble = ({count}: {count: number}) => {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  const label = safeCount > 999 ? '999+' : String(safeCount);
  return safeCount > 0 ? (
    <Oval color={colors.notify} minSize={20}>
      <YayText variant="micro" color={colors.textOnBrand} numberOfLines={1}>
        {label}
      </YayText>
    </Oval>
  ) : null;
};

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
  avatarImageUri,
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
  avatarImageUri?: string;
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
      <Avatar name={avatarName} imageUri={avatarImageUri} online={online} />
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
  actionLabel,
  onAction,
}: {
  text: string;
  tone?: 'info' | 'warning' | 'danger' | 'success';
  icon?: string;
  /** Renders a tappable affordance under the text. Needs `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
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
      <View style={{flex: 1}}>
        <YayText variant="caption" color={t.fg}>
          {text}
        </YayText>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            hitSlop={8}
            style={({pressed}) => [{marginTop: spacing.xxs}, pressed && {opacity: 0.6}]}>
            <YayText variant="caption" color={t.fg} style={{textDecorationLine: 'underline'}}>
              {actionLabel}
            </YayText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

/** Marks screens whose data is simulated. Required on wallet/reward previews. */
/**
 * The "this data is not real" banner.
 *
 * Passing `module` ties the banner to whether that feature is actually being
 * served by the backend: once it is, the banner disappears on its own. This is
 * the one piece of UI that must never be stale in either direction — leaving it
 * up over live balances trains users to ignore it, and dropping it over preview
 * data is a lie about their money.
 */
export const MockNotice = ({text, module}: {text?: string; module?: DataModule}) => {
  const live = useIsLive(module);
  if (live) {
    return null;
  }
  return (
    <Banner
      tone="warning"
      icon="flask"
      text={text ?? 'Preview build — data shown here is simulated. No real balances, rewards, or transactions.'}
    />
  );
};

/** Tracks a module's live/preview state, re-rendering when the probe resolves. */
const useIsLive = (module?: DataModule): boolean => {
  const [live, setLive] = useState(() => (module ? dataMode.isLive(module) : false));
  useEffect(() => {
    if (!module) {
      setLive(false);
      return;
    }
    setLive(dataMode.isLive(module));
    return dataMode.subscribe((changed, isLive) => {
      if (changed === module) {
        setLive(isLive);
      }
    });
  }, [module]);
  return module ? live : false;
};

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
    message="Check your connection. YaysApp will pick up where you left off."
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

/**
 * Hub dashboard CTA (BTCY, EMMM, ShoperPal): the brand oval (tinted to the
 * hub's color, untinted for brand orange) with an arrow icon inside and the
 * label centered beneath — same shape language as Button.
 */
export const HubCta = ({
  label,
  onPress,
  background = colors.brand,
  color = colors.textOnBrand,
  labelColor = colors.textPrimary,
}: {
  label: string;
  onPress: () => void;
  background?: string;
  color?: string;
  /** Label color below the oval — set light when the CTA sits on a dark hero. */
  labelColor?: string;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={({pressed}) => [
      {alignSelf: 'center', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs},
      pressed && {opacity: 0.8},
    ]}>
    <Oval size={58} color={background === colors.brand ? undefined : background}>
      <Ionicons name="arrow-forward" size={24} color={color} />
    </Oval>
    <YayText variant="caption" color={labelColor} style={{fontWeight: '700', textAlign: 'center'}}>
      {label}
    </YayText>
  </Pressable>
);

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

/** YaysApp icon mark (the orange speech-bubble "y"). */
export const BrandMark = ({size = 64}: {size?: number}) => (
  <Image
    source={require('../../../assets/Yaysapp-05.png')}
    style={{width: size, height: size}}
    resizeMode="contain"
    accessibilityLabel="YaysApp"
  />
);

/** YaysApp full wordmark lockup (icon + "YAYSAPP"). Aspect ratio ~3.64:1. */
export const Wordmark = ({height = 30}: {height?: number}) => (
  <Image
    source={require('../../../assets/Yaysapp-08.png')}
    style={{height, width: height * (1607 / 441)}}
    resizeMode="contain"
    accessibilityLabel="YaysApp"
  />
);

/**
 * aiAInai brand mark (aiainai.com) — a 2x2 red/white tile wordmark used for the
 * aiainai assistant. Rendered from views so it needs no bundled asset; to use
 * the exact PNG later, drop it in assets and swap this for an <Image>.
 */
const AIAI_RED = palette.aiainaiRed;
export const AiBrandLogo = ({size = 56}: {size?: number}) => {
  const cell = size / 2;
  const fontSize = cell * 0.5;
  const tile = (bg: string, fg: string, label: string) => (
    <View style={{width: cell, height: cell, backgroundColor: bg, alignItems: 'center', justifyContent: 'center'}}>
      <Text
        allowFontScaling={false}
        style={{
          color: fg,
          fontSize,
          fontWeight: '800',
          fontStyle: 'italic',
          fontFamily: typography.titleFamily,
        }}>
        {label}
      </Text>
    </View>
  );
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.sm,
        overflow: 'hidden',
        ...shadows.card,
      }}>
      <View style={{flexDirection: 'row'}}>
        {tile('#ffffff', AIAI_RED, 'ai')}
        {tile(AIAI_RED, '#ffffff', 'ai')}
      </View>
      <View style={{flexDirection: 'row'}}>
        {tile(AIAI_RED, '#ffffff', 'N')}
        {tile('#ffffff', AIAI_RED, 'ai')}
      </View>
    </View>
  );
};

// Real product logos pulled from each brand's website, keyed by ecosystem
// product id (see services/mock/db.ts ecosystemProducts).
const BRAND_LOGOS: Record<string, number> = {
  p_btcy: require('../../../assets/brands/btcy-logo.png'),
  p_aiainai: require('../../../assets/brands/aiainai-logo.png'),
  p_shopper: require('../../../assets/brands/shoperpal-logo.png'),
  p_rehuman: require('../../../assets/brands/rehuman-logo.png'),
  p_emmm: require('../../../assets/brands/emmm-logo.png'),
  p_exchange: require('../../../assets/brands/indexx-logo.png'),
};

/**
 * A product's own brand logo, falling back to its Ionicons glyph for products
 * without a bundled asset. Logos with an opaque square background (aiainai,
 * Indexx, ReHuman) read as rounded app-icon chips; transparent marks sit
 * directly on the tile color.
 */
export const ProductBrandLogo = ({
  productId,
  icon,
  size = 38,
  iconColor = colors.textOnBrand,
}: {
  productId: string;
  icon: string;
  size?: number;
  iconColor?: string;
}) => {
  const source = BRAND_LOGOS[productId];
  if (!source) {
    // No bundled logo: white glyph inside the brand oval so it stays visible
    // on any tile background.
    return (
      <Oval size={size}>
        <Ionicons name={icon} size={size * 0.55} color={iconColor} />
      </Oval>
    );
  }
  return (
    <Image
      source={source}
      style={{width: size, height: size, borderRadius: size * 0.22}}
      resizeMode="contain"
    />
  );
};

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
  longButton: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
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
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  passwordInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  passwordToggle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
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
    right: -2,
    bottom: -1,
  },
  avatarOvalLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    alignSelf: 'flex-start',
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
