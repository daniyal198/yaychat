/**
 * Full-catalog emoji picker sheet.
 *
 * Renders every Unicode emoji (via unicode-emoji-json) in a categorised,
 * searchable grid. Used for message reactions ("+" in the reaction row)
 * and for inserting emoji into the composer.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, Modal, Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import emojiGroups from 'unicode-emoji-json/data-by-group.json';
import {Row, SearchBar, YayText} from './components';
import {colors, radius, spacing} from './tokens';

type EmojiEntry = {emoji: string; name: string; slug: string};
type EmojiGroup = {slug: string; name: string; emojis: EmojiEntry[]};

const GROUPS = emojiGroups as EmojiGroup[];

const GROUP_ICON: Record<string, string> = {
  smileys_emotion: 'happy-outline',
  people_body: 'hand-left-outline',
  animals_nature: 'leaf-outline',
  food_drink: 'pizza-outline',
  travel_places: 'airplane-outline',
  activities: 'football-outline',
  objects: 'bulb-outline',
  symbols: 'shapes-outline',
  flags: 'flag-outline',
};

const COLUMNS = 8;
const CELL_HEIGHT = 44;

const chunk = (items: EmojiEntry[]): EmojiEntry[][] => {
  const rows: EmojiEntry[][] = [];
  for (let i = 0; i < items.length; i += COLUMNS) {
    rows.push(items.slice(i, i + COLUMNS));
  }
  return rows;
};

export const EmojiPicker = ({
  visible,
  onClose,
  onSelect,
  title = 'Emoji',
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  title?: string;
}) => {
  const [query, setQuery] = useState('');
  const [groupSlug, setGroupSlug] = useState(GROUPS[0].slug);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setGroupSlug(GROUPS[0].slug);
    }
  }, [visible]);

  const q = query.trim().toLowerCase();
  const activeGroup = GROUPS.find(g => g.slug === groupSlug) ?? GROUPS[0];

  const rows = useMemo(() => {
    if (q) {
      const matches = GROUPS.flatMap(g => g.emojis).filter(
        e => e.name.toLowerCase().includes(q) || e.slug.includes(q.replace(/\s+/g, '_')),
      );
      return chunk(matches);
    }
    return chunk(activeGroup.emojis);
  }, [q, activeGroup]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close emoji picker" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <YayText variant="heading" style={{marginBottom: spacing.sm}}>
          {title}
        </YayText>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search emoji" />
        {!q ? (
          <Row style={styles.tabs}>
            {GROUPS.map(g => (
              <Pressable
                key={g.slug}
                onPress={() => setGroupSlug(g.slug)}
                hitSlop={4}
                accessibilityRole="tab"
                accessibilityLabel={g.name}
                style={[styles.tab, g.slug === groupSlug && styles.tabActive]}>
                <Ionicons
                  name={GROUP_ICON[g.slug] ?? 'ellipse-outline'}
                  size={19}
                  color={g.slug === groupSlug ? colors.brand : colors.textMuted}
                />
              </Pressable>
            ))}
          </Row>
        ) : (
          <View style={styles.tabs} />
        )}
        <YayText variant="micro" color={colors.textMuted} style={{marginBottom: spacing.xxs}}>
          {q ? `Results for “${query.trim()}”` : activeGroup.name}
        </YayText>
        <FlatList
          data={rows}
          keyExtractor={(row, i) => row[0]?.slug ?? String(i)}
          keyboardShouldPersistTaps="handled"
          getItemLayout={(_, index) => ({length: CELL_HEIGHT, offset: CELL_HEIGHT * index, index})}
          ListEmptyComponent={
            <YayText color={colors.textMuted} style={{textAlign: 'center', marginTop: spacing.lg}}>
              No emoji found
            </YayText>
          }
          renderItem={({item: row}) => (
            <View style={styles.gridRow}>
              {row.map(e => (
                <Pressable
                  key={e.slug}
                  onPress={() => onSelect(e.emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={e.name}
                  style={({pressed}) => [styles.cell, pressed && styles.cellPressed]}>
                  <YayText style={styles.emoji}>{e.emoji}</YayText>
                </Pressable>
              ))}
              {row.length < COLUMNS
                ? Array.from({length: COLUMNS - row.length}).map((_, i) => (
                    <View key={`pad_${i}`} style={styles.cell} />
                  ))
                : null}
            </View>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    height: '72%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  tabs: {
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    minHeight: 34,
  },
  tab: {
    padding: spacing.xxs,
    borderRadius: radius.md,
  },
  tabActive: {
    backgroundColor: colors.brandSoft,
  },
  gridRow: {
    flexDirection: 'row',
    height: CELL_HEIGHT,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  cellPressed: {
    backgroundColor: colors.brandSoft,
  },
  emoji: {
    fontSize: 27,
    lineHeight: 36,
  },
});
