/**
 * Module 5 — AI assistant, AI governance, and the support desk.
 *
 * Screens: AiHome (tools, live usage + cost, provider status, privacy),
 * AiChat (assistant thread with reporting), AiHistory, and the support desk
 * (AiSupport + AiSupportThread). All data comes from `aiService`, which runs
 * against the backend when the M5 routes are deployed and against the local
 * engine otherwise — the screens do not branch on which is live.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Clipboard,
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
  SwitchRow,
  TextField,
  YayText,
} from '../../design/components';
import {MAX_FONT_SCALE, colors, radius, spacing, typography} from '../../design/tokens';
import {ApiError, aiService, errorMessage} from '../../services';
import {useAuth, useToast} from '../../state/AppProviders';
import {useAsync} from '../../state/hooks';
import type {
  AiConsent,
  AiConversation,
  AiMessage,
  SupportTicket,
} from '../../types/models';
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

/** Cost is usually sub-cent, so plain `toFixed(2)` would read as $0.00. */
export const formatCost = (usd: number): string => {
  if (!Number.isFinite(usd) || usd <= 0) {
    return '$0.00';
  }
  return usd < 0.01 ? `<$0.01` : `$${usd.toFixed(2)}`;
};

const REPORT_REASONS = [
  'Inaccurate or misleading',
  'Harmful or unsafe',
  'Offensive content',
  'Gave financial, legal, or medical advice',
  'Something else',
];

// ---------------------------------------------------------------------------
// Shared: privacy / consent controls
// ---------------------------------------------------------------------------

/**
 * The consent surface. Both content switches are off until the user turns them
 * on — AI inside chats and communities is blocked server-side until then.
 */
export const AiPrivacySheet = ({
  visible,
  onClose,
  consent,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  consent: AiConsent | null;
  onChange: (patch: Partial<AiConsent>) => void;
}) => (
  <BottomSheet visible={visible} onClose={onClose} title="AI privacy">
    <YayText variant="caption" color={colors.textMuted}>
      Nothing from your chats or communities is sent to an AI provider unless you
      turn it on here, and then only for the message or conversation you pick.
    </YayText>
    <Spacer size={spacing.sm} />
    <Card style={{paddingVertical: spacing.xxs}}>
      <SwitchRow
        label="Share chat content with AI"
        description="Allows Summarize and Translate inside a conversation."
        value={!!consent?.shareChatContent}
        onValueChange={v => onChange({shareChatContent: v})}
      />
      <Divider />
      <SwitchRow
        label="Share community content with AI"
        description="Allows summarizing a community feed or announcement."
        value={!!consent?.shareCommunityContent}
        onValueChange={v => onChange({shareCommunityContent: v})}
      />
      <Divider />
      <SwitchRow
        label="Save history"
        description="Keep past AI conversations so you can revisit them."
        value={consent?.saveHistory ?? true}
        onValueChange={v => onChange({saveHistory: v})}
      />
      <Divider />
      <SwitchRow
        label="Personalization"
        description="Let the assistant use earlier turns in the same thread."
        value={consent?.personalization ?? true}
        onValueChange={v => onChange({personalization: v})}
      />
    </Card>
  </BottomSheet>
);

// ---------------------------------------------------------------------------
// AiHome
// ---------------------------------------------------------------------------

