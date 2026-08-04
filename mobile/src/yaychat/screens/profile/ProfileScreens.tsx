/**
 * YaysApp Profile tab screens.
 *
 * Covers the profile hub, profile editing, social lists (contacts, blocked,
 * notifications), every settings surface, help/about, account deletion, and
 * the Developer (preview controls) screen used to demo global app states.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, Share, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../../design/tokens';
import {
  AsyncView,
  Avatar,
  Badge,
  Banner,
  BottomSheet,
  BrandMark,
  Button,
  Card,
  Chip,
  ConfirmSheet,
  CountBubble,
  Divider,
  IconButton,
  ListRow,
  ListSkeleton,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  Spacer,
  SwitchRow,
  CheckRow,
  StatTile,
  TextField,
  YayText,
} from '../../design/components';
import {
  authService,
  featureFlags,
  notificationService,
  settingsService,
  setSimulatedOffline,
  simulation,
  userService,
} from '../../services';
import type {AppNotification, SettingsState, User} from '../../types/models';
import type {ProfileStackParamList} from '../../types/navigation';
import {useAsync, useAction} from '../../state/hooks';
import {useAuth, useToast} from '../../state/AppProviders';

type ProfileProps<R extends keyof ProfileStackParamList> = NativeStackScreenProps<
  ProfileStackParamList,
  R
>;

const APP_VERSION = 'YaysApp 0.1.0 — Milestone 1 preview';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) {
    return 'Just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  const weeks = Math.floor(days / 7);
  return weeks < 5 ? `${weeks}w ago` : new Date(iso).toLocaleDateString();
};

/** Deterministic pseudo-QR grid derived from a seed string. */
const qrMatrix = (seed: string, size = 21): boolean[][] => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0 || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
  const grid: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      row.push(next() > 0.5);
    }
    grid.push(row);
  }
  // Finder-pattern-like corners so it reads as a QR code.
  const stampFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const ring = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[oy + y][ox + x] = ring || core;
      }
    }
  };
  stampFinder(0, 0);
  stampFinder(size - 7, 0);
  stampFinder(0, size - 7);
  return grid;
};

/**
 * Shared settings pattern: loads settings once, exposes an optimistic `patch`
 * that updates local state immediately and persists fire-and-forget with a
 * toast on failure. Every settings screen renders through this shell.
 */
