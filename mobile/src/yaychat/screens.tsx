import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  chatThreads,
  conversationPreview,
  contactSummaries,
  callPreviews,
  discoverCards,
  milestoneSignals,
  miniAppPreviews,
  momentsPreview,
  serviceShortcuts,
} from './mockData';
import {
  ActionRow,
  bodyText,
  BrandPill,
  GlassCard,
  HeroHeader,
  ListCard,
  SectionTitle,
  StatStrip,
  YayScreen,
} from './ui';
import {yayTheme, yayTypography} from './theme';

export const ChatsHomeScreen = ({navigation}: any) => (
  <YayScreen>
    <HeroHeader
      eyebrow="YayChat"
      title="Chats"
      subtitle="A chat-first shell for direct messages, groups, and official accounts."
      rightLabel="MVP track"
    />

    <GlassCard>
      <BrandPill label="WeChat comparison" />
      <Text style={styles.featureTitle}>What we already have</Text>
      <Text style={bodyText}>
        Auth, inbox, basic threads, wallet-adjacent services, and support flows
        are already in the codebase. This shell reorganizes them into a
        communication product.
      </Text>
      <StatStrip items={milestoneSignals} />
    </GlassCard>

    <SectionTitle title="Recent threads" meta="4 seeded previews" />
    {chatThreads.map(thread => (
      <ListCard
        key={thread.id}
        accent={thread.accent}
        badge={thread.state}
        meta={thread.time}
        onPress={() => navigation.navigate('Conversation', {thread})}
        subtitle={thread.lastMessage}
        title={thread.title}
      />
    ))}

    <ActionRow
      description="Preview the richer thread experience needed to reach parity with a modern messaging app."
      icon="chatbubble-ellipses-outline"
      onPress={() => navigation.navigate('Conversation', {thread: chatThreads[0]})}
      title="Open conversation"
    />
    <ActionRow
      description="Review call history, room states, and the signaling work still needed."
      icon="call-outline"
      onPress={() => navigation.navigate('Calls')}
      title="Open calls board"
    />
    <ActionRow
      description="Stage how group creation, invites, and moderation should work."
      icon="people-circle-outline"
      onPress={() => navigation.navigate('GroupStudio')}
      title="Open group studio"
    />
  </YayScreen>
);

export const ContactsScreen = ({navigation}: any) => (
  <YayScreen>
    <HeroHeader
      eyebrow="Network"
      title="Contacts"
      subtitle="The current app lacks a real friend graph. This surface defines how contact discovery should feel."
      rightLabel="Gap: medium"
    />

    <GlassCard>
      <BrandPill label="Needed for WeChat parity" tone="accent" />
      <Text style={styles.featureTitle}>Contacts need more than a list</Text>
      <Text style={bodyText}>
        We need add-by-QR, approval flows, saved contacts, business accounts,
        presence, and contact segmentation before YayChat feels complete.
      </Text>
    </GlassCard>

    <SectionTitle title="Suggested contacts" meta="Seeded preview" />
    {contactSummaries.map(contact => (
      <ListCard
        key={contact.id}
        accent={contact.accent}
        badge={contact.action}
        onPress={() => navigation.navigate('ContactProfile', {contact})}
        subtitle={contact.status}
        title={contact.name}
      />
    ))}

    <ActionRow
      description="A QR-based add-contact flow is a core gap versus WeChat."
      icon="qr-code-outline"
      onPress={() => navigation.navigate('QRPreview')}
      title="Preview QR identity card"
    />
  </YayScreen>
);

