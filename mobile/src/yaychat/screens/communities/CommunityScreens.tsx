/**
 * Communities feature screens (Module 3).
 *
 * Home / search / detail / chat / members / create / edit / join-by-invite.
 * All data comes from `communityService`, which serves the M3 backend when it
 * is live and an equivalent local engine when it is not — screens never branch
 * on which. Permission-shaped UI (publish, moderate, manage roles) is driven by
 * the flags the payload carries, not by re-deriving the rules here.
 *
 * Community chat is an ordinary M2 group conversation, so it uses `chatService`
 * with the community's `chatGroupId`; the seeded preview only appears when the
 * community has no backing group (a locally-served session).
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, Share, StyleSheet, View} from 'react-native';
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
import {chatService, communityService, errorMessage, featureFlags} from '../../services';
import {useAction, useAsync} from '../../state/hooks';
import {useAuth, useToast} from '../../state/AppProviders';
import type {
  Community,
  CommunityAnnouncement,
  CommunityInvite,
  CommunityMember,
  ImpersonationFlag,
  Message,
} from '../../types/models';
import type {CommunitiesStackParamList} from '../../types/navigation';
import {useAiAssist} from '../shared/AiAssist';

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

const announcementStatusBadge = (
  status?: CommunityAnnouncement['status'],
): React.ReactNode => {
  if (status === 'scheduled') {
    return <Badge label="Scheduled" tone="warning" />;
  }
  if (status === 'pending_approval') {
    return <Badge label="Awaiting approval" tone="info" />;
  }
  if (status === 'rejected') {
    return <Badge label="Rejected" tone="danger" />;
  }
  return <Badge label="Published" tone="success" />;
};

/** One line explaining why a name was flagged as a possible impersonation. */
const impersonationLine = (flag: ImpersonationFlag): string => {
  const how =
    flag.reason === 'exact'
      ? 'is identical to'
      : flag.reason === 'confusable'
      ? 'uses lookalike characters from'
      : flag.reason === 'official_term'
      ? 'claims to be an official channel of'
      : 'closely resembles';
  return `This name ${how} the verified community “${flag.matchedName}”. A moderator will review it.`;
};

// ---------------------------------------------------------------------------
// CommunitiesHomeScreen
// ---------------------------------------------------------------------------

type HomeProps = NativeStackScreenProps<CommunitiesStackParamList, 'CommunitiesHome'>;