const SettingsShell = ({
  children,
  header,
}: {
  header?: React.ReactNode;
  children: (settings: SettingsState, patch: (next: SettingsState) => void) => React.ReactNode;
}) => {
  const toast = useToast();
  const {data, setData, loading, error, offline, reload} = useAsync(() => settingsService.get(), []);
  const patch = (next: SettingsState) => {
    setData(next);
    settingsService.update(next).catch(() => {
      toast.show('Could not save that setting. Please try again.', 'error');
    });
  };
  return (
    <Screen>
      {header}
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        skeleton={<ListSkeleton rows={4} />}>
        {settings => <>{children(settings, patch)}</>}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ProfileHomeScreen
// ---------------------------------------------------------------------------

export const ProfileHomeScreen = ({navigation}: ProfileProps<'ProfileHome'>) => {
  const {session, signOut, updateUser} = useAuth();
  const toast = useToast();
  const [signOutVisible, setSignOutVisible] = useState(false);
  const notifications = useAsync(() => notificationService.list(), []);
  const unreadCount = (notifications.data ?? []).filter(n => !n.read).length;
  const user = session?.user;

  useEffect(() => {
    let mounted = true;
    userService
      .me()
      .then(fresh => {
        if (mounted) {
          updateUser(fresh);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goRoot = (route: 'WalletOverview' | 'Ecosystem') => {
    (navigation as any).navigate(route);
  };

  return (
    <Screen>
      <Card onPress={() => navigation.navigate('EditProfile')}>
        <Row gap={spacing.md}>
          <Avatar name={user?.name ?? 'Yay User'} size={72} />
          <View style={{flex: 1}}>
            <YayText variant="title" numberOfLines={1}>
              {user?.name ?? 'Yay user'}
            </YayText>
            <YayText variant="caption" color={colors.textMuted}>
              @{user?.username ?? 'username'}
            </YayText>
            {user?.bio ? (
              <YayText variant="caption" color={colors.textSecondary} numberOfLines={2}>
                {user.bio}
              </YayText>
            ) : null}
          </View>
          <IconButton
            icon="qr-code-outline"
            label="Show my QR code"
            color={colors.brand}
            onPress={() => navigation.navigate('QrProfile')}
          />
        </Row>
      </Card>

      <SectionHeader title="Social" />
      <Card style={styles.sectionCard}>
        <ListRow
          title="Friends"
          subtitle="Your YaysApp contacts"
          icon="people-outline"
          onPress={() => navigation.navigate('Contacts')}
        />
        <Divider />
        <ListRow
          title="Blocked users"
          subtitle="People you have blocked"
          icon="hand-left-outline"
          onPress={() => navigation.navigate('BlockedUsers')}
        />
        <Divider />
        <ListRow
          title="Notifications"
          subtitle="Activity across chats, communities, and rewards"
          icon="notifications-outline"
          right={<CountBubble count={unreadCount} />}
          onPress={() => navigation.navigate('Notifications')}
        />
      </Card>

      <SectionHeader title="Preferences" />
      <Card style={styles.sectionCard}>
        <ListRow title="Notification settings" icon="notifications-circle-outline" onPress={() => navigation.navigate('NotificationSettings')} />
        <Divider />
        <ListRow title="Privacy" icon="lock-closed-outline" onPress={() => navigation.navigate('PrivacySettings')} />
        <Divider />
        <ListRow title="Chat settings" icon="chatbubble-ellipses-outline" onPress={() => navigation.navigate('ChatSettings')} />
        <Divider />
        <ListRow title="Community settings" icon="people-circle-outline" onPress={() => navigation.navigate('CommunitySettings')} />
        <Divider />
        <ListRow title="AI settings" icon="sparkles-outline" onPress={() => navigation.navigate('AiSettings')} />
        <Divider />
        <ListRow title="Rewards settings" icon="gift-outline" onPress={() => navigation.navigate('RewardsSettings')} />
        <Divider />
        <ListRow title="Appearance" icon="color-palette-outline" onPress={() => navigation.navigate('Appearance')} />
        <Divider />
        <ListRow title="Language" icon="globe-outline" onPress={() => navigation.navigate('Language')} />
        <Divider />
        <ListRow title="Accessibility" icon="accessibility-outline" onPress={() => navigation.navigate('Accessibility')} />
        <Divider />
        <ListRow title="Data and storage" icon="server-outline" onPress={() => navigation.navigate('DataStorage')} />
      </Card>

      <SectionHeader title="Wallet & ecosystem" />
      <Card style={styles.sectionCard}>
        <ListRow
          title="Wallet preview"
          subtitle="Simulated balances — no real funds"
          icon="wallet-outline"
          onPress={() => goRoot('WalletOverview')}
        />
        <Divider />
        <ListRow
          title="Indexx ecosystem"
          subtitle="Explore connected Indexx products"
          icon="planet-outline"
          onPress={() => goRoot('Ecosystem')}
        />
        <Divider />
        <ListRow
          title="Wallet security settings"
          subtitle="PIN, biometrics, and recovery"
          icon="shield-checkmark-outline"
          onPress={() => toast.show('Arrives with wallet setup (Milestone 7)')}
        />
      </Card>

      <SectionHeader title="Account" />
      <Card style={styles.sectionCard}>
        <ListRow title="Devices" icon="phone-portrait-outline" onPress={() => navigation.navigate('Devices')} />
        <Divider />
        <ListRow title="Help center" icon="help-buoy-outline" onPress={() => navigation.navigate('Help')} />
        <Divider />
        <ListRow title="About & legal" icon="document-text-outline" onPress={() => navigation.navigate('AboutLegal')} />
        <Divider />
        <ListRow
          title="Preview controls"
          subtitle="Demo offline, errors, and latency"
          icon="construct-outline"
          onPress={() => navigation.navigate('Developer')}
        />
        <Divider />
        <ListRow
          title="Delete account"
          icon="trash-outline"
          iconTone={colors.danger}
          onPress={() => navigation.navigate('DeleteAccount')}
        />
        <Divider />
        <ListRow
          title="Sign out"
          icon="log-out-outline"
          iconTone={colors.danger}
          chevron={false}
          onPress={() => setSignOutVisible(true)}
        />
      </Card>

      <Spacer />
      <YayText variant="caption" color={colors.textFaint} style={{textAlign: 'center'}}>
        {APP_VERSION}
      </YayText>

      <ConfirmSheet
        visible={signOutVisible}
        onClose={() => setSignOutVisible(false)}
        title="Sign out?"
        message="You can sign back in any time. Your chats stay safe."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => {
          signOut();
        }}
      />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// EditProfileScreen
// ---------------------------------------------------------------------------

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export const EditProfileScreen = ({navigation}: ProfileProps<'EditProfile'>) => {
  const {session, updateUser} = useAuth();
  const toast = useToast();
  const {busy, perform} = useAction();
  const user = session?.user;
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [errors, setErrors] = useState<{name?: string; username?: string}>({});

  const save = async () => {
    const nextErrors: {name?: string; username?: string} = {};
    if (name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters.';
    }
    if (!USERNAME_RE.test(username)) {
      nextErrors.username = 'Use 3–20 lowercase letters, numbers, or underscores.';
    }
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.username) {
      return;
    }
    const result = await perform(
      () => userService.updateProfile({name: name.trim(), username, bio: bio.trim()}),
      message => toast.show(message, 'error'),
    );
    if (result) {
      updateUser(result);
      toast.show('Profile updated', 'success');
      navigation.goBack();
    }
  };

  return (
    <Screen>
      <View style={{alignItems: 'center', marginBottom: spacing.lg}}>
        <Avatar name={name || 'Yay User'} size={72} />
        <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.xs}}>
          Custom avatars arrive in a later milestone
        </YayText>
      </View>
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        error={errors.name}
        autoCapitalize="words"
      />
      <TextField
        label="Username"
        value={username}
        onChangeText={t => setUsername(t.toLowerCase())}
        placeholder="username"
        error={errors.username}
        hint="3–20 lowercase letters, numbers, or underscores."
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Say something about yourself"
        multiline
        numberOfLines={3}
        style={{marginBottom: spacing.lg}}
      />
      <Button label="Save changes" onPress={save} loading={busy} icon="checkmark" />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// QrProfileScreen
// ---------------------------------------------------------------------------

export const QrProfileScreen = (_props: ProfileProps<'QrProfile'>) => {
  const {session} = useAuth();
  const toast = useToast();
  const user = session?.user;
  const seed = user?.username ?? 'yaychat';
  const grid = useMemo(() => qrMatrix(seed), [seed]);
  const cell = 9;

  const share = async () => {
    try {
      await Share.share({
        message: `Add me on YaysApp! I'm @${seed} — https://yay.chat/u/${seed}`,
      });
    } catch {
      toast.show('Could not open the share sheet.', 'error');
    }
  };

  return (
    <Screen>
      <Card style={{alignItems: 'center', paddingVertical: spacing.xl}}>
        <Avatar name={user?.name ?? 'Yay User'} size={64} />
        <Spacer size={spacing.sm} />
        <YayText variant="title">{user?.name ?? 'Yay user'}</YayText>
        <YayText variant="caption" color={colors.textMuted}>
          @{seed}
        </YayText>
        <Spacer />
        <View style={styles.qrFrame}>
          {grid.map((row, y) => (
            <View key={y} style={{flexDirection: 'row'}}>
              {row.map((on, x) => (
                <View
                  key={x}
                  style={{
                    width: cell,
                    height: cell,
                    backgroundColor: on ? colors.textPrimary : colors.surfaceRaised,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
        <Spacer size={spacing.sm} />
        <YayText variant="caption" color={colors.textMuted}>
          Scan to add me on YaysApp
        </YayText>
      </Card>
      <Spacer />
      <Button label="Share" icon="share-outline" onPress={share} />
      <Spacer size={spacing.xs} />
      <Button
        label="Scan code"
        kind="secondary"
        icon="scan-outline"
        onPress={() => toast.show('Camera scanning arrives in a later milestone.')}
      />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// ContactsScreen
// ---------------------------------------------------------------------------

export const ContactsScreen = (_props: ProfileProps<'Contacts'>) => {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null);
  const {data, setData, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => userService.contacts(),
    [],
  );

  const filtered = (data ?? []).filter(u => {
    const q = query.trim().toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search friends" />
      <Spacer size={spacing.sm} />
      <Pressable onPress={() => toast.show('Invites open in a later milestone.')}>
        <Banner
          tone="success"
          icon="person-add"
          text="Invite friends to YaysApp and earn YayPoints when they join."
        />
      </Pressable>
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={filtered.length === 0}
        emptyTitle={query ? 'No matches' : 'No friends yet'}
        emptyMessage={
          query
            ? 'Try a different name or username.'
            : 'When you connect with people on YaysApp they show up here.'
        }>
        {() => (
          <Card style={styles.sectionCard}>
            {filtered.map((u, i) => (
              <View key={u.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  avatarName={u.name}
                  online={u.online}
                  title={u.name}
                  subtitle={u.online ? 'Online' : `Last seen ${timeAgo(u.lastSeen)}`}
                  onPress={() => setSelected(u)}
                  chevron={false}
                />
              </View>
            ))}
          </Card>
        )}
      </AsyncView>

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        <ListRow
          title="Message"
          icon="chatbubble-outline"
          chevron={false}
          onPress={() => {
            setSelected(null);
            toast.show('Open the Chats tab to message this friend.');
          }}
        />
        <Divider />
        <ListRow
          title="View profile"
          icon="person-outline"
          chevron={false}
          onPress={() => {
            setSelected(null);
            toast.show('Full profiles arrive in a later milestone.');
          }}
        />
        <Divider />
        <ListRow
          title="Remove friend"
          icon="person-remove-outline"
          iconTone={colors.danger}
          chevron={false}
          onPress={() => {
            setConfirmRemove(selected);
            setSelected(null);
          }}
        />
      </BottomSheet>

      <ConfirmSheet
        visible={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title={`Remove ${confirmRemove?.name ?? 'friend'}?`}
        message="They will no longer appear in your friends list."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          const target = confirmRemove;
          if (target) {
            setData(prev => (prev ? prev.filter(u => u.id !== target.id) : prev));
            toast.show(`${target.name} removed from friends`, 'success');
          }
        }}
      />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// BlockedUsersScreen
// ---------------------------------------------------------------------------

export const BlockedUsersScreen = (_props: ProfileProps<'BlockedUsers'>) => {
  const toast = useToast();
  const {data, loading, error, offline, reload} = useAsync(() => userService.blockedUsers(), []);
  const {busy, perform} = useAction();

  const unblock = async (u: User) => {
    const done = await perform(
      () => userService.setBlocked(u.id, false),
      message => toast.show(message, 'error'),
    );
    if (done !== null) {
      toast.show(`${u.name} unblocked`, 'success');
      reload();
    }
  };

  return (
    <Screen>
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={(data ?? []).length === 0}
        emptyTitle="No blocked users"
        emptyMessage="People you block will appear here."
        emptyAction={undefined}>
        {users => (
          <Card style={styles.sectionCard}>
            {users.map((u, i) => (
              <View key={u.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  avatarName={u.name}
                  title={u.name}
                  subtitle={`@${u.username}`}
                  chevron={false}
                  right={
                    <Button
                      label="Unblock"
                      kind="secondary"
                      onPress={() => unblock(u)}
                      disabled={busy}
                      style={styles.smallButton}
                    />
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

// ---------------------------------------------------------------------------
// NotificationsScreen
// ---------------------------------------------------------------------------

const NOTIFICATION_ICONS: Record<AppNotification['kind'], string> = {
  chat: 'chatbubble',
  community: 'people',
  reward: 'gift',
  system: 'information-circle',
};

export const NotificationsScreen = (_props: ProfileProps<'Notifications'>) => {
  const {data, loading, error, offline, reload} = useAsync(() => notificationService.list(), []);
  const hasUnread = (data ?? []).some(n => !n.read);

  const markAll = async () => {
    await notificationService.markAllRead();
    reload();
  };

  return (
    <Screen>
      {hasUnread ? (
        <Button label="Mark all read" kind="ghost" icon="checkmark-done" onPress={markAll} />
      ) : null}
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={(data ?? []).length === 0}
        emptyTitle="You're all caught up"
        emptyMessage="Notifications about chats, communities, and rewards land here."
        skeleton={<ListSkeleton />}>
        {items => (
          <Card style={styles.sectionCard}>
            {items.map((n, i) => (
              <View key={n.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  icon={NOTIFICATION_ICONS[n.kind]}
                  title={n.title}
                  subtitle={`${n.body} · ${timeAgo(n.createdAt)}`}
                  chevron={false}
                  right={!n.read ? <View style={styles.unreadDot} /> : undefined}
                />
              </View>
            ))}
          </Card>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Settings screens (all built on SettingsShell)
// ---------------------------------------------------------------------------

export const NotificationSettingsScreen = (_props: ProfileProps<'NotificationSettings'>) => (
  <SettingsShell>
    {(s, patch) => (
      <Card style={styles.sectionCard}>
        <SwitchRow
          label="Messages"
          description="Alerts for new direct and group messages."
          value={s.notifications.messages}
          onValueChange={v => patch({...s, notifications: {...s.notifications, messages: v}})}
        />
        <Divider />
        <SwitchRow
          label="Communities"
          description="Announcements, events, and mentions from communities you joined."
          value={s.notifications.communities}
          onValueChange={v => patch({...s, notifications: {...s.notifications, communities: v}})}
        />
        <Divider />
        <SwitchRow
          label="Rewards"
          description="Streak reminders and reward confirmations."
          value={s.notifications.rewards}
          onValueChange={v => patch({...s, notifications: {...s.notifications, rewards: v}})}
        />
        <Divider />
        <SwitchRow
          label="Sounds"
          description="Play a sound with each notification."
          value={s.notifications.sounds}
          onValueChange={v => patch({...s, notifications: {...s.notifications, sounds: v}})}
        />
        <Spacer size={spacing.xs} />
        <YayText variant="caption" color={colors.textMuted}>
          Muted chats never notify you regardless of these settings.
        </YayText>
      </Card>
    )}
  </SettingsShell>
);

export const PrivacySettingsScreen = (_props: ProfileProps<'PrivacySettings'>) => (
  <SettingsShell
    header={
      <Banner
        tone="info"
        text="Read receipts show friends when you've read their messages. Turn them off and you won't see theirs either."
      />
    }>
    {(s, patch) => (
      <Card style={styles.sectionCard}>
        <SwitchRow
          label="Last seen"
          description="Let friends see when you were last active."
          value={s.privacy.lastSeen}
          onValueChange={v => patch({...s, privacy: {...s.privacy, lastSeen: v}})}
        />
        <Divider />
        <SwitchRow
          label="Read receipts"
          description="Show others when you have read their messages."
          value={s.privacy.readReceipts}
          onValueChange={v => patch({...s, privacy: {...s.privacy, readReceipts: v}})}
        />
        <Divider />
        <SwitchRow
          label="Discoverable by username"
          description="Allow people to find you by searching your @username."
          value={s.privacy.discoverableByUsername}
          onValueChange={v =>
            patch({...s, privacy: {...s.privacy, discoverableByUsername: v}})
          }
        />
      </Card>
    )}
  </SettingsShell>
);

const FONT_SCALES: {key: SettingsState['chat']['fontScale']; label: string}[] = [
  {key: 'small', label: 'Small'},
  {key: 'default', label: 'Default'},
  {key: 'large', label: 'Large'},
];

export const ChatSettingsScreen = (_props: ProfileProps<'ChatSettings'>) => (
  <SettingsShell>
    {(s, patch) => (
      <>
        <Card style={styles.sectionCard}>
          <SwitchRow
            label="Enter to send"
            description="Pressing return sends the message instead of adding a new line."
            value={s.chat.enterToSend}
            onValueChange={v => patch({...s, chat: {...s.chat, enterToSend: v}})}
          />
          <Divider />
          <SwitchRow
            label="Auto-download media"
            description="Download photos and videos automatically on Wi-Fi."
            value={s.chat.autoDownloadMedia}
            onValueChange={v => patch({...s, chat: {...s.chat, autoDownloadMedia: v}})}
          />
        </Card>
        <SectionHeader title="Font size" />
        <Card style={styles.sectionCard}>
          {FONT_SCALES.map((f, i) => (
            <View key={f.key}>
              {i > 0 ? <Divider /> : null}
              <CheckRow
                kind="radio"
                label={f.label}
                checked={s.chat.fontScale === f.key}
                onToggle={() => patch({...s, chat: {...s.chat, fontScale: f.key}})}
              />
            </View>
          ))}
        </Card>
      </>
    )}
  </SettingsShell>
);

export const CommunitySettingsScreen = (_props: ProfileProps<'CommunitySettings'>) => {
  const [invites, setInvites] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [trendingDigests, setTrendingDigests] = useState(false);
  return (
    <Screen>
      <Card style={styles.sectionCard}>
        <SwitchRow
          label="Community invites"
          description="Allow members to invite you to their communities."
          value={invites}
          onValueChange={setInvites}
        />
        <Divider />
        <SwitchRow
          label="Event reminders"
          description="Remind you before community events you RSVP'd to."
          value={eventReminders}
          onValueChange={setEventReminders}
        />
        <Divider />
        <SwitchRow
          label="Trending digests"
          description="A weekly digest of trending posts across your communities."
          value={trendingDigests}
          onValueChange={setTrendingDigests}
        />
      </Card>
      <Spacer size={spacing.sm} />
      <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
        Synced in a later milestone
      </YayText>
    </Screen>
  );
};

export const AiSettingsScreen = (_props: ProfileProps<'AiSettings'>) => {
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <>
      <SettingsShell
        header={
          <Banner
            tone="info"
            icon="sparkles"
            text="aiainai never reads your private chats without an explicit action."
          />
        }>
        {(s, patch) => (
          <>
            <Card style={styles.sectionCard}>
              <SwitchRow
                label="Save history"
                description="Keep past AI conversations so you can revisit them."
                value={s.ai.saveHistory}
                onValueChange={v => patch({...s, ai: {...s.ai, saveHistory: v}})}
              />
              <Divider />
              <SwitchRow
                label="Personalization"
                description="Let aiainai tailor suggestions using your activity."
                value={s.ai.personalization}
                onValueChange={v => patch({...s, ai: {...s.ai, personalization: v}})}
              />
            </Card>
            <Spacer />
            <Button
              label="Clear AI history"
              kind="danger"
              icon="trash-outline"
              onPress={() => setConfirmClear(true)}
            />
          </>
        )}
      </SettingsShell>
      <ConfirmSheet
        visible={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear AI history?"
        message="This removes all saved aiainai conversations. It cannot be undone."
        confirmLabel="Clear history"
        destructive
        onConfirm={() => toast.show('AI history cleared', 'success')}
      />
    </>
  );
};

export const RewardsSettingsScreen = (_props: ProfileProps<'RewardsSettings'>) => (
  <SettingsShell
    header={
      <Banner
        tone="warning"
        icon="shield-half"
        text="Anti-abuse note: rewards are verified server-side. Automated or fraudulent activity forfeits rewards."
      />
    }>
    {(s, patch) => (
      <Card style={styles.sectionCard}>
        <SwitchRow
          label="Activity tracking"
          description="Track eligible actions — daily check-ins, messages sent, and referrals — so you can earn YayPoints. Nothing else is tracked."
          value={s.rewards.activityTracking}
          onValueChange={v => patch({...s, rewards: {activityTracking: v}})}
        />
        <Spacer size={spacing.xs} />
        <YayText variant="caption" color={colors.textMuted}>
          Turning this off pauses earning. Your existing balance is unaffected.
        </YayText>
      </Card>
    )}
  </SettingsShell>
);

export const AppearanceScreen = (_props: ProfileProps<'Appearance'>) => {
  const darkModeEnabled = featureFlags.isEnabled('dark_mode');
  return (
    <SettingsShell>
      {(s, patch) => (
        <Card style={styles.sectionCard}>
          <CheckRow
            kind="radio"
            label="Light (default)"
            checked={s.appearance.theme === 'light'}
            onToggle={() => patch({...s, appearance: {theme: 'light'}})}
          />
          <Divider />
          <CheckRow
            kind="radio"
            label="System"
            checked={s.appearance.theme === 'system'}
            onToggle={() => patch({...s, appearance: {theme: 'system'}})}
          />
          {!darkModeEnabled ? (
            <>
              <Divider />
              <View style={[styles.disabledRow]}>
                <Ionicons name="moon-outline" size={22} color={colors.textFaint} />
                <YayText style={{flex: 1}} color={colors.textFaint}>
                  Dark mode
                </YayText>
                <Badge label="Coming soon" tone="neutral" />
              </View>
            </>
          ) : null}
        </Card>
      )}
    </SettingsShell>
  );
};

const LANGUAGES = ['English', 'Español', 'Português', '中文', 'हिन्दी'];

export const LanguageScreen = (_props: ProfileProps<'Language'>) => {
  const toast = useToast();
  return (
    <Screen>
      <Card style={styles.sectionCard}>
        {LANGUAGES.map((lang, i) => (
          <View key={lang}>
            {i > 0 ? <Divider /> : null}
            <CheckRow
              kind="radio"
              label={lang}
              checked={lang === 'English'}
              onToggle={() => {
                if (lang !== 'English') {
                  toast.show('Translations arrive with localization (Milestone 10)');
                }
              }}
            />
          </View>
        ))}
      </Card>
      <Spacer size={spacing.sm} />
      <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
        YaysApp is English-only in this preview build.
      </YayText>
    </Screen>
  );
};

export const AccessibilityScreen = (_props: ProfileProps<'Accessibility'>) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  return (
    <Screen>
      <Card style={styles.sectionCard}>
        <SwitchRow
          label="Reduce motion"
          description="Minimize animations and transitions."
          value={reduceMotion}
          onValueChange={setReduceMotion}
        />
        <Divider />
        <SwitchRow
          label="High-contrast text"
          description="Increase text contrast for readability."
          value={highContrast}
          onValueChange={setHighContrast}
        />
        <Divider />
        <ListRow
          title="Larger text"
          subtitle="Adjust message font size in Chat settings"
          icon="text-outline"
          chevron={false}
        />
      </Card>
      <Spacer size={spacing.sm} />
      <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
        YaysApp supports VoiceOver and TalkBack labels throughout the app.
      </YayText>
    </Screen>
  );
};

export const DataStorageScreen = (_props: ProfileProps<'DataStorage'>) => {
  const toast = useToast();
  const [clearing, setClearing] = useState(false);

  const clearCache = () => {
    setClearing(true);
    setTimeout(() => {
      setClearing(false);
      toast.show('Cache cleared', 'success');
    }, 1000);
  };

  return (
    <SettingsShell
      header={
        <>
          <Row gap={spacing.sm} style={{alignItems: 'stretch'}}>
            <StatTile label="Storage used" value="128 MB" icon="server-outline" />
            <StatTile label="Media" value="96 MB" icon="images-outline" />
            <StatTile label="Cache" value="32 MB" icon="albums-outline" />
          </Row>
          <Spacer />
          <Button
            label="Clear cache"
            kind="secondary"
            icon="trash-bin-outline"
            loading={clearing}
            onPress={clearCache}
          />
          <Spacer />
        </>
      }>
      {(s, patch) => (
        <Card style={styles.sectionCard}>
          <SwitchRow
            label="Auto-download media"
            description="Mirrors the same setting in Chat settings."
            value={s.chat.autoDownloadMedia}
            onValueChange={v => patch({...s, chat: {...s.chat, autoDownloadMedia: v}})}
          />
        </Card>
      )}
    </SettingsShell>
  );
};

// ---------------------------------------------------------------------------
// DevicesScreen
// ---------------------------------------------------------------------------

export const DevicesScreen = (_props: ProfileProps<'Devices'>) => {
  const toast = useToast();
  const {data, loading, error, offline, reload} = useAsync(() => userService.deviceSessions(), []);
  const {busy, perform} = useAction();

  const revoke = async (id: string, device: string) => {
    const done = await perform(
      () => userService.revokeSession(id),
      message => toast.show(message, 'error'),
    );
    if (done !== null) {
      toast.show(`Signed out of ${device}`, 'success');
      reload();
    }
  };

  return (
    <Screen>
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={(data ?? []).length === 0}
        emptyTitle="No active sessions">
        {sessions => (
          <Card style={styles.sectionCard}>
            {sessions.map((d, i) => (
              <View key={d.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  icon="phone-portrait"
                  title={d.device}
                  subtitle={`${d.location} · Active ${timeAgo(d.lastActive)}`}
                  chevron={false}
                  right={
                    d.current ? (
                      <Badge label="This device" tone="brand" />
                    ) : (
                      <Button
                        label="Sign out"
                        kind="ghost"
                        onPress={() => revoke(d.id, d.device)}
                        disabled={busy}
                        style={styles.smallButton}
                      />
                    )
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

// ---------------------------------------------------------------------------
// HelpScreen
// ---------------------------------------------------------------------------

const FAQS: {q: string; a: string}[] = [
  {
    q: 'What does "preview build" mean?',
    a: 'This is Milestone 1 of YaysApp. Screens, flows, and states are real, but data is simulated locally on your device. Nothing you do here affects a live account.',
  },
  {
    q: 'Are my YayPoints and rewards real?',
    a: 'Not yet. Rewards in this build are simulated so you can review the earning flows. Real reward tracking arrives when the backend ships in a later milestone.',
  },
  {
    q: 'Is the wallet holding real crypto?',
    a: 'No. The wallet is a visual preview with simulated balances and transactions. No real funds can be sent, received, or lost in this build.',
  },
  {
    q: 'How do I report a person or community?',
    a: 'Open the person\'s profile or the community\'s detail page and choose Report. In this preview the report is logged locally for the team to review flows.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Profile → Delete account. You will be asked to type DELETE to confirm. In this preview build it simply signs you out and clears local data.',
  },
  {
    q: 'Why do some features say "coming soon"?',
    a: 'YaysApp ships in milestones. Stickers, calls, dark mode, and camera QR scanning are planned for later milestones and are labeled where they will live.',
  },
];

export const HelpScreen = (_props: ProfileProps<'Help'>) => {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');

  const filtered = FAQS.filter(f => {
    const q = query.trim().toLowerCase();
    return !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
  });

  return (
    <Screen>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search help topics" />
      <SectionHeader title="Frequently asked" />
      {filtered.length === 0 ? (
        <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
          No help topics match your search.
        </YayText>
      ) : (
        filtered.map(f => {
          const index = FAQS.indexOf(f);
          const open = expanded === index;
          return (
            <Card
              key={f.q}
              style={{marginBottom: spacing.sm}}
              onPress={() => setExpanded(open ? null : index)}>
              <Row>
                <YayText variant="bodyStrong" style={{flex: 1}}>
                  {f.q}
                </YayText>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textFaint}
                />
              </Row>
              {open ? (
                <YayText
                  variant="caption"
                  color={colors.textSecondary}
                  style={{marginTop: spacing.xs}}>
                  {f.a}
                </YayText>
              ) : null}
            </Card>
          );
        })
      )}

      <SectionHeader title="Still stuck?" />
      <Card style={{marginBottom: spacing.sm}}>
        <YayText variant="bodyStrong">Contact support</YayText>
        <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.sm}}>
          Chat with the YaysApp team about anything.
        </YayText>
        <Button
          label="Contact support"
          kind="secondary"
          icon="chatbubbles-outline"
          onPress={() => toast.show('Support inbox opens in a later milestone')}
        />
      </Card>
      <Card onPress={() => setReportOpen(true)}>
        <Row>
          <View style={{flex: 1}}>
            <YayText variant="bodyStrong">Report a problem</YayText>
            <YayText variant="caption" color={colors.textMuted}>
              Found a bug or something odd? Tell us.
            </YayText>
          </View>
          <Ionicons name="bug-outline" size={20} color={colors.brand} />
        </Row>
      </Card>

      <BottomSheet visible={reportOpen} onClose={() => setReportOpen(false)} title="Report a problem">
        <TextField
          label="What happened?"
          value={reportText}
          onChangeText={setReportText}
          placeholder="Describe the problem, including what you tapped..."
          multiline
          numberOfLines={4}
        />
        <Button
          label="Submit"
          disabled={reportText.trim().length === 0}
          onPress={() => {
            setReportOpen(false);
            setReportText('');
            toast.show('Thanks — logged for the team.', 'success');
          }}
        />
      </BottomSheet>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// AboutLegalScreen
// ---------------------------------------------------------------------------

const LEGAL_DRAFT = (title: string) =>
  `${title}\n\nDraft — for preview. This placeholder text stands in for the final ${title.toLowerCase()} which is being prepared with counsel and ships before public launch.\n\n1. Acceptance. By using this preview build of YaysApp you acknowledge the app is under active development and data shown is simulated.\n\n2. Accounts. Preview accounts are local to your device. No personal data leaves the device in Milestone 1.\n\n3. Rewards & wallet. YayPoints, balances, and transactions in this build are simulated and carry no monetary value.\n\n4. Conduct. Be kind. Harassment, spam, and abuse are prohibited and will be enforced when live services launch.\n\n5. Changes. These terms will be replaced by final documents prior to launch; continued use after launch constitutes acceptance of the final versions.`;

export const AboutLegalScreen = ({route}: ProfileProps<'AboutLegal'>) => {
  const toast = useToast();
  const [openDoc, setOpenDoc] = useState<'terms' | 'privacy' | null>(route.params?.doc ?? null);

  const docRow = (doc: 'terms' | 'privacy', title: string, icon: string) => (
    <>
      <ListRow
        title={title}
        icon={icon}
        chevron={false}
        right={
          <Ionicons
            name={openDoc === doc ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textFaint}
          />
        }
        onPress={() => setOpenDoc(openDoc === doc ? null : doc)}
      />
      {openDoc === doc ? (
        <View style={styles.legalBox}>
          <ScrollView nestedScrollEnabled style={{maxHeight: 260}}>
            <YayText variant="caption" color={colors.textSecondary}>
              {LEGAL_DRAFT(title)}
            </YayText>
          </ScrollView>
        </View>
      ) : null}
    </>
  );

  return (
    <Screen>
      <Card style={{alignItems: 'center', paddingVertical: spacing.xl}}>
        <BrandMark size={88} />
        <Spacer size={spacing.sm} />
        <YayText variant="title">YaysApp</YayText>
        <YayText variant="caption" color={colors.textMuted}>
          {APP_VERSION}
        </YayText>
        <YayText variant="caption" color={colors.textFaint} style={{marginTop: spacing.xxs}}>
          Part of the Indexx ecosystem
        </YayText>
      </Card>
      <SectionHeader title="Legal" />
      <Card style={styles.sectionCard}>
        {docRow('terms', 'Terms of service', 'document-text-outline')}
        <Divider />
        {docRow('privacy', 'Privacy policy', 'shield-checkmark-outline')}
        <Divider />
        <ListRow
          title="Open-source licenses"
          icon="code-slash-outline"
          chevron={false}
          onPress={() => toast.show('License list arrives in a later milestone')}
        />
      </Card>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// DeleteAccountScreen
// ---------------------------------------------------------------------------

export const DeleteAccountScreen = (_props: ProfileProps<'DeleteAccount'>) => {
  const {signOut} = useAuth();
  const toast = useToast();
  const {busy, perform} = useAction();
  const [confirmText, setConfirmText] = useState('');

  const remove = async () => {
    const done = await perform(
      () => authService.deleteAccount(),
      message => toast.show(message, 'error'),
    );
    if (done !== null) {
      await signOut();
    }
  };

  return (
    <Screen>
      <Banner
        tone="danger"
        text="Deleting your account is permanent. This cannot be undone."
      />
      <Card style={{marginBottom: spacing.lg}}>
        <YayText variant="bodyStrong" style={{marginBottom: spacing.xs}}>
          What happens when you delete your account
        </YayText>
        {[
          'Your profile, username, and bio are removed.',
          'Your chats and message history are deleted for you.',
          'Your YayPoints balance and reward history are forfeited.',
          'You leave every community you joined.',
          'Wallet preview data is cleared from this device.',
        ].map(line => (
          <Row key={line} gap={spacing.xs} style={{marginBottom: spacing.xxs, alignItems: 'flex-start'}}>
            <Ionicons name="remove-circle-outline" size={16} color={colors.danger} />
            <YayText variant="caption" color={colors.textSecondary} style={{flex: 1}}>
              {line}
            </YayText>
          </Row>
        ))}
      </Card>
      <TextField
        label="Type DELETE to confirm"
        value={confirmText}
        onChangeText={setConfirmText}
        placeholder="DELETE"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Button
        label="Delete my account"
        kind="danger"
        icon="trash-outline"
        disabled={confirmText !== 'DELETE'}
        loading={busy}
        onPress={remove}
      />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// DeveloperScreen (preview controls)
// ---------------------------------------------------------------------------

const LATENCY_OPTIONS = [
  {label: 'Fast 150ms', value: 150},
  {label: 'Normal 450ms', value: 450},
  {label: 'Slow 2000ms', value: 2000},
];

export const DeveloperScreen = (_props: ProfileProps<'Developer'>) => {
  const {expireSession} = useAuth();
  const toast = useToast();
  const [offline, setOffline] = useState(simulation.offline);
  const [latency, setLatency] = useState(simulation.latencyMs);
  const flags = featureFlags.all();

  return (
    <Screen>
      <Banner tone="warning" icon="construct" text="Demo controls for reviewing app states." />

      <SectionHeader title="Network" />
      <Card style={styles.sectionCard}>
        <SwitchRow
          label="Simulate offline"
          description="All requests fail as if the device lost its connection."
          value={offline}
          onValueChange={v => {
            setOffline(v);
            setSimulatedOffline(v);
          }}
        />
        <Divider />
        <YayText variant="caption" color={colors.textMuted} style={{marginVertical: spacing.xs}}>
          Simulated latency
        </YayText>
        <Row gap={spacing.xs}>
          {LATENCY_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={latency === opt.value}
              onPress={() => {
                setLatency(opt.value);
                simulation.latencyMs = opt.value;
              }}
            />
          ))}
        </Row>
      </Card>

      <SectionHeader title="Failures" />
      <Card style={styles.sectionCard}>
        <Button
          label="Fail next request (server error)"
          kind="secondary"
          icon="cloud-offline-outline"
          onPress={() => {
            simulation.failNextRequest = 'server';
            toast.show('Next request will fail with a server error');
          }}
        />
        <Spacer size={spacing.xs} />
        <Button
          label="Fail next request (session expired)"
          kind="secondary"
          icon="key-outline"
          onPress={() => {
            simulation.failNextRequest = 'unauthorized';
            toast.show('Next request will fail as session expired');
          }}
        />
        <Spacer size={spacing.xs} />
        <Button
          label="Trigger session expired now"
          kind="danger"
          icon="log-out-outline"
          onPress={() => expireSession()}
        />
      </Card>

      <SectionHeader title="Feature flags (read-only)" />
      <Card style={styles.sectionCard}>
        {Object.entries(flags).map(([flag, enabled], i) => (
          <View key={flag}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              title={flag}
              icon={enabled ? 'flag' : 'flag-outline'}
              iconTone={enabled ? colors.brand : colors.textFaint}
              chevron={false}
              right={<Badge label={enabled ? 'On' : 'Off'} tone={enabled ? 'success' : 'neutral'} />}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  sectionCard: {
    paddingVertical: spacing.xxs,
  },
  smallButton: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  unreadDot: {
    width: 12,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  qrFrame: {
    padding: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  disabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    opacity: 0.7,
  },
  legalBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
});