export const DiscoverScreen = ({navigation}: any) => (
  <YayScreen>
    <HeroHeader
      eyebrow="Expansion"
      title="Discover"
      subtitle="This is where YayChat starts moving beyond chat into social, wallet, and mini-app workflows."
      rightLabel="Super-app path"
    />

    {discoverCards.map(card => (
      <TouchableOpacity
        key={card.id}
        activeOpacity={0.86}
        onPress={() => navigation.navigate(card.route)}
        style={[styles.discoveryCard, {borderLeftColor: card.accent}]}>
        <View style={styles.discoveryCopy}>
          <BrandPill label={card.badge} />
          <Text style={styles.featureTitle}>{card.title}</Text>
          <Text style={bodyText}>{card.description}</Text>
        </View>
        <Ionicons name="arrow-forward-circle-outline" size={24} color={yayTheme.colors.ink} />
      </TouchableOpacity>
    ))}
  </YayScreen>
);

export const ServicesScreen = ({navigation}: any) => (
  <YayScreen>
    <HeroHeader
      eyebrow="Preserved modules"
      title="Services"
      subtitle="Existing mining, subscription, and support capabilities stay in the app, but they no longer define the primary product."
      rightLabel="Legacy preserved"
    />

    {serviceShortcuts.map(service => (
      <TouchableOpacity
        key={service.id}
        activeOpacity={0.86}
        onPress={() => navigation.navigate(service.route)}
        style={[styles.serviceCard, {backgroundColor: `${service.accent}14`}]}>
        <Text style={styles.serviceBadge}>{service.badge}</Text>
        <Text style={styles.serviceTitle}>{service.title}</Text>
        <Text style={styles.serviceDescription}>{service.description}</Text>
      </TouchableOpacity>
    ))}

    <ActionRow
      description="Balance, transferability, and wallet surfaces remain available while the app becomes more communication-centric."
      icon="wallet-outline"
      onPress={() => navigation.navigate('Balances')}
      title="Open wallet balances"
    />
  </YayScreen>
);

export const MeScreen = ({navigation}: any) => (
  <YayScreen>
    <HeroHeader
      eyebrow="Identity"
      title="Me"
      subtitle="Profile, privacy, and account safety stay intact while the product brand shifts to YayChat."
      rightLabel="User center"
    />

    <GlassCard>
      <Text style={styles.featureTitle}>YayChat profile</Text>
      <Text style={bodyText}>
        Existing profile and privacy screens are preserved. The missing work is
        social identity: status, saved posts, blocked contacts, devices, and
        trusted payment methods.
      </Text>
    </GlassCard>

    <ActionRow
      description="Use the original account profile editor from the copied app."
      icon="person-outline"
      onPress={() => navigation.navigate('Profile')}
      title="Open profile"
    />
    <ActionRow
      description="Review privacy controls and account policy screens."
      icon="shield-checkmark-outline"
      onPress={() => navigation.navigate('Privacy')}
      title="Privacy and terms"
    />
    <ActionRow
      description="Keep access to role and account progression from the existing app."
      icon="sparkles-outline"
      onPress={() => navigation.navigate('Roles')}
      title="Roles and progression"
    />
  </YayScreen>
);

