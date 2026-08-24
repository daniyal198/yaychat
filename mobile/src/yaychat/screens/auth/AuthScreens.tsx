/**
 * YaysApp auth + onboarding screens.
 *
 * Covers the full pre-app journey: Welcome → SignIn / SignUp → email + phone
 * verification → password recovery → legal docs, and the onboarding stack
 * (username, profile, permissions, done). All data flows through authService;
 * everything renders from the design kit.
 */
import React, {useLayoutEffect, useState} from 'react';
import {Pressable, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  Avatar,
  Banner,
  BrandMark,
  Button,
  Card,
  CheckRow,
  Chip,
  Divider,
  Row,
  Screen,
  SegmentedTabs,
  Spacer,
  StateView,
  SwitchRow,
  TextField,
  YayText,
} from '../../design/components';
import {colors, spacing} from '../../design/tokens';
import {authService, usesLiveAuth} from '../../services';
import {parsePhone} from '../../utils/phone';
import {useAction} from '../../state/hooks';
import {useAuth, useToast} from '../../state/AppProviders';
import type {Session} from '../../types/models';
import type {
  AuthStackParamList,
  OnboardingStackParamList,
} from '../../types/navigation';
import {chooseProfilePhoto} from '../../utils/profilePhoto';

type AuthProps<R extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  R
>;
type OnboardingProps<R extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, R>;

// ---------------------------------------------------------------------------
// Cross-screen scratch state
// ---------------------------------------------------------------------------

/**
 * Session returned by signUp, held until email/phone verification finishes.
 * Signing in with it (onboarded=false) flips the root to the Onboarding stack.
 */
let pendingSignUpSession: Session | null = null;

/** Username chosen during onboarding, consumed by OnboardingDoneScreen. */
let pendingUsername = '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

const InlineLink = ({label, onPress}: {label: string; onPress: () => void}) => (
  <Pressable onPress={onPress} hitSlop={6} accessibilityRole="link" accessibilityLabel={label}>
    <YayText variant="caption" color={colors.brandStrong} style={{fontWeight: '700'}}>
      {label}
    </YayText>
  </Pressable>
);

const ValueBullet = ({icon, text}: {icon: string; text: string}) => (
  <Row gap={spacing.sm} style={{paddingVertical: spacing.xxs}}>
    <Chip label="" icon={icon} />
    <YayText variant="caption" color={colors.textSecondary} style={{flex: 1}}>
      {text}
    </YayText>
  </Row>
);

// ---------------------------------------------------------------------------
// Welcome
// ---------------------------------------------------------------------------

