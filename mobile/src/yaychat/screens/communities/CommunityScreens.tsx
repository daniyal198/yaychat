/**
 * Communities feature screens.
 * Home / search / detail / chat / members / create / edit — all data comes
 * from communityService (mock layer) with userService.contacts() providing a
 * fake member sample.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
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
  ConfirmSheet,
  Divider,
  EmptyState,
  ListRow,
  ListSkeleton,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  Spacer,
  TextField,
  YayText,
} from '../../design/components';
import {colors, radius, spacing} from '../../design/tokens';
import {communityService, userService} from '../../services';
import {useAction, useAsync} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {Community, User} from '../../types/models';
import type {CommunitiesStackParamList} from '../../types/navigation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
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
  return new Date(iso).toLocaleDateString();
};

const formatEventDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const memberLabel = (count: number): string =>
  `${count.toLocaleString()} member${count === 1 ? '' : 's'}`;

const privacyBadge = (c: Community): React.ReactNode => {
  if (c.inviteOnly) {
    return <Badge label="Invite-only" tone="warning" />;
  }
  if (c.privacy === 'private') {
    return <Badge label="Private" tone="neutral" />;
  }
  return null;
};

const roleBadge = (role?: Community['role']): React.ReactNode => {
  if (role === 'admin') {
    return <Badge label="Admin" tone="gold" />;
  }
  if (role === 'moderator') {
    return <Badge label="Moderator" tone="info" />;
  }
  return null;
};

// ---------------------------------------------------------------------------
// CommunitiesHomeScreen
// ---------------------------------------------------------------------------

type HomeProps = NativeStackScreenProps<CommunitiesStackParamList, 'CommunitiesHome'>;

export const CommunitiesHomeScreen = ({navigation}: HomeProps) => {
  const toast = useToast();
  const {busy, perform} = useAction();
  const categories = useMemo(() => communityService.categories(), []);
  const [category, setCategory] = useState('All');
  const load = useAsync(
    async () => {
      const [mine, discover] = await Promise.all([
        communityService.myCommunities(),
        communityService.discover(category === 'All' ? undefined : category),
      ]);
      return {mine, discover};
    },
    [category],
  );

  const joinCommunity = async (c: Community) => {
    const updated = await perform(
      () => communityService.join(c.id),
      message => toast.show(message, 'error'),
    );
    if (updated) {
      if (updated.joined) {
        toast.show(`Joined ${updated.name} — +15 YayPoints preview`, 'success');
      } else if (updated.joinRequested) {
        toast.show('Join request sent', 'info');
      }
      load.refresh();
    }
  };

  return (
    <Screen refreshing={load.refreshing} onRefresh={load.refresh}>
      <Row style={{justifyContent: 'space-between'}}>
        <YayText variant="title">Communities</YayText>
        <Button
          label="+ Create"
          kind="ghost"
          style={styles.smallButton}
          onPress={() => navigation.navigate('CreateCommunity')}
        />
      </Row>
      <Spacer size={spacing.sm} />
      <Pressable onPress={() => navigation.navigate('CommunitySearch')}>
        <View pointerEvents="none">
          <SearchBar value="" onChangeText={() => {}} placeholder="Search communities" />
        </View>
      </Pressable>

      <AsyncView
        loading={load.loading}
        error={load.error}
        offline={load.offline}
        onRetry={load.reload}
        data={load.data}>
        {({mine, discover}) => (
          <>
            <SectionHeader title="My communities" />
            {mine.length === 0 ? (
              <EmptyState
                title="No communities yet"
                message="Join a community below or create your own."
                icon="people-outline"
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Row gap={spacing.sm} style={{alignItems: 'stretch'}}>
                  {mine.map(c => (
                    <Card
                      key={c.id}
                      style={styles.myCommunityCard}
                      onPress={() =>
                        navigation.navigate('CommunityDetail', {communityId: c.id})
                      }>
                      <Avatar name={c.name} size={40} />
                      <YayText variant="bodyStrong" numberOfLines={1} style={{marginTop: spacing.xs}}>
                        {c.name}
                      </YayText>
                      <YayText variant="caption" color={colors.textMuted}>
                        {memberLabel(c.memberCount)}
                      </YayText>
                      {c.role === 'admin' || c.role === 'moderator' ? (
                        <View style={{marginTop: spacing.xxs}}>{roleBadge(c.role)}</View>
                      ) : null}
                    </Card>
                  ))}
                </Row>
              </ScrollView>
            )}

            <SectionHeader title="Discover" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Row gap={spacing.xs}>
                {categories.map(cat => (
                  <Chip
                    key={cat}
                    label={cat}
                    active={cat === category}
                    onPress={() => setCategory(cat)}
                  />
                ))}
              </Row>
            </ScrollView>
            <Spacer size={spacing.sm} />
            {discover.length === 0 ? (
              <EmptyState
                title="Nothing in this category"
                message="Try another category or create the first community here."
                icon="compass-outline"
              />
            ) : (
              discover.map(c => (
                <ListRow
                  key={c.id}
                  avatarName={c.name}
                  title={c.name}
                  subtitle={`${c.category} · ${memberLabel(c.memberCount)}`}
                  chevron={false}
                  onPress={() => navigation.navigate('CommunityDetail', {communityId: c.id})}
                  right={
                    <Row gap={spacing.xs}>
                      {privacyBadge(c)}
                      {c.joined ? (
                        <Badge label="Joined" tone="success" />
                      ) : c.joinRequested ? (
                        <Badge label="Requested" tone="neutral" />
                      ) : (
                        <Button
                          label="Join"
                          kind="secondary"
                          disabled={busy}
                          style={styles.smallButton}
                          onPress={() => joinCommunity(c)}
                        />
                      )}
                    </Row>
                  }
                />
              ))
            )}
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// CommunitySearchScreen
// ---------------------------------------------------------------------------

type SearchProps = NativeStackScreenProps<CommunitiesStackParamList, 'CommunitySearch'>;

export const CommunitySearchScreen = ({navigation}: SearchProps) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useAsync(
    async () => (debounced.trim() ? communityService.discover(undefined, debounced) : null),
    [debounced],
  );

  return (
    <Screen>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search communities"
        autoFocus
      />
      <Spacer size={spacing.sm} />
      {debounced.trim().length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Find your people"
          message="Search by community name or topic."
        />
      ) : (
        <AsyncView
          loading={load.loading}
          error={load.error}
          offline={load.offline}
          onRetry={load.reload}
          data={load.data}
          isEmpty={(load.data?.length ?? 0) === 0}
          emptyTitle="No communities found"
          emptyMessage={`Nothing matched “${debounced}”. Try a different search.`}>
          {results => (
            <>
              {results.map(c => (
                <ListRow
                  key={c.id}
                  avatarName={c.name}
                  title={c.name}
                  subtitle={`${c.category} · ${memberLabel(c.memberCount)}`}
                  right={privacyBadge(c)}
                  onPress={() =>
                    navigation.navigate('CommunityDetail', {communityId: c.id})
                  }
                />
              ))}
            </>
          )}
        </AsyncView>
      )}
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// CommunityDetailScreen
// ---------------------------------------------------------------------------

type DetailProps = NativeStackScreenProps<CommunitiesStackParamList, 'CommunityDetail'>;

interface ReportedItem {
  id: string;
  author: string;
  excerpt: string;
  reason: string;
  resolved?: 'approved' | 'removed';
}

const INITIAL_QUEUE: ReportedItem[] = [
  {id: 'rep1', author: 'Casey Nguyen', excerpt: 'Check out this deal, DM me for the link…', reason: 'Possible spam'},
  {id: 'rep2', author: 'Sam Ortiz', excerpt: 'That take was honestly terrible and so are you.', reason: 'Harassment'},
];

const REPORT_REASONS = ['Spam', 'Harassment', 'Misinformation', 'Inappropriate content', 'Other'];

export const CommunityDetailScreen = ({navigation, route}: DetailProps) => {
  const {communityId} = route.params;
  const toast = useToast();
  const {busy, perform} = useAction();
  const load = useAsync(() => communityService.get(communityId), [communityId]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [goingEventIds, setGoingEventIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [composer, setComposer] = useState('');
  const [queue, setQueue] = useState<ReportedItem[]>(INITIAL_QUEUE);

  const join = async (c: Community) => {
    const updated = await perform(
      () => communityService.join(c.id),
      message => toast.show(message, 'error'),
    );
    if (updated) {
      load.setData({...updated});
      if (updated.joined) {
        toast.show('Joined! +15 YayPoints preview', 'success');
      } else if (updated.joinRequested) {
        toast.show('Join request sent to admins', 'info');
      }
    }
  };

  const leave = async () => {
    const done = await perform(
      async () => {
        await communityService.leave(communityId);
        return true;
      },
      message => toast.show(message, 'error'),
    );
    if (done) {
      toast.show('You left the community', 'info');
      load.reload();
    }
  };

  const vote = async (pollId: string, optionIndex: number) => {
    const updated = await perform(
      () => communityService.vote(communityId, pollId, optionIndex),
      message => toast.show(message, 'error'),
    );
    if (updated) {
      load.setData({...updated});
      toast.show('Vote recorded', 'success');
    }
  };

  const post = async () => {
    const updated = await perform(
      () => communityService.postToFeed(communityId, composer),
      message => toast.show(message, 'error'),
    );
    if (updated) {
      load.setData({...updated});
      setComposer('');
      toast.show('Posted to the community feed', 'success');
    }
  };

  const sendReport = async (reason: string) => {
    setReportOpen(false);
    const done = await perform(
      async () => {
        await communityService.report(communityId, reason);
        return true;
      },
      message => toast.show(message, 'error'),
    );
    if (done) {
      toast.show('Report submitted. Thanks for keeping YaysApp safe.', 'success');
    }
  };

  const resolveQueueItem = (id: string, resolution: 'approved' | 'removed') => {
    setQueue(prev => prev.map(item => (item.id === id ? {...item, resolved: resolution} : item)));
    toast.show(resolution === 'approved' ? 'Post approved' : 'Post removed', 'success');
  };

  return (
    <Screen refreshing={load.refreshing} onRefresh={load.refresh}>
      <AsyncView
        loading={load.loading}
        error={load.error}
        offline={load.offline}
        onRetry={load.reload}
        data={load.data}>
        {c => {
          const isStaff = c.role === 'admin' || c.role === 'moderator';
          return (
            <>
              <Card style={{alignItems: 'center'}}>
                <Avatar name={c.name} size={72} />
                <Spacer size={spacing.sm} />
                <Row gap={spacing.xs}>
                  <YayText
                    variant="title"
                    style={{textAlign: 'center', flexShrink: 1}}
                    numberOfLines={1}>
                    {c.name}
                  </YayText>
                  {isStaff ? roleBadge(c.role) : null}
                </Row>
                <YayText variant="caption" color={colors.textMuted}>
                  {c.category} · {memberLabel(c.memberCount)}
                </YayText>
                <Spacer size={spacing.xs} />
                {privacyBadge(c)}
                {c.description ? (
                  <YayText
                    variant="body"
                    color={colors.textSecondary}
                    style={{textAlign: 'center', marginTop: spacing.sm}}>
                    {c.description}
                  </YayText>
                ) : null}
                <Spacer size={spacing.md} />
                {c.joined ? (
                  <Row gap={spacing.md} style={{justifyContent: 'center'}}>
                    <QuickAction
                      icon="chatbubbles-outline"
                      label="Chat"
                      onPress={() => navigation.navigate('CommunityChat', {communityId: c.id})}
                    />
                    <QuickAction
                      icon="people-outline"
                      label="Members"
                      onPress={() => navigation.navigate('CommunityMembers', {communityId: c.id})}
                    />
                    <QuickAction
                      icon="person-add-outline"
                      label="Invite"
                      onPress={() => setInviteOpen(true)}
                    />
                    <QuickAction
                      icon="exit-outline"
                      label="Leave"
                      tone={colors.danger}
                      onPress={() => setLeaveOpen(true)}
                    />
                  </Row>
                ) : c.inviteOnly ? (
                  <>
                    <Banner
                      tone="warning"
                      icon="lock-closed"
                      text="This community is invite-only. Ask a member to send you an invite link."
                    />
                    <Button label="Invite-only" disabled style={{alignSelf: 'stretch'}} />
                  </>
                ) : c.joinRequested ? (
                  <Badge label="Request pending" tone="warning" />
                ) : (
                  <Button
                    label={c.privacy === 'private' ? 'Request to join' : 'Join community'}
                    loading={busy}
                    onPress={() => join(c)}
                    style={{alignSelf: 'stretch'}}
                  />
                )}
              </Card>

              {isStaff ? (
                <>
                  <SectionHeader title="Manage" />
                  <Card style={{paddingVertical: spacing.xxs}}>
                    <ListRow
                      icon="create-outline"
                      title="Edit community"
                      subtitle="Name, description, and rules"
                      onPress={() => navigation.navigate('EditCommunity', {communityId: c.id})}
                    />
                  </Card>
                  <Spacer size={spacing.sm} />
                  <Card>
                    <YayText variant="heading">Moderation queue</YayText>
                    <YayText variant="caption" color={colors.textMuted}>
                      Reported content awaiting review
                    </YayText>
                    {queue.map(item => (
                      <View key={item.id}>
                        <Divider />
                        <Row style={{justifyContent: 'space-between'}}>
                          <YayText variant="bodyStrong">{item.author}</YayText>
                          <Badge label={item.reason} tone="danger" />
                        </Row>
                        <YayText variant="caption" color={colors.textSecondary}>
                          “{item.excerpt}”
                        </YayText>
                        <Spacer size={spacing.xs} />
                        {item.resolved ? (
                          <Badge
                            label={item.resolved === 'approved' ? 'Approved' : 'Removed'}
                            tone={item.resolved === 'approved' ? 'success' : 'neutral'}
                          />
                        ) : (
                          <Row gap={spacing.xs}>
                            <Button
                              label="Approve"
                              kind="secondary"
                              style={styles.smallButton}
                              onPress={() => resolveQueueItem(item.id, 'approved')}
                            />
                            <Button
                              label="Remove"
                              kind="danger"
                              style={styles.smallButton}
                              onPress={() => resolveQueueItem(item.id, 'removed')}
                            />
                          </Row>
                        )}
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}

              {c.announcements.length > 0 ? (
                <>
                  <SectionHeader title="Announcements" />
                  {c.announcements.map(a => (
                    <Card key={a.id} style={{marginBottom: spacing.sm}}>
                      <Row style={{justifyContent: 'space-between'}}>
                        <YayText variant="bodyStrong" style={{flex: 1}}>
                          {a.title}
                        </YayText>
                        <YayText variant="micro" color={colors.textFaint}>
                          {timeAgo(a.postedAt)}
                        </YayText>
                      </Row>
                      <YayText variant="caption" color={colors.textSecondary}>
                        {a.body}
                      </YayText>
                    </Card>
                  ))}
                </>
              ) : null}

              {c.events.length > 0 ? (
                <>
                  <SectionHeader title="Events" />
                  {c.events.map(e => {
                    const going = goingEventIds.includes(e.id);
                    return (
                      <Card key={e.id} style={{marginBottom: spacing.sm}}>
                        <Row>
                          <View style={styles.eventIcon}>
                            <Ionicons name="calendar-outline" size={20} color={colors.brand} />
                          </View>
                          <View style={{flex: 1}}>
                            <YayText variant="bodyStrong">{e.title}</YayText>
                            <YayText variant="caption" color={colors.textMuted}>
                              {formatEventDate(e.date)} · {e.attending + (going ? 1 : 0)} attending
                            </YayText>
                          </View>
                          {going ? (
                            <Badge label="Going" tone="success" />
                          ) : (
                            <Button
                              label="I'm going"
                              kind="secondary"
                              style={styles.smallButton}
                              onPress={() => {
                                setGoingEventIds(prev => [...prev, e.id]);
                                toast.show(`You're going to ${e.title}`, 'success');
                              }}
                            />
                          )}
                        </Row>
                      </Card>
                    );
                  })}
                </>
              ) : null}

              {c.polls.length > 0 ? (
                <>
                  <SectionHeader title="Poll" />
                  {c.polls.map(poll => {
                    const total = poll.options.reduce((sum, o) => sum + o.votes, 0);
                    const voted = poll.votedIndex !== undefined;
                    return (
                      <Card key={poll.id} style={{marginBottom: spacing.sm}}>
                        <YayText variant="bodyStrong">{poll.question}</YayText>
                        <Spacer size={spacing.xs} />
                        {poll.options.map((opt, i) => {
                          const share = total > 0 ? opt.votes / total : 0;
                          const mine = poll.votedIndex === i;
                          return (
                            <Pressable
                              key={opt.label}
                              disabled={voted || busy}
                              onPress={() => vote(poll.id, i)}
                              style={({pressed}) => [
                                styles.pollOption,
                                pressed && {opacity: 0.7},
                              ]}>
                              <Row style={{justifyContent: 'space-between'}}>
                                <Row gap={spacing.xs} style={{flex: 1}}>
                                  {mine ? (
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={16}
                                      color={colors.brand}
                                    />
                                  ) : null}
                                  <YayText variant="caption" color={colors.textPrimary}>
                                    {opt.label}
                                  </YayText>
                                </Row>
                                <YayText variant="micro" color={colors.textMuted}>
                                  {opt.votes} · {Math.round(share * 100)}%
                                </YayText>
                              </Row>
                              <View style={{marginTop: spacing.xxs}}>
                                <View style={styles.pollTrack}>
                                  <View
                                    style={[
                                      styles.pollFill,
                                      {
                                        width: `${Math.round(share * 100)}%`,
                                        backgroundColor: mine ? colors.brand : colors.brandBorder,
                                      },
                                    ]}
                                  />
                                </View>
                              </View>
                            </Pressable>
                          );
                        })}
                        <YayText variant="micro" color={colors.textFaint}>
                          {voted ? 'You voted.' : 'Tap an option to vote.'} Closes {timeAgo(poll.closesAt)}
                        </YayText>
                      </Card>
                    );
                  })}
                </>
              ) : null}

              <SectionHeader title="Feed" />
              {c.joined ? (
                <Card style={{marginBottom: spacing.sm}}>
                  <TextField
                    placeholder="Share something with the community…"
                    value={composer}
                    onChangeText={setComposer}
                    multiline
                    style={{marginBottom: spacing.xs}}
                  />
                  <Button
                    label="Post"
                    disabled={composer.trim().length === 0}
                    loading={busy}
                    onPress={post}
                  />
                </Card>
              ) : null}
              {c.feed.length === 0 ? (
                <EmptyState
                  icon="newspaper-outline"
                  title="No posts yet"
                  message={c.joined ? 'Be the first to post something.' : 'Join to see and share posts.'}
                />
              ) : (
                c.feed.map(p => {
                  const liked = likedPostIds.includes(p.id);
                  return (
                    <Card key={p.id} style={{marginBottom: spacing.sm}}>
                      <Row>
                        <Avatar name={p.authorName} size={34} />
                        <View style={{flex: 1}}>
                          <YayText variant="bodyStrong">{p.authorName}</YayText>
                          <YayText variant="micro" color={colors.textFaint}>
                            {timeAgo(p.postedAt)}
                          </YayText>
                        </View>
                      </Row>
                      <YayText style={{marginTop: spacing.xs}}>{p.body}</YayText>
                      <Spacer size={spacing.xs} />
                      <Pressable
                        onPress={() =>
                          setLikedPostIds(prev =>
                            liked ? prev.filter(id => id !== p.id) : [...prev, p.id],
                          )
                        }
                        hitSlop={8}
                        style={{alignSelf: 'flex-start'}}>
                        <Row gap={spacing.xxs}>
                          <Ionicons
                            name={liked ? 'heart' : 'heart-outline'}
                            size={18}
                            color={liked ? colors.accent : colors.textMuted}
                          />
                          <YayText variant="caption" color={colors.textMuted}>
                            {p.likes + (liked ? 1 : 0)}
                          </YayText>
                        </Row>
                      </Pressable>
                    </Card>
                  );
                })
              )}

              {c.rules.length > 0 ? (
                <>
                  <SectionHeader title="Rules" />
                  <Card>
                    {c.rules.map((rule, i) => (
                      <Row key={`${i}-${rule}`} style={{alignItems: 'flex-start', marginBottom: spacing.xs}}>
                        <YayText variant="bodyStrong" color={colors.brand}>
                          {i + 1}.
                        </YayText>
                        <YayText variant="caption" color={colors.textSecondary} style={{flex: 1}}>
                          {rule}
                        </YayText>
                      </Row>
                    ))}
                  </Card>
                </>
              ) : null}

              <Spacer size={spacing.md} />
              <Button
                label="Report community"
                kind="ghost"
                icon="flag-outline"
                onPress={() => setReportOpen(true)}
              />

              <BottomSheet
                visible={inviteOpen}
                onClose={() => setInviteOpen(false)}
                title="Invite friends">
                <YayText variant="caption" color={colors.textMuted}>
                  Share this link so friends can join {c.name}.
                </YayText>
                <Spacer size={spacing.sm} />
                <View style={styles.inviteLinkBox}>
                  <YayText variant="caption" color={colors.textSecondary} numberOfLines={1} style={{flex: 1}}>
                    {c.inviteLink}
                  </YayText>
                </View>
                <Spacer size={spacing.sm} />
                <Button
                  label="Copy link"
                  icon="copy-outline"
                  onPress={() => {
                    setInviteOpen(false);
                    toast.show('Invite link copied', 'success');
                  }}
                />
              </BottomSheet>

              <ConfirmSheet
                visible={leaveOpen}
                onClose={() => setLeaveOpen(false)}
                title={`Leave ${c.name}?`}
                message="You will stop receiving updates and lose your role in this community."
                confirmLabel="Leave community"
                destructive
                onConfirm={leave}
              />

              <BottomSheet
                visible={reportOpen}
                onClose={() => setReportOpen(false)}
                title="Report community">
                <YayText variant="caption" color={colors.textMuted}>
                  Why are you reporting {c.name}?
                </YayText>
                <Spacer size={spacing.sm} />
                <View style={styles.chipWrap}>
                  {REPORT_REASONS.map(reason => (
                    <Chip key={reason} label={reason} onPress={() => sendReport(reason)} />
                  ))}
                </View>
              </BottomSheet>
            </>
          );
        }}
      </AsyncView>
    </Screen>
  );
};

const QuickAction = ({
  icon,
  label,
  onPress,
  tone = colors.brandStrong,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  tone?: string;
}) => (
  <Pressable onPress={onPress} style={({pressed}) => [styles.quickAction, pressed && {opacity: 0.6}]}>
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon} size={20} color={tone} />
    </View>
    <YayText variant="micro" color={colors.textSecondary}>
      {label}
    </YayText>
  </Pressable>
);

// ---------------------------------------------------------------------------
// CommunityChatScreen
// ---------------------------------------------------------------------------

type ChatProps = NativeStackScreenProps<CommunitiesStackParamList, 'CommunityChat'>;

interface LocalChatMessage {
  id: string;
  author: string;
  text: string;
  mine: boolean;
}

const SEED_MESSAGES: LocalChatMessage[] = [
  {id: 'cm1', author: 'Priya Shah', text: 'Welcome everyone who joined this week!', mine: false},
  {id: 'cm2', author: 'Leo Martins', text: 'Glad to be here — this community is exactly what I was looking for.', mine: false},
  {id: 'cm3', author: 'Priya Shah', text: 'Reminder: the meetup poll closes tonight, cast your vote!', mine: false},
  {id: 'cm4', author: 'Amara Diallo', text: 'Just voted. Saturday works best for me.', mine: false},
  {id: 'cm5', author: 'Leo Martins', text: 'Same here. Also sharing some resources in the feed later today.', mine: false},
  {id: 'cm6', author: 'Amara Diallo', text: 'Nice, looking forward to it!', mine: false},
];

const AUTO_REPLIES = [
  'Totally agree!',
  'Good point — anyone else have thoughts on this?',
  'Thanks for sharing!',
  'Let’s bring this up at the next meetup.',
];

export const CommunityChatScreen = ({route}: ChatProps) => {
  const {communityId} = route.params;
  const load = useAsync(() => communityService.get(communityId), [communityId]);
  const [messages, setMessages] = useState<LocalChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState('');
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const send = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    idRef.current += 1;
    const mineId = `local-${idRef.current}`;
    setMessages(prev => [...prev, {id: mineId, author: 'You', text, mine: true}]);
    setDraft('');
    timerRef.current = setTimeout(() => {
      idRef.current += 1;
      setMessages(prev => [
        ...prev,
        {
          id: `local-${idRef.current}`,
          author: 'Priya Shah',
          text: AUTO_REPLIES[idRef.current % AUTO_REPLIES.length],
          mine: false,
        },
      ]);
    }, 2000);
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={{padding: spacing.md, paddingBottom: 0}}>
        <Banner
          tone="info"
          icon="flask"
          text="Community chat preview — real-time arrives in Milestone 3/4."
        />
        {load.data ? (
          <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.xs}}>
            {load.data.name} · {memberLabel(load.data.memberCount)}
          </YayText>
        ) : null}
      </View>
      <ScrollView
        ref={scrollRef}
        style={{flex: 1}}
        contentContainerStyle={{padding: spacing.md, gap: spacing.xs}}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({animated: true})}>
        {messages.map(m => (
          <View
            key={m.id}
            style={[styles.bubbleRow, m.mine ? {justifyContent: 'flex-end'} : null]}>
            {!m.mine ? <Avatar name={m.author} size={28} /> : null}
            <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              {!m.mine ? (
                <YayText variant="micro" color={colors.brandStrong}>
                  {m.author}
                </YayText>
              ) : null}
              <YayText
                variant="caption"
                color={m.mine ? colors.textOnBrand : colors.textPrimary}>
                {m.text}
              </YayText>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.composerRow}>
        <View style={{flex: 1}}>
          <TextField
            placeholder="Message the community…"
            value={draft}
            onChangeText={setDraft}
            style={{marginBottom: 0}}
          />
        </View>
        <Button
          label="Send"
          disabled={draft.trim().length === 0}
          onPress={send}
          style={styles.smallButton}
        />
      </View>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// CommunityMembersScreen
// ---------------------------------------------------------------------------

type MembersProps = NativeStackScreenProps<CommunitiesStackParamList, 'CommunityMembers'>;

type MemberRole = 'admin' | 'moderator' | 'member';

export const CommunityMembersScreen = ({route}: MembersProps) => {
  const {communityId} = route.params;
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [roleOverrides, setRoleOverrides] = useState<Record<string, MemberRole>>({});
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [bannedIds, setBannedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<User | null>(null);

  const load = useAsync(
    async () => {
      const [community, contacts] = await Promise.all([
        communityService.get(communityId),
        userService.contacts(),
      ]);
      return {community, contacts};
    },
    [communityId],
  );

  const roleFor = (user: User, index: number): MemberRole =>
    roleOverrides[user.id] ?? (index === 0 ? 'admin' : index === 1 ? 'moderator' : 'member');

  return (
    <Screen refreshing={load.refreshing} onRefresh={load.refresh}>
      <AsyncView
        loading={load.loading}
        error={load.error}
        offline={load.offline}
        onRetry={load.reload}
        data={load.data}>
        {({community, contacts}) => {
          const iModerate = community.role === 'admin' || community.role === 'moderator';
          const q = query.trim().toLowerCase();
          const members = contacts
            .filter(u => !removedIds.includes(u.id) && !bannedIds.includes(u.id))
            .filter(u => (q ? u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) : true));
          const withRoles = members.map(u => ({
            user: u,
            role: roleFor(u, contacts.findIndex(x => x.id === u.id)),
          }));
          const staff = withRoles.filter(m => m.role !== 'member');
          const regular = withRoles.filter(m => m.role === 'member');

          const memberRow = ({user, role}: {user: User; role: MemberRole}) => (
            <Pressable
              key={user.id}
              onLongPress={iModerate ? () => setSelected(user) : undefined}
              style={({pressed}) => [styles.memberRow, pressed && {backgroundColor: colors.surfaceSunken}]}>
              <Avatar name={user.name} online={user.online} />
              <View style={{flex: 1}}>
                <YayText variant="bodyStrong" numberOfLines={1}>
                  {user.name}
                </YayText>
                <YayText variant="caption" color={colors.textMuted} numberOfLines={1}>
                  @{user.username}
                </YayText>
              </View>
              {role !== 'member' ? roleBadge(role) : null}
            </Pressable>
          );

          const selectedRole = selected
            ? roleFor(selected, contacts.findIndex(x => x.id === selected.id))
            : 'member';

          return (
            <>
              <YayText variant="title">Members</YayText>
              <YayText variant="caption" color={colors.textMuted}>
                {community.name} · {memberLabel(community.memberCount)} (sample shown)
              </YayText>
              <Spacer size={spacing.sm} />
              <SearchBar value={query} onChangeText={setQuery} placeholder="Search members" />
              {iModerate ? (
                <>
                  <Spacer size={spacing.xs} />
                  <Banner tone="info" icon="shield-checkmark-outline" text="Long-press a member to moderate." />
                </>
              ) : null}

              {withRoles.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="No members found"
                  message={q ? `No one matches “${query}”.` : 'This community has no visible members yet.'}
                />
              ) : (
                <>
                  {staff.length > 0 ? (
                    <>
                      <SectionHeader title="Admins & moderators" />
                      {staff.map(memberRow)}
                    </>
                  ) : null}
                  {regular.length > 0 ? (
                    <>
                      <SectionHeader title="Members" />
                      {regular.map(memberRow)}
                    </>
                  ) : null}
                </>
              )}

              <BottomSheet
                visible={selected !== null}
                onClose={() => setSelected(null)}
                title={selected ? selected.name : undefined}>
                {selected ? (
                  <>
                    <ListRow
                      icon="ribbon-outline"
                      chevron={false}
                      title={selectedRole === 'moderator' ? 'Remove moderator' : 'Make moderator'}
                      onPress={() => {
                        setRoleOverrides(prev => ({
                          ...prev,
                          [selected.id]: selectedRole === 'moderator' ? 'member' : 'moderator',
                        }));
                        toast.show(
                          selectedRole === 'moderator'
                            ? `${selected.name} is no longer a moderator`
                            : `${selected.name} is now a moderator`,
                          'success',
                        );
                        setSelected(null);
                      }}
                    />
                    <ListRow
                      icon="person-remove-outline"
                      iconTone={colors.danger}
                      chevron={false}
                      title="Remove from community"
                      onPress={() => {
                        setRemovedIds(prev => [...prev, selected.id]);
                        toast.show(`${selected.name} was removed`, 'info');
                        setSelected(null);
                      }}
                    />
                    <ListRow
                      icon="ban-outline"
                      iconTone={colors.danger}
                      chevron={false}
                      title="Ban member"
                      onPress={() => {
                        setBannedIds(prev => [...prev, selected.id]);
                        toast.show(`${selected.name} was banned`, 'info');
                        setSelected(null);
                      }}
                    />
                  </>
                ) : null}
              </BottomSheet>
            </>
          );
        }}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// CreateCommunityScreen
// ---------------------------------------------------------------------------

type CreateProps = NativeStackScreenProps<CommunitiesStackParamList, 'CreateCommunity'>;

export const CreateCommunityScreen = ({navigation}: CreateProps) => {
  const toast = useToast();
  const {busy, perform} = useAction();
  // 'All' is the discovery filter, not a real category a community can have.
  const categories = useMemo(
    () => communityService.categories().filter(c => c !== 'All'),
    [],
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] ?? 'Other');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [nameError, setNameError] = useState<string | null>(null);

  const create = async () => {
    setNameError(null);
    const created = await perform(
      () => communityService.create({name, description, category, privacy}),
      message => {
        setNameError(message);
        toast.show(message, 'error');
      },
    );
    if (created) {
      toast.show(`${created.name} is live!`, 'success');
      navigation.replace('CommunityDetail', {communityId: created.id});
    }
  };

  return (
    <Screen>
      <YayText variant="title">Create a community</YayText>
      <YayText variant="caption" color={colors.textMuted}>
        Bring people together around a shared interest.
      </YayText>
      <Spacer size={spacing.lg} />
      <TextField
        label="Name"
        placeholder="e.g. Weekend Trail Runners"
        value={name}
        onChangeText={t => {
          setName(t);
          setNameError(null);
        }}
        error={nameError}
      />
      <TextField
        label="Description"
        placeholder="What is this community about?"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <YayText variant="caption" color={colors.textSecondary} style={{marginBottom: spacing.xxs}}>
        Category
      </YayText>
      <View style={styles.chipWrap}>
        {categories.map(cat => (
          <Chip key={cat} label={cat} active={cat === category} onPress={() => setCategory(cat)} />
        ))}
      </View>
      <Spacer size={spacing.md} />
      <YayText variant="caption" color={colors.textSecondary}>
        Privacy
      </YayText>
      <CheckRowWithCaption
        label="Public"
        caption="Anyone can find and join instantly."
        checked={privacy === 'public'}
        onToggle={() => setPrivacy('public')}
      />
      <CheckRowWithCaption
        label="Private"
        caption="Visible in discovery, but joining requires admin approval."
        checked={privacy === 'private'}
        onToggle={() => setPrivacy('private')}
      />
      <Spacer size={spacing.lg} />
      <Button label="Create community" loading={busy} onPress={create} />
    </Screen>
  );
};

const CheckRowWithCaption = ({
  label,
  caption,
  checked,
  onToggle,
}: {
  label: string;
  caption: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <Pressable onPress={onToggle} accessibilityRole="radio" style={styles.radioRow}>
    <Ionicons
      name={checked ? 'radio-button-on' : 'radio-button-off'}
      size={22}
      color={checked ? colors.brand : colors.textMuted}
    />
    <View style={{flex: 1}}>
      <YayText variant="bodyStrong">{label}</YayText>
      <YayText variant="caption" color={colors.textMuted}>
        {caption}
      </YayText>
    </View>
  </Pressable>
);

// ---------------------------------------------------------------------------
// EditCommunityScreen
// ---------------------------------------------------------------------------

type EditProps = NativeStackScreenProps<CommunitiesStackParamList, 'EditCommunity'>;

export const EditCommunityScreen = ({navigation, route}: EditProps) => {
  const {communityId} = route.params;
  const toast = useToast();
  const {busy, perform} = useAction();
  const load = useAsync(() => communityService.get(communityId), [communityId]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    if (load.data && !seeded.current) {
      seeded.current = true;
      setName(load.data.name);
      setDescription(load.data.description);
      setRules(load.data.rules);
    }
  }, [load.data]);

  const save = async () => {
    const updated = await perform(
      () =>
        communityService.update(communityId, {
          name: name.trim(),
          description: description.trim(),
          rules: rules.map(r => r.trim()).filter(Boolean),
        }),
      message => toast.show(message, 'error'),
    );
    if (updated) {
      toast.show('Community updated', 'success');
      navigation.goBack();
    }
  };

  return (
    <Screen>
      <AsyncView
        loading={load.loading}
        error={load.error}
        offline={load.offline}
        onRetry={load.reload}
        data={load.data}
        skeleton={<ListSkeleton rows={4} />}>
        {() => (
          <>
            <YayText variant="title">Edit community</YayText>
            <Spacer size={spacing.lg} />
            <TextField label="Name" value={name} onChangeText={setName} />
            <TextField
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <SectionHeader title="Rules" />
            {rules.length === 0 ? (
              <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.sm}}>
                No rules yet. Add the first one below.
              </YayText>
            ) : null}
            {rules.map((rule, i) => (
              <Row key={i} style={{alignItems: 'flex-start'}}>
                <YayText variant="bodyStrong" color={colors.brand} style={{marginTop: spacing.sm}}>
                  {i + 1}.
                </YayText>
                <View style={{flex: 1}}>
                  <TextField
                    value={rule}
                    onChangeText={t => setRules(prev => prev.map((r, j) => (j === i ? t : r)))}
                    placeholder="Describe the rule"
                  />
                </View>
                <Pressable
                  onPress={() => setRules(prev => prev.filter((_, j) => j !== i))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove rule ${i + 1}`}
                  style={{marginTop: spacing.sm}}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </Row>
            ))}
            <Button
              label="Add rule"
              kind="secondary"
              icon="add"
              onPress={() => setRules(prev => [...prev, ''])}
            />
            <Spacer size={spacing.lg} />
            <Button label="Save changes" loading={busy} onPress={save} />
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  smallButton: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
  },
  myCommunityCard: {
    width: 150,
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.xxs,
    minWidth: 56,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollOption: {
    paddingVertical: spacing.xs,
  },
  pollTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  pollFill: {
    height: 8,
    borderRadius: 4,
  },
  inviteLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  bubble: {
    maxWidth: '78%',
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
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    borderRadius: radius.sm,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