export const FeaturePreviewScreen = ({route}: any) => {
  const params = route.params || {};
  const title = params.title || params.thread?.title || params.contact?.name || 'Preview';
  const badge = params.badge || params.thread?.state || params.contact?.role || 'Preview';
  const summary =
    params.summary ||
    params.thread?.lastMessage ||
    params.contact?.status ||
    'This screen describes the feature gap and target behavior for YayChat.';
  const highlights: string[] = params.highlights || [
    'Frontend preview implemented in YayChat.',
    'Backend support partially exists for chat and unread state.',
    'Additional work is still required to fully match WeChat behavior.',
  ];

  return (
    <YayScreen>
      <HeroHeader
        eyebrow="Feature preview"
        title={title}
        subtitle={summary}
        rightLabel={badge}
      />
      <GlassCard>
        <Text style={styles.featureTitle}>What this module needs next</Text>
        {highlights.map(item => (
          <View key={item} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </GlassCard>
    </YayScreen>
  );
};

export const ConversationScreen = ({route, navigation}: any) => {
  const thread = route.params?.thread || chatThreads[0];

  return (
    <YayScreen>
      <HeroHeader
        eyebrow={thread.type === 'group' ? 'Group thread' : 'Direct thread'}
        title={thread.title}
        subtitle={`${thread.handle} • ${thread.state}`}
        rightLabel={thread.time}
      />

      <GlassCard>
        <View style={styles.threadToolbar}>
          <BrandPill label="Reply" />
          <BrandPill label="Voice note" tone="accent" />
          <BrandPill label="Forward" tone="muted" />
        </View>
        {conversationPreview.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.direction === 'outgoing'
                ? styles.outgoingBubble
                : message.direction === 'system'
                  ? styles.systemBubble
                  : styles.incomingBubble,
            ]}>
            <Text style={styles.messageAuthor}>{message.author}</Text>
            <Text style={styles.messageBody}>{message.body}</Text>
            <Text style={styles.messageMeta}>
              {message.time}
              {message.status ? ` • ${message.status}` : ''}
            </Text>
          </View>
        ))}
      </GlassCard>

      <ActionRow
        description="This thread still needs live delivery, media upload, reactions, and socket transport alignment."
        icon="flash-outline"
        onPress={() => navigation.navigate('ConversationPreview', {thread})}
        title="Open implementation notes"
      />
    </YayScreen>
  );
};

export const CallsScreen = () => (
  <YayScreen>
    <HeroHeader
      eyebrow="Calls"
      title="Calls board"
      subtitle="This is the UI target for voice and video history before transport and permissions are wired."
      rightLabel="Gap: large"
    />
    {callPreviews.map(call => (
      <ListCard
        key={call.id}
        accent={
          call.outcome === 'missed'
            ? yayTheme.colors.danger
            : call.mode === 'video'
              ? yayTheme.colors.blue
              : yayTheme.colors.brand
        }
        badge={`${call.mode} • ${call.outcome}`}
        meta={call.time}
        subtitle={call.subtitle}
        title={call.title}
      />
    ))}
    <GlassCard>
      <Text style={styles.featureTitle}>Still required</Text>
      <Text style={bodyText}>
        Socket signaling, ringing state, call controls, device permissions, call
        recap, and push wake-up handling are still missing from the current app.
      </Text>
    </GlassCard>
  </YayScreen>
);

