/**
 * Yay-chat Chats stack — the flagship area of the app.
 *
 * ChatList, ChatSearch, ArchivedChats, NewChat, Conversation,
 * ConversationDetails, GroupMembers, SharedMedia, ForwardMessage and
 * ContactProfile screens. All data flows through chatService / userService.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  ConfirmSheet,
  CountBubble,
  Divider,
  EmptyState,
  IconButton,
  ListRow,
  ListSkeleton,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  SegmentedTabs,
  Spacer,
  StateView,
  SwitchRow,
  CheckRow,
  TextField,
  YayText,
} from '../../design/components';
import {colors, radius, shadows, spacing, typography} from '../../design/tokens';
import {ME_ID, chatService, userService} from '../../services';
import {useAction, useAsync} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import {Conversation, Message, User} from '../../types/models';
import {ChatsStackParamList} from '../../types/navigation';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) {
    return 'now';
  }
  if (mins < 60) {
    return `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }
  return new Date(iso).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
};

const clockTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
};

const presenceLabel = (u: User): string =>
  u.online ? 'online' : `last seen ${timeAgo(u.lastSeen)} ago`;

const kindPrefix = (m: Message): string => {
  switch (m.kind) {
    case 'file':
      return '📎 ';
    case 'voice':
      return '🎤 ';
    case 'image':
      return '🖼️ ';
    case 'video':
      return '🎬 ';
    default:
      return '';
  }
};

const previewText = (c: Conversation): string => {
  const m = c.lastMessage;
  if (!m) {
    return 'No messages yet';
  }
  if (m.recalled) {
    return 'Message recalled';
  }
  const you = m.senderId === ME_ID && m.kind !== 'system' ? 'You: ' : '';
  return `${you}${kindPrefix(m)}${m.text}`;
};

const otherMemberId = (c: Conversation): string | undefined =>
  c.memberIds.find(id => id !== ME_ID);

const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const CANNED_REPLIES = [
  'Sounds good to me! 👍',
  'Haha, nice one.',
  'Let me check and get back to you.',
  'Totally agree.',
  'On it! Give me a few minutes.',
];

// ---------------------------------------------------------------------------
// ChatListScreen
// ---------------------------------------------------------------------------

type ChatFilter = 'All' | 'Unread' | 'Groups';
const FILTER_MAP: Record<ChatFilter, 'all' | 'unread' | 'groups'> = {
  All: 'all',
  Unread: 'unread',
  Groups: 'groups',
};

const ConversationRow = ({
  conversation,
  onPress,
  onLongPress,
}: {
  conversation: Conversation;
  onPress: () => void;
  onLongPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    style={({pressed}) => [styles.convoRow, pressed && {backgroundColor: colors.surfaceSunken}]}>
    <Avatar name={conversation.title} size={48} />
    <View style={{flex: 1}}>
      <Row gap={spacing.xxs}>
        <YayText variant="bodyStrong" numberOfLines={1} style={{flexShrink: 1}}>
          {conversation.title}
        </YayText>
        {conversation.muted ? (
          <Ionicons name="volume-mute" size={14} color={colors.textFaint} />
        ) : null}
        {conversation.pinned ? (
          <Ionicons name="pin" size={13} color={colors.accent} />
        ) : null}
        <View style={{flex: 1}} />
        <YayText variant="micro" color={colors.textMuted}>
          {conversation.lastMessage ? timeAgo(conversation.lastMessage.createdAt) : ''}
        </YayText>
      </Row>
      <Row gap={spacing.xs} style={{marginTop: 2}}>
        <YayText variant="caption" color={colors.textMuted} numberOfLines={1} style={{flex: 1}}>
          {previewText(conversation)}
        </YayText>
        <CountBubble count={conversation.unreadCount} />
      </Row>
    </View>
  </Pressable>
);

export const ChatListScreen = ({
  navigation,
}: NativeStackScreenProps<ChatsStackParamList, 'ChatList'>) => {
  const toast = useToast();
  const {perform} = useAction();
  const [filter, setFilter] = useState<ChatFilter>('All');
  const [sheetConvo, setSheetConvo] = useState<Conversation | null>(null);
  const {data, loading, refreshing, error, offline, reload, refresh} = useAsync(
    () => chatService.listConversations(FILTER_MAP[filter]),
    [filter],
  );

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => refresh());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const runRowAction = async (fn: () => Promise<unknown>, message: string) => {
    setSheetConvo(null);
    await perform(fn, m => toast.show(m, 'error'));
    toast.show(message, 'success');
    refresh();
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={{paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm}}>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ChatSearch')}>
          <View pointerEvents="none">
            <SearchBar value="" onChangeText={() => {}} placeholder="Search messages" />
          </View>
        </Pressable>
        <Row gap={spacing.xs}>
          {(['All', 'Unread', 'Groups'] as ChatFilter[]).map(f => (
            <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </Row>
        <ListRow
          icon="archive-outline"
          title="Archived chats"
          onPress={() => navigation.navigate('ArchivedChats')}
        />
        <Divider />
      </View>
      <View style={{flex: 1, paddingHorizontal: spacing.md}}>
        <AsyncView
          loading={loading}
          error={error}
          offline={offline}
          onRetry={reload}
          data={data}
          isEmpty={data?.length === 0}
          emptyTitle={filter === 'All' ? 'No chats yet' : `No ${filter.toLowerCase()} chats`}
          emptyMessage="Start a conversation with a friend to see it here."
          emptyAction={{label: 'Start a chat', onPress: () => navigation.navigate('NewChat')}}>
          {conversations => (
            <FlatList
              data={conversations}
              keyExtractor={c => c.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />
              }
              contentContainerStyle={{paddingBottom: spacing.xxxl * 2}}
              renderItem={({item}) => (
                <ConversationRow
                  conversation={item}
                  onPress={() =>
                    navigation.navigate('Conversation', {conversationId: item.id})
                  }
                  onLongPress={() => setSheetConvo(item)}
                />
              )}
            />
          )}
        </AsyncView>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New chat"
        onPress={() => navigation.navigate('NewChat')}
        style={({pressed}) => [styles.fab, pressed && {opacity: 0.85}]}>
        <Ionicons name="create" size={24} color={colors.textOnBrand} />
      </Pressable>
      <BottomSheet
        visible={sheetConvo != null}
        onClose={() => setSheetConvo(null)}
        title={sheetConvo?.title}>
        {sheetConvo ? (
          <View>
            <ListRow
              icon="pin"
              title={sheetConvo.pinned ? 'Unpin' : 'Pin'}
              chevron={false}
              onPress={() =>
                runRowAction(
                  () => chatService.setPinned(sheetConvo.id, !sheetConvo.pinned),
                  sheetConvo.pinned ? 'Unpinned' : 'Pinned',
                )
              }
            />
            <ListRow
              icon={sheetConvo.muted ? 'volume-high' : 'volume-mute'}
              title={sheetConvo.muted ? 'Unmute' : 'Mute'}
              chevron={false}
              onPress={() =>
                runRowAction(
                  () => chatService.setMuted(sheetConvo.id, !sheetConvo.muted),
                  sheetConvo.muted ? 'Unmuted' : 'Muted',
                )
              }
            />
            <ListRow
              icon="archive"
              title="Archive"
              chevron={false}
              onPress={() =>
                runRowAction(() => chatService.setArchived(sheetConvo.id, true), 'Archived')
              }
            />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ChatSearchScreen
// ---------------------------------------------------------------------------

export const ChatSearchScreen = ({
  navigation,
}: NativeStackScreenProps<ChatsStackParamList, 'ChatSearch'>) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{conversation: Conversation; message: Message}[] | null>(
    null,
  );
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      chatService
        .searchMessages(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <Screen scroll={false}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search messages" autoFocus />
      <Spacer size={spacing.sm} />
      {!query.trim() ? (
        <StateView
          icon="search"
          title="Search your messages"
          message="Try a name, a word from a conversation, or a file name."
        />
      ) : searching ? (
        <ListSkeleton rows={4} />
      ) : results && results.length === 0 ? (
        <StateView
          icon="search"
          title={`No results for “${query.trim()}”`}
          message="Check the spelling or try a different word."
        />
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={r => r.message.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({item}) => (
            <ListRow
              avatarName={item.conversation.title}
              title={item.conversation.title}
              subtitle={`${kindPrefix(item.message)}${item.message.text}`}
              right={
                <YayText variant="micro" color={colors.textMuted}>
                  {timeAgo(item.message.createdAt)}
                </YayText>
              }
              onPress={() =>
                navigation.navigate('Conversation', {conversationId: item.conversation.id})
              }
            />
          )}
        />
      )}
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ArchivedChatsScreen
// ---------------------------------------------------------------------------

export const ArchivedChatsScreen = ({
  navigation,
}: NativeStackScreenProps<ChatsStackParamList, 'ArchivedChats'>) => {
  const toast = useToast();
  const {perform} = useAction();
  const [sheetConvo, setSheetConvo] = useState<Conversation | null>(null);
  const {data, loading, refreshing, error, offline, reload, refresh} = useAsync(() =>
    chatService.listConversations('archived'),
  );

  return (
    <Screen scroll={false}>
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={data?.length === 0}
        emptyTitle="No archived chats"
        emptyMessage="Chats you archive will rest here until you need them.">
        {conversations => (
          <FlatList
            data={conversations}
            keyExtractor={c => c.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />
            }
            renderItem={({item}) => (
              <ConversationRow
                conversation={item}
                onPress={() => navigation.navigate('Conversation', {conversationId: item.id})}
                onLongPress={() => setSheetConvo(item)}
              />
            )}
          />
        )}
      </AsyncView>
      <BottomSheet
        visible={sheetConvo != null}
        onClose={() => setSheetConvo(null)}
        title={sheetConvo?.title}>
        <ListRow
          icon="arrow-up-circle"
          title="Unarchive"
          chevron={false}
          onPress={async () => {
            const id = sheetConvo?.id;
            setSheetConvo(null);
            if (id) {
              await perform(
                () => chatService.setArchived(id, false),
                m => toast.show(m, 'error'),
              );
              toast.show('Moved back to chats', 'success');
              refresh();
            }
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// NewChatScreen
// ---------------------------------------------------------------------------

export const NewChatScreen = ({
  navigation,
  route,
}: NativeStackScreenProps<ChatsStackParamList, 'NewChat'>) => {
  const toast = useToast();
  const {busy, perform} = useAction();
  const [mode, setMode] = useState(route.params?.group ? 'Group' : 'Direct');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const {data, loading, error, offline, reload} = useAsync(() => userService.contacts());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data) {
      return [];
    }
    return q
      ? data.filter(u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
      : data;
  }, [data, query]);

  const openDirect = async (userId: string) => {
    const convo = await perform(
      () => chatService.createConversation([userId]),
      m => toast.show(m, 'error'),
    );
    if (convo) {
      navigation.replace('Conversation', {conversationId: convo.id});
    }
  };

  const createGroup = async () => {
    const convo = await perform(
      () => chatService.createConversation(selected, groupName),
      m => toast.show(m, 'error'),
    );
    if (convo) {
      navigation.replace('Conversation', {conversationId: convo.id});
    }
  };

  return (
    <Screen scroll={false}>
      <SegmentedTabs tabs={['Direct', 'Group']} active={mode} onChange={setMode} />
      <Spacer size={spacing.sm} />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search contacts" />
      <Spacer size={spacing.sm} />
      {mode === 'Group' ? (
        <TextField
          label="Group name"
          placeholder="Name your group"
          value={groupName}
          onChangeText={setGroupName}
        />
      ) : null}
      <View style={{flex: 1}}>
        <AsyncView
          loading={loading}
          error={error}
          offline={offline}
          onRetry={reload}
          data={data}
          isEmpty={filtered.length === 0}
          emptyTitle={query ? 'No contacts found' : 'No contacts yet'}
          emptyMessage={query ? `Nothing matched “${query.trim()}”.` : 'Add friends to start chatting.'}>
          {() => (
            <FlatList
              data={filtered}
              keyExtractor={u => u.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({item}) =>
                mode === 'Direct' ? (
                  <ListRow
                    avatarName={item.name}
                    online={item.online}
                    title={item.name}
                    subtitle={`@${item.username}`}
                    onPress={() => openDirect(item.id)}
                  />
                ) : (
                  <CheckRow
                    label={item.name}
                    checked={selected.includes(item.id)}
                    onToggle={() =>
                      setSelected(prev =>
                        prev.includes(item.id)
                          ? prev.filter(id => id !== item.id)
                          : [...prev, item.id],
                      )
                    }
                  />
                )
              }
            />
          )}
        </AsyncView>
      </View>
      {mode === 'Group' ? (
        <View style={{paddingTop: spacing.sm}}>
          {selected.length < 2 ? (
            <YayText
              variant="caption"
              color={colors.textMuted}
              style={{textAlign: 'center', marginBottom: spacing.xs}}>
              Pick at least 2 members to create a group
            </YayText>
          ) : null}
          <Button
            label={`Create group${selected.length > 0 ? ` (${selected.length})` : ''}`}
            icon="people"
            disabled={selected.length < 2}
            loading={busy}
            onPress={createGroup}
          />
        </View>
      ) : null}
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ConversationScreen — the big one
// ---------------------------------------------------------------------------

type ConvoRowItem =
  | {rowKey: string; type: 'msg'; message: Message}
  | {rowKey: string; type: 'date'; label: string}
  | {rowKey: string; type: 'unread'};

const statusIconFor = (status: Message['status']): {icon: string; color: string} => {
  switch (status) {
    case 'sending':
      return {icon: 'time-outline', color: colors.textFaint};
    case 'sent':
      return {icon: 'checkmark', color: colors.textMuted};
    case 'delivered':
      return {icon: 'checkmark-done', color: colors.textMuted};
    case 'read':
      return {icon: 'checkmark-done', color: colors.brand};
    case 'failed':
      return {icon: 'alert-circle', color: colors.danger};
  }
};

const WAVEFORM_HEIGHTS = [8, 14, 10, 18, 12, 20, 9, 15, 11, 17, 8, 13];

const AttachmentBody = ({message, mine}: {message: Message; mine: boolean}) => {
  const fg = mine ? colors.textOnBrand : colors.textPrimary;
  const sub = mine ? colors.brandSoft : colors.textMuted;
  const boxBg = mine ? colors.brandStrong : colors.surfaceSunken;
  if (message.kind === 'image' || message.kind === 'video') {
    return (
      <View>
        <View style={[styles.mediaPlaceholder, {backgroundColor: boxBg}]}>
          <Ionicons
            name={message.kind === 'image' ? 'image' : 'play-circle'}
            size={34}
            color={mine ? colors.brandSoft : colors.textFaint}
          />
        </View>
        <YayText variant="micro" color={sub} style={{marginTop: spacing.xxs}}>
          {message.attachment?.name ?? message.text}
        </YayText>
      </View>
    );
  }
  if (message.kind === 'file') {
    return (
      <Row gap={spacing.xs}>
        <View style={[styles.fileIcon, {backgroundColor: boxBg}]}>
          <Ionicons name="document" size={20} color={mine ? colors.textOnBrand : colors.brand} />
        </View>
        <View style={{flexShrink: 1}}>
          <YayText variant="bodyStrong" color={fg} numberOfLines={1}>
            {message.attachment?.name ?? message.text}
          </YayText>
          <YayText variant="micro" color={sub}>
            {message.attachment?.sizeLabel ?? ''}
          </YayText>
        </View>
      </Row>
    );
  }
  if (message.kind === 'voice') {
    return (
      <Row gap={spacing.xs}>
        <Ionicons name="play-circle" size={30} color={mine ? colors.textOnBrand : colors.brand} />
        <Row gap={2}>
          {WAVEFORM_HEIGHTS.map((h, i) => (
            <View
              key={i}
              style={{
                width: 3,
                height: h,
                borderRadius: 2,
                backgroundColor: mine ? colors.brandSoft : colors.brand,
              }}
            />
          ))}
        </Row>
        <YayText variant="micro" color={sub}>
          {message.attachment?.durationLabel ?? '0:00'}
        </YayText>
      </Row>
    );
  }
  return <YayText color={fg}>{message.text}</YayText>;
};

const MessageBubble = ({
  message,
  mine,
  senderName,
  quoted,
  quotedSenderName,
  onLongPress,
  onPress,
  onToggleReaction,
}: {
  message: Message;
  mine: boolean;
  senderName?: string;
  quoted?: Message;
  quotedSenderName?: string;
  onLongPress: () => void;
  onPress?: () => void;
  onToggleReaction: (emoji: string) => void;
}) => {
  if (message.kind === 'system') {
    return (
      <YayText variant="micro" color={colors.textMuted} style={styles.systemLine}>
        {message.text}
      </YayText>
    );
  }
  const status = statusIconFor(message.status);
  return (
    <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
      <Pressable
        onLongPress={message.recalled ? undefined : onLongPress}
        onPress={onPress}
        style={({pressed}) => [
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleTheirs,
          pressed && {opacity: 0.85},
        ]}>
        {senderName ? (
          <YayText variant="micro" color={colors.accent} style={{marginBottom: 2}}>
            {senderName}
          </YayText>
        ) : null}
        {message.pinned ? (
          <Row gap={4} style={{marginBottom: 2}}>
            <Ionicons name="pin" size={11} color={mine ? colors.brandSoft : colors.accent} />
            <YayText variant="micro" color={mine ? colors.brandSoft : colors.textMuted}>
              Pinned
            </YayText>
          </Row>
        ) : null}
        {quoted ? (
          <View
            style={[
              styles.quotedBlock,
              {backgroundColor: mine ? colors.brandStrong : colors.brandSoft},
            ]}>
            <YayText
              variant="micro"
              color={mine ? colors.brandSoft : colors.brandStrong}
              numberOfLines={1}>
              {quotedSenderName ?? 'Message'}
            </YayText>
            <YayText
              variant="micro"
              color={mine ? colors.textOnBrand : colors.textSecondary}
              numberOfLines={2}>
              {quoted.recalled ? 'Message recalled' : `${kindPrefix(quoted)}${quoted.text}`}
            </YayText>
          </View>
        ) : null}
        {message.recalled ? (
          <YayText
            variant="caption"
            color={mine ? colors.brandSoft : colors.textMuted}
            style={{fontStyle: 'italic'}}>
            Message recalled
          </YayText>
        ) : (
          <AttachmentBody message={message} mine={mine} />
        )}
      </Pressable>
      {message.reactions.length > 0 ? (
        <Row gap={spacing.xxs} style={{marginTop: 3}}>
          {message.reactions.map(r => (
            <Pressable
              key={r.emoji}
              onPress={() => onToggleReaction(r.emoji)}
              style={[
                styles.reactionPill,
                r.userIds.includes(ME_ID) && {
                  backgroundColor: colors.brandSoft,
                  borderColor: colors.brandBorder,
                },
              ]}>
              <YayText variant="micro">{`${r.emoji} ${r.userIds.length}`}</YayText>
            </Pressable>
          ))}
        </Row>
      ) : null}
      <Row gap={4} style={{marginTop: 2}}>
        <YayText variant="micro" color={colors.textFaint}>
          {clockTime(message.createdAt)}
        </YayText>
        {mine ? <Ionicons name={status.icon} size={13} color={status.color} /> : null}
        {mine && message.status === 'failed' ? (
          <YayText variant="micro" color={colors.danger}>
            Failed — tap to retry
          </YayText>
        ) : null}
      </Row>
    </View>
  );
};

export const ConversationScreen = ({
  navigation,
  route,
}: NativeStackScreenProps<ChatsStackParamList, 'Conversation'>) => {
  const {conversationId} = route.params;
  const toast = useToast();
  const {data, loading, error, offline, reload} = useAsync(async () => {
    const conversation = await chatService.getConversation(conversationId);
    const page = await chatService.getMessages(conversationId);
    const members = await Promise.all(conversation.memberIds.map(id => userService.getUser(id)));
    return {conversation, messages: page.items, members};
  }, [conversationId]);

  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sheetMsg, setSheetMsg] = useState<Message | null>(null);
  const [attachSheet, setAttachSheet] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const initialUnread = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const localId = useRef(0);

  const conversation = data?.conversation;
  const isGroup = conversation?.type === 'group';
  const memberById = useMemo(() => {
    const map: Record<string, User> = {};
    data?.members.forEach(u => {
      map[u.id] = u;
    });
    return map;
  }, [data]);
  const otherUser = conversation && !isGroup ? memberById[otherMemberId(conversation) ?? ''] : undefined;

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (data) {
      initialUnread.current = data.conversation.unreadCount;
      setMsgs(data.messages.filter(m => !m.deleted));
      chatService.markRead(conversationId);
    }
  }, [data, conversationId]);

  useEffect(() => {
    if (!conversation) {
      return;
    }
    const typing = otherTyping || conversation.typingUserIds.length > 0;
    const subtitle = isGroup
      ? typing
        ? 'typing…'
        : `${conversation.memberIds.length} members`
      : typing
      ? 'typing…'
      : otherUser
      ? presenceLabel(otherUser)
      : '';
    navigation.setOptions({
      headerTitle: () => (
        <View>
          <YayText variant="bodyStrong" numberOfLines={1}>
            {conversation.title}
          </YayText>
          {subtitle ? (
            <YayText
              variant="micro"
              color={typing || otherUser?.online ? colors.brand : colors.textMuted}>
              {subtitle}
            </YayText>
          ) : null}
        </View>
      ),
      headerRight: () => (
        <IconButton
          icon="ellipsis-horizontal-circle"
          label="Conversation details"
          onPress={() => navigation.navigate('ConversationDetails', {conversationId})}
        />
      ),
    });
  }, [navigation, conversation, conversationId, isGroup, otherUser, otherTyping]);

  const scheduleIncomingReply = useCallback(() => {
    if (!conversation || isGroup) {
      return;
    }
    const senderId = otherMemberId(conversation);
    if (!senderId) {
      return;
    }
    const t1 = setTimeout(() => {
      setOtherTyping(true);
      const t2 = setTimeout(() => {
        setOtherTyping(false);
        localId.current += 1;
        const reply: Message = {
          id: `sim_${Date.now()}_${localId.current}`,
          conversationId,
          senderId,
          kind: 'text',
          text: CANNED_REPLIES[localId.current % CANNED_REPLIES.length],
          createdAt: new Date().toISOString(),
          status: 'delivered',
          reactions: [],
        };
        setMsgs(prev => [...prev, reply]);
      }, 1400);
      timers.current.push(t2);
    }, 2500);
    timers.current.push(t1);
  }, [conversation, conversationId, isGroup]);

  const doSend = useCallback(
    (input: {
      text: string;
      kind?: Message['kind'];
      attachment?: Message['attachment'];
      replyToId?: string;
    }) => {
      localId.current += 1;
      const tempId = `local_${Date.now()}_${localId.current}`;
      const temp: Message = {
        id: tempId,
        conversationId,
        senderId: ME_ID,
        kind: input.kind ?? 'text',
        text: input.text,
        createdAt: new Date().toISOString(),
        status: 'sending',
        replyToId: input.replyToId,
        reactions: [],
        attachment: input.attachment,
      };
      setMsgs(prev => [...prev, temp]);
      chatService
        .sendMessage(conversationId, input)
        .then(saved => {
          setMsgs(prev => prev.map(m => (m.id === tempId ? saved : m)));
          if ((input.kind ?? 'text') === 'text') {
            scheduleIncomingReply();
          }
        })
        .catch(() => {
          setMsgs(prev => prev.map(m => (m.id === tempId ? {...m, status: 'failed'} : m)));
        });
    },
    [conversationId, scheduleIncomingReply],
  );

  const sendText = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    doSend({text: trimmed, replyToId: replyTo?.id});
    setText('');
    setReplyTo(null);
  };

  const retryFailed = (m: Message) => {
    setMsgs(prev => prev.filter(x => x.id !== m.id));
    doSend({text: m.text, kind: m.kind, attachment: m.attachment, replyToId: m.replyToId});
  };

  const sendAttachment = (kind: 'image' | 'video' | 'file' | 'voice') => {
    setAttachSheet(false);
    const specs: Record<typeof kind, {text: string; attachment: Message['attachment']}> = {
      image: {text: 'sunset-photo.jpg', attachment: {name: 'sunset-photo.jpg', sizeLabel: '1.1 MB'}},
      video: {text: 'clip.mp4', attachment: {name: 'clip.mp4', sizeLabel: '6.8 MB', durationLabel: '0:31'}},
      file: {text: 'notes.pdf', attachment: {name: 'notes.pdf', sizeLabel: '420 KB'}},
      voice: {text: 'Voice note', attachment: {name: 'voice-note', sizeLabel: '96 KB', durationLabel: '0:12'}},
    };
    const spec = specs[kind];
    doSend({text: spec.text, kind, attachment: spec.attachment, replyToId: replyTo?.id});
    setReplyTo(null);
  };

  const toggleReaction = async (m: Message, emoji: string) => {
    try {
      const updated = await chatService.toggleReaction(conversationId, m.id, emoji);
      setMsgs(prev => prev.map(x => (x.id === m.id ? updated : x)));
    } catch {
      // local (optimistic / simulated) messages are not in the mock store
      setMsgs(prev =>
        prev.map(x => {
          if (x.id !== m.id) {
            return x;
          }
          const existing = x.reactions.find(r => r.emoji === emoji);
          const reactions = existing
            ? existing.userIds.includes(ME_ID)
              ? x.reactions
                  .map(r =>
                    r.emoji === emoji ? {...r, userIds: r.userIds.filter(u => u !== ME_ID)} : r,
                  )
                  .filter(r => r.userIds.length > 0)
              : x.reactions.map(r =>
                  r.emoji === emoji ? {...r, userIds: [...r.userIds, ME_ID]} : r,
                )
            : [...x.reactions, {emoji, userIds: [ME_ID]}];
          return {...x, reactions};
        }),
      );
    }
  };

  const rows = useMemo<ConvoRowItem[]>(() => {
    const visible = msgs.filter(m => !m.deleted);
    const out: ConvoRowItem[] = [];
    let lastDay = '';
    const unreadStart =
      initialUnread.current > 0 ? visible.length - initialUnread.current : -1;
    visible.forEach((m, i) => {
      const day = new Date(m.createdAt).toDateString();
      if (day !== lastDay) {
        out.push({rowKey: `day_${day}_${i}`, type: 'date', label: dayLabel(m.createdAt)});
        lastDay = day;
      }
      if (i === unreadStart) {
        out.push({rowKey: 'unread_marker', type: 'unread'});
      }
      out.push({rowKey: m.id, type: 'msg', message: m});
    });
    return out.reverse();
  }, [msgs]);

  const pinnedMessage = msgs.find(m => m.pinned && !m.deleted && !m.recalled);

  const sheetActions = (m: Message) => {
    const mine = m.senderId === ME_ID;
    const close = () => setSheetMsg(null);
    return (
      <View>
        <Row gap={spacing.sm} style={{justifyContent: 'center', marginBottom: spacing.sm}}>
          {REACTION_EMOJI.map(e => (
            <Pressable
              key={e}
              onPress={() => {
                close();
                toggleReaction(m, e);
              }}
              hitSlop={6}>
              <YayText variant="title">{e}</YayText>
            </Pressable>
          ))}
        </Row>
        <Divider />
        <ListRow
          icon="arrow-undo"
          title="Reply"
          chevron={false}
          onPress={() => {
            close();
            setReplyTo(m);
          }}
        />
        <ListRow
          icon="copy"
          title="Copy"
          chevron={false}
          onPress={() => {
            close();
            toast.show('Copied', 'success');
          }}
        />
        <ListRow
          icon="arrow-redo"
          title="Forward"
          chevron={false}
          onPress={() => {
            close();
            navigation.navigate('ForwardMessage', {conversationId, messageId: m.id});
          }}
        />
        <ListRow
          icon="pin"
          title={m.pinned ? 'Unpin' : 'Pin'}
          chevron={false}
          onPress={async () => {
            close();
            try {
              await chatService.pinMessage(conversationId, m.id);
              setMsgs(prev => prev.map(x => (x.id === m.id ? {...x, pinned: !x.pinned} : x)));
              toast.show(m.pinned ? 'Unpinned' : 'Pinned', 'success');
            } catch {
              toast.show('Could not update pin', 'error');
            }
          }}
        />
        <ListRow
          icon="trash"
          iconTone={colors.danger}
          title="Delete for me"
          chevron={false}
          onPress={async () => {
            close();
            await chatService.deleteMessage(conversationId, m.id, false).catch(() => undefined);
            setMsgs(prev => prev.filter(x => x.id !== m.id));
            toast.show('Deleted for you', 'success');
          }}
        />
        {mine ? (
          <ListRow
            icon="refresh-circle"
            iconTone={colors.danger}
            title="Recall"
            chevron={false}
            onPress={async () => {
              close();
              await chatService.deleteMessage(conversationId, m.id, true).catch(() => undefined);
              setMsgs(prev =>
                prev.map(x => (x.id === m.id ? {...x, recalled: true, text: ''} : x)),
              );
              toast.show('Message recalled', 'success');
            }}
          />
        ) : null}
      </View>
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <AsyncView
          loading={loading}
          error={error}
          offline={offline}
          onRetry={reload}
          data={data}>
          {() => (
            <View style={{flex: 1}}>
              {pinnedMessage ? (
                <Pressable
                  onPress={() => toast.show('Pinned by a member of this chat', 'info')}
                  style={styles.pinnedBanner}>
                  <Ionicons name="pin" size={14} color={colors.brandStrong} />
                  <YayText
                    variant="micro"
                    color={colors.brandStrong}
                    numberOfLines={1}
                    style={{flex: 1}}>
                    {`${kindPrefix(pinnedMessage)}${pinnedMessage.text}`}
                  </YayText>
                </Pressable>
              ) : null}
              <FlatList
                data={rows}
                inverted
                keyExtractor={r => r.rowKey}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{paddingHorizontal: spacing.md, paddingVertical: spacing.sm}}
                renderItem={({item}) => {
                  if (item.type === 'date') {
                    return (
                      <View style={styles.dateSeparator}>
                        <YayText variant="micro" color={colors.textMuted}>
                          {item.label}
                        </YayText>
                      </View>
                    );
                  }
                  if (item.type === 'unread') {
                    return (
                      <Row gap={spacing.xs} style={{marginVertical: spacing.xs}}>
                        <View style={styles.unreadLine} />
                        <YayText variant="micro" color={colors.accent}>
                          Unread messages
                        </YayText>
                        <View style={styles.unreadLine} />
                      </Row>
                    );
                  }
                  const m = item.message;
                  const mine = m.senderId === ME_ID;
                  const quoted = m.replyToId
                    ? msgs.find(x => x.id === m.replyToId)
                    : undefined;
                  return (
                    <MessageBubble
                      message={m}
                      mine={mine}
                      senderName={
                        isGroup && !mine && m.kind !== 'system'
                          ? memberById[m.senderId]?.name
                          : undefined
                      }
                      quoted={quoted}
                      quotedSenderName={
                        quoted
                          ? quoted.senderId === ME_ID
                            ? 'You'
                            : memberById[quoted.senderId]?.name
                          : undefined
                      }
                      onLongPress={() => setSheetMsg(m)}
                      onPress={mine && m.status === 'failed' ? () => retryFailed(m) : undefined}
                      onToggleReaction={emoji => toggleReaction(m, emoji)}
                    />
                  );
                }}
              />
              {otherTyping ? (
                <YayText
                  variant="micro"
                  color={colors.textMuted}
                  style={{paddingHorizontal: spacing.md, paddingBottom: spacing.xxs}}>
                  {`${otherUser?.name ?? 'Someone'} is typing…`}
                </YayText>
              ) : null}
              <View style={styles.composer}>
                {replyTo ? (
                  <Row gap={spacing.xs} style={styles.replyBar}>
                    <Ionicons name="arrow-undo" size={15} color={colors.brand} />
                    <View style={{flex: 1}}>
                      <YayText variant="micro" color={colors.brandStrong}>
                        {replyTo.senderId === ME_ID
                          ? 'You'
                          : memberById[replyTo.senderId]?.name ?? 'Message'}
                      </YayText>
                      <YayText variant="micro" color={colors.textMuted} numberOfLines={1}>
                        {`${kindPrefix(replyTo)}${replyTo.text}`}
                      </YayText>
                    </View>
                    <IconButton icon="close" size={17} onPress={() => setReplyTo(null)} label="Cancel reply" />
                  </Row>
                ) : null}
                <Row gap={spacing.xxs} style={{alignItems: 'flex-end'}}>
                  <IconButton icon="add-circle" size={26} color={colors.brand} label="Attach" onPress={() => setAttachSheet(true)} />
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Message"
                    placeholderTextColor={colors.textFaint}
                    multiline
                    style={styles.composerInput}
                    accessibilityLabel="Message input"
                  />
                  <IconButton icon="happy-outline" label="Emoji" onPress={() => setText(t => `${t}😊`)} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send"
                    disabled={!text.trim()}
                    onPress={sendText}
                    style={[styles.sendButton, !text.trim() && {opacity: 0.4}]}>
                    <Ionicons name="paper-plane" size={18} color={colors.textOnBrand} />
                  </Pressable>
                </Row>
              </View>
            </View>
          )}
        </AsyncView>
      </KeyboardAvoidingView>
      <BottomSheet visible={sheetMsg != null} onClose={() => setSheetMsg(null)} title="Message">
        {sheetMsg ? sheetActions(sheetMsg) : null}
      </BottomSheet>
      <BottomSheet visible={attachSheet} onClose={() => setAttachSheet(false)} title="Share something">
        <ListRow icon="image" title="Photo" chevron={false} onPress={() => sendAttachment('image')} />
        <ListRow icon="videocam" title="Video" chevron={false} onPress={() => sendAttachment('video')} />
        <ListRow icon="document" title="File" chevron={false} onPress={() => sendAttachment('file')} />
        <ListRow icon="mic" title="Voice note" chevron={false} onPress={() => sendAttachment('voice')} />
        <Divider />
        <ListRow icon="happy" title="Stickers" chevron={false} right={<Badge label="Coming soon" tone="neutral" />} />
        <ListRow icon="film" title="GIFs" chevron={false} right={<Badge label="Coming soon" tone="neutral" />} />
      </BottomSheet>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ConversationDetailsScreen
// ---------------------------------------------------------------------------

const REPORT_REASONS = ['Spam', 'Harassment', 'Scam or fraud', 'Inappropriate content', 'Other'];

export const ConversationDetailsScreen = ({
  navigation,
  route,
}: NativeStackScreenProps<ChatsStackParamList, 'ConversationDetails'>) => {
  const {conversationId} = route.params;
  const toast = useToast();
  const {perform} = useAction();
  const {data, setData, loading, error, offline, reload} = useAsync(
    () => chatService.getConversation(conversationId),
    [conversationId],
  );
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [leaveVisible, setLeaveVisible] = useState(false);
  const [blockVisible, setBlockVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    if (data && data.type === 'direct') {
      const oid = otherMemberId(data);
      if (oid) {
        userService.getUser(oid).then(setOtherUser).catch(() => undefined);
      }
    }
  }, [data]);

  return (
    <Screen>
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {c => {
          const isGroup = c.type === 'group';
          const myRole = c.groupRoles?.[ME_ID] ?? 'member';
          const canManage = isGroup && (myRole === 'owner' || myRole === 'admin');
          return (
            <View>
              <Card style={{alignItems: 'center', gap: spacing.xs}}>
                <Avatar name={c.title} size={72} online={!isGroup ? otherUser?.online : undefined} />
                <YayText variant="title" style={{textAlign: 'center'}}>
                  {c.title}
                </YayText>
                {isGroup ? (
                  <YayText variant="caption" color={colors.textMuted}>
                    {`${c.memberIds.length} members`}
                  </YayText>
                ) : otherUser ? (
                  <View style={{alignItems: 'center'}}>
                    <YayText variant="caption" color={colors.textMuted}>
                      {`@${otherUser.username} · ${presenceLabel(otherUser)}`}
                    </YayText>
                    {otherUser.bio ? (
                      <YayText
                        variant="caption"
                        color={colors.textSecondary}
                        style={{textAlign: 'center', marginTop: spacing.xxs}}>
                        {otherUser.bio}
                      </YayText>
                    ) : null}
                  </View>
                ) : null}
              </Card>

              {isGroup && c.description ? (
                <View>
                  <SectionHeader title="About" />
                  <Card>
                    <YayText color={colors.textSecondary}>{c.description}</YayText>
                  </Card>
                </View>
              ) : null}

              <SectionHeader title="Options" />
              <Card style={{paddingVertical: spacing.xxs}}>
                <SwitchRow
                  label="Mute notifications"
                  description="You will still see new messages"
                  value={c.muted}
                  onValueChange={async v => {
                    setData({...c, muted: v});
                    await perform(
                      () => chatService.setMuted(c.id, v),
                      m => toast.show(m, 'error'),
                    );
                  }}
                />
                <SwitchRow
                  label="Archive chat"
                  description="Hide this chat from your main list"
                  value={c.archived}
                  onValueChange={async v => {
                    setData({...c, archived: v});
                    await perform(
                      () => chatService.setArchived(c.id, v),
                      m => toast.show(m, 'error'),
                    );
                  }}
                />
                <ListRow icon="search" title="Search in conversation" onPress={() => navigation.navigate('ChatSearch')} />
                <ListRow
                  icon="images"
                  title="Shared media"
                  onPress={() => navigation.navigate('SharedMedia', {conversationId: c.id})}
                />
              </Card>

              {isGroup ? (
                <View>
                  <SectionHeader title="Group" />
                  <Card style={{paddingVertical: spacing.xxs}}>
                    <ListRow
                      icon="people"
                      title="Members"
                      subtitle={`${c.memberIds.length} people`}
                      onPress={() => navigation.navigate('GroupMembers', {conversationId: c.id})}
                    />
                    <ListRow
                      icon="person-add"
                      title="Invite to group"
                      onPress={() => toast.show('Invite link copied (preview)', 'success')}
                    />
                  </Card>
                  {canManage ? (
                    <View>
                      <SectionHeader title="Group settings" />
                      <Card style={{paddingVertical: spacing.xxs}}>
                        <ListRow
                          icon="pencil"
                          title="Edit group name"
                          onPress={() => {
                            setNameDraft(c.title);
                            setEditNameVisible(true);
                          }}
                        />
                        <YayText
                          variant="micro"
                          color={colors.textMuted}
                          style={{paddingHorizontal: spacing.xxs, paddingBottom: spacing.xs}}>
                          Owners and admins can rename the group and manage members.
                        </YayText>
                      </Card>
                    </View>
                  ) : null}
                  <Spacer />
                  <Button
                    label="Leave group"
                    kind="danger"
                    icon="exit"
                    onPress={() => setLeaveVisible(true)}
                  />
                </View>
              ) : (
                <View>
                  <SectionHeader title="Contact" />
                  <Card style={{paddingVertical: spacing.xxs}}>
                    <ListRow
                      icon="person"
                      title="View profile"
                      onPress={() =>
                        otherUser
                          ? navigation.navigate('ContactProfile', {userId: otherUser.id})
                          : undefined
                      }
                    />
                    <ListRow
                      icon="hand-left"
                      iconTone={colors.danger}
                      title="Block user"
                      onPress={() => setBlockVisible(true)}
                    />
                    <ListRow
                      icon="flag"
                      iconTone={colors.danger}
                      title="Report user"
                      onPress={() => setReportVisible(true)}
                    />
                  </Card>
                </View>
              )}
            </View>
          );
        }}
      </AsyncView>

      <ConfirmSheet
        visible={leaveVisible}
        onClose={() => setLeaveVisible(false)}
        title="Leave group?"
        message="You will stop receiving messages from this group."
        confirmLabel="Leave group"
        destructive
        onConfirm={async () => {
          await perform(
            () => chatService.leaveGroup(conversationId),
            m => toast.show(m, 'error'),
          );
          toast.show('You left the group', 'success');
          navigation.popToTop();
        }}
      />
      <ConfirmSheet
        visible={blockVisible}
        onClose={() => setBlockVisible(false)}
        title={`Block ${otherUser?.name ?? 'this user'}?`}
        message="They will no longer be able to message you."
        confirmLabel="Block"
        destructive
        onConfirm={async () => {
          if (otherUser) {
            await perform(
              () => userService.setBlocked(otherUser.id, true),
              m => toast.show(m, 'error'),
            );
            toast.show(`${otherUser.name} blocked`, 'success');
          }
        }}
      />
      <BottomSheet
        visible={reportVisible}
        onClose={() => {
          setReportVisible(false);
          setReportReason(null);
        }}
        title="Report user">
        <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.sm}}>
          Why are you reporting this user?
        </YayText>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg}}>
          {REPORT_REASONS.map(r => (
            <Chip key={r} label={r} active={reportReason === r} onPress={() => setReportReason(r)} />
          ))}
        </View>
        <Button
          label="Submit report"
          disabled={!reportReason}
          onPress={async () => {
            setReportVisible(false);
            if (otherUser && reportReason) {
              await perform(
                () => userService.report(otherUser.id, reportReason),
                m => toast.show(m, 'error'),
              );
            }
            setReportReason(null);
            toast.show('Thanks, our team will review', 'success');
          }}
        />
      </BottomSheet>
      <BottomSheet visible={editNameVisible} onClose={() => setEditNameVisible(false)} title="Edit group name">
        <TextField label="Group name" value={nameDraft} onChangeText={setNameDraft} placeholder="Group name" />
        <Button
          label="Save"
          disabled={nameDraft.trim().length < 2}
          onPress={() => {
            setEditNameVisible(false);
            if (data) {
              setData({...data, title: nameDraft.trim()});
            }
            toast.show('Group name updated', 'success');
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// GroupMembersScreen
// ---------------------------------------------------------------------------

type GroupRole = 'owner' | 'admin' | 'member';

export const GroupMembersScreen = ({
  route,
}: NativeStackScreenProps<ChatsStackParamList, 'GroupMembers'>) => {
  const {conversationId} = route.params;
  const toast = useToast();
  const {data, loading, error, offline, reload} = useAsync(async () => {
    const conversation = await chatService.getConversation(conversationId);
    const members = await Promise.all(conversation.memberIds.map(id => userService.getUser(id)));
    return {conversation, members};
  }, [conversationId]);

  const [roles, setRoles] = useState<Record<string, GroupRole>>({});
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [sheetMember, setSheetMember] = useState<User | null>(null);

  useEffect(() => {
    if (data) {
      setRoles({...(data.conversation.groupRoles ?? {})});
      setRemovedIds([]);
    }
  }, [data]);

  const myRole: GroupRole = roles[ME_ID] ?? 'member';
  const canManage = myRole === 'owner' || myRole === 'admin';

  return (
    <Screen scroll={false}>
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {({members}) => (
          <FlatList
            data={members.filter(m => !removedIds.includes(m.id))}
            keyExtractor={m => m.id}
            renderItem={({item}) => {
              const role = roles[item.id] ?? 'member';
              return (
                <Pressable
                  onLongPress={
                    canManage && item.id !== ME_ID && role !== 'owner'
                      ? () => setSheetMember(item)
                      : undefined
                  }
                  style={({pressed}) => [pressed && {backgroundColor: colors.surfaceSunken, borderRadius: radius.sm}]}>
                  <ListRow
                    avatarName={item.name}
                    online={item.online}
                    title={item.id === ME_ID ? `${item.name} (you)` : item.name}
                    subtitle={`@${item.username}`}
                    chevron={false}
                    right={
                      role === 'owner' ? (
                        <Badge label="Owner" tone="gold" />
                      ) : role === 'admin' ? (
                        <Badge label="Admin" tone="brand" />
                      ) : undefined
                    }
                  />
                </Pressable>
              );
            }}
          />
        )}
      </AsyncView>
      <BottomSheet
        visible={sheetMember != null}
        onClose={() => setSheetMember(null)}
        title={sheetMember?.name}>
        {sheetMember ? (
          <View>
            <ListRow
              icon="shield-checkmark"
              title={roles[sheetMember.id] === 'admin' ? 'Remove admin' : 'Make admin'}
              chevron={false}
              onPress={() => {
                const next: GroupRole = roles[sheetMember.id] === 'admin' ? 'member' : 'admin';
                setRoles(prev => ({...prev, [sheetMember.id]: next}));
                setSheetMember(null);
                toast.show(
                  next === 'admin'
                    ? `${sheetMember.name} is now an admin`
                    : `${sheetMember.name} is no longer an admin`,
                  'success',
                );
              }}
            />
            <ListRow
              icon="person-remove"
              iconTone={colors.danger}
              title="Remove from group"
              chevron={false}
              onPress={() => {
                setRemovedIds(prev => [...prev, sheetMember.id]);
                setSheetMember(null);
                toast.show(`${sheetMember.name} removed`, 'success');
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// SharedMediaScreen
// ---------------------------------------------------------------------------

export const SharedMediaScreen = ({
  route,
}: NativeStackScreenProps<ChatsStackParamList, 'SharedMedia'>) => {
  const {conversationId} = route.params;
  const [tab, setTab] = useState('Media');
  const {data, loading, error, offline, reload} = useAsync(async () => {
    const page = await chatService.getMessages(conversationId);
    return page.items.filter(m => !m.deleted && !m.recalled);
  }, [conversationId]);

  return (
    <Screen scroll={false}>
      <SegmentedTabs tabs={['Media', 'Files', 'Voice']} active={tab} onChange={setTab} />
      <Spacer size={spacing.sm} />
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {messages => {
          const media = messages.filter(m => m.kind === 'image' || m.kind === 'video');
          const files = messages.filter(m => m.kind === 'file');
          const voice = messages.filter(m => m.kind === 'voice');
          if (tab === 'Media') {
            return media.length === 0 ? (
              <EmptyState
                icon="images-outline"
                title="No shared media"
                message="Photos and videos shared here will show up in this tab."
              />
            ) : (
              <View style={styles.mediaGrid}>
                {media.map(m => (
                  <View key={m.id} style={styles.mediaTile}>
                    <Ionicons
                      name={m.kind === 'image' ? 'image' : 'play-circle'}
                      size={28}
                      color={colors.textFaint}
                    />
                    <YayText variant="micro" color={colors.textMuted} numberOfLines={1}>
                      {m.attachment?.name ?? m.text}
                    </YayText>
                  </View>
                ))}
              </View>
            );
          }
          if (tab === 'Files') {
            return files.length === 0 ? (
              <EmptyState
                icon="document-outline"
                title="No shared files"
                message="Documents shared in this chat will appear here."
              />
            ) : (
              <View>
                {files.map(m => (
                  <ListRow
                    key={m.id}
                    icon="document"
                    title={m.attachment?.name ?? m.text}
                    subtitle={`${m.attachment?.sizeLabel ?? ''} · ${timeAgo(m.createdAt)} ago`}
                    chevron={false}
                  />
                ))}
              </View>
            );
          }
          return voice.length === 0 ? (
            <EmptyState
              icon="mic-outline"
              title="No voice notes"
              message="Voice notes exchanged here will be listed in this tab."
            />
          ) : (
            <View>
              {voice.map(m => (
                <ListRow
                  key={m.id}
                  icon="mic"
                  title="Voice note"
                  subtitle={`${m.attachment?.durationLabel ?? '0:00'} · ${timeAgo(m.createdAt)} ago`}
                  chevron={false}
                  right={<Ionicons name="play-circle" size={24} color={colors.brand} />}
                />
              ))}
            </View>
          );
        }}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ForwardMessageScreen
// ---------------------------------------------------------------------------

export const ForwardMessageScreen = ({
  navigation,
  route,
}: NativeStackScreenProps<ChatsStackParamList, 'ForwardMessage'>) => {
  const {conversationId, messageId} = route.params;
  const toast = useToast();
  const {busy, perform} = useAction();
  const [selected, setSelected] = useState<string[]>([]);
  const {data, loading, error, offline, reload} = useAsync(async () => {
    const list = await chatService.listConversations('all');
    return list.filter(c => c.id !== conversationId);
  }, [conversationId]);

  return (
    <Screen scroll={false}>
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={data?.length === 0}
        emptyTitle="Nowhere to forward"
        emptyMessage="Start another chat first, then forward messages to it.">
        {conversations => (
          <FlatList
            data={conversations}
            keyExtractor={c => c.id}
            renderItem={({item}) => (
              <CheckRow
                label={item.title}
                checked={selected.includes(item.id)}
                onToggle={() =>
                  setSelected(prev =>
                    prev.includes(item.id)
                      ? prev.filter(id => id !== item.id)
                      : [...prev, item.id],
                  )
                }
              />
            )}
          />
        )}
      </AsyncView>
      <View style={{paddingTop: spacing.sm}}>
        <Button
          label={selected.length > 0 ? `Send to ${selected.length}` : 'Send'}
          icon="paper-plane"
          disabled={selected.length === 0}
          loading={busy}
          onPress={async () => {
            const ok = await perform(
              () => chatService.forwardMessage(messageId, conversationId, selected),
              m => toast.show(m, 'error'),
            );
            if (ok !== null) {
              toast.show('Message forwarded', 'success');
              navigation.goBack();
            }
          }}
        />
      </View>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ContactProfileScreen
// ---------------------------------------------------------------------------

export const ContactProfileScreen = ({
  navigation,
  route,
}: NativeStackScreenProps<ChatsStackParamList, 'ContactProfile'>) => {
  const {userId} = route.params;
  const toast = useToast();
  const {busy, perform} = useAction();
  const {data, setData, loading, error, offline, reload} = useAsync(
    () => userService.getUser(userId),
    [userId],
  );
  const [blockVisible, setBlockVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);

  return (
    <Screen>
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {user => (
          <View>
            <Card style={{alignItems: 'center', gap: spacing.xs}}>
              <Avatar name={user.name} size={84} online={user.online} />
              <YayText variant="title">{user.name}</YayText>
              <YayText variant="caption" color={colors.textMuted}>
                {`@${user.username} · ${presenceLabel(user)}`}
              </YayText>
              {user.bio ? (
                <YayText
                  variant="caption"
                  color={colors.textSecondary}
                  style={{textAlign: 'center'}}>
                  {user.bio}
                </YayText>
              ) : null}
              {user.blocked ? <Badge label="Blocked" tone="danger" /> : null}
            </Card>
            <Spacer />
            <Button
              label="Message"
              icon="chatbubble"
              loading={busy}
              onPress={async () => {
                const convo = await perform(
                  () => chatService.createConversation([user.id]),
                  m => toast.show(m, 'error'),
                );
                if (convo) {
                  navigation.navigate('Conversation', {conversationId: convo.id});
                }
              }}
            />
            <SectionHeader title="QR code" />
            <Card style={{alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl}}>
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code" size={64} color={colors.textFaint} />
              </View>
              <YayText variant="caption" color={colors.textMuted}>
                Scan to add {user.name} on Yay-chat
              </YayText>
            </Card>
            <SectionHeader title="Safety" />
            <Card style={{paddingVertical: spacing.xxs}}>
              <ListRow
                icon="hand-left"
                iconTone={colors.danger}
                title={user.blocked ? 'Unblock user' : 'Block user'}
                onPress={async () => {
                  if (user.blocked) {
                    await perform(
                      () => userService.setBlocked(user.id, false),
                      m => toast.show(m, 'error'),
                    );
                    setData({...user, blocked: false});
                    toast.show(`${user.name} unblocked`, 'success');
                  } else {
                    setBlockVisible(true);
                  }
                }}
              />
              <ListRow
                icon="flag"
                iconTone={colors.danger}
                title="Report user"
                onPress={() => setReportVisible(true)}
              />
            </Card>
          </View>
        )}
      </AsyncView>
      <ConfirmSheet
        visible={blockVisible}
        onClose={() => setBlockVisible(false)}
        title={`Block ${data?.name ?? 'this user'}?`}
        message="They will no longer be able to message you."
        confirmLabel="Block"
        destructive
        onConfirm={async () => {
          if (data) {
            await perform(
              () => userService.setBlocked(data.id, true),
              m => toast.show(m, 'error'),
            );
            setData({...data, blocked: true});
            toast.show(`${data.name} blocked`, 'success');
          }
        }}
      />
      <BottomSheet
        visible={reportVisible}
        onClose={() => {
          setReportVisible(false);
          setReportReason(null);
        }}
        title="Report user">
        <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.sm}}>
          Why are you reporting this user?
        </YayText>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg}}>
          {REPORT_REASONS.map(r => (
            <Chip key={r} label={r} active={reportReason === r} onPress={() => setReportReason(r)} />
          ))}
        </View>
        <Button
          label="Submit report"
          disabled={!reportReason}
          onPress={async () => {
            setReportVisible(false);
            if (data && reportReason) {
              await perform(
                () => userService.report(data.id, reportReason),
                m => toast.show(m, 'error'),
              );
            }
            setReportReason(null);
            toast.show('Thanks, our team will review', 'success');
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Styles (chat-specific layout only — everything else comes from the kit)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  convoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    borderRadius: radius.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
  },
  // Conversation
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.brandBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dateSeparator: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginVertical: spacing.sm,
  },
  unreadLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.accentSoft,
  },
  systemLine: {
    alignSelf: 'center',
    textAlign: 'center',
    marginVertical: spacing.xs,
    maxWidth: '80%',
  },
  bubbleWrap: {
    maxWidth: '78%',
    marginVertical: 3,
  },
  bubbleWrapMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleWrapTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: radius.lg,
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
  },
  quotedBlock: {
    borderRadius: radius.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    marginBottom: spacing.xxs,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  mediaPlaceholder: {
    width: 190,
    height: 130,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  replyBar: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    marginBottom: spacing.xs,
  },
  composerInput: {
    flex: 1,
    maxHeight: 4 * typography.body.lineHeight + spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    fontFamily: typography.bodyFamily,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Shared media
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  mediaTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    padding: spacing.xxs,
  },
  // Contact profile
  qrPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