export const AiHomeScreen = ({
  navigation,
}: NativeStackScreenProps<AiStackParamList, 'AiHome'>) => {
  const toast = useToast();
  const usage = useAsync(() => aiService.usage(), []);
  const consent = useAsync(() => aiService.consent(), []);
  const [provider, setProvider] = useState(aiService.providerStatus());
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const tools = aiService.tools();
  const prompts = aiService.suggestedPrompts();

  useEffect(() => {
    // Refreshes the tool catalogue and tells us whether a live provider is up.
    aiService.loadCatalog().then(setProvider);
  }, []);

  const patchConsent = useCallback(
    async (patch: Partial<AiConsent>) => {
      try {
        consent.setData(await aiService.updateConsent(patch));
      } catch (e) {
        toast.show(errorMessage(e), 'error');
      }
    },
    [consent, toast],
  );

  const sharingOn =
    !!consent.data?.shareChatContent || !!consent.data?.shareCommunityContent;

  return (
    <Screen refreshing={usage.refreshing} onRefresh={usage.refresh}>
      <Card style={styles.hero}>
        <AiBrandLogo size={58} />
        <YayText variant="title" style={{marginTop: spacing.sm}}>
          aiainai
        </YayText>
        <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
          {provider.live
            ? `Answers by ${provider.model}`
            : 'No AI provider connected — answers are generated offline.'}
        </YayText>
      </Card>

      {!provider.live ? (
        <>
          <Spacer size={spacing.sm} />
          <Banner
            tone="warning"
            icon="cloud-offline"
            text="AI provider unavailable. You can keep using the assistant, but answers are offline placeholders."
          />
        </>
      ) : null}

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
          {u => {
            const exhausted = u.usedRequests >= u.totalRequests;
            return (
              <View>
                <Row style={{justifyContent: 'space-between'}}>
                  <YayText variant="bodyStrong">
                    {u.usedRequests} / {u.totalRequests} requests today
                  </YayText>
                  <Badge label={u.planLabel} tone="brand" />
                </Row>
                <Spacer size={spacing.xs} />
                <ProgressBar
                  value={u.totalRequests > 0 ? u.usedRequests / u.totalRequests : 0}
                  tone={exhausted ? colors.danger : colors.brand}
                />
                <Spacer size={spacing.xs} />
                {/* Cost and tokens are surfaced so spend is observable, not just billed. */}
                <Row style={{justifyContent: 'space-between'}}>
                  <YayText variant="caption" color={colors.textMuted}>
                    {u.tokensIn + u.tokensOut} tokens · {formatCost(u.costUsd)} today
                  </YayText>
                  <YayText variant="caption" color={colors.textMuted}>
                    Resets at midnight UTC
                  </YayText>
                </Row>
                {exhausted ? (
                  <>
                    <Spacer size={spacing.xs} />
                    <Banner
                      tone="danger"
                      icon="flash-off"
                      text="Daily AI limit reached. New requests resume after the reset."
                    />
                  </>
                ) : null}
              </View>
            );
          }}
        </AsyncView>
      </Card>

      <Spacer />
      <Card onPress={() => setPrivacyOpen(true)}>
        <Row gap={spacing.sm}>
          <Ionicons
            name={sharingOn ? 'lock-open-outline' : 'lock-closed-outline'}
            size={20}
            color={sharingOn ? colors.brand : colors.textMuted}
          />
          <View style={{flex: 1}}>
            <YayText variant="bodyStrong">AI privacy</YayText>
            <YayText variant="caption" color={colors.textMuted}>
              {sharingOn
                ? 'Chat or community content may be shared when you ask for it.'
                : 'Your chats and communities are never sent to AI.'}
            </YayText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Row>
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
              if (tool.id === 'support') {
                navigation.navigate('AiSupport');
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
          title="Support desk"
          subtitle="AI first, a human agent if you need one"
          icon="help-buoy-outline"
          onPress={() => navigation.navigate('AiSupport')}
        />
      </Card>

      <AiPrivacySheet
        visible={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        consent={consent.data}
        onChange={patchConsent}
      />
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
  const {session} = useAuth();
  const [convo, setConvo] = useState<AiConversation | null>(null);
  const [loading, setLoading] = useState(!!conversationId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState(initialPrompt ?? '');
  const [sending, setSending] = useState(false);
  const [failedText, setFailedText] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [feedbackById, setFeedbackById] = useState<Record<string, 'up' | 'down' | undefined>>({});
  const [reportTarget, setReportTarget] = useState<AiMessage | null>(null);
  const listRef = useRef<FlatList<AiMessage>>(null);
  const composerRef = useRef<TextInput>(null);

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
      setRateLimited(false);
      try {
        let current = convo;
        if (!current) {
          current = await aiService.start(activeToolId, trimmed);
          setConvo(current);
        }
        const updated = await aiService.send(current.id, trimmed, activeToolId, session?.user.name);
        setConvo({...updated, messages: [...updated.messages]});
        setDraft('');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'rate_limited') {
          setRateLimited(true);
        } else if (e instanceof ApiError && e.code === 'validation') {
          // Safety blocks and over-long prompts land here — show the reason.
          toast.show(e.message, 'error');
        } else {
          setFailedText(trimmed);
        }
      } finally {
        setSending(false);
      }
    },
    [convo, activeToolId, sending, session?.user.name, toast],
  );

  const messages = convo?.messages ?? [];

  const copyMessage = useCallback(
    (text: string, label = 'Copied') => {
      Clipboard.setString(text);
      toast.show(label, 'success');
    },
    [toast],
  );

  const editPrompt = useCallback(
    (text: string) => {
      setDraft(text);
      requestAnimationFrame(() => composerRef.current?.focus());
      toast.show('Prompt ready to edit', 'info');
    },
    [toast],
  );

  const recordFeedback = useCallback(
    (messageId: string, value: 'up' | 'down') => {
      setFeedbackById(prev => ({
        ...prev,
        [messageId]: prev[messageId] === value ? undefined : value,
      }));
      toast.show('Thanks for the feedback', 'success');
    },
    [toast],
  );

  const submitReport = useCallback(
    async (reason: string) => {
      const target = reportTarget;
      setReportTarget(null);
      if (!target) {
        return;
      }
      try {
        await aiService.reportAnswer({
          reason,
          excerpt: target.text,
          conversationId: convo?.id,
          messageId: target.id,
        });
        toast.show('Report sent for review.', 'success');
      } catch (e) {
        toast.show(errorMessage(e), 'error');
      }
    },
    [reportTarget, convo?.id, toast],
  );

  const renderMessage = ({item}: {item: AiMessage}) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userMessageWrap}>
            <View style={[styles.bubble, styles.bubbleMine]}>
              <YayText color={colors.textOnBrand}>{item.text}</YayText>
            </View>
            <Row gap={0} style={styles.userActionRow}>
              <IconButton
                icon="copy-outline"
                size={16}
                color={colors.textMuted}
                label="Copy prompt"
                onPress={() => copyMessage(item.text, 'Prompt copied')}
              />
              <IconButton
                icon="create-outline"
                size={16}
                color={colors.textMuted}
                label="Edit prompt"
                onPress={() => editPrompt(item.text)}
              />
            </Row>
          </View>
        </View>
      );
    }
    const feedback = feedbackById[item.id];
    return (
      <View style={styles.assistantRow}>
        <Oval size={26} style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={14} color={colors.textOnBrand} />
        </Oval>
        <View style={{flex: 1}}>
          <View style={[styles.bubble, styles.bubbleTheirs]}>
            <YayText>{item.text}</YayText>
          </View>
          {item.degraded ? (
            <YayText variant="caption" color={colors.warning} style={{marginTop: 2}}>
              Offline answer — no AI provider was reachable.
            </YayText>
          ) : null}
          <Row gap={0} style={{marginTop: 2}}>
            <IconButton
              icon="copy-outline"
              size={16}
              color={colors.textMuted}
              label="Copy answer"
              onPress={() => copyMessage(item.text)}
            />
            <IconButton
              icon={feedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
              size={16}
              color={feedback === 'up' ? colors.brand : colors.textMuted}
              label="Good answer"
              onPress={() => recordFeedback(item.id, 'up')}
            />
            <IconButton
              icon={feedback === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
              size={16}
              color={feedback === 'down' ? colors.danger : colors.textMuted}
              label="Bad answer"
              onPress={() => recordFeedback(item.id, 'down')}
            />
            <IconButton
              icon="flag-outline"
              size={16}
              color={colors.textMuted}
              label="Report answer"
              onPress={() => setReportTarget(item)}
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
            <Banner
              tone="danger"
              icon="flash-off"
              text="Daily AI limit reached. Your quota resets at midnight UTC."
            />
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
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            ref={composerRef}
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

      <BottomSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        title="Report this answer">
        <YayText variant="caption" color={colors.textMuted}>
          Reported answers go to a human reviewer with the text of the reply.
        </YayText>
        <Spacer size={spacing.sm} />
        {REPORT_REASONS.map(reason => (
          <Button
            key={reason}
            label={reason}
            kind="secondary"
            style={{marginTop: spacing.xs}}
            onPress={() => submitReport(reason)}
          />
        ))}
      </BottomSheet>
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
                    {timeAgo(item.updatedAt)} · {formatCost(item.costUsd ?? 0)}
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
// Support desk
// ---------------------------------------------------------------------------

const TICKET_TONE: Record<SupportTicket['status'], {label: string; tone: 'brand' | 'neutral' | 'warning' | 'success'}> = {
  ai_handling: {label: 'AI handling', tone: 'brand'},
  awaiting_user: {label: 'Awaiting you', tone: 'neutral'},
  escalated: {label: 'With an agent', tone: 'warning'},
  resolved: {label: 'Resolved', tone: 'success'},
};

export const AiSupportScreen = ({
  navigation,
}: NativeStackScreenProps<AiStackParamList, 'AiSupport'>) => {
  const toast = useToast();
  const tickets = useAsync(() => aiService.tickets(), []);
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [detail, setDetail] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => navigation.addListener('focus', () => tickets.refresh()), [navigation, tickets]);

  const createTicket = useCallback(async () => {
    const text = detail.trim();
    if (!text) {
      toast.show('Describe the problem first.', 'error');
      return;
    }
    setCreating(true);
    try {
      const ticket = await aiService.createTicket({subject: subject.trim() || text, text});
      setComposeOpen(false);
      setSubject('');
      setDetail('');
      tickets.refresh();
      navigation.navigate('AiSupportThread', {ticketId: ticket.id});
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setCreating(false);
    }
  }, [detail, subject, tickets, navigation, toast]);

  return (
    <Screen scroll={false}>
      <Banner
        tone="info"
        icon="help-buoy"
        text="AI answers first. If it cannot help, escalate and a human agent picks it up with the full transcript."
      />
      <Spacer size={spacing.sm} />
      <Button label="New support request" icon="add" onPress={() => setComposeOpen(true)} />
      <Spacer size={spacing.sm} />
      <AsyncView
        loading={tickets.loading}
        error={tickets.error}
        offline={tickets.offline}
        onRetry={tickets.reload}
        data={tickets.data}
        isEmpty={(tickets.data ?? []).length === 0}
        emptyTitle="No support requests"
        emptyMessage="Open one and the AI first line will try to resolve it straight away."
        emptyAction={{label: 'New request', onPress: () => setComposeOpen(true)}}>
        {items => (
          <FlatList
            data={items}
            keyExtractor={t => t.id}
            ItemSeparatorComponent={Divider}
            renderItem={({item}) => {
              const status = TICKET_TONE[item.status];
              return (
                <Pressable
                  onPress={() => navigation.navigate('AiSupportThread', {ticketId: item.id})}
                  style={({pressed}) => [
                    styles.historyRow,
                    pressed && {backgroundColor: colors.surfaceSunken},
                  ]}>
                  <View style={{flex: 1, gap: spacing.xxs}}>
                    <Row gap={spacing.xs}>
                      <Badge label={status.label} tone={status.tone} />
                      <YayText variant="caption" color={colors.textMuted}>
                        {item.product}
                      </YayText>
                    </Row>
                    <YayText variant="bodyStrong" numberOfLines={1}>
                      {item.subject}
                    </YayText>
                    <YayText variant="caption" color={colors.textMuted}>
                      {timeAgo(item.updatedAt)}
                    </YayText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Pressable>
              );
            }}
          />
        )}
      </AsyncView>

      <BottomSheet
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="New support request">
        <TextField
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          placeholder="Short summary (optional)"
        />
        <TextField
          label="What is happening?"
          value={detail}
          onChangeText={setDetail}
          placeholder="Describe the problem and what you already tried."
          multiline
        />
        <Button
          label={creating ? 'Sending…' : 'Send to AI support'}
          icon="paper-plane"
          loading={creating}
          style={{marginTop: spacing.sm}}
          onPress={createTicket}
        />
      </BottomSheet>
    </Screen>
  );
};

export const AiSupportThreadScreen = ({
  route,
  navigation,
}: NativeStackScreenProps<AiStackParamList, 'AiSupportThread'>) => {
  const {ticketId} = route.params;
  const toast = useToast();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const listRef = useRef<FlatList<SupportTicket['messages'][number]>>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    aiService
      .tickets()
      .then(all => {
        const found = all.find(t => t.id === ticketId) ?? null;
        setTicket(found);
        if (!found) {
          setLoadError('This support request is no longer available.');
        }
      })
      .catch(e => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [ticketId]);

  useEffect(load, [load]);

  useEffect(() => {
    navigation.setOptions({title: ticket?.subject ?? 'Support'});
  }, [navigation, ticket?.subject]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) {
      return;
    }
    setSending(true);
    try {
      setTicket(await aiService.replyToTicket(ticketId, text));
      setDraft('');
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setSending(false);
    }
  }, [draft, sending, ticketId, toast]);

  const escalate = useCallback(async () => {
    try {
      setTicket(await aiService.escalateTicket(ticketId, 'Requested by the user'));
      toast.show('Escalated to a human agent.', 'success');
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }, [ticketId, toast]);

  const escalated = ticket?.status === 'escalated';

  return (
    <Screen scroll={false} padded={false}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={{paddingHorizontal: spacing.md, paddingTop: spacing.sm}}>
          <Banner
            tone={escalated ? 'warning' : 'info'}
            icon={escalated ? 'person' : 'sparkles'}
            text={
              escalated
                ? 'A human agent owns this request. Your replies are queued for them.'
                : 'Answered by AI. Escalate any time to reach a human agent.'
            }
          />
        </View>
        {loading ? (
          <View style={{padding: spacing.md, gap: spacing.sm}}>
            <Skeleton height={44} width="70%" />
            <Skeleton height={44} width="80%" style={{alignSelf: 'flex-end'}} />
          </View>
        ) : loadError ? (
          <View style={{padding: spacing.md}}>
            <Banner tone="danger" text={loadError} />
            <Button label="Try again" kind="secondary" onPress={load} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={ticket?.messages ?? []}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.thread}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({animated: true})}
            renderItem={({item}) =>
              item.author === 'user' ? (
                <View style={styles.userRow}>
                  <View style={[styles.bubble, styles.bubbleMine]}>
                    <YayText color={colors.textOnBrand}>{item.text}</YayText>
                  </View>
                </View>
              ) : (
                <View style={styles.assistantRow}>
                  <Oval size={26} style={styles.aiAvatar}>
                    <Ionicons
                      name={item.author === 'agent' ? 'person' : 'sparkles'}
                      size={14}
                      color={colors.textOnBrand}
                    />
                  </Oval>
                  <View style={{flex: 1}}>
                    <YayText variant="caption" color={colors.textMuted}>
                      {item.author === 'agent' ? 'Support agent' : 'AI support'}
                    </YayText>
                    <View style={[styles.bubble, styles.bubbleTheirs]}>
                      <YayText>{item.text}</YayText>
                    </View>
                  </View>
                </View>
              )
            }
            ListFooterComponent={
              ticket && !escalated ? (
                <Button
                  label="Escalate to a human agent"
                  kind="secondary"
                  icon="person-add-outline"
                  style={{marginTop: spacing.md}}
                  onPress={() => setConfirmEscalate(true)}
                />
              ) : null
            }
          />
        )}
        <View style={styles.composer}>
          <TextInput
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            value={draft}
            onChangeText={setDraft}
            placeholder={escalated ? 'Message the agent…' : 'Reply to AI support…'}
            placeholderTextColor={colors.textFaint}
            multiline
            style={styles.composerInput}
            accessibilityLabel="Message support"
          />
          <IconButton
            icon="arrow-up-circle"
            size={32}
            color={draft.trim() && !sending ? colors.brand : colors.textFaint}
            label="Send"
            onPress={send}
          />
        </View>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={confirmEscalate}
        onClose={() => setConfirmEscalate(false)}
        title="Escalate to a human?"
        message="Your full conversation with AI support is shared with the agent so you do not have to repeat yourself."
        confirmLabel="Escalate"
        onConfirm={escalate}
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
  userMessageWrap: {
    alignItems: 'flex-end',
    maxWidth: '100%',
  },
  userActionRow: {
    marginTop: 2,
    justifyContent: 'flex-end',
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
