/**
 * YaysApp Chats stack — the flagship area of the app.
 *
 * ChatList, ChatSearch, ArchivedChats, NewChat, Conversation,
 * ConversationDetails, GroupMembers, SharedMedia, ForwardMessage and
 * ContactProfile screens. All data flows through chatService / userService.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Clipboard,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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
  Oval,
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
import {EmojiPicker} from '../../design/EmojiPicker';
import {colors, radius, spacing, typography} from '../../design/tokens';
import {ME_ID, chatService, communityService, errorMessage, userService} from '../../services';
import {useAction, useAsync} from '../../state/hooks';
import {useToast, useUnread} from '../../state/AppProviders';
import {Conversation, Message, User} from '../../types/models';
import {ChatsStackParamList} from '../../types/navigation';
import {ChatLinkCard, classifyChatLink} from './linkCards';

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
    return 'This message was deleted';
  }
  const you = m.senderId === ME_ID && m.kind !== 'system' ? 'You: ' : '';
  return `${you}${kindPrefix(m)}${m.text}`;
};

const otherMemberId = (c: Conversation): string | undefined =>
  c.memberIds.find(id => id !== ME_ID);

const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mergeMessages = (current: Message[], incoming: Message[]): Message[] => {
  const merged: Message[] = [];
  [...current, ...incoming].forEach(message => {
    const key = message.clientId ?? message.id;
    const existingIndex = merged.findIndex(existing => {
      if ((existing.clientId ?? existing.id) === key) {
        return true;
      }
      if (existing.id === message.id) {
        return true;
      }
      const sameOptimisticMessage =
        existing.senderId === message.senderId &&
        existing.text === message.text &&
        existing.kind === message.kind &&
        existing.status === 'sending' &&
        message.status !== 'sending' &&
        Math.abs(new Date(existing.createdAt).getTime() - new Date(message.createdAt).getTime()) < 60_000;
      return sameOptimisticMessage;
    });
    if (existingIndex >= 0) {
      merged[existingIndex] = {...merged[existingIndex], ...message};
    } else {
      merged.push(message);
    }
  });
  return merged.sort((a, b) => {
    const byTime = a.createdAt.localeCompare(b.createdAt);
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });
};

const latestIncomingMessage = (messages: Message[]): Message | undefined =>
  [...messages]
    .filter(m => m.senderId !== ME_ID && !m.deleted && !m.recalled)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

const withDerivedReadReceipts = (messages: Message[]): Message[] => {
  const latestIncoming = latestIncomingMessage(messages);
  if (!latestIncoming) {
    return messages;
  }
  const latestIncomingAt = new Date(latestIncoming.createdAt).getTime();
  return messages.map(message => {
    const eligible =
      message.senderId === ME_ID &&
      message.status !== 'read' &&
      message.status !== 'failed' &&
      message.status !== 'sending' &&
      new Date(message.createdAt).getTime() < latestIncomingAt;
    return eligible ? {...message, status: 'read'} : message;
  });
};

const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const COMPOSER_EMOJIS = [
  '😀',
  '😂',
  '😍',
  '🥰',
  '😎',
  '😭',
  '🙌',
  '👏',
  '👍',
  '👀',
  '🔥',
  '💯',
  '❤️',
  '🧡',
  '✨',
  '🎉',
  '🙏',
  '🤝',
  '✅',
  '🚀',
];

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
}) => {
  const unread = conversation.unreadCount > 0;
  return (
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
        <YayText
          variant="micro"
          color={unread ? colors.notify : colors.textMuted}
          style={unread ? {fontWeight: '700'} : undefined}>
          {conversation.lastMessage ? timeAgo(conversation.lastMessage.createdAt) : ''}
        </YayText>
      </Row>
      <Row gap={spacing.xs} style={{marginTop: 2}}>
        <YayText
          variant="caption"
          color={unread ? colors.textPrimary : colors.textMuted}
          numberOfLines={1}
          style={unread ? {flex: 1, fontWeight: '700'} : {flex: 1}}>
          {previewText(conversation)}
        </YayText>
        <CountBubble count={conversation.unreadCount} />
      </Row>
    </View>
  </Pressable>
  );
};

export const ChatListScreen = ({
  navigation,
}: NativeStackScreenProps<ChatsStackParamList, 'ChatList'>) => {
  const toast = useToast();
  const {getConversationUnread} = useUnread();
  const {perform} = useAction();
  const [filter, setFilter] = useState<ChatFilter>('All');
  const [sheetConvo, setSheetConvo] = useState<Conversation | null>(null);
  const [confirmDeleteConvo, setConfirmDeleteConvo] = useState<Conversation | null>(null);
  const {data, loading, refreshing, error, offline, reload, refresh} = useAsync(
    () => chatService.listConversations(filter === 'Unread' ? 'all' : FILTER_MAP[filter]),
    [filter],
  );
  const conversationsWithLocalUnread = useMemo(
    () => {
      const merged = (data ?? []).map(conversation => ({
        ...conversation,
        unreadCount: Math.max(conversation.unreadCount, getConversationUnread(conversation.id)),
      }));
      return filter === 'Unread' ? merged.filter(conversation => conversation.unreadCount > 0) : merged;
    },
    [data, filter, getConversationUnread],
  );

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => refresh());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  useEffect(() => {
    return chatService.subscribe(event => {
      if (event.type === 'conversation.updated' || event.type === 'conversation.deleted') {
        refresh();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          data={conversationsWithLocalUnread}
          isEmpty={conversationsWithLocalUnread.length === 0}
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
        <Oval size={52}>
          <Ionicons name="create" size={24} color={colors.textOnBrand} />
        </Oval>
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
            <ListRow
              icon="trash"
              iconTone={colors.danger}
              title="Delete chat"
              chevron={false}
              onPress={() => {
                setSheetConvo(null);
                setConfirmDeleteConvo(sheetConvo);
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
      <ConfirmSheet
        visible={confirmDeleteConvo != null}
        onClose={() => setConfirmDeleteConvo(null)}
        title="Delete chat?"
        message={`“${confirmDeleteConvo?.title ?? ''}” and its messages will be deleted for you. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirmDeleteConvo) {
            runRowAction(
              () => chatService.deleteConversation(confirmDeleteConvo.id),
              'Chat deleted',
            );
          }
        }}
      />
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
  const toast = useToast();
  const {busy, perform} = useAction();
  const [messageResults, setMessageResults] = useState<
    {conversation: Conversation; message: Message}[] | null
  >(null);
  const [peopleResults, setPeopleResults] = useState<User[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setMessageResults(null);
      setPeopleResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      Promise.all([
        userService.searchUsers(query).catch(() => []),
        chatService.searchMessages(query).catch(() => []),
      ])
        .then(([people, messages]) => {
          setPeopleResults(people);
          setMessageResults(messages);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const openPerson = async (user: User) => {
    const convo = await perform(
      () => chatService.createConversation([user.id]),
      m => toast.show(m, 'error'),
    );
    if (convo) {
      navigation.navigate('Conversation', {conversationId: convo.id});
    }
  };

  const noResults = !!query.trim() && !searching && !peopleResults?.length && !messageResults?.length;

  return (
    <Screen scroll={false}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search people or messages" autoFocus />
      <Spacer size={spacing.sm} />
      {!query.trim() ? (
        <StateView
          icon="search"
          title="Search people and messages"
          message="Type a username, name, email address, or a word from a conversation."
        />
      ) : searching ? (
        <ListSkeleton rows={4} />
      ) : noResults ? (
        <StateView
          icon="search"
          title={`No results for “${query.trim()}”`}
          message="To start a new direct chat before backend search deploys, type the other user’s full email address."
        />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          {peopleResults?.length ? (
            <>
              <SectionHeader title="People" />
              {peopleResults.map(user => (
                <ListRow
                  key={user.id}
                  avatarName={user.name}
                  online={user.online}
                  title={user.name}
                  subtitle={user.email ? user.email : `@${user.username}`}
                  right={busy ? <YayText variant="micro" color={colors.textMuted}>Opening…</YayText> : undefined}
                  onPress={() => openPerson(user)}
                />
              ))}
              <Spacer size={spacing.sm} />
            </>
          ) : null}
          {messageResults?.length ? (
            <>
              <SectionHeader title="Messages" />
              {messageResults.map(item => (
                <ListRow
                  key={item.message.id}
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
              ))}
            </>
          ) : null}
        </ScrollView>
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
  const groupCategories = useMemo(
    () => communityService.categories().filter(c => c !== 'All'),
    [],
  );
  const [groupCategory, setGroupCategory] = useState('Other');
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

  const typedEmailUser = useMemo<User | null>(() => {
    const email = query.trim().toLowerCase();
    if (mode !== 'Direct' || !emailLike.test(email)) {
      return null;
    }
    if (data?.some(u => u.email?.toLowerCase() === email || u.id.toLowerCase() === email)) {
      return null;
    }
    return {
      id: email,
      name: email,
      username: email.split('@')[0],
      email,
      bio: '',
      online: false,
      lastSeen: new Date().toISOString(),
      isContact: false,
    };
  }, [data, mode, query]);

  const displayedUsers = useMemo(
    () => (typedEmailUser ? [typedEmailUser, ...filtered] : filtered),
    [filtered, typedEmailUser],
  );

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
      () => chatService.createConversation(selected, groupName, groupCategory),
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
        <>
          <TextField
            label="Group name"
            placeholder="Name your group"
            value={groupName}
            onChangeText={setGroupName}
          />
          <YayText variant="caption" color={colors.textSecondary} style={{marginBottom: spacing.xxs}}>
            Category
          </YayText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{gap: spacing.xxs, paddingBottom: spacing.sm}}>
            {groupCategories.map(cat => (
              <Chip
                key={cat}
                label={cat}
                active={cat === groupCategory}
                onPress={() => setGroupCategory(cat)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
      <View style={{flex: 1}}>
        <AsyncView
          loading={loading}
          error={error}
          offline={offline}
          onRetry={reload}
          data={data}
          isEmpty={displayedUsers.length === 0}
          emptyTitle={query ? 'No contacts found' : 'No contacts yet'}
          emptyMessage={
            query
              ? `Nothing matched “${query.trim()}”. Type the full email address to start a direct chat.`
              : 'Type a full email address to start chatting.'
          }>
          {() => (
            <FlatList
              data={displayedUsers}
              keyExtractor={u => u.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({item}) =>
                mode === 'Direct' ? (
                  <ListRow
                    avatarName={item.name}
                    online={item.online}
                    title={item.name}
                    subtitle={item.email ? item.email : `@${item.username}`}
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
        <View style={[styles.mediaPlaceholder, {backgroundColor: colors.mediaBox}]}>
          <Ionicons
            name={message.kind === 'image' ? 'image' : 'play-circle'}
            size={34}
            color={colors.textMuted}
          />
        </View>
        <YayText variant="micro" color={colors.textMuted} style={{marginTop: spacing.xxs}}>
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

const LinkCardPreview = ({
  card,
  mine,
}: {
  card: ChatLinkCard;
  mine: boolean;
}) => {
  if (card.type === 'action') {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${card.productName} action card preview. ${card.label}.`}
        style={[
          styles.linkCard,
          mine ? styles.linkCardMine : styles.linkCardTheirs,
        ]}>
        <View style={styles.linkIcon}>
          <Ionicons name={card.icon} size={18} color={colors.brandStrong} />
        </View>
        <View style={styles.linkCardContent}>
          <YayText variant="micro" color={colors.textMuted}>
            Trusted ecosystem link
          </YayText>
          <YayText variant="bodyStrong" numberOfLines={1}>
            {card.productName}
          </YayText>
          <YayText variant="micro" color={colors.brandStrong} numberOfLines={1}>
            {card.label}
          </YayText>
        </View>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`External link warning. This link leaves YaysApp for ${card.host}.`}
      style={[
        styles.linkCard,
        styles.externalWarningCard,
        mine ? styles.linkCardMine : styles.linkCardTheirs,
      ]}>
      <View style={[styles.linkIcon, {backgroundColor: colors.warningSoft}]}>
        <Ionicons name="warning" size={18} color={colors.warning} />
      </View>
      <View style={styles.linkCardContent}>
        <YayText variant="bodyStrong">External Link Warning</YayText>
        <YayText variant="micro" color={colors.textMuted} numberOfLines={2}>
          {`This link leaves YaysApp: ${card.host}`}
        </YayText>
      </View>
    </View>
  );
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
  selected,
}: {
  message: Message;
  mine: boolean;
  senderName?: string;
  quoted?: Message;
  quotedSenderName?: string;
  onLongPress: () => void;
  onPress?: () => void;
  onToggleReaction: (emoji: string) => void;
  selected?: boolean;
}) => {
  if (message.kind === 'system') {
    return (
      <YayText variant="micro" color={colors.textMuted} style={styles.systemLine}>
        {message.text}
      </YayText>
    );
  }
  const status = statusIconFor(message.status);
  const isMedia = !message.recalled && (message.kind === 'image' || message.kind === 'video');
  const linkCard =
    !message.recalled && message.kind === 'text' ? classifyChatLink(message.text) : null;
  return (
    <View
      style={[
        styles.bubbleWrap,
        mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs,
        selected && styles.bubbleWrapSelected,
      ]}>
      <Pressable
        onLongPress={message.recalled ? undefined : onLongPress}
        onPress={onPress}
        style={({pressed}) => [
          styles.bubble,
          mine ? (isMedia ? styles.bubbleMediaMine : styles.bubbleMine) : styles.bubbleTheirs,
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
              {quoted.recalled ? 'This message was deleted' : `${kindPrefix(quoted)}${quoted.text}`}
            </YayText>
          </View>
        ) : null}
        {message.recalled ? (
          <YayText
            variant="caption"
            color={mine ? colors.brandSoft : colors.textMuted}
            style={{fontStyle: 'italic'}}>
            {mine ? 'You deleted this message' : 'This message was deleted'}
          </YayText>
        ) : (
          <View>
            <AttachmentBody message={message} mine={mine} />
            {linkCard ? <LinkCardPreview card={linkCard} mine={mine} /> : null}
          </View>
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
        {message.edited && !message.recalled ? (
          <YayText variant="micro" color={colors.textFaint}>
            · edited
          </YayText>
        ) : null}
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
  const showToast = toast.show;
  const {clearConversation, setActiveConversation} = useUnread();
  const {data, loading, error, offline, reload} = useAsync(async () => {
    const conversation = await chatService.getConversation(conversationId);
    const page = await chatService.getMessages(conversationId);
    const members = await Promise.all(conversation.memberIds.map(id => userService.getUser(id)));
    return {conversation, messages: page.items, members, nextCursor: page.nextCursor};
  }, [conversationId]);

  const [msgs, setMsgs] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sheetMsg, setSheetMsg] = useState<Message | null>(null);
  const [confirmCall, setConfirmCall] = useState<'voice' | 'video' | null>(null);
  const [confirmMsgDelete, setConfirmMsgDelete] = useState<{message: Message; everyone: boolean} | null>(null);
  const [emojiTarget, setEmojiTarget] = useState<'composer' | {message: Message} | null>(null);
  const [attachSheet, setAttachSheet] = useState(false);
  // Multi-select: null = normal mode, a Set = selection mode with those ids.
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const unreadAnchorId = useRef<string | null>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());
  const lastNotifiedIncomingId = useRef<string | null>(null);
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
    const scheduledTimers = timers.current;
    return () => {
      scheduledTimers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (data) {
      // Anchor the unread separator to a message id so it doesn't drift as
      // new messages are appended to the list.
      const list = data.messages.filter(m => !m.deleted);
      const count = data.conversation.unreadCount;
      unreadAnchorId.current = count > 0 ? list[list.length - count]?.id ?? null : null;
      seenMessageIds.current = new Set(list.map(m => m.id));
      if (lastNotifiedIncomingId.current === null) {
        lastNotifiedIncomingId.current = latestIncomingMessage(list)?.id ?? '';
      }
      setMsgs(list);
      setNextCursor(data.nextCursor);
      setActiveConversation(conversationId);
      clearConversation(conversationId);
      chatService.markRead(conversationId);
    }
  }, [data, conversationId, clearConversation, setActiveConversation]);

  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    return chatService.subscribeConversation(conversationId, event => {
      if (event.type === 'message.upsert') {
        if (event.message.senderId === ME_ID) {
          seenMessageIds.current.add(event.message.id);
          setMsgs(prev => {
            const exists = prev.some(
              m => m.id === event.message.id || (event.message.clientId && m.clientId === event.message.clientId),
            );
            return exists ? mergeMessages(prev, [event.message]).filter(m => !m.deleted) : prev;
          });
          return;
        }
        const isNewIncoming = !seenMessageIds.current.has(event.message.id);
        seenMessageIds.current.add(event.message.id);
        clearConversation(conversationId);
        setMsgs(prev => {
          const withReadReceipts = isNewIncoming
            ? prev.map(m =>
                m.senderId === ME_ID && m.status !== 'failed' && m.status !== 'sending'
                  ? {...m, status: 'read' as const}
                  : m,
              )
            : prev;
          return mergeMessages(withReadReceipts, [event.message]).filter(m => !m.deleted);
        });
        chatService.markRead(conversationId);
        return;
      }
      if (event.type === 'message.deleted') {
        if (event.message?.recalled) {
          setMsgs(prev => prev.map(m => (m.id === event.messageId ? event.message! : m)));
        } else {
          setMsgs(prev => prev.filter(m => m.id !== event.messageId));
        }
        return;
      }
      if (event.type === 'typing.changed') {
        setOtherTyping(event.userIds.some(id => id !== ME_ID));
      }
    });
  }, [conversationId, showToast, clearConversation]);

  useEffect(() => {
    const latestIncoming = latestIncomingMessage(msgs);
    if (!latestIncoming) {
      return;
    }
    if (lastNotifiedIncomingId.current === null) {
      lastNotifiedIncomingId.current = latestIncoming.id;
      return;
    }
    if (lastNotifiedIncomingId.current !== latestIncoming.id) {
      lastNotifiedIncomingId.current = latestIncoming.id;
      showToast(latestIncoming.text.trim() || 'New message', 'info');
    }
  }, [msgs, showToast]);

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
        <Row gap={spacing.xs}>
          <Avatar name={conversation.title} size={34} />
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
        </Row>
      ),
      headerRight: () => (
        <Row gap={0}>
          <IconButton icon="call" label="Voice call" onPress={() => setConfirmCall('voice')} />
          <IconButton icon="videocam" label="Video call" onPress={() => setConfirmCall('video')} />
          <IconButton
            icon="ellipsis-horizontal-circle"
            label="Conversation details"
            onPress={() => navigation.navigate('ConversationDetails', {conversationId})}
          />
        </Row>
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
      chatService.setTyping(conversationId, senderId, true);
      const t2 = setTimeout(() => {
        chatService.setTyping(conversationId, senderId, false);
        localId.current += 1;
        chatService
          .simulateIncomingMessage(conversationId, {
            senderId,
            text: CANNED_REPLIES[localId.current % CANNED_REPLIES.length],
          })
          .catch(() => undefined);
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
      clientId?: string;
    }) => {
      localId.current += 1;
      const clientId = input.clientId ?? `client_${Date.now()}_${localId.current}`;
      const temp: Message = {
        id: clientId,
        clientId,
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
      setMsgs(prev => mergeMessages(prev, [temp]));
      chatService
        .sendMessage(conversationId, {...input, clientId})
        .then(saved => {
          setMsgs(prev => mergeMessages(prev, [saved]));
          if ((input.kind ?? 'text') === 'text') {
            scheduleIncomingReply();
          }
        })
        .catch(() => {
          setMsgs(prev =>
            prev.map(m =>
              (m.clientId ?? m.id) === clientId ? {...m, status: 'failed'} : m,
            ),
          );
        });
    },
    [conversationId, scheduleIncomingReply],
  );

  const loadOlderMessages = useCallback(async () => {
    if (!nextCursor || loadingOlder) {
      return;
    }
    setLoadingOlder(true);
    try {
      const page = await chatService.getMessages(conversationId, nextCursor);
      setMsgs(prev => mergeMessages(page.items.filter(m => !m.deleted), prev));
      setNextCursor(page.nextCursor);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder, nextCursor, toast]);

  const sendText = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    if (editingMsg) {
      const target = editingMsg;
      setEditingMsg(null);
      setText('');
      chatService
        .editMessage(conversationId, target.id, trimmed)
        .then(updated => {
          setMsgs(prev => prev.map(x => (x.id === target.id ? updated : x)));
          toast.show('Message updated', 'success');
        })
        .catch(e => toast.show(errorMessage(e), 'error'));
      return;
    }
    doSend({text: trimmed, replyToId: replyTo?.id});
    setText('');
    setReplyTo(null);
  };

  const toggleSelect = (m: Message) => {
    if (m.kind === 'system') {
      return;
    }
    setSelectedIds(prev => {
      const next = new Set(prev ?? []);
      if (next.has(m.id)) {
        next.delete(m.id);
      } else {
        next.add(m.id);
      }
      return next;
    });
  };

  const deleteSelected = async () => {
    const ids = selectedIds ? [...selectedIds] : [];
    if (ids.length === 0) {
      return;
    }
    await Promise.all(
      ids.map(id => chatService.deleteMessage(conversationId, id, false).catch(() => undefined)),
    );
    setMsgs(prev => prev.filter(m => !ids.includes(m.id)));
    setSelectedIds(null);
    toast.show(ids.length === 1 ? 'Message deleted' : `${ids.length} messages deleted`, 'success');
  };

  const retryFailed = (m: Message) => {
    doSend({
      text: m.text,
      kind: m.kind,
      attachment: m.attachment,
      replyToId: m.replyToId,
      clientId: m.clientId ?? m.id,
    });
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
    // Attaching cancels an in-progress edit — an attachment is a new message.
    if (editingMsg) {
      setEditingMsg(null);
      setText('');
    }
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
    const visible = withDerivedReadReceipts(msgs.filter(m => !m.deleted));
    const out: ConvoRowItem[] = [];
    let lastDay = '';
    visible.forEach((m, i) => {
      const day = new Date(m.createdAt).toDateString();
      if (day !== lastDay) {
        out.push({rowKey: `day_${day}_${i}`, type: 'date', label: dayLabel(m.createdAt)});
        lastDay = day;
      }
      if (m.id === unreadAnchorId.current) {
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More reactions"
            onPress={() => {
              close();
              setEmojiTarget({message: m});
            }}
            hitSlop={6}
            style={styles.moreReactions}>
            <Ionicons name="add" size={20} color={colors.textSecondary} />
          </Pressable>
        </Row>
        <Divider />
        <ListRow
          icon="arrow-undo"
          title="Reply"
          chevron={false}
          onPress={() => {
            close();
            // Replying cancels any in-progress edit so the two bars never
            // stack and the edit can't silently swallow the reply.
            if (editingMsg) {
              setEditingMsg(null);
              setText('');
            }
            setReplyTo(m);
          }}
        />
        <ListRow
          icon="copy"
          title="Copy"
          chevron={false}
          onPress={() => {
            close();
            Clipboard.setString(m.text);
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
        {mine && m.kind === 'text' && !m.recalled ? (
          <ListRow
            icon="create-outline"
            title="Edit"
            chevron={false}
            onPress={() => {
              close();
              setReplyTo(null);
              setEditingMsg(m);
              setText(m.text);
            }}
          />
        ) : null}
        <ListRow
          icon="checkmark-circle-outline"
          title="Select messages"
          chevron={false}
          onPress={() => {
            close();
            setEditingMsg(null);
            setReplyTo(null);
            setSelectedIds(new Set([m.id]));
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
              // Single pinned message per chat: pinning one unpins the rest.
              setMsgs(prev =>
                prev.map(x => ({...x, pinned: x.id === m.id ? !x.pinned : false})),
              );
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
          onPress={() => {
            close();
            setConfirmMsgDelete({message: m, everyone: false});
          }}
        />
        {mine ? (
          <ListRow
            icon="trash-bin"
            iconTone={colors.danger}
            title="Delete for everyone"
            chevron={false}
            onPress={() => {
              close();
              setConfirmMsgDelete({message: m, everyone: true});
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
                onEndReached={loadOlderMessages}
                onEndReachedThreshold={0.2}
                ListFooterComponent={
                  loadingOlder ? (
                    <YayText
                      variant="micro"
                      color={colors.textMuted}
                      style={{textAlign: 'center', paddingVertical: spacing.sm}}>
                      Loading older messages...
                    </YayText>
                  ) : null
                }
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
                      onLongPress={() =>
                        selectedIds ? toggleSelect(m) : setSheetMsg(m)
                      }
                      onPress={
                        selectedIds
                          ? () => toggleSelect(m)
                          : mine && m.status === 'failed'
                          ? () => retryFailed(m)
                          : undefined
                      }
                      onToggleReaction={
                        // In selection mode reaction pills select the message
                        // instead of mutating reactions.
                        selectedIds ? () => toggleSelect(m) : emoji => toggleReaction(m, emoji)
                      }
                      selected={selectedIds?.has(m.id) ?? false}
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
              {selectedIds ? (
                <View style={styles.composer}>
                  <Row style={{justifyContent: 'space-between'}}>
                    <YayText variant="bodyStrong">
                      {`${selectedIds.size} selected`}
                    </YayText>
                    <Row gap={spacing.md}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cancel selection"
                        hitSlop={8}
                        onPress={() => setSelectedIds(null)}>
                        <YayText variant="bodyStrong" color={colors.textSecondary}>
                          Cancel
                        </YayText>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${selectedIds.size} messages`}
                        disabled={selectedIds.size === 0}
                        onPress={deleteSelected}
                        style={({pressed}) => [
                          styles.selectionDelete,
                          (pressed || selectedIds.size === 0) && {opacity: 0.5},
                        ]}>
                        <Ionicons name="trash" size={15} color={colors.danger} />
                        <YayText variant="bodyStrong" color={colors.danger}>
                          Delete
                        </YayText>
                      </Pressable>
                    </Row>
                  </Row>
                </View>
              ) : (
              <View style={styles.composer}>
                {editingMsg ? (
                  <Row gap={spacing.xs} style={styles.replyBar}>
                    <Ionicons name="create-outline" size={15} color={colors.brand} />
                    <View style={{flex: 1}}>
                      <YayText variant="micro" color={colors.brandStrong}>
                        Editing message
                      </YayText>
                      <YayText variant="micro" color={colors.textMuted} numberOfLines={1}>
                        {editingMsg.text}
                      </YayText>
                    </View>
                    <IconButton
                      icon="close"
                      size={17}
                      onPress={() => {
                        setEditingMsg(null);
                        setText('');
                      }}
                      label="Cancel edit"
                    />
                  </Row>
                ) : null}
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
                {emojiTarget === 'composer' ? (
                  <View style={styles.composerEmojiTray}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.composerEmojiRow}>
                      {COMPOSER_EMOJIS.map(emoji => (
                        <Pressable
                          key={emoji}
                          accessibilityRole="button"
                          accessibilityLabel={`Insert ${emoji}`}
                          onPress={() => setText(t => `${t}${emoji}`)}
                          style={({pressed}) => [
                            styles.composerEmojiButton,
                            pressed && styles.composerEmojiButtonPressed,
                          ]}>
                          <YayText style={styles.composerEmojiText}>{emoji}</YayText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
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
                  <IconButton
                    icon={emojiTarget === 'composer' ? 'close-circle' : 'happy-outline'}
                    label={emojiTarget === 'composer' ? 'Close emoji' : 'Emoji'}
                    onPress={() => setEmojiTarget(current => (current === 'composer' ? null : 'composer'))}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={editingMsg ? 'Save edit' : 'Send'}
                    disabled={!text.trim()}
                    onPress={sendText}
                    style={!text.trim() ? {opacity: 0.4} : null}>
                    <Oval size={38}>
                      <Ionicons
                        name={editingMsg ? 'checkmark' : 'paper-plane'}
                        size={18}
                        color={colors.textOnBrand}
                      />
                    </Oval>
                  </Pressable>
                </Row>
              </View>
              )}
            </View>
          )}
        </AsyncView>
      </KeyboardAvoidingView>
      <BottomSheet visible={sheetMsg != null} onClose={() => setSheetMsg(null)} title="Message">
        {sheetMsg ? sheetActions(sheetMsg) : null}
      </BottomSheet>
      <ConfirmSheet
        visible={confirmCall != null}
        onClose={() => setConfirmCall(null)}
        title={confirmCall === 'video' ? 'Start video call?' : 'Start voice call?'}
        message={
          conversation
            ? `${confirmCall === 'video' ? 'Video call' : 'Call'} ${conversation.title}?`
            : undefined
        }
        confirmLabel={confirmCall === 'video' ? 'Video call' : 'Call'}
        onConfirm={() =>
          toast.show(
            confirmCall === 'video'
              ? 'Video call started (preview)'
              : 'Voice call started (preview)',
            'success',
          )
        }
      />
      <ConfirmSheet
        visible={confirmMsgDelete != null}
        onClose={() => setConfirmMsgDelete(null)}
        title={confirmMsgDelete?.everyone ? 'Delete for everyone?' : 'Delete this message?'}
        message={
          confirmMsgDelete?.everyone
            ? 'This message will be removed for everyone in this chat.'
            : 'This message will be deleted for you only.'
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!confirmMsgDelete) {
            return;
          }
          const {message, everyone} = confirmMsgDelete;
          await chatService.deleteMessage(conversationId, message.id, everyone).catch(() => undefined);
          if (everyone) {
            setMsgs(prev =>
              prev.map(x => (x.id === message.id ? {...x, recalled: true, text: ''} : x)),
            );
            toast.show('Deleted for everyone', 'success');
          } else {
            setMsgs(prev => prev.filter(x => x.id !== message.id));
            toast.show('Deleted for you', 'success');
          }
        }}
      />
      <EmojiPicker
        visible={emojiTarget != null && emojiTarget !== 'composer'}
        onClose={() => setEmojiTarget(null)}
        title="React with any emoji"
        onSelect={emoji => {
          if (emojiTarget && emojiTarget !== 'composer') {
            toggleReaction(emojiTarget.message, emoji);
            setEmojiTarget(null);
          }
        }}
      />
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
          onPress={async () => {
            setEditNameVisible(false);
            try {
              await chatService.renameGroup(conversationId, nameDraft);
              if (data) {
                setData({...data, title: nameDraft.trim()});
              }
              toast.show('Group name updated', 'success');
            } catch (e) {
              toast.show(errorMessage(e), 'error');
            }
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
              onPress={async () => {
                const next: GroupRole = roles[sheetMember.id] === 'admin' ? 'member' : 'admin';
                setSheetMember(null);
                try {
                  await chatService.setGroupRole(conversationId, sheetMember.id, next);
                  setRoles(prev => ({...prev, [sheetMember.id]: next}));
                  toast.show(
                    next === 'admin'
                      ? `${sheetMember.name} is now an admin`
                      : `${sheetMember.name} is no longer an admin`,
                    'success',
                  );
                } catch (e) {
                  toast.show(errorMessage(e), 'error');
                }
              }}
            />
            <ListRow
              icon="person-remove"
              iconTone={colors.danger}
              title="Remove from group"
              chevron={false}
              onPress={async () => {
                setSheetMember(null);
                try {
                  await chatService.removeGroupMember(conversationId, sheetMember.id);
                  setRemovedIds(prev => [...prev, sheetMember.id]);
                  toast.show(`${sheetMember.name} removed`, 'success');
                } catch (e) {
                  toast.show(errorMessage(e), 'error');
                }
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
                Scan to add {user.name} on YaysApp
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
  selectionDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  bubbleWrapSelected: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xxs,
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
  bubbleMediaMine: {
    backgroundColor: colors.bubbleMedia,
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
  moreReactions: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
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
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 210,
    maxWidth: 260,
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  linkCardMine: {
    backgroundColor: colors.surface,
    borderColor: colors.brandBorder,
  },
  linkCardTheirs: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
  },
  externalWarningCard: {
    borderColor: colors.warning,
  },
  linkCardContent: {
    flex: 1,
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
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
  composerEmojiTray: {
    marginBottom: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: spacing.xxs,
  },
  composerEmojiRow: {
    paddingHorizontal: spacing.xs,
    gap: spacing.xxs,
  },
  composerEmojiButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  composerEmojiButtonPressed: {
    backgroundColor: colors.brandSoft,
  },
  composerEmojiText: {
    fontSize: 24,
    lineHeight: 30,
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