export const GroupStudioScreen = () => (
  <YayScreen>
    <HeroHeader
      eyebrow="Groups"
      title="Group studio"
      subtitle="Maps the features needed for credible team, family, and official-account group experiences."
      rightLabel="Backend partial"
    />
    <GlassCard>
      <Text style={styles.featureTitle}>Group launch checklist</Text>
      {[
        'Create group with avatar, topic, invite code, and owner roles.',
        'Expose group message history already supported by backend APIs.',
        'Add mute, read state, and moderation controls.',
        'Support official account broadcasts and service rooms later.',
      ].map(item => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </GlassCard>
  </YayScreen>
);

export const ContactProfileScreen = ({route, navigation}: any) => {
  const contact = route.params?.contact || contactSummaries[0];

  return (
    <YayScreen>
      <HeroHeader
        eyebrow={contact.role}
        title={contact.name}
        subtitle={contact.status}
        rightLabel={contact.action}
      />
      <ActionRow
        description="Jump into the richer conversation surface for this contact."
        icon="chatbubble-outline"
        onPress={() =>
          navigation.navigate('Conversation', {
            thread: {
              ...chatThreads[0],
              title: contact.name,
              state: contact.status,
            },
          })
        }
        title="Message contact"
      />
      <ActionRow
        description="Calls remain a milestone target, but the UX direction is defined."
        icon="videocam-outline"
        onPress={() => navigation.navigate('Calls')}
        title="Start call preview"
      />
    </YayScreen>
  );
};

export const MomentsScreen = () => (
  <YayScreen>
    <HeroHeader
      eyebrow="Moments"
      title="Social layer"
      subtitle="A first pass at the feed YayChat would need before it can claim WeChat-style social behavior."
      rightLabel="Gap closing"
    />
    {momentsPreview.map(post => (
      <GlassCard key={post.id}>
        <BrandPill label={post.meta} />
        <Text style={styles.featureTitle}>{post.author}</Text>
        <Text style={bodyText}>{post.caption}</Text>
        <Text style={styles.postStats}>{post.stats}</Text>
      </GlassCard>
    ))}
  </YayScreen>
);

export const WalletHubScreen = () => (
  <YayScreen>
    <HeroHeader
      eyebrow="Wallet"
      title="Scan and pay"
      subtitle="Shows the chat-native wallet layer YayChat still needs beyond the preserved legacy payment flows."
      rightLabel="Super-app core"
    />
    <GlassCard>
      <Text style={styles.featureTitle}>Wallet actions</Text>
      {[
        'Personal QR to receive money or connect with a contact.',
        'Merchant QR with receipt, refund, and order context.',
        'In-chat request money flow tied to direct and group threads.',
      ].map(item => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </GlassCard>
  </YayScreen>
);

export const MiniAppsScreen = () => (
  <YayScreen>
    <HeroHeader
      eyebrow="Platform"
      title="Mini apps"
      subtitle="These are examples of service experiences that could eventually live inside YayChat."
      rightLabel="Long-range"
    />
    {miniAppPreviews.map(app => (
      <ListCard
        key={app.id}
        accent={app.accent}
        badge="Concept"
        subtitle={app.description}
        title={app.title}
      />
    ))}
    <GlassCard>
      <Text style={styles.featureTitle}>Why this is later</Text>
      <Text style={bodyText}>
        A mini-app platform needs runtime isolation, business onboarding,
        service permissions, and a support model. It should follow chat, calls,
        and wallet basics, not precede them.
      </Text>
    </GlassCard>
  </YayScreen>
);

const styles = StyleSheet.create({
  featureTitle: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 12,
  },
  discoveryCard: {
    alignItems: 'center',
    backgroundColor: yayTheme.colors.card,
    borderColor: yayTheme.colors.line,
    borderLeftWidth: 6,
    borderRadius: yayTheme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 18,
  },
  discoveryCopy: {
    flex: 1,
    paddingRight: 12,
  },
  serviceCard: {
    borderRadius: yayTheme.radius.lg,
    marginBottom: 14,
    padding: 18,
  },
  serviceBadge: {
    color: yayTheme.colors.inkMuted,
    fontFamily: yayTypography.titleFamily,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.7,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  serviceTitle: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  serviceDescription: {
    color: yayTheme.colors.inkSoft,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingRight: 6,
  },
  bulletDot: {
    backgroundColor: yayTheme.colors.brand,
    borderRadius: 4,
    height: 8,
    marginRight: 10,
    marginTop: 7,
    width: 8,
  },
  bulletText: {
    ...bodyText,
    flex: 1,
  },
  threadToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  messageBubble: {
    borderRadius: yayTheme.radius.md,
    marginBottom: 10,
    padding: 14,
  },
  incomingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: yayTheme.colors.canvas,
    maxWidth: '88%',
  },
  outgoingBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(29, 143, 95, 0.14)',
    maxWidth: '88%',
  },
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: yayTheme.colors.paper,
    borderColor: yayTheme.colors.line,
    borderWidth: 1,
    maxWidth: '94%',
  },
  messageAuthor: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  messageBody: {
    color: yayTheme.colors.inkSoft,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  messageMeta: {
    color: yayTheme.colors.inkMuted,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 12,
    marginTop: 8,
  },
  postStats: {
    color: yayTheme.colors.inkMuted,
    fontFamily: yayTypography.bodyFamily,
    fontSize: 12,
    marginTop: 12,
  },
});
