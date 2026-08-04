/**
 * aiainai screens: AiHome (tool hub + usage), AiChat (assistant thread), and
 * AiHistory (past sessions). All data comes from the mock aiService.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AiBrandLogo,
  AsyncView,
  Badge,
  Banner,
  Oval,
  Button,
  BottomSheet,
  Card,
  ConfirmSheet,
  Divider,
  EmptyState,
  IconButton,
  ListRow,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  SegmentedTabs,
  Skeleton,
  Spacer,
  YayText,
} from '../../design/components';
import {colors, radius, shadows, spacing, typography} from '../../design/tokens';
import {ApiError, aiService, errorMessage} from '../../services';
import {useToast} from '../../state/AppProviders';
import {useAsync} from '../../state/hooks';
import type {AiConversation, AiMessage} from '../../types/models';
import type {AiStackParamList} from '../../types/navigation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) {
    return 'Just now';
  }
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }
  return new Date(iso).toLocaleDateString();
};

const toolTitle = (toolId: string): string =>
  aiService.tools().find(t => t.id === toolId)?.title ?? toolId;

// ---------------------------------------------------------------------------
// AiHome
// ---------------------------------------------------------------------------

export const AiHomeScreen = ({
  navigation,
}: NativeStackScreenProps<AiStackParamList, 'AiHome'>) => {
  const toast = useToast();
  const usage = useAsync(() => aiService.usage(), []);
  const tools = aiService.tools();
  const prompts = aiService.suggestedPrompts();

  return (
    <Screen refreshing={usage.refreshing} onRefresh={usage.refresh}>
      <Card style={styles.hero}>
        <AiBrandLogo size={58} />
        <YayText variant="title" style={{marginTop: spacing.sm}}>
          aiainai
        </YayText>
        <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
          Powered by aiainai.com — answers are simulated in this preview.
        </YayText>
      </Card>

      <Spacer />
      <Card>
        <AsyncView
          loading={usage.loading}
          error={usage.error}
          offline={usage.offline}
          onRetry={usage.reload}
          data={usage.data}
          skeleton={
            <View style={{gap: spacing.xs}}>
              <Skeleton height={14} width="45%" />
              <Skeleton height={8} />
            </View>
          }>
          {u => (
            <View>
              <Row style={{justifyContent: 'space-between'}}>
                <YayText variant="bodyStrong">
                  {u.usedCredits} / {u.totalCredits} credits used
                </YayText>
                <Badge label={u.plan} tone="brand" />
              </Row>
              <Spacer size={spacing.xs} />
              <ProgressBar
                value={u.totalCredits > 0 ? u.usedCredits / u.totalCredits : 0}
                tone={u.usedCredits >= u.totalCredits ? colors.danger : colors.brand}
              />
              <Spacer size={spacing.xs} />
              <YayText variant="caption" color={colors.textMuted}>
                Preview plan — credits reset daily
              </YayText>
            </View>
          )}
        </AsyncView>
      </Card>

      <SectionHeader title="Tools" />
      <View style={styles.grid}>
        {tools.map(tool => (
          <Card
            key={tool.id}
            style={styles.gridCard}
            onPress={() => {
              if (tool.comingSoon) {
                toast.show(`${tool.title} is coming soon.`, 'info');
                return;
              }
              navigation.navigate('AiChat', {toolId: tool.id});
            }}>
            <View style={styles.toolIcon}>
              <Ionicons name={tool.icon} size={20} color={colors.brand} />
            </View>
            <YayText variant="bodyStrong" style={{marginTop: spacing.xs}} numberOfLines={1}>
              {tool.title}
            </YayText>
            {tool.comingSoon ? (
              <View style={{marginTop: spacing.xxs}}>
                <Badge label="Coming soon" tone="neutral" />
              </View>
            ) : null}
          </Card>
        ))}
      </View>

      <SectionHeader title="Suggested prompts" />
      <View style={{gap: spacing.sm}}>
        {prompts.map(prompt => (
          <Card key={prompt} onPress={() => navigation.navigate('AiChat', {initialPrompt: prompt})}>
            <Row gap={spacing.xs}>
              <Ionicons name="bulb-outline" size={16} color={colors.accent} />
              <YayText variant="caption" color={colors.textSecondary} style={{flex: 1}}>
                {prompt}
              </YayText>
            </Row>
          </Card>
        ))}
      </View>

      <Spacer />
      <Card style={{paddingVertical: spacing.xxs}}>
        <ListRow
          title="History"
          subtitle="Pick up a previous session"
          icon="time-outline"
          onPress={() => navigation.navigate('AiHistory')}
        />
        <Divider />
        <ListRow
          title="Saved"
          subtitle="Answers you bookmarked"
          icon="bookmark-outline"
          onPress={() => navigation.navigate('AiHistory')}
        />
      </Card>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// AiChat
// ---------------------------------------------------------------------------

const ThinkingBubble = () => {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 1, duration: 450, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 0.3, duration: 450, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.assistantRow}>
      <AiBrandLogo size={26} />

      <View style={[styles.bubble, styles.bubbleTheirs]}>
        <Row gap={5}>
          {[0, 1, 2].map(i => (
            <Animated.View key={i} style={[styles.dot, {opacity: pulse}]} />
          ))}
        </Row>
      </View>
    </View>
  );
};

export const AiChatScreen = ({
  route,
  navigation,
}: NativeStackScreenProps<AiStackParamList, 'AiChat'>) => {
  const {conversationId, toolId, initialPrompt} = route.params ?? {};
  const toast = useToast();
  const [convo, setConvo] = useState<AiConversation | null>(null);
  const [loading, setLoading] = useState(!!conversationId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState(initialPrompt ?? '');
  const [sending, setSending] = useState(false);
  const [failedText, setFailedText] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const listRef = useRef<FlatList<AiMessage>>(null);

  const activeToolId = convo?.tool ?? toolId ?? 'ask';
  const tool = aiService.tools().find(t => t.id === activeToolId);
  const showDisclaimer = !!tool?.disclaimer;

  const loadConversation = useCallback(() => {
    if (!conversationId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    aiService
      .get(conversationId)
      .then(setConvo)
      .catch(e => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(loadConversation, [loadConversation]);

  useEffect(() => {
    navigation.setOptions({
      title: tool?.title ?? 'aiainai',
      headerRight: () =>
        convo ? (
          <IconButton
            icon={convo.saved ? 'bookmark' : 'bookmark-outline'}
            color={convo.saved ? colors.brand : colors.textSecondary}
            label="Save conversation"
            onPress={async () => {
              const next = !convo.saved;
              await aiService.setSaved(convo.id, next);
              setConvo({...convo, saved: next});
              toast.show(next ? 'Saved to your library.' : 'Removed from saved.', 'success');
            }}
          />
        ) : null,
    });
  }, [navigation, convo, tool, toast]);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) {
        return;
      }
      setSending(true);
      setFailedText(null);
      try {
        let current = convo;
        if (!current) {
          current = await aiService.start(activeToolId, trimmed);
          setConvo(current);
        }
        const updated = await aiService.send(current.id, trimmed, activeToolId);
        setConvo({...updated, messages: [...updated.messages]});
        setDraft('');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'rate_limited') {
          setRateLimited(true);
        } else {
          setFailedText(trimmed);
        }
      } finally {
        setSending(false);
      }
    },
    [convo, activeToolId, sending],
  );

  const messages = convo?.messages ?? [];

  const renderMessage = ({item}: {item: AiMessage}) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={[styles.bubble, styles.bubbleMine]}>
            <YayText color={colors.textOnBrand}>{item.text}</YayText>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.assistantRow}>
        <Oval size={26} style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={14} color={colors.textOnBrand} />
        </Oval>
        <View style={{flex: 1}}>
          <View style={[styles.bubble, styles.bubbleTheirs]}>
            <YayText>{item.text}</YayText>
          </View>
          <Row gap={0} style={{marginTop: 2}}>
            <IconButton
              icon="copy-outline"
              size={16}
              color={colors.textMuted}
              label="Copy answer"
              onPress={() => toast.show('Copied', 'success')}
            />
            <IconButton
              icon="thumbs-up-outline"
              size={16}
              color={colors.textMuted}
              label="Good answer"
              onPress={() => toast.show('Thanks for the feedback', 'success')}
            />
            <IconButton
              icon="thumbs-down-outline"
              size={16}
              color={colors.textMuted}
              label="Bad answer"
              onPress={() => toast.show('Thanks for the feedback', 'success')}
            />
          </Row>
        </View>
      </View>
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={{paddingHorizontal: spacing.md, paddingTop: spacing.sm}}>
          {showDisclaimer ? (
            <Banner
              tone="warning"
              text="General information only — never financial, legal, or medical advice."
            />
          ) : null}
          {rateLimited ? (
            <Banner tone="danger" icon="flash-off" text="You have used all preview credits" />
          ) : null}
        </View>
        {loading ? (
          <View style={{padding: spacing.md, gap: spacing.sm}}>
            <Skeleton height={44} width="70%" />
            <Skeleton height={44} width="80%" style={{alignSelf: 'flex-end'}} />
            <Skeleton height={44} width="60%" />
          </View>
        ) : loadError ? (
          <View style={{padding: spacing.md}}>
            <Banner tone="danger" text={loadError} />
            <Button label="Try again" kind="secondary" onPress={loadConversation} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.thread}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({animated: true})}
            ListEmptyComponent={
              sending ? null : (
                <EmptyState
                  icon="sparkles-outline"
                  title={tool?.title ?? 'aiainai'}
                  message={tool?.prompt ?? 'Ask me anything to get started.'}
                />
              )
            }
            ListFooterComponent={
              <View>
                {sending ? <ThinkingBubble /> : null}
                {failedText ? (
                  <View style={styles.assistantRow}>
                    <View style={[styles.aiAvatar, {backgroundColor: colors.danger}]}>
                      <Ionicons name="alert" size={14} color={colors.textOnBrand} />
                    </View>
                    <View style={[styles.bubble, styles.bubbleError]}>
                      <YayText variant="caption" color={colors.danger}>
                        aiainai could not answer that right now.
                      </YayText>
                      <Button
                        label="Retry"
                        kind="danger"
                        icon="refresh"
                        style={{marginTop: spacing.xs, minHeight: 38}}
                        onPress={() => sendText(failedText)}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            }
          />
        )}
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask aiainai anything…"
            placeholderTextColor={colors.textFaint}
            multiline
            style={styles.composerInput}
            accessibilityLabel="Message aiainai"
          />
          <IconButton
            icon="arrow-up-circle"
            size={32}
            color={draft.trim() && !sending ? colors.brand : colors.textFaint}
            label="Send"
            onPress={() => sendText(draft)}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// AiHistory
// ---------------------------------------------------------------------------

export const AiHistoryScreen = ({
  navigation,
}: NativeStackScreenProps<AiStackParamList, 'AiHistory'>) => {
  const toast = useToast();
  const [tab, setTab] = useState('All');
  const [selected, setSelected] = useState<AiConversation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const history = useAsync(() => aiService.history(), []);

  useEffect(() => navigation.addListener('focus', () => history.refresh()), [navigation, history]);

  const visible = useMemo(() => {
    const list = history.data ?? [];
    return tab === 'Saved' ? list.filter(c => c.saved) : list;
  }, [history.data, tab]);

  return (
    <Screen scroll={false}>
      <SegmentedTabs tabs={['All', 'Saved']} active={tab} onChange={setTab} />
      <Spacer size={spacing.sm} />
      <AsyncView
        loading={history.loading}
        error={history.error}
        offline={history.offline}
        onRetry={history.reload}
        data={history.data}
        isEmpty={visible.length === 0}
        emptyTitle={tab === 'Saved' ? 'Nothing saved yet' : 'No AI sessions yet'}
        emptyMessage={
          tab === 'Saved'
            ? 'Bookmark a conversation from its header to keep it here.'
            : 'Start a chat with any aiainai tool and it will show up here.'
        }
        emptyAction={{label: 'Ask aiainai', onPress: () => navigation.navigate('AiChat', {})}}>
        {() => (
          <FlatList
            data={visible}
            keyExtractor={c => c.id}
            ItemSeparatorComponent={Divider}
            renderItem={({item}) => (
              <Pressable
                onPress={() => navigation.navigate('AiChat', {conversationId: item.id})}
                onLongPress={() => setSelected(item)}
                style={({pressed}) => [
                  styles.historyRow,
                  pressed && {backgroundColor: colors.surfaceSunken},
                ]}>
                <View style={{flex: 1, gap: spacing.xxs}}>
                  <Row gap={spacing.xs}>
                    <Badge label={toolTitle(item.tool)} tone="brand" />
                    {item.saved ? <Ionicons name="bookmark" size={13} color={colors.brand} /> : null}
                  </Row>
                  <YayText variant="bodyStrong" numberOfLines={1}>
                    {item.title}
                  </YayText>
                  <YayText variant="caption" color={colors.textMuted}>
                    {timeAgo(item.updatedAt)}
                  </YayText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            )}
          />
        )}
      </AsyncView>

      <BottomSheet
        visible={!!selected && !confirmDelete}
        onClose={() => setSelected(null)}
        title={selected?.title}>
        <Button
          label={selected?.saved ? 'Unsave' : 'Save'}
          kind="secondary"
          icon={selected?.saved ? 'bookmark' : 'bookmark-outline'}
          onPress={async () => {
            if (!selected) {
              return;
            }
            await aiService.setSaved(selected.id, !selected.saved);
            toast.show(selected.saved ? 'Removed from saved.' : 'Saved to your library.', 'success');
            setSelected(null);
            history.refresh();
          }}
        />
        <Button
          label="Delete"
          kind="danger"
          icon="trash-outline"
          style={{marginTop: spacing.xs}}
          onPress={() => setConfirmDelete(true)}
        />
      </BottomSheet>

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
          setSelected(null);
        }}
        title="Delete this conversation?"
        message="This removes the session and its answers from your history."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (selected) {
            await aiService.remove(selected.id);
            toast.show('Conversation deleted.', 'success');
          }
          setSelected(null);
          history.refresh();
        }}
      />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xxs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  gridCard: {
    width: '48.5%',
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thread: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingLeft: spacing.xxl,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingRight: spacing.xl,
  },
  aiAvatar: {
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '100%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bubbleMine: {
    backgroundColor: colors.bubbleMine,
    borderBottomRightRadius: radius.xs / 2,
  },
  bubbleTheirs: {
    backgroundColor: colors.bubbleTheirs,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderBottomLeftRadius: radius.xs / 2,
    alignSelf: 'flex-start',
  },
  bubbleError: {
    backgroundColor: colors.dangerSoft,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  composerInput: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    fontFamily: typography.bodyFamily,
    color: colors.textPrimary,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    borderRadius: radius.sm,
  },
});