export const WelcomeScreen = ({navigation}: AuthProps<'Welcome'>) => {
  useLayoutEffect(() => {
    navigation.setOptions({headerShown: false});
  }, [navigation]);

  return (
    <Screen>
      <Spacer size={spacing.xxxl} />
      <View style={{alignItems: 'center', gap: spacing.sm}}>
        <BrandMark size={120} />
        <Spacer size={spacing.xs} />
        <YayText variant="display">YaysApp</YayText>
        <YayText variant="body" color={colors.textSecondary} style={{textAlign: 'center'}}>
          Chat. Learn. Earn. Together.
        </YayText>
      </View>
      <Spacer size={spacing.xl} />
      <Card>
        <ValueBullet
          icon="chatbubbles-outline"
          text="Fast, expressive messaging with friends and groups."
        />
        <ValueBullet
          icon="people-outline"
          text="Communities for every interest — join or start your own."
        />
        <ValueBullet
          icon="sparkles-outline"
          text="aiainai helps you translate, summarize, and learn."
        />
        <ValueBullet
          icon="gift-outline"
          text="Earn IndexxPoints for everyday activity and invites."
        />
      </Card>
      <Spacer size={spacing.xl} />
      <Button
        label="Create account"
        icon="person-add-outline"
        onPress={() => navigation.navigate('SignUp')}
      />
      <Spacer size={spacing.sm} />
      <Button
        label="Sign in"
        kind="secondary"
        icon="log-in-outline"
        onPress={() => navigation.navigate('SignIn')}
      />
      <Spacer size={spacing.lg} />
      <Row gap={spacing.lg} style={{justifyContent: 'center'}}>
        <InlineLink
          label="Terms of Service"
          onPress={() => navigation.navigate('Legal', {doc: 'terms'})}
        />
        <InlineLink
          label="Privacy Policy"
          onPress={() => navigation.navigate('Legal', {doc: 'privacy'})}
        />
      </Row>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

export const SignInScreen = ({navigation}: AuthProps<'SignIn'>) => {
  const {signIn} = useAuth();
  const toast = useToast();
  const {busy, perform} = useAction();
  const [mode, setMode] = useState<'Email' | 'Phone'>('Email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{email?: string; phone?: string; password?: string}>({});

  const submit = async () => {
    const next: {email?: string; phone?: string; password?: string} = {};
    if (mode === 'Email' && !EMAIL_RE.test(email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (mode === 'Phone') {
      const parsed = parsePhone(phone);
      if (!parsed.e164) {
        next.phone = parsed.error ?? 'Enter a valid phone number.';
      }
    }
    if (password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }
    setErrors(next);
    if (next.email || next.phone || next.password) {
      return;
    }
    const session = await perform(
      () =>
        mode === 'Email'
          ? authService.signIn(email.trim(), password)
          : authService.signInWithPhone(phone.trim(), password),
      message => toast.show(message, 'error'),
    );
    if (session) {
      signIn(session);
    }
  };

  return (
    <Screen>
      <YayText variant="title">Welcome back</YayText>
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.lg}}>
        Sign in to pick up your chats, communities, and rewards.
      </YayText>
      <SegmentedTabs
        tabs={['Email', 'Phone']}
        active={mode}
        onChange={tab => {
          setMode(tab as 'Email' | 'Phone');
          setErrors({});
        }}
      />
      <Spacer size={spacing.md} />
      {mode === 'Email' ? (
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
        />
      ) : (
        <TextField
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 555 010 0199"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoCorrect={false}
          error={errors.phone}
          hint="Include your country code."
        />
      )}
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        error={errors.password}
      />
      <Button label="Sign in" onPress={submit} loading={busy} icon="log-in-outline" />
      <Spacer size={spacing.md} />
      <Row style={{justifyContent: 'space-between'}}>
        <InlineLink
          label="Forgot password?"
          onPress={() => navigation.navigate('ForgotPassword')}
        />
        <InlineLink label="Create an account" onPress={() => navigation.navigate('SignUp')} />
      </Row>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

export const SignUpScreen = ({navigation}: AuthProps<'SignUp'>) => {
  const {signIn} = useAuth();
  const toast = useToast();
  const {busy, perform} = useAction();
  const [mode, setMode] = useState<'Email' | 'Phone'>('Email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePic, setProfilePic] = useState<string | undefined>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirm?: string;
    accepted?: string;
  }>({});

  const choosePhoto = async () => {
    try {
      const uri = await chooseProfilePhoto();
      if (uri) {
        setProfilePic(uri);
      }
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Could not select that picture.', 'error');
    }
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) {
      next.name = 'Enter your name.';
    }
    if (mode === 'Email' && !EMAIL_RE.test(email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (mode === 'Phone') {
      const parsed = parsePhone(phone);
      if (!parsed.e164) {
        next.phone = parsed.error ?? 'Enter a valid phone number.';
      }
    }
    if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (confirm !== password) {
      next.confirm = 'Passwords do not match.';
    }
    if (!accepted) {
      next.accepted = 'Please accept the Terms and Privacy Policy to continue.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }
    const session = await perform(
      () =>
        authService.signUp({
          method: mode.toLowerCase() as 'email' | 'phone',
          name: name.trim(),
          email: mode === 'Email' ? email.trim() : undefined,
          phone: mode === 'Phone' ? phone.trim() : undefined,
          profilePic,
          password,
        }),
      message => toast.show(message, 'error'),
    );
    if (session) {
      if (session.onboarded) {
        signIn(session);
      } else {
        pendingSignUpSession = session;
        if (mode === 'Email') {
          navigation.navigate('VerifyEmail', {email: email.trim()});
        } else {
          // Navigate on the canonical form: it is what the backend stored and
          // what the verify call must send back, and it is also what the
          // screen displays.
          navigation.navigate('VerifyPhone', {
            phone: parsePhone(phone).e164 ?? phone.trim(),
          });
        }
      }
    }
  };

  return (
    <Screen>
      <YayText variant="title">Create your account</YayText>
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.lg}}>
        A couple of details and you are in.
      </YayText>
      <View style={{alignItems: 'center', marginBottom: spacing.lg}}>
        <Avatar
          name={name.trim() || 'New user'}
          size={84}
          color="#E2842D"
          imageUri={profilePic}
        />
        <Spacer size={spacing.xs} />
        <Button
          label={profilePic ? 'Change profile picture' : 'Upload profile picture'}
          kind="secondary"
          icon="camera-outline"
          onPress={choosePhoto}
        />
        {profilePic ? (
          <Button
            label="Remove picture"
            kind="ghost"
            icon="trash-outline"
            onPress={() => setProfilePic(undefined)}
          />
        ) : null}
        <YayText variant="micro" color={colors.textMuted}>
          Optional · image files up to 5 MB
        </YayText>
      </View>
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Your full name"
        autoCorrect={false}
        error={errors.name}
      />
      <SegmentedTabs
        tabs={['Email', 'Phone']}
        active={mode}
        onChange={tab => {
          setMode(tab as 'Email' | 'Phone');
          setErrors(prev => ({...prev, email: undefined, phone: undefined}));
        }}
      />
      <Spacer size={spacing.md} />
      {mode === 'Email' ? (
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
        />
      ) : (
        <TextField
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 555 010 0199"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoCorrect={false}
          error={errors.phone}
          hint="Include your country code."
        />
      )}
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        error={errors.password}
        hint="Use 8+ characters. A mix of letters and numbers is best."
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Repeat your password"
        secureTextEntry
        error={errors.confirm}
      />
      <CheckRow
        label="I agree to the Terms of Service and Privacy Policy"
        checked={accepted}
        onToggle={() => {
          setAccepted(v => !v);
          setErrors(prev => ({...prev, accepted: undefined}));
        }}
      />
      {errors.accepted ? (
        <YayText variant="caption" color={colors.danger} style={{marginBottom: spacing.xs}}>
          {errors.accepted}
        </YayText>
      ) : null}
      <Row gap={spacing.lg} style={{marginBottom: spacing.md}}>
        <InlineLink label="Read the Terms" onPress={() => navigation.navigate('Legal', {doc: 'terms'})} />
        <InlineLink
          label="Read the Privacy Policy"
          onPress={() => navigation.navigate('Legal', {doc: 'privacy'})}
        />
      </Row>
      <Button label="Create account" onPress={submit} loading={busy} icon="person-add-outline" />
      <Spacer size={spacing.md} />
      <Row style={{justifyContent: 'center'}}>
        <InlineLink label="Already have an account? Sign in" onPress={() => navigation.navigate('SignIn')} />
      </Row>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Verification (shared pattern)
// ---------------------------------------------------------------------------

const useVerification = () => {
  const {signIn} = useAuth();
  const toast = useToast();
  const finishSignUp = () => {
    if (pendingSignUpSession) {
      signIn(pendingSignUpSession);
      pendingSignUpSession = null;
    } else {
      toast.show('Your sign-up session expired. Please sign in again.', 'error');
    }
  };
  return {finishSignUp};
};

export const VerifyEmailScreen = ({navigation, route}: AuthProps<'VerifyEmail'>) => {
  const toast = useToast();
  const backendLive = usesLiveAuth();
  const {busy, perform} = useAction();
  const {finishSignUp} = useVerification();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError(null);
    const ok = await perform(
      () =>
        authService
          .verifyCode(code, {channel: 'email', identifier: route.params.email})
          .then(() => true),
      message => setError(message),
    );
    if (ok) {
      toast.show('Email verified', 'success');
      // Only ask for a phone number when the account actually has one. The
      // previous hard-coded number sent every signup to a phone step for a
      // line that was not theirs.
      if (route.params.phone) {
        navigation.navigate('VerifyPhone', {phone: route.params.phone});
      } else {
        finishSignUp();
      }
    }
  };

  const resend = () =>
    perform(
      () =>
        authService
          .sendCode({channel: 'email', identifier: route.params.email})
          .then(() => true),
      message => toast.show(message, 'error'),
    ).then(sent => {
      if (sent) {
        toast.show('A new code is on its way to your inbox.', 'success');
      }
    });

  return (
    <Screen>
      <YayText variant="title">Check your email</YayText>
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.lg}}>
        We sent a 6-digit verification code to {route.params.email}.
      </YayText>
      {backendLive ? null : (
        <Banner tone="info" icon="flask" text="Preview build: the code is always 123456." />
      )}
      <TextField
        label="Verification code"
        value={code}
        onChangeText={t => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        error={error}
        hint="Enter the 6 digits exactly as they appear."
      />
      <Button label="Verify email" onPress={submit} loading={busy} icon="checkmark-circle-outline" />
      <Spacer size={spacing.sm} />
      <Button
        label="Skip for now"
        kind="ghost"
        onPress={finishSignUp}
      />
      <Spacer size={spacing.md} />
      <Row style={{justifyContent: 'center'}}>
        <InlineLink label="Resend code" onPress={resend} />
      </Row>
    </Screen>
  );
};

export const VerifyPhoneScreen = ({route}: AuthProps<'VerifyPhone'>) => {
  const toast = useToast();
  const backendLive = usesLiveAuth();
  const {busy, perform} = useAction();
  const {finishSignUp} = useVerification();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code we texted you.');
      return;
    }
    setError(null);
    const ok = await perform(
      () =>
        authService
          .verifyCode(code, {channel: 'phone', identifier: route.params.phone})
          .then(() => true),
      message => setError(message),
    );
    if (ok) {
      toast.show('Phone verified', 'success');
      finishSignUp();
    }
  };

  const resend = () =>
    perform(
      () =>
        authService
          .sendCode({channel: 'phone', identifier: route.params.phone})
          .then(() => true),
      message => toast.show(message, 'error'),
    ).then(sent => {
      if (sent) {
        toast.show('A new code is on its way to your phone.', 'success');
      }
    });

  return (
    <Screen>
      <YayText variant="title">Verify your phone</YayText>
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.lg}}>
        We texted a 6-digit code to {route.params.phone}. Verifying your number helps friends find
        you and keeps your account recoverable.
      </YayText>
      {backendLive ? null : (
        <Banner tone="info" icon="flask" text="Preview build: the code is always 123456." />
      )}
      <TextField
        label="SMS code"
        value={code}
        onChangeText={t => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        error={error}
      />
      <Button label="Verify phone" onPress={submit} loading={busy} icon="checkmark-circle-outline" />
      <Spacer size={spacing.sm} />
      <Button label="Skip for now" kind="ghost" onPress={finishSignUp} />
      <Spacer size={spacing.md} />
      <Row style={{justifyContent: 'center'}}>
        <InlineLink label="Resend code" onPress={resend} />
      </Row>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Password recovery
// ---------------------------------------------------------------------------

export const ForgotPasswordScreen = ({navigation}: AuthProps<'ForgotPassword'>) => {
  const toast = useToast();
  const {busy, perform} = useAction();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    const ok = await perform(
      () => authService.requestPasswordReset(email.trim()).then(() => true),
      message => toast.show(message, 'error'),
    );
    if (ok) {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <Screen>
        <StateView
          icon="mail-open-outline"
          title="Check your email"
          message={`We sent a 6-digit password reset code to ${email.trim()}. The code expires in 15 minutes.`}
        />
        <Button
          label="Enter reset code"
          onPress={() => navigation.navigate('ResetPassword', {email: email.trim()})}
        />
        <Spacer size={spacing.sm} />
        <Button
          label="Resend code"
          kind="secondary"
          onPress={submit}
          loading={busy}
          icon="refresh-outline"
        />
        <Spacer size={spacing.sm} />
        <Button label="Back to sign in" kind="ghost" onPress={() => navigation.navigate('SignIn')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <YayText variant="title">Forgot your password?</YayText>
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.lg}}>
        Enter the email on your account and we will send a 6-digit reset code.
      </YayText>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
      />
      <Button label="Send reset code" onPress={submit} loading={busy} icon="mail-outline" />
    </Screen>
  );
};

export const ResetPasswordScreen = ({navigation, route}: AuthProps<'ResetPassword'>) => {
  const toast = useToast();
  const {busy, perform} = useAction();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{code?: string; password?: string; confirm?: string}>({});

  const submit = async () => {
    const next: typeof errors = {};
    if (!/^\d{6}$/.test(code)) {
      next.code = 'Enter the 6-digit code from your email.';
    }
    if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (confirm !== password) {
      next.confirm = 'Passwords do not match.';
    }
    setErrors(next);
    if (next.code || next.password || next.confirm) {
      return;
    }
    const ok = await perform(
      () => authService.resetPassword(route.params.email, code, password).then(() => true),
      message => toast.show(message, 'error'),
    );
    if (ok) {
      toast.show('Password updated. Sign in with your new password.', 'success');
      navigation.navigate('SignIn');
    }
  };

  return (
    <Screen>
      <YayText variant="title">Set a new password</YayText>
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.lg}}>
        Enter the code sent to {route.params.email}, then choose a new password.
      </YayText>
      <TextField
        label="Reset code"
        value={code}
        onChangeText={text => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        error={errors.code}
      />
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        error={errors.password}
      />
      <TextField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Repeat your new password"
        secureTextEntry
        error={errors.confirm}
      />
      <Button label="Update password" onPress={submit} loading={busy} icon="key-outline" />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Legal
// ---------------------------------------------------------------------------

const LEGAL_COPY: Record<'terms' | 'privacy', {title: string; paragraphs: string[]}> = {
  terms: {
    title: 'Terms of Service (draft)',
    paragraphs: [
      'This is placeholder draft copy for the YaysApp preview build. It is not a binding agreement and will be replaced by counsel-reviewed terms before public release.',
      '1. Your account. You are responsible for the activity that happens under your account and for keeping your sign-in credentials secure. You must be at least 13 years old (or the minimum age in your country) to use YaysApp.',
      '2. Acceptable use. Do not use YaysApp to harass, defraud, or harm others, to distribute unlawful content, or to interfere with the service. Community spaces have additional rules set by their organizers, and moderators may remove content or members that break them.',
      '3. Rewards preview. IndexxPoints, wallet balances, and any earn features shown in this build are simulated previews. They carry no monetary value, cannot be redeemed, and may be reset at any time without notice.',
      '4. Content. You keep ownership of what you post. By posting, you grant YaysApp the limited license needed to store, display, and transmit your content so the service can function.',
      '5. Termination. You can stop using YaysApp at any time and delete your account from Settings. We may suspend accounts that violate these terms.',
      '6. Changes. We will notify you of material changes to these terms in-app before they take effect.',
    ],
  },
  privacy: {
    title: 'Privacy Policy (draft)',
    paragraphs: [
      'This is placeholder draft copy for the YaysApp preview build. It is not a final policy and will be replaced by a counsel-reviewed version before public release.',
      '1. What we collect. Account details you provide (name, email, optional phone), the content you create, and basic usage data such as device type and crash logs that help us keep the app reliable.',
      '2. What we do not do. We do not sell your personal data, and message content is never used for advertising. In this preview build all data is simulated and stored locally on your device.',
      '3. How we use data. To operate the service, personalize your experience (like suggested communities), calculate preview rewards, and protect the platform from abuse.',
      '4. Sharing. Content you post in public communities is visible to their members. We share data with service providers only as needed to run YaysApp, under contractual safeguards.',
      '5. Your controls. Privacy settings let you manage last-seen visibility, read receipts, and discoverability. You can export or delete your data by deleting your account from Settings.',
      '6. Contact. Questions about privacy can be sent to privacy@yay.chat once the service launches publicly.',
    ],
  },
};

export const LegalScreen = ({navigation, route}: AuthProps<'Legal'>) => {
  const [doc, setDoc] = useState<'terms' | 'privacy'>(route.params.doc);
  const active = LEGAL_COPY[doc];

  return (
    <Screen>
      <SegmentedTabs
        tabs={['Terms', 'Privacy']}
        active={doc === 'terms' ? 'Terms' : 'Privacy'}
        onChange={tab => setDoc(tab === 'Terms' ? 'terms' : 'privacy')}
      />
      <Spacer size={spacing.md} />
      <Banner tone="warning" icon="document-text-outline" text="Draft preview copy — not the final legal text." />
      <Card>
        <YayText variant="heading" style={{marginBottom: spacing.sm}}>
          {active.title}
        </YayText>
        {active.paragraphs.map((paragraph, i) => (
          <View key={`${doc}-${i}`}>
            <YayText variant="body" color={colors.textSecondary}>
              {paragraph}
            </YayText>
            {i < active.paragraphs.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </Card>
      <Spacer size={spacing.lg} />
      <Button label="I understand" onPress={() => navigation.goBack()} icon="checkmark-outline" />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Onboarding: username
// ---------------------------------------------------------------------------

export const UsernameScreen = ({navigation}: OnboardingProps<'Username'>) => {
  const toast = useToast();
  const {busy, perform} = useAction();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  const check = async (): Promise<boolean> => {
    setAvailable(false);
    const result = await perform(
      () => authService.checkUsername(username.trim()),
      message => setError(message),
    );
    if (!result) {
      return false;
    }
    if (!result.available) {
      setError(`@${username.trim()} is already taken. Try another one.`);
      return false;
    }
    setError(null);
    setAvailable(true);
    return true;
  };

  const submit = async () => {
    const ok = await check();
    if (ok) {
      pendingUsername = username.trim();
      navigation.navigate('ProfileSetup', {username: username.trim()});
    }
  };

  return (
    <Screen>
      <YayText variant="title">Pick your username</YayText>
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.lg}}>
        This is how friends find you across YaysApp. You can change it later in Settings.
      </YayText>
      <TextField
        label="Username"
        value={username}
        onChangeText={t => {
          setUsername(t);
          setError(null);
          setAvailable(false);
        }}
        placeholder="e.g. sunny_meadow"
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
        hint={
          available
            ? `@${username.trim()} is available!`
            : '3–20 lowercase letters, numbers, or underscores.'
        }
      />
      <Button
        label="Check availability"
        kind="secondary"
        onPress={() => {
          check().then(ok => {
            if (ok) {
              toast.show(`@${username.trim()} is available`, 'success');
            }
          });
        }}
        loading={busy}
        icon="search-outline"
      />
      <Spacer size={spacing.sm} />
      <Button label="Continue" onPress={submit} loading={busy} icon="arrow-forward-outline" />
      <Spacer size={spacing.md} />
      <Banner
        tone="info"
        text='Preview build: the username "taken" is reserved so you can see the unavailable state.'
      />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Onboarding: profile setup
// ---------------------------------------------------------------------------

const AVATAR_STYLES = [
  {id: 'initials', label: 'Initials', icon: 'text-outline'},
  {id: 'meadow', label: 'Meadow', icon: 'leaf-outline'},
  {id: 'sunrise', label: 'Sunrise', icon: 'sunny-outline'},
  {id: 'playful', label: 'Playful', icon: 'happy-outline'},
];

export const ProfileSetupScreen = ({navigation, route}: OnboardingProps<'ProfileSetup'>) => {
  const {session} = useAuth();
  const [name, setName] = useState(session?.user.name ?? '');
  const [bio, setBio] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('initials');
  const [nameError, setNameError] = useState<string | null>(null);

  const submit = () => {
    if (name.trim().length < 2) {
      setNameError('Enter your name so friends recognize you.');
      return;
    }
    setNameError(null);
    navigation.navigate('Permissions');
  };

  return (
    <Screen>
      <YayText variant="title">Set up your profile</YayText>
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.lg}}>
        You are @{route.params.username}. Add a name and a short bio.
      </YayText>
      <View style={{alignItems: 'center', marginBottom: spacing.lg}}>
        <Avatar
          name={name.trim() || route.params.username}
          size={84}
          imageUri={session?.user.profilePic}
        />
        <Spacer size={spacing.xs} />
        <YayText variant="caption" color={colors.textMuted}>
          Your avatar preview updates as you type your name.
        </YayText>
      </View>
      <TextField
        label="Display name"
        value={name}
        onChangeText={t => {
          setName(t);
          setNameError(null);
        }}
        placeholder="How friends should see you"
        error={nameError}
      />
      <TextField
        label="Bio (optional)"
        value={bio}
        onChangeText={setBio}
        placeholder="A line about you — hobbies, city, vibes"
        multiline
        maxLength={140}
        hint={`${bio.length}/140 characters`}
      />
      <YayText variant="caption" color={colors.textSecondary} style={{marginBottom: spacing.xs}}>
        Avatar style
      </YayText>
      <Row gap={spacing.xs} style={{flexWrap: 'wrap', marginBottom: spacing.lg}}>
        {AVATAR_STYLES.map(style => (
          <Chip
            key={style.id}
            label={style.label}
            icon={style.icon}
            active={avatarStyle === style.id}
            onPress={() => setAvatarStyle(style.id)}
          />
        ))}
      </Row>
      <Button label="Continue" onPress={submit} icon="arrow-forward-outline" />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Onboarding: permissions
// ---------------------------------------------------------------------------

export const PermissionsScreen = ({navigation}: OnboardingProps<'Permissions'>) => {
  const [notifications, setNotifications] = useState(true);
  const [contacts, setContacts] = useState(false);

  return (
    <Screen>
      <YayText variant="title">A couple of permissions</YayText>
      <YayText variant="caption" color={colors.textMuted} style={{marginBottom: spacing.lg}}>
        Both are optional and can be changed anytime in Settings. Nothing is requested from the
        system in this preview build.
      </YayText>
      <Card style={{marginBottom: spacing.md}}>
        <SwitchRow
          label="Notifications"
          description="Get pinged for new messages, community activity, and reward milestones. Without this, you will only see updates when you open the app."
          value={notifications}
          onValueChange={setNotifications}
        />
      </Card>
      <Card style={{marginBottom: spacing.lg}}>
        <SwitchRow
          label="Contacts"
          description="Find friends who already use YaysApp by matching phone numbers. Your contacts are hashed on-device and never stored on our servers."
          value={contacts}
          onValueChange={setContacts}
        />
      </Card>
      <Button
        label="Continue"
        onPress={() => navigation.navigate('OnboardingDone')}
        icon="arrow-forward-outline"
      />
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Onboarding: done
// ---------------------------------------------------------------------------

export const OnboardingDoneScreen = (_props: OnboardingProps<'OnboardingDone'>) => {
  const {completeOnboarding} = useAuth();
  const toast = useToast();
  const {busy, perform} = useAction();

  const finish = async () => {
    const username = pendingUsername || 'new_yay_friend';
    const session = await perform(
      () => authService.completeOnboarding({username}),
      message => toast.show(message, 'error'),
    );
    if (session) {
      pendingUsername = '';
      completeOnboarding(session);
    }
  };

  return (
    <Screen>
      <Spacer size={spacing.xl} />
      <View style={{alignItems: 'center'}}>
        <BrandMark size={96} />
      </View>
      <StateView
        icon="sparkles-outline"
        title="You are all set!"
        message="Your profile is ready and your first IndexxPoints are waiting."
        compact
      />
      <Card>
        <YayText variant="heading" style={{marginBottom: spacing.xs}}>
          Try these first
        </YayText>
        <ValueBullet icon="chatbubbles-outline" text="Say hi — start a chat from the Chats tab." />
        <ValueBullet icon="people-outline" text="Browse Communities and join one that fits you." />
        <ValueBullet icon="sparkles-outline" text="Ask aiainai to translate or summarize something." />
        <ValueBullet icon="gift-outline" text="Do your first daily check-in on the Earn tab." />
      </Card>
      <Spacer size={spacing.xl} />
      <Button label="Enter YaysApp" onPress={finish} loading={busy} icon="rocket-outline" />
    </Screen>
  );
};