export const CommunitiesHomeScreen = ({navigation}: HomeProps) => {
  const toast = useToast();
  const {busy, perform} = useAction();
  const [categories, setCategories] = useState<string[]>(() =>
    communityService.categories(),
  );
  const [category, setCategory] = useState('All');
  const load = useAsync(
    async () => {
      // Resolving the backend first keeps the category chips in step with
      // whichever side is actually serving this session.
      setCategories(await communityService.loadCatalog());
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
        toast.show(`Joined ${updated.name}`, 'success');
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
        <Row gap={spacing.xxs}>
          <Button
            label="Invite"
            kind="ghost"
            icon="link-outline"
            style={styles.smallButton}
            onPress={() => navigation.navigate('JoinByInvite')}
          />
          <Button
            label="+ Create"
            kind="ghost"
            style={styles.smallButton}
            onPress={() => navigation.navigate('CreateCommunity')}
          />
        </Row>
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
                      {c.banned ? (
                        <Badge label="Banned" tone="danger" />
                      ) : c.joined ? (
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

export const CommunityDetailScreen = ({navigation, route}: DetailProps) => {
  const {communityId} = route.params;
  const toast = useToast();
  const {session} = useAuth();
  const {busy, perform} = useAction();
  const load = useAsync(() => communityService.get(communityId), [communityId]);
  const reportReasons = useMemo(() => communityService.reportReasons(), []);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invites, setInvites] = useState<CommunityInvite[]>([]);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    targetType: 'community' | 'post';
    targetId?: string;
    label: string;
  }>({targetType: 'community', label: 'this community'});
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementActionLabel, setAnnouncementActionLabel] = useState('');
  const [announcementActionUrl, setAnnouncementActionUrl] = useState('');
  const [announcementAudience, setAnnouncementAudience] = useState<'all' | 'members' | 'region'>('members');
  const [announcementRegion, setAnnouncementRegion] = useState('United States');
  const [announcementScheduledFor, setAnnouncementScheduledFor] = useState('');
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartsAt, setEventStartsAt] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [composer, setComposer] = useState('');

  /** Push a mutation's returned community straight into the loaded view. */
  const apply = (updated: Community | null | undefined) => {
    if (updated) {
      load.setData({...updated});
    }
    return updated;
  };

  const join = async (c: Community) => {
    const updated = apply(
      await perform(
        () => communityService.join(c.id),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated?.joined) {
      toast.show('Joined!', 'success');
    } else if (updated?.joinRequested) {
      toast.show('Join request sent to admins', 'info');
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
    const updated = apply(
      await perform(
        () => communityService.vote(communityId, pollId, optionIndex),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      toast.show('Vote recorded', 'success');
    }
  };

  const post = async () => {
    const updated = apply(
      await perform(
        () => communityService.postToFeed(communityId, composer),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      setComposer('');
      toast.show('Posted to the community feed', 'success');
    }
  };

  const toggleLike = async (postId: string) => {
    const result = await perform(
      () => communityService.likePost(communityId, postId),
      message => toast.show(message, 'error'),
    );
    if (result && load.data) {
      load.setData({
        ...load.data,
        feed: load.data.feed.map(item =>
          item.id === postId ? {...item, liked: result.liked, likes: result.likes} : item,
        ),
      });
    }
  };

  const removePost = async (postId: string) => {
    const updated = apply(
      await perform(
        () => communityService.removePost(communityId, postId),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      toast.show('Post removed', 'info');
    }
  };

  const rsvp = async (eventId: string, attending: boolean) => {
    const updated = apply(
      await perform(
        () => communityService.rsvp(communityId, eventId, attending),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      toast.show(attending ? "You're going" : 'RSVP removed', 'success');
    }
  };

  const sendReport = async (reason: string) => {
    setReportOpen(false);
    const updated = apply(
      await perform(
        () =>
          communityService.report(communityId, reason, {
            targetType: reportTarget.targetType,
            targetId: reportTarget.targetId,
          }),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      toast.show('Report submitted. Thanks for keeping YaysApp safe.', 'success');
    }
  };

  const resolveQueueItem = async (
    id: string,
    resolution: 'approved' | 'removed' | 'dismissed',
  ) => {
    const updated = apply(
      await perform(
        () => communityService.resolveReport(communityId, id, resolution),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      toast.show(
        resolution === 'approved'
          ? 'Content approved'
          : resolution === 'removed'
          ? 'Content removed'
          : 'Report dismissed',
        'success',
      );
    }
  };

  const approveJoinRequest = async (requestId: string, approve: boolean) => {
    const updated = apply(
      await perform(
        () => communityService.approveJoinRequest(communityId, requestId, approve),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      toast.show(approve ? 'Join request approved' : 'Join request rejected', 'success');
    }
  };

  const publishAnnouncement = async () => {
    const updated = apply(
      await perform(
        () =>
          communityService.publishAnnouncement(communityId, {
            title: announcementTitle,
            body: announcementBody,
            audience: announcementAudience,
            region: announcementAudience === 'region' ? announcementRegion : undefined,
            scheduledFor: announcementScheduledFor,
            actionLabel: announcementActionLabel,
            actionUrl: announcementActionUrl,
          }),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      setAnnouncementOpen(false);
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setAnnouncementActionLabel('');
      setAnnouncementActionUrl('');
      setAnnouncementScheduledFor('');
      const latest = updated.announcements[0];
      toast.show(
        latest?.status === 'pending_approval'
          ? 'Sent to an admin for approval'
          : latest?.status === 'scheduled'
          ? 'Announcement scheduled'
          : 'Announcement published',
        'success',
      );
    }
  };

  const decideAnnouncement = async (announcementId: string, approve: boolean) => {
    const updated = apply(
      await perform(
        () =>
          communityService.approveAnnouncement(
            communityId,
            announcementId,
            approve,
            approve ? undefined : 'Rejected by an admin',
          ),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      toast.show(approve ? 'Announcement approved' : 'Announcement rejected', 'success');
    }
  };

  const markAnnouncementRead = async (announcementId: string, actioned = false) => {
    apply(
      await perform(
        () => communityService.readAnnouncement(communityId, announcementId, actioned),
        message => toast.show(message, 'error'),
      ),
    );
  };

  const createPoll = async () => {
    const updated = apply(
      await perform(
        () =>
          communityService.createPoll(communityId, {
            question: pollQuestion,
            options: pollOptions,
          }),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      setPollOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      toast.show('Poll created', 'success');
    }
  };

  const createEvent = async () => {
    const updated = apply(
      await perform(
        () =>
          communityService.createEvent(communityId, {
            title: eventTitle,
            startsAt: eventStartsAt,
            location: eventLocation,
          }),
        message => toast.show(message, 'error'),
      ),
    );
    if (updated) {
      setEventOpen(false);
      setEventTitle('');
      setEventStartsAt('');
      setEventLocation('');
      toast.show('Event created', 'success');
    }
  };

  const openInvites = async (community: Community) => {
    setInviteOpen(true);
    const list = await perform(
      () => communityService.listInvites(community.id),
      () => undefined,
    );
    setInvites(list ?? []);
  };

  const mintInvite = async () => {
    const invite = await perform(
      () => communityService.createInvite(communityId, {}),
      message => toast.show(message, 'error'),
    );
    if (invite) {
      setInvites(prev => [invite, ...prev]);
      toast.show('Invite link created', 'success');
    }
  };

  const shareInvite = async (invite: CommunityInvite, communityName: string) => {
    try {
      await Share.share({message: `Join ${communityName} on YaysApp: ${invite.url}`});
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  };

  const revokeInvite = async (code: string) => {
    const done = await perform(
      async () => {
        await communityService.revokeInvite(communityId, code);
        return true;
      },
      message => toast.show(message, 'error'),
    );
    if (done) {
      setInvites(prev =>
        prev.map(invite => (invite.code === code ? {...invite, revoked: true} : invite)),
      );
      toast.show('Invite revoked', 'info');
    }
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
          const isStaff = c.canModerate ?? (c.role === 'admin' || c.role === 'moderator');
          const canPublish =
            c.canPublishAnnouncement ??
            (c.role === 'admin' ||
              (c.approvedPublisherIds ?? []).includes(session?.user.id ?? ''));
          const canApprove = c.role === 'admin';
          const flags = c.impersonationFlags ?? [];

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
                {c.verified ? (
                  <Badge
                    label={c.officialProduct ? `${c.officialProduct} official` : 'Verified official'}
                    tone="success"
                  />
                ) : null}
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
                {c.banned ? (
                  <Banner
                    tone="danger"
                    icon="ban"
                    text="You are banned from this community. Contact an admin if you think this is a mistake."
                  />
                ) : c.joined ? (
                  <Row gap={spacing.md} style={{justifyContent: 'center', flexWrap: 'wrap'}}>
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
                      onPress={() => openInvites(c)}
                    />
                    {canPublish ? (
                      <QuickAction
                        icon="megaphone-outline"
                        label="Post"
                        onPress={() => setAnnouncementOpen(true)}
                      />
                    ) : null}
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
                    <Button
                      label="I have an invite link"
                      kind="secondary"
                      onPress={() => navigation.navigate('JoinByInvite')}
                      style={{alignSelf: 'stretch'}}
                    />
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

              {c.restricted ? (
                <>
                  <Spacer size={spacing.sm} />
                  <Banner
                    tone="info"
                    icon="lock-closed-outline"
                    text="This is a private community. Posts, members, and announcements appear once your request is approved."
                  />
                </>
              ) : null}

              {isStaff && flags.length > 0 ? (
                <>
                  <Spacer size={spacing.sm} />
                  <Banner tone="warning" icon="warning-outline" text={impersonationLine(flags[0])} />
                </>
              ) : null}

              {isStaff ? (
                <>
                  <SectionHeader title="Manage" />
                  <Card style={{paddingVertical: spacing.xxs}}>
                    <ListRow
                      icon="create-outline"
                      title="Edit community"
                      subtitle="Name, description, privacy, and rules"
                      onPress={() => navigation.navigate('EditCommunity', {communityId: c.id})}
                    />
                    {/* Moderators manage the community but do not speak for it,
                        so the row is hidden rather than shown and refused. */}
                    {canPublish ? (
                      <ListRow
                        icon="megaphone-outline"
                        title="Publish announcement"
                        subtitle="Schedule, target, and track official updates"
                        onPress={() => setAnnouncementOpen(true)}
                      />
                    ) : null}
                    <ListRow
                      icon="stats-chart-outline"
                      title="New poll"
                      subtitle="Ask members a question"
                      onPress={() => setPollOpen(true)}
                    />
                    <ListRow
                      icon="calendar-outline"
                      title="New event"
                      subtitle="Schedule a meetup or call"
                      onPress={() => setEventOpen(true)}
                    />
                  </Card>
                  <Spacer size={spacing.sm} />
                  {(c.joinRequests ?? []).filter(item => item.status === 'pending').length > 0 ? (
                    <Card style={{marginBottom: spacing.sm}}>
                      <YayText variant="heading">Join requests</YayText>
                      <YayText variant="caption" color={colors.textMuted}>
                        Private community access is reviewed by admins and moderators.
                      </YayText>
                      {(c.joinRequests ?? [])
                        .filter(item => item.status === 'pending')
                        .map(item => (
                          <View key={item.id}>
                            <Divider />
                            <Row style={{justifyContent: 'space-between'}}>
                              <View style={{flex: 1}}>
                                <YayText variant="bodyStrong">{item.userName}</YayText>
                                <YayText variant="micro" color={colors.textMuted}>
                                  {item.userEmail} · {timeAgo(item.requestedAt)}
                                </YayText>
                              </View>
                              <Row gap={spacing.xs}>
                                <Button
                                  label="Approve"
                                  kind="secondary"
                                  style={styles.smallButton}
                                  onPress={() => approveJoinRequest(item.id, true)}
                                />
                                <Button
                                  label="Reject"
                                  kind="ghost"
                                  style={styles.smallButton}
                                  onPress={() => approveJoinRequest(item.id, false)}
                                />
                              </Row>
                            </Row>
                          </View>
                        ))}
                    </Card>
                  ) : null}
                  <Card>
                    <YayText variant="heading">Moderation queue</YayText>
                    <YayText variant="caption" color={colors.textMuted}>
                      Reported content awaiting review
                    </YayText>
                    {(c.moderationReports ?? []).length === 0 ? (
                      <YayText variant="caption" color={colors.textMuted} style={{marginTop: spacing.sm}}>
                        No active reports.
                      </YayText>
                    ) : null}
                    {(c.moderationReports ?? []).map(item => (
                      <View key={item.id}>
                        <Divider />
                        <Row style={{justifyContent: 'space-between'}}>
                          <YayText variant="bodyStrong">{item.reporterName}</YayText>
                          <Badge label={item.reason} tone="danger" />
                        </Row>
                        <YayText variant="micro" color={colors.textFaint}>
                          {item.targetType} · {timeAgo(item.createdAt)}
                        </YayText>
                        <YayText variant="caption" color={colors.textSecondary}>
                          "{item.excerpt}"
                        </YayText>
                        <Spacer size={spacing.xs} />
                        {item.status !== 'open' ? (
                          <Badge
                            label={
                              item.status === 'approved'
                                ? 'Approved'
                                : item.status === 'removed'
                                ? 'Removed'
                                : 'Dismissed'
                            }
                            tone={item.status === 'approved' ? 'success' : 'neutral'}
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
                            <Button
                              label="Dismiss"
                              kind="ghost"
                              style={styles.smallButton}
                              onPress={() => resolveQueueItem(item.id, 'dismissed')}
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
                    <Pressable
                      key={a.id}
                      onPress={() => markAnnouncementRead(a.id)}
                      style={({pressed}) => pressed && {opacity: 0.8}}>
                      <Card style={{marginBottom: spacing.sm}}>
                        <Row style={{justifyContent: 'space-between'}}>
                          <YayText variant="bodyStrong" style={{flex: 1}}>
                            {a.title}
                          </YayText>
                          {announcementStatusBadge(a.status)}
                        </Row>
                        <Row gap={spacing.xs} style={styles.announcementMeta}>
                          {a.publisherVerified ? <Badge label="Official" tone="success" /> : null}
                          <YayText variant="micro" color={colors.textFaint}>
                            {a.status === 'scheduled' && a.scheduledFor
                              ? `For ${formatEventDate(a.scheduledFor)}`
                              : timeAgo(a.postedAt)}
                            {a.publisherName ? ` · ${a.publisherName}` : ''}
                          </YayText>
                        </Row>
                        <YayText variant="caption" color={colors.textSecondary}>
                          {a.body}
                        </YayText>
                        <Spacer size={spacing.xs} />
                        <YayText variant="micro" color={colors.textMuted}>
                          Audience: {a.audience === 'region' ? a.region : a.audience ?? 'all'} ·
                          Reads: {(a.readCount ?? 0).toLocaleString()}
                          {a.deliveredCount
                            ? ` of ${a.deliveredCount.toLocaleString()} delivered (${Math.round(
                                Math.min(1, (a.readCount ?? 0) / a.deliveredCount) * 100,
                              )}%)`
                            : ''}
                        </YayText>
                        {a.status === 'rejected' && a.rejectedReason ? (
                          <YayText variant="micro" color={colors.danger}>
                            {a.rejectedReason}
                          </YayText>
                        ) : null}
                        {a.status === 'pending_approval' && canApprove ? (
                          <>
                            <Spacer size={spacing.xs} />
                            <Row gap={spacing.xs}>
                              <Button
                                label="Approve"
                                kind="secondary"
                                style={styles.smallButton}
                                onPress={() => decideAnnouncement(a.id, true)}
                              />
                              <Button
                                label="Reject"
                                kind="ghost"
                                style={styles.smallButton}
                                onPress={() => decideAnnouncement(a.id, false)}
                              />
                            </Row>
                          </>
                        ) : null}
                        {a.actionLabel ? (
                          <>
                            <Spacer size={spacing.xs} />
                            <Button
                              label={a.actionLabel}
                              kind="secondary"
                              icon="link-outline"
                              style={styles.smallButton}
                              onPress={() => markAnnouncementRead(a.id, true)}
                            />
                          </>
                        ) : null}
                      </Card>
                    </Pressable>
                  ))}
                </>
              ) : null}

              {c.events.length > 0 ? (
                <>
                  <SectionHeader title="Events" />
                  {c.events.map(e => (
                    <Card key={e.id} style={{marginBottom: spacing.sm}}>
                      <Row>
                        <View style={styles.eventIcon}>
                          <Ionicons name="calendar-outline" size={20} color={colors.brand} />
                        </View>
                        <View style={{flex: 1}}>
                          <YayText variant="bodyStrong">{e.title}</YayText>
                          <YayText variant="caption" color={colors.textMuted}>
                            {formatEventDate(e.date)} · {e.attending} attending
                            {e.location ? ` · ${e.location}` : ''}
                          </YayText>
                        </View>
                        {e.going ? (
                          <Button
                            label="Going"
                            kind="ghost"
                            style={styles.smallButton}
                            onPress={() => rsvp(e.id, false)}
                          />
                        ) : (
                          <Button
                            label="I'm going"
                            kind="secondary"
                            style={styles.smallButton}
                            onPress={() => rsvp(e.id, true)}
                          />
                        )}
                      </Row>
                    </Card>
                  ))}
                </>
              ) : null}

              {c.polls.length > 0 ? (
                <>
                  <SectionHeader title="Polls" />
                  {c.polls.map(poll => {
                    const total = poll.options.reduce((sum, o) => sum + o.votes, 0);
                    const voted = poll.votedIndex !== undefined;
                    const closed = new Date(poll.closesAt).getTime() <= Date.now();
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
                              disabled={voted || closed || busy}
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
                          {closed
                            ? 'This poll has closed.'
                            : voted
                            ? 'You voted.'
                            : 'Tap an option to vote.'}{' '}
                          {closed ? '' : `Closes ${timeAgo(poll.closesAt)}`}
                        </YayText>
                      </Card>
                    );
                  })}
                </>
              ) : null}

              {c.restricted ? null : (
                <>
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
                    c.feed.map(p => (
                      <Card key={p.id} style={{marginBottom: spacing.sm}}>
                        <Row>
                          <Avatar name={p.authorName} size={34} />
                          <View style={{flex: 1}}>
                            <YayText variant="bodyStrong">{p.authorName}</YayText>
                            <YayText variant="micro" color={colors.textFaint}>
                              {timeAgo(p.postedAt)}
                            </YayText>
                          </View>
                          {p.mine || isStaff ? (
                            <Pressable
                              onPress={() => removePost(p.id)}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel="Remove post">
                              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                            </Pressable>
                          ) : null}
                        </Row>
                        <YayText style={{marginTop: spacing.xs}}>{p.body}</YayText>
                        <Spacer size={spacing.xs} />
                        <Row gap={spacing.md}>
                          <Pressable
                            onPress={() => toggleLike(p.id)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Like post">
                            <Row gap={spacing.xxs}>
                              <Ionicons
                                name={p.liked ? 'heart' : 'heart-outline'}
                                size={18}
                                color={p.liked ? colors.accent : colors.textMuted}
                              />
                              <YayText variant="caption" color={colors.textMuted}>
                                {p.likes}
                              </YayText>
                            </Row>
                          </Pressable>
                          {p.mine ? null : (
                            <Pressable
                              onPress={() => {
                                setReportTarget({
                                  targetType: 'post',
                                  targetId: p.id,
                                  label: `this post by ${p.authorName}`,
                                });
                                setReportOpen(true);
                              }}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel="Report post">
                              <Row gap={spacing.xxs}>
                                <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
                                <YayText variant="caption" color={colors.textMuted}>
                                  Report
                                </YayText>
                              </Row>
                            </Pressable>
                          )}
                        </Row>
                      </Card>
                    ))
                  )}
                </>
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
                onPress={() => {
                  setReportTarget({targetType: 'community', label: `this community`});
                  setReportOpen(true);
                }}
              />

              <BottomSheet
                visible={inviteOpen}
                onClose={() => setInviteOpen(false)}
                title="Invite friends">
                <YayText variant="caption" color={colors.textMuted}>
                  Anyone with an invite link can join {c.name}, even while it is private or
                  invite-only. Revoke a link to cut off access.
                </YayText>
                <Spacer size={spacing.sm} />
                <Button label="Create invite link" icon="add" loading={busy} onPress={mintInvite} />
                <Spacer size={spacing.sm} />
                {invites.length === 0 ? (
                  <YayText variant="caption" color={colors.textFaint}>
                    No invite links yet.
                  </YayText>
                ) : (
                  invites.map(invite => (
                    <View key={invite.code} style={{marginBottom: spacing.sm}}>
                      <View style={styles.inviteLinkBox}>
                        <YayText
                          variant="caption"
                          color={invite.revoked ? colors.textFaint : colors.textSecondary}
                          numberOfLines={1}
                          style={{flex: 1}}>
                          {invite.url}
                        </YayText>
                      </View>
                      <Row gap={spacing.xs} style={{marginTop: spacing.xxs}}>
                        {invite.revoked ? (
                          <Badge label="Revoked" tone="neutral" />
                        ) : (
                          <>
                            <Button
                              label="Share"
                              kind="secondary"
                              icon="share-outline"
                              style={styles.smallButton}
                              onPress={() => shareInvite(invite, c.name)}
                            />
                            <Button
                              label="Revoke"
                              kind="ghost"
                              style={styles.smallButton}
                              onPress={() => revokeInvite(invite.code)}
                            />
                          </>
                        )}
                        <YayText variant="micro" color={colors.textFaint}>
                          {invite.uses} use{invite.uses === 1 ? '' : 's'}
                          {invite.maxUses ? ` of ${invite.maxUses}` : ''}
                        </YayText>
                      </Row>
                    </View>
                  ))
                )}
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
                title="Report to moderators">
                <YayText variant="caption" color={colors.textMuted}>
                  Why are you reporting {reportTarget.label}?
                </YayText>
                <Spacer size={spacing.sm} />
                <View style={styles.chipWrap}>
                  {reportReasons.map(reason => (
                    <Chip key={reason} label={reason} onPress={() => sendReport(reason)} />
                  ))}
                </View>
              </BottomSheet>

              <BottomSheet
                visible={announcementOpen}
                onClose={() => setAnnouncementOpen(false)}
                title="Publish announcement">
                {c.verified && !canApprove ? (
                  <Banner
                    tone="info"
                    icon="shield-checkmark-outline"
                    text="This is an official account, so your announcement goes to an admin for approval before it is sent."
                  />
                ) : null}
                <TextField
                  label="Title"
                  placeholder="Announcement title"
                  value={announcementTitle}
                  onChangeText={setAnnouncementTitle}
                />
                <TextField
                  label="Message"
                  placeholder="What should members know?"
                  value={announcementBody}
                  onChangeText={setAnnouncementBody}
                  multiline
                />
                <YayText variant="caption" color={colors.textSecondary}>
                  Audience
                </YayText>
                <Spacer size={spacing.xs} />
                <View style={styles.chipWrap}>
                  {(['all', 'members', 'region'] as const).map(audience => (
                    <Chip
                      key={audience}
                      label={audience === 'all' ? 'Everyone' : audience === 'members' ? 'Members' : 'Region'}
                      active={announcementAudience === audience}
                      onPress={() => setAnnouncementAudience(audience)}
                    />
                  ))}
                </View>
                <Spacer size={spacing.sm} />
                {announcementAudience === 'region' ? (
                  <TextField
                    label="Region"
                    hint="Members whose account region matches are notified; others are not."
                    placeholder="United States"
                    value={announcementRegion}
                    onChangeText={setAnnouncementRegion}
                  />
                ) : null}
                <TextField
                  label="Schedule for"
                  hint="Optional. Use a future date/time, for example 2026-08-20T09:00:00."
                  placeholder="Publish now"
                  value={announcementScheduledFor}
                  onChangeText={setAnnouncementScheduledFor}
                  autoCapitalize="none"
                />
                <TextField
                  label="Primary action"
                  placeholder="Button label"
                  value={announcementActionLabel}
                  onChangeText={setAnnouncementActionLabel}
                />
                <TextField
                  label="Action link"
                  placeholder="mock-link://product/action"
                  value={announcementActionUrl}
                  onChangeText={setAnnouncementActionUrl}
                  autoCapitalize="none"
                />
                <Button
                  label="Save announcement"
                  icon="megaphone-outline"
                  loading={busy}
                  onPress={publishAnnouncement}
                />
              </BottomSheet>

              <BottomSheet visible={pollOpen} onClose={() => setPollOpen(false)} title="New poll">
                <TextField
                  label="Question"
                  placeholder="What should we do next?"
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                />
                {pollOptions.map((option, index) => (
                  <TextField
                    key={index}
                    label={`Option ${index + 1}`}
                    placeholder="Option text"
                    value={option}
                    onChangeText={text =>
                      setPollOptions(prev => prev.map((o, i) => (i === index ? text : o)))
                    }
                  />
                ))}
                <Button
                  label="Add option"
                  kind="secondary"
                  icon="add"
                  onPress={() => setPollOptions(prev => [...prev, ''])}
                />
                <Spacer size={spacing.sm} />
                <Button label="Create poll" loading={busy} onPress={createPoll} />
              </BottomSheet>

              <BottomSheet visible={eventOpen} onClose={() => setEventOpen(false)} title="New event">
                <TextField
                  label="Title"
                  placeholder="Community call"
                  value={eventTitle}
                  onChangeText={setEventTitle}
                />
                <TextField
                  label="Starts at"
                  hint="For example 2026-08-20T18:00:00."
                  placeholder="2026-08-20T18:00:00"
                  value={eventStartsAt}
                  onChangeText={setEventStartsAt}
                  autoCapitalize="none"
                />
                <TextField
                  label="Location"
                  placeholder="Online, or a place"
                  value={eventLocation}
                  onChangeText={setEventLocation}
                />
                <Button label="Create event" loading={busy} onPress={createEvent} />
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
//
// A community's chat is a real M2 group conversation. When the community has a
// backing chat group the screen renders that conversation — same transport,
// history, and push as any other group. Communities served by the local engine
// have no group, so a clearly-labelled seeded preview stands in.
// ---------------------------------------------------------------------------

type ChatProps = NativeStackScreenProps<CommunitiesStackParamList, 'CommunityChat'>;

const SEED_MESSAGES = [
  {id: 'cm1', author: 'Priya Shah', text: 'Welcome everyone who joined this week!', mine: false},
  {id: 'cm2', author: 'Leo Martins', text: 'Glad to be here — this community is exactly what I was looking for.', mine: false},
  {id: 'cm3', author: 'Priya Shah', text: 'Reminder: the meetup poll closes tonight, cast your vote!', mine: false},
  {id: 'cm4', author: 'Amara Diallo', text: 'Just voted. Saturday works best for me.', mine: false},
];

interface ChatRow {
  id: string;
  author: string;
  text: string;
  mine: boolean;
}

export const CommunityChatScreen = ({route}: ChatProps) => {
  const {communityId} = route.params;
  const toast = useToast();
  const {session} = useAuth();
  const load = useAsync(() => communityService.get(communityId), [communityId]);
  const community = load.data;
  const conversationId = community ? communityService.chatConversationId(community) : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [preview, setPreview] = useState<ChatRow[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const localIdRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  // AI-in-community. Gated by its own consent switch, separate from chat.
  const {run: runAiAssist, sheet: aiAssistSheet} = useAiAssist();
  const aiInCommunitiesEnabled = featureFlags.isEnabled('ai_in_communities');

  const rows: ChatRow[] = useMemo(() => {
    if (!conversationId) {
      return preview;
    }
    const meId = session?.user.id;
    return messages.map(message => ({
      id: message.id,
      author: message.senderId === meId ? 'You' : message.senderId,
      text: message.text,
      mine: message.senderId === meId,
    }));
  }, [conversationId, messages, preview, session?.user.id]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    try {
      const page = await chatService.getMessages(conversationId);
      setMessages(page.items);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }, [conversationId, toast]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    return chatService.subscribeConversation(conversationId, event => {
      if (event.type === 'message.upsert') {
        setMessages(prev => {
          const next = prev.filter(
            message =>
              message.id !== event.message.id &&
              (!event.message.clientId || message.clientId !== event.message.clientId),
          );
          return [...next, event.message];
        });
      }
      if (event.type === 'message.deleted') {
        setMessages(prev => prev.filter(message => message.id !== event.messageId));
      }
    });
  }, [conversationId]);

  const summarizeCommunityWithAi = () => {
    const transcript = rows
      .slice(-30)
      .map(row => `${row.author}: ${row.text}`)
      .join('\n');
    runAiAssist({
      kind: 'summarize_conversation',
      scope: 'community',
      title: 'Summarize this community',
      describes: 'The last 30 messages in this community chat',
      content: transcript,
    });
  };

  const send = async () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setDraft('');
    if (!conversationId) {
      localIdRef.current += 1;
      setPreview(prev => [
        ...prev,
        {id: `local-${localIdRef.current}`, author: 'You', text, mine: true},
      ]);
      return;
    }
    setSending(true);
    try {
      const message = await chatService.sendMessage(conversationId, {text});
      setMessages(prev =>
        prev.some(item => item.id === message.id) ? prev : [...prev, message],
      );
    } catch (e) {
      setDraft(text);
      toast.show(errorMessage(e), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={{padding: spacing.md, paddingBottom: 0}}>
        {conversationId ? null : (
          <Banner
            tone="info"
            icon="flask"
            text="Community chat preview — this community has no live chat group in offline mode."
          />
        )}
        {community ? (
          <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.xs}}>
            {community.name} · {memberLabel(community.memberCount)}
          </YayText>
        ) : null}
        {aiInCommunitiesEnabled ? (
          <Button
            label="Summarize with AI"
            kind="secondary"
            icon="sparkles"
            style={{marginBottom: spacing.xs}}
            onPress={summarizeCommunityWithAi}
          />
        ) : null}
      </View>
      <ScrollView
        ref={scrollRef}
        style={{flex: 1}}
        contentContainerStyle={{padding: spacing.md, gap: spacing.xs}}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({animated: true})}>
        {rows.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No messages yet"
            message="Say hello to get the conversation started."
          />
        ) : (
          rows.map(m => (
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
          ))
        )}
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
          loading={sending}
          onPress={send}
          style={styles.smallButton}
        />
      </View>
      {aiAssistSheet}
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// CommunityMembersScreen
// ---------------------------------------------------------------------------

type MembersProps = NativeStackScreenProps<CommunitiesStackParamList, 'CommunityMembers'>;

export const CommunityMembersScreen = ({route}: MembersProps) => {
  const {communityId} = route.params;
  const toast = useToast();
  const {perform} = useAction();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<CommunityMember | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useAsync(
    async () => {
      const [community, members] = await Promise.all([
        communityService.get(communityId),
        communityService.members(communityId, debounced),
      ]);
      return {community, members};
    },
    [communityId, debounced],
  );

  const act = async (run: () => Promise<unknown>, success: string) => {
    setSelected(null);
    const done = await perform(
      async () => {
        await run();
        return true;
      },
      message => toast.show(message, 'error'),
    );
    if (done) {
      toast.show(success, 'success');
      load.reload();
    }
  };

  return (
    <Screen refreshing={load.refreshing} onRefresh={load.refresh}>
      <AsyncView
        loading={load.loading}
        error={load.error}
        offline={load.offline}
        onRetry={load.reload}
        data={load.data}>
        {({community, members}) => {
          const iModerate =
            community.canModerate ?? (community.role === 'admin' || community.role === 'moderator');
          const iAdmin = community.role === 'admin';
          const active = members.filter(member => member.status === 'active');
          const banned = members.filter(member => member.status === 'banned');
          const staff = active.filter(member => member.role !== 'member');
          const regular = active.filter(member => member.role === 'member');

          const memberRow = (member: CommunityMember) => (
            <Pressable
              key={member.id}
              onLongPress={iModerate ? () => setSelected(member) : undefined}
              style={({pressed}) => [styles.memberRow, pressed && {backgroundColor: colors.surfaceSunken}]}>
              <Avatar name={member.name} imageUri={member.profilePic} />
              <View style={{flex: 1}}>
                <YayText variant="bodyStrong" numberOfLines={1}>
                  {member.name}
                </YayText>
                <YayText variant="caption" color={colors.textMuted} numberOfLines={1}>
                  @{member.username}
                </YayText>
              </View>
              {member.role !== 'member' ? roleBadge(member.role) : null}
            </Pressable>
          );

          return (
            <>
              <YayText variant="title">Members</YayText>
              <YayText variant="caption" color={colors.textMuted}>
                {community.name} · {memberLabel(community.memberCount)}
              </YayText>
              <Spacer size={spacing.sm} />
              <SearchBar value={query} onChangeText={setQuery} placeholder="Search members" />
              {iModerate ? (
                <>
                  <Spacer size={spacing.xs} />
                  <Banner tone="info" icon="shield-checkmark-outline" text="Long-press a member to moderate." />
                </>
              ) : null}

              {active.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="No members found"
                  message={
                    debounced ? `No one matches “${debounced}”.` : 'This community has no visible members yet.'
                  }
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

              {iModerate && banned.length > 0 ? (
                <>
                  <SectionHeader title="Banned" />
                  {banned.map(member => (
                    <Row key={member.id} style={styles.memberRow}>
                      <Avatar name={member.name} imageUri={member.profilePic} />
                      <View style={{flex: 1}}>
                        <YayText variant="bodyStrong" numberOfLines={1}>
                          {member.name}
                        </YayText>
                        <YayText variant="micro" color={colors.textMuted} numberOfLines={1}>
                          {member.banReason || 'Banned by a moderator'}
                        </YayText>
                      </View>
                      <Button
                        label="Unban"
                        kind="ghost"
                        style={styles.smallButton}
                        onPress={() =>
                          act(
                            () => communityService.unbanMember(communityId, member.email),
                            `${member.name} was unbanned`,
                          )
                        }
                      />
                    </Row>
                  ))}
                </>
              ) : null}

              <BottomSheet
                visible={selected !== null}
                onClose={() => setSelected(null)}
                title={selected ? selected.name : undefined}>
                {selected ? (
                  <>
                    {iAdmin ? (
                      <ListRow
                        icon="ribbon-outline"
                        chevron={false}
                        title={
                          selected.role === 'moderator' ? 'Remove moderator' : 'Make moderator'
                        }
                        onPress={() =>
                          act(
                            () =>
                              communityService.setRole(
                                communityId,
                                selected.email,
                                selected.role === 'moderator' ? 'member' : 'moderator',
                              ),
                            selected.role === 'moderator'
                              ? `${selected.name} is no longer a moderator`
                              : `${selected.name} is now a moderator`,
                          )
                        }
                      />
                    ) : null}
                    <ListRow
                      icon="person-remove-outline"
                      iconTone={colors.danger}
                      chevron={false}
                      title="Remove from community"
                      onPress={() =>
                        act(
                          () => communityService.removeMember(communityId, selected.email),
                          `${selected.name} was removed`,
                        )
                      }
                    />
                    <ListRow
                      icon="ban-outline"
                      iconTone={colors.danger}
                      chevron={false}
                      title="Ban member"
                      subtitle="Removes them and blocks them from re-joining, including by invite."
                      onPress={() =>
                        act(
                          () =>
                            communityService.removeMember(communityId, selected.email, {
                              ban: true,
                              reason: 'Banned by a moderator',
                            }),
                          `${selected.name} was banned`,
                        )
                      }
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
  const [inviteOnly, setInviteOnly] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const create = async () => {
    setNameError(null);
    const created = await perform(
      () => communityService.create({name, description, category, privacy, inviteOnly}),
      message => {
        setNameError(message);
        toast.show(message, 'error');
      },
    );
    if (created) {
      const flag = created.impersonationFlags?.[0];
      toast.show(
        flag ? 'Created — a moderator will review the name' : `${created.name} is live!`,
        flag ? 'info' : 'success',
      );
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
        hint="Names that imitate an official product account are reviewed by moderators."
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
      <Spacer size={spacing.sm} />
      <CheckRowWithCaption
        label="Invite-only"
        caption="Nobody can join or request to join — only an invite link gets someone in."
        checked={inviteOnly}
        onToggle={() => setInviteOnly(prev => !prev)}
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
  const categories = useMemo(
    () => communityService.categories().filter(c => c !== 'All'),
    [],
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [inviteOnly, setInviteOnly] = useState(false);
  const [rules, setRules] = useState<string[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    if (load.data && !seeded.current) {
      seeded.current = true;
      setName(load.data.name);
      setDescription(load.data.description);
      setCategory(load.data.category);
      setPrivacy(load.data.privacy);
      setInviteOnly(!!load.data.inviteOnly);
      setRules(load.data.rules);
    }
  }, [load.data]);

  const save = async () => {
    const updated = await perform(
      () =>
        communityService.update(communityId, {
          name: name.trim(),
          description: description.trim(),
          category,
          privacy,
          inviteOnly,
          rules: rules.map(r => r.trim()).filter(Boolean),
        }),
      message => toast.show(message, 'error'),
    );
    if (updated) {
      const flag = updated.impersonationFlags?.[0];
      toast.show(
        flag ? 'Saved — a moderator will review the new name' : 'Community updated',
        flag ? 'info' : 'success',
      );
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
            <Spacer size={spacing.sm} />
            <CheckRowWithCaption
              label="Invite-only"
              caption="Only an invite link gets someone in."
              checked={inviteOnly}
              onToggle={() => setInviteOnly(prev => !prev)}
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
// JoinByInviteScreen
//
// Redeeming a link is a two-step flow on purpose: preview first, so a person
// sees which community they are about to join (and any reason the link is
// dead) before their membership is created.
// ---------------------------------------------------------------------------

type InviteProps = NativeStackScreenProps<CommunitiesStackParamList, 'JoinByInvite'>;

export const JoinByInviteScreen = ({navigation, route}: InviteProps) => {
  const toast = useToast();
  const {busy, perform} = useAction();
  const [code, setCode] = useState(route.params?.code ?? '');
  const [preview, setPreview] = useState<{
    community: Community;
    valid: boolean;
    reason?: string;
  } | null>(null);

  const check = async () => {
    const result = await perform(
      () => communityService.previewInvite(code),
      message => {
        setPreview(null);
        toast.show(message, 'error');
      },
    );
    if (result) {
      setPreview(result);
    }
  };

  const accept = async () => {
    const joined = await perform(
      () => communityService.acceptInvite(code),
      message => toast.show(message, 'error'),
    );
    if (joined) {
      toast.show(`Joined ${joined.name}`, 'success');
      navigation.replace('CommunityDetail', {communityId: joined.id});
    }
  };

  return (
    <Screen>
      <YayText variant="title">Join with an invite</YayText>
      <YayText variant="caption" color={colors.textMuted}>
        Paste an invite link or code. An invite works even for private and invite-only
        communities.
      </YayText>
      <Spacer size={spacing.lg} />
      <TextField
        label="Invite link or code"
        placeholder="https://yay.chat/c/trail-runners?i=…"
        value={code}
        onChangeText={t => {
          setCode(t);
          setPreview(null);
        }}
        autoCapitalize="none"
      />
      <Button
        label="Check invite"
        kind="secondary"
        loading={busy}
        disabled={code.trim().length === 0}
        onPress={check}
      />

      {preview ? (
        <>
          <Spacer size={spacing.lg} />
          <Card style={{alignItems: 'center'}}>
            <Avatar name={preview.community.name} size={64} />
            <Spacer size={spacing.sm} />
            <YayText variant="heading">{preview.community.name}</YayText>
            <YayText variant="caption" color={colors.textMuted}>
              {preview.community.category} · {memberLabel(preview.community.memberCount)}
            </YayText>
            {preview.community.description ? (
              <YayText
                variant="caption"
                color={colors.textSecondary}
                style={{textAlign: 'center', marginTop: spacing.sm}}>
                {preview.community.description}
              </YayText>
            ) : null}
            <Spacer size={spacing.md} />
            {preview.valid ? (
              <Button
                label={preview.community.joined ? 'Open community' : 'Join community'}
                loading={busy}
                style={{alignSelf: 'stretch'}}
                onPress={
                  preview.community.joined
                    ? () =>
                        navigation.replace('CommunityDetail', {
                          communityId: preview.community.id,
                        })
                    : accept
                }
              />
            ) : (
              <Banner tone="warning" icon="alert-circle-outline" text={preview.reason ?? 'This invite cannot be used.'} />
            )}
          </Card>
        </>
      ) : null}
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
  announcementMeta: {
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
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
