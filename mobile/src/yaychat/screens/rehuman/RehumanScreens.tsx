/**
 * ReHuman sub-app hub.
 *
 * Unlike the BTCY/EMMM/ShoperPal hubs (account dashboards), ReHuman is a
 * longevity supplement institution — so this hub is an editorial storefront:
 * the three formulas, the philosophy, the roadmap, and the journal, in
 * ReHuman's cream-and-forest-green identity. Every purchase/reading CTA
 * deep-links to rehumansystem.com — no checkout inside YaysApp.
 */
import React from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Badge,
  Card,
  HubCta,
  ListRow,
  MockNotice,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  YayText,
} from '../../design/components';
import {colors, radius, shadows, spacing} from '../../design/tokens';
import {rehumanService} from '../../services';
import {useAsync} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {RootStackParamList} from '../../types/navigation';

const REHUMAN_SCHEME = 'rehuman://';
const REHUMAN_SITE = 'https://rehumansystem.com/';
// ReHuman brand (from rehumansystem.com): forest green over warm cream.
const RH_FOREST = '#5c7062';
const RH_FOREST_DEEP = '#1f4a3d';
const RH_SAGE = '#a8b89e';
const RH_CREAM = '#fbf8ef';

/** Opens ReHuman at a path, falling back to the website root. */
const openRehuman = async (path = '') => {
  try {
    await Linking.openURL(`${REHUMAN_SCHEME}${path}`);
  } catch {
    Linking.openURL(`${REHUMAN_SITE}${path}`).catch(() => undefined);
  }
};

