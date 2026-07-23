import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {yayTheme, yayTypography} from './theme';

type YayScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export const YayScreen: React.FC<YayScreenProps> = ({
  children,
  scroll = true,
  contentContainerStyle,
}) => {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scrollContent, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundBubbleTop} />
      <View style={styles.backgroundBubbleBottom} />
      {content}
    </SafeAreaView>
  );
};

type HeroHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  rightLabel?: string;
};

export const HeroHeader: React.FC<HeroHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  rightLabel,
}) => (
  <View style={styles.heroHeader}>
    <View style={styles.heroCopy}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
    {rightLabel ? (
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>{rightLabel}</Text>
      </View>
    ) : null}
  </View>
);

export const SectionTitle: React.FC<{title: string; meta?: string}> = ({
  title,
  meta,
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
  </View>
);

export const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({children, style}) => <View style={[styles.card, style]}>{children}</View>;

export const BrandPill: React.FC<{
  label: string;
  tone?: 'brand' | 'accent' | 'muted';
}> = ({label, tone = 'brand'}) => {
  const toneStyle =
    tone === 'accent'
      ? styles.pillAccent
      : tone === 'muted'
        ? styles.pillMuted
        : styles.pillBrand;

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
};

export const StatStrip: React.FC<{items: Array<{label: string; value: string}>}> = ({
  items,
}) => (
  <View style={styles.statStrip}>
    {items.map(item => (
      <View key={item.label} style={styles.statItem}>
        <Text style={styles.statValue}>{item.value}</Text>
        <Text style={styles.statLabel}>{item.label}</Text>
      </View>
    ))}
  </View>
);

export const AvatarChip: React.FC<{label: string; accent: string}> = ({
  label,
  accent,
}) => (
  <View style={[styles.avatarChip, {backgroundColor: accent}]}>
    <Text style={styles.avatarChipText}>{label.slice(0, 2).toUpperCase()}</Text>
  </View>
);

export const ListCard: React.FC<{
  accent: string;
  title: string;
  subtitle: string;
  meta?: string;
  badge?: string;
  onPress?: () => void;
}> = ({accent, title, subtitle, meta, badge, onPress}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={styles.listCard}>
    <AvatarChip label={title} accent={accent} />
    <View style={styles.listCopy}>
      <Text style={styles.listTitle}>{title}</Text>
      <Text style={styles.listSubtitle}>{subtitle}</Text>
    </View>
    <View style={styles.listMeta}>
      {meta ? <Text style={styles.listMetaText}>{meta}</Text> : null}
      {badge ? <BrandPill label={badge} tone="muted" /> : null}
    </View>
  </TouchableOpacity>
);

export const ActionRow: React.FC<{
  icon: string;
  title: string;
  description: string;
  onPress?: () => void;
}> = ({icon, title, description, onPress}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={styles.actionRow}>
    <View style={styles.actionIcon}>
      <Ionicons name={icon} size={20} color={yayTheme.colors.ink} />
    </View>
    <View style={styles.actionCopy}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={yayTheme.colors.inkMuted} />
  </TouchableOpacity>
);

export const bodyText: TextStyle = {
  color: yayTheme.colors.inkSoft,
  fontFamily: yayTypography.bodyFamily,
  fontSize: 15,
  lineHeight: 22,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: yayTheme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  backgroundBubbleTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 122, 69, 0.13)',
  },
  backgroundBubbleBottom: {
    position: 'absolute',
    bottom: -40,
    left: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(29, 143, 95, 0.12)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: yayTheme.colors.brand,
    fontFamily: yayTypography.titleFamily,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: yayTheme.colors.inkSoft,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  heroBadge: {
    backgroundColor: yayTheme.colors.paper,
    borderColor: yayTheme.colors.line,
    borderRadius: yayTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  heroBadgeText: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionMeta: {
    color: yayTheme.colors.inkMuted,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 13,
  },
  card: {
    backgroundColor: yayTheme.colors.card,
    borderColor: yayTheme.colors.line,
    borderRadius: yayTheme.radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 18,
    shadowColor: yayTheme.colors.shadow,
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: yayTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillBrand: {
    backgroundColor: 'rgba(29, 143, 95, 0.12)',
  },
  pillAccent: {
    backgroundColor: 'rgba(255, 122, 69, 0.14)',
  },
  pillMuted: {
    backgroundColor: yayTheme.colors.canvas,
  },
  pillText: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 11,
    fontWeight: '600',
  },
  statStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  statItem: {
    flex: 1,
    paddingRight: 8,
  },
  statValue: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: yayTheme.colors.inkMuted,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  avatarChip: {
    alignItems: 'center',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarChipText: {
    color: '#fff',
    fontFamily: yayTypography.titleFamily,
    fontSize: 15,
    fontWeight: '700',
  },
  listCard: {
    alignItems: 'center',
    backgroundColor: yayTheme.colors.card,
    borderColor: yayTheme.colors.line,
    borderRadius: yayTheme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 14,
  },
  listCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  listTitle: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  listSubtitle: {
    color: yayTheme.colors.inkSoft,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  listMeta: {
    alignItems: 'flex-end',
  },
  listMetaText: {
    color: yayTheme.colors.inkMuted,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 12,
    marginBottom: 6,
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: yayTheme.colors.card,
    borderColor: yayTheme.colors.line,
    borderRadius: yayTheme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 14,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: yayTheme.colors.canvas,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    marginRight: 12,
    width: 42,
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  actionDescription: {
    color: yayTheme.colors.inkSoft,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
});
