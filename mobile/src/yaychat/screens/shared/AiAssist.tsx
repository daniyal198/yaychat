/**
 * Module 5 — AI inside chats and communities.
 *
 * The consent gate lives here so every in-context AI action goes through the
 * same flow: disclose exactly what will be shared, get an explicit opt-in the
 * first time, then run the assist and show the result with a copy action.
 *
 * Nothing is sent to a provider before `aiService.assist` is called, and that
 * call is rejected server-side while the matching consent switch is off.
 */
import React, {useCallback, useState} from 'react';
import {Clipboard, ScrollView, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Banner,
  BottomSheet,
  Button,
  Card,
  Divider,
  Row,
  Spacer,
  YayText,
} from '../../design/components';
import {colors, spacing} from '../../design/tokens';
import {ApiError, aiService, errorMessage} from '../../services';
import {useToast} from '../../state/AppProviders';
import type {AiAssistResult} from '../../types/models';

export type AiAssistKind = 'summarize_conversation' | 'translate_message';
export type AiAssistScope = 'chat' | 'community';

export interface AiAssistRequest {
  kind: AiAssistKind;
  scope: AiAssistScope;
  /** Human-readable label for the sheet header, e.g. "Summarize this chat". */
  title: string;
  /** Exactly what will leave the device — shown verbatim in the disclosure. */
  content: string;
  /** One line describing the content being shared, e.g. "the last 30 messages". */
  describes: string;
}

interface AssistState {
  request: AiAssistRequest | null;
  running: boolean;
  result: AiAssistResult | null;
  error: string | null;
  /** True when the request was rejected for missing consent. */
  needsConsent: boolean;
}

const EMPTY: AssistState = {
  request: null,
  running: false,
  result: null,
  error: null,
  needsConsent: false,
};

/**
 * Drives the in-context AI actions. Returns `run` to open the disclosure sheet
 * and the `<AiAssistSheet />` element to render inside the screen.
 */
export const useAiAssist = () => {
  const toast = useToast();
  const [state, setState] = useState<AssistState>(EMPTY);

  const run = useCallback((request: AiAssistRequest) => {
    setState({...EMPTY, request});
  }, []);

  const close = useCallback(() => setState(EMPTY), []);

  const confirm = useCallback(async () => {
    const request = state.request;
    if (!request) {
      return;
    }
    setState(prev => ({...prev, running: true, error: null, needsConsent: false}));
    try {
      const result = await aiService.assist({
        kind: request.kind,
        content: request.content,
        scope: request.scope,
      });
      setState(prev => ({...prev, running: false, result}));
    } catch (e) {
      // `consent_required` is not an error state — it is the opt-in prompt.
      const needsConsent =
        e instanceof ApiError &&
        (e.code === 'consent_required' || e.code === 'unauthorized');
      setState(prev => ({
        ...prev,
        running: false,
        needsConsent,
        error: needsConsent ? null : errorMessage(e),
      }));
    }
  }, [state.request]);

  /** Grant the switch this scope needs, then retry immediately. */
  const grantConsent = useCallback(async () => {
    const request = state.request;
    if (!request) {
      return;
    }
    try {
      await aiService.updateConsent(
        request.scope === 'community'
          ? {shareCommunityContent: true}
          : {shareChatContent: true},
      );
      setState(prev => ({...prev, needsConsent: false}));
      await confirm();
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  }, [state.request, confirm, toast]);

  const sheet = (
    <AiAssistSheet
      state={state}
      onClose={close}
      onConfirm={confirm}
      onGrantConsent={grantConsent}
    />
  );

  return {run, sheet};
};

const AiAssistSheet = ({
  state,
  onClose,
  onConfirm,
  onGrantConsent,
}: {
  state: AssistState;
  onClose: () => void;
  onConfirm: () => void;
  onGrantConsent: () => void;
}) => {
  const toast = useToast();
  const {request, running, result, error, needsConsent} = state;

  return (
    <BottomSheet visible={!!request} onClose={onClose} title={request?.title}>
      {!request ? null : result ? (
        <View>
          {result.degraded ? (
            <>
              <Banner
                tone="warning"
                icon="cloud-offline"
                text="AI provider unavailable — this is an offline placeholder."
              />
              <Spacer size={spacing.sm} />
            </>
          ) : null}
          <Card>
            <ScrollView style={{maxHeight: 280}}>
              <YayText>{result.text}</YayText>
            </ScrollView>
          </Card>
          <Spacer size={spacing.xs} />
          <YayText variant="caption" color={colors.textMuted}>
            {result.tokensIn + result.tokensOut} tokens used
          </YayText>
          <Button
            label="Copy"
            kind="secondary"
            icon="copy-outline"
            style={{marginTop: spacing.sm}}
            onPress={() => {
              Clipboard.setString(result.text);
              toast.show('Copied', 'success');
            }}
          />
          <Button label="Done" style={{marginTop: spacing.xs}} onPress={onClose} />
        </View>
      ) : (
        <View>
          {/* The disclosure. Shown every time, not just on first use. */}
          <Row gap={spacing.sm} style={{alignItems: 'flex-start'}}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
            <View style={{flex: 1}}>
              <YayText variant="bodyStrong">This sends content to an AI provider</YayText>
              <YayText variant="caption" color={colors.textMuted}>
                {request.describes} will be sent so the assistant can answer. Nothing
                else from this {request.scope === 'community' ? 'community' : 'chat'} is
                shared, and the result is not posted anywhere.
              </YayText>
            </View>
          </Row>
          <Spacer size={spacing.sm} />
          <Divider />
          <Spacer size={spacing.sm} />
          <YayText variant="caption" color={colors.textMuted}>
            Preview of what will be sent
          </YayText>
          <Spacer size={spacing.xxs} />
          <Card>
            <ScrollView style={{maxHeight: 140}}>
              <YayText variant="caption" color={colors.textSecondary}>
                {request.content.slice(0, 1200) || '(nothing to send)'}
              </YayText>
            </ScrollView>
          </Card>

          {needsConsent ? (
            <>
              <Spacer size={spacing.sm} />
              <Banner
                tone="info"
                icon="lock-closed"
                text={
                  request.scope === 'community'
                    ? 'Sharing community content with AI is currently off.'
                    : 'Sharing chat content with AI is currently off.'
                }
              />
              <Button
                label="Turn on and continue"
                icon="lock-open-outline"
                style={{marginTop: spacing.sm}}
                onPress={onGrantConsent}
              />
              <Button
                label="Not now"
                kind="secondary"
                style={{marginTop: spacing.xs}}
                onPress={onClose}
              />
            </>
          ) : (
            <>
              {error ? (
                <>
                  <Spacer size={spacing.sm} />
                  <Banner tone="danger" text={error} />
                </>
              ) : null}
              <Button
                label={running ? 'Working…' : 'Send to AI'}
                icon="sparkles"
                loading={running}
                style={{marginTop: spacing.sm}}
                onPress={onConfirm}
              />
              <Button
                label="Cancel"
                kind="secondary"
                style={{marginTop: spacing.xs}}
                onPress={onClose}
              />
            </>
          )}
        </View>
      )}
    </BottomSheet>
  );
};