export const RehumanHubScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'RehumanHub'>) => {
  const toast = useToast();
  const {data, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => rehumanService.dashboard(),
    [],
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MockNotice text="Preview — content mirrors rehumansystem.com. Purchases happen on the ReHuman site." />
      <AsyncView loading={loading} error={error} offline={offline} onRetry={reload} data={data}>
        {d => (
          <>
            {/* Hero */}
            <View style={styles.hero}>
              <YayText variant="micro" color={RH_SAGE}>
                {d.tagline.toUpperCase()}
              </YayText>
              <YayText variant="title" color={RH_CREAM} style={{marginTop: spacing.xxs}}>
                The future of regenerative human wellness.
              </YayText>
              <Spacer size={spacing.xs} />
              <YayText variant="caption" color={RH_SAGE}>
                {d.intro}
              </YayText>
              <Spacer size={spacing.md} />
              <HubCta
                label="See the Formulas"
                background={RH_CREAM}
                color={RH_FOREST_DEEP}
                onPress={() => openRehuman('formulas')}
              />
            </View>

            {/* Formulas */}
            <SectionHeader title="The formulas" />
            <View style={{gap: spacing.sm}}>
              {d.formulas.map(f => (
                <Card key={f.id}>
                  <Row style={{justifyContent: 'space-between'}}>
                    <Row gap={spacing.xs} style={{flexShrink: 1}}>
                      <View style={[styles.formulaDot, {backgroundColor: f.accent}]} />
                      <YayText variant="bodyStrong" numberOfLines={1} style={{flexShrink: 1}}>
                        {f.name}
                      </YayText>
                    </Row>
                    <YayText variant="micro" color={colors.textMuted}>
                      {f.code}
                    </YayText>
                  </Row>
                  <YayText variant="micro" color={f.accent} style={{marginTop: spacing.xxs}}>
                    {f.focus}
                  </YayText>
                  <YayText
                    variant="caption"
                    color={colors.textSecondary}
                    style={{marginTop: spacing.xxs}}>
                    {f.blurb}
                  </YayText>
                  <YayText variant="micro" color={colors.textMuted} style={{marginTop: spacing.xxs}}>
                    {f.protocol}
                  </YayText>
                  <Spacer size={spacing.sm} />
                  <HubCta
                    label="Buy the system"
                    background={RH_FOREST}
                    onPress={() => openRehuman('formulas')}
                  />
                </Card>
              ))}
            </View>

            {/* Philosophy */}
            <SectionHeader title="Philosophy" />
            <Card>
              <YayText variant="caption" color={colors.textSecondary}>
                Human health is an alignment system — biology, intelligence, energy, and
                environment considered as one continuum, built on four pillars.
              </YayText>
              {d.pillars.map(p => (
                <Row key={p.code} gap={spacing.sm} style={{alignItems: 'flex-start', marginTop: spacing.sm}}>
                  <YayText variant="micro" color={RH_FOREST} style={{width: 44, marginTop: 2}}>
                    {p.code}
                  </YayText>
                  <View style={{flex: 1}}>
                    <YayText variant="bodyStrong">{p.name}</YayText>
                    <YayText variant="caption" color={colors.textMuted}>
                      {p.detail}
                    </YayText>
                  </View>
                </Row>
              ))}
            </Card>

            {/* The three systems */}
            <SectionHeader title="The three systems" />
            <Row gap={spacing.xs} style={{alignItems: 'stretch'}}>
              {d.systems.map(s => (
                <View key={s.numeral} style={styles.systemTile}>
                  <YayText variant="micro" color={RH_SAGE}>
                    {s.numeral}
                  </YayText>
                  <YayText variant="bodyStrong" color={RH_CREAM}>
                    {s.name}
                  </YayText>
                  <YayText variant="micro" color={RH_SAGE}>
                    {s.sub}
                  </YayText>
                  <YayText variant="micro" color={RH_CREAM} style={{marginTop: spacing.xxs, opacity: 0.85}}>
                    {s.focus}
                  </YayText>
                </View>
              ))}
            </Row>

            {/* Method */}
            <SectionHeader title="The method" />
            <Card>
              <YayText variant="caption" color={colors.textSecondary}>
                Not a launch — an institution, built in deliberate phases.
              </YayText>
              {d.stages.map(s => (
                <Row key={s.stage} gap={spacing.sm} style={{alignItems: 'flex-start', marginTop: spacing.sm}}>
                  <Badge label={s.stage} tone="neutral" />
                  <View style={{flex: 1}}>
                    <YayText variant="bodyStrong">{s.name}</YayText>
                    <YayText variant="caption" color={colors.textMuted}>
                      {s.detail}
                    </YayText>
                  </View>
                </Row>
              ))}
            </Card>

            {/* Journal */}
            <SectionHeader title="Journal" />
            <Card style={{paddingVertical: spacing.xxs}}>
              {d.journal.map(n => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  onPress={() => openRehuman('journal')}
                  style={({pressed}) => [styles.journalRow, pressed && {opacity: 0.7}]}>
                  <YayText variant="micro" color={RH_FOREST} style={{width: 44, marginTop: 2}}>
                    {n.number}
                  </YayText>
                  <YayText variant="caption" color={colors.textPrimary} style={{flex: 1}}>
                    {n.title}
                  </YayText>
                  <Ionicons name="arrow-forward" size={14} color={colors.textFaint} />
                </Pressable>
              ))}
            </Card>

            {/* Request access */}
            <SectionHeader title="Request access" />
            <View style={styles.accessCard}>
              <YayText variant="bodyStrong" color={RH_FOREST_DEEP}>
                The system opens in measured batches.
              </YayText>
              <YayText variant="caption" color={colors.textSecondary} style={{marginTop: spacing.xxs}}>
                Request access to receive the next release, protocol notes, and early research
                from the lab. No marketing. No noise.
              </YayText>
              <Spacer size={spacing.sm} />
              <HubCta
                label="Request Access"
                background={RH_FOREST_DEEP}
                onPress={() => openRehuman('access')}
              />
            </View>

            {/* Quick actions */}
            <SectionHeader title="Quick actions" />
            <Card style={{paddingVertical: spacing.xxs}}>
              <ListRow icon="leaf" title="Open ReHuman" onPress={() => openRehuman()} />
              <ListRow
                icon="globe-outline"
                title="Open website"
                onPress={() => Linking.openURL(REHUMAN_SITE).catch(() => toast.show('Could not open the website.', 'error'))}
              />
              <ListRow
                icon="person-add-outline"
                title="Invite friends"
                subtitle="Your referral code and invites"
                onPress={() => navigation.navigate('InviteFriends')}
              />
              <ListRow icon="mail-outline" title="Contact" onPress={() => openRehuman('contact')} />
            </Card>

            <Spacer size={spacing.md} />
            <YayText variant="micro" color={colors.textFaint} style={{textAlign: 'center'}}>
              {d.disclaimer}
            </YayText>
            <Spacer size={spacing.md} />
          </>
        )}
      </AsyncView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: RH_FOREST_DEEP,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  formulaDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  systemTile: {
    flex: 1,
    backgroundColor: RH_FOREST,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  accessCard: {
    backgroundColor: RH_CREAM,
    borderColor: RH_SAGE,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
