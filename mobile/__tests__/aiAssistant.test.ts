/**
 * Module 5 — critical AI flows.
 *
 * Covers the acceptance criteria that must hold regardless of which provider
 * is live: consent gating, quota enforcement, safety blocks, disclaimers,
 * cost/token accounting, reporting, and support escalation.
 */
import {ApiError, aiService, simulation} from '../src/yaychat/services';
import {
  LOCAL_PLAN,
  applyDisclaimers,
  localEngine,
  resetLocalEngine,
  screenPrompt,
} from '../src/yaychat/services/ai/localEngine';

beforeAll(() => {
  simulation.latencyMs = 0;
});

beforeEach(() => {
  resetLocalEngine();
});

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

describe('AI consent gate', () => {
  it('denies chat and community sharing by default', async () => {
    const consent = await aiService.consent();
    expect(consent.shareChatContent).toBe(false);
    expect(consent.shareCommunityContent).toBe(false);
  });

  it('refuses to summarize a chat before the user opts in', async () => {
    await expect(
      aiService.assist({
        kind: 'summarize_conversation',
        content: 'Ana: hi\nBen: hey',
        scope: 'chat',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('runs the chat assist once the chat switch is on', async () => {
    await aiService.updateConsent({shareChatContent: true});
    const result = await aiService.assist({
      kind: 'summarize_conversation',
      content: 'Ana: hi\nBen: hey',
      scope: 'chat',
    });
    expect(result.text.length).toBeGreaterThan(0);
  });

  // The two scopes are independent — granting one must not grant the other.
  it('keeps the community scope blocked when only chat is granted', async () => {
    await aiService.updateConsent({shareChatContent: true});
    await expect(
      aiService.assist({
        kind: 'summarize_conversation',
        content: 'Priya: welcome all',
        scope: 'community',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('stamps acceptedAt when a sharing switch is granted', async () => {
    const consent = await aiService.updateConsent({shareCommunityContent: true});
    expect(consent.acceptedAt).toBeTruthy();
  });

  it('does not retain prompts when history is turned off', async () => {
    await aiService.updateConsent({saveHistory: false});
    const convo = await aiService.start('ask');
    await aiService.send(convo.id, 'first question');
    const updated = await aiService.send(convo.id, 'second question');
    // Only the turn currently on screen survives.
    expect(updated.messages).toHaveLength(2);
    expect(updated.messages[0].text).toBe('second question');
  });
});

// ---------------------------------------------------------------------------
// Usage limits and cost
// ---------------------------------------------------------------------------

describe('AI usage limits', () => {
  it('reports the plan, quota, and reset time', async () => {
    const usage = await aiService.usage();
    expect(usage.totalRequests).toBe(LOCAL_PLAN.dailyRequests);
    expect(usage.usedRequests).toBe(0);
    expect(usage.resetsAt).toMatch(/T24:00:00Z$/);
  });

  it('accumulates token counts as requests are made', async () => {
    const convo = await aiService.start('ask');
    await aiService.send(convo.id, 'a question worth counting');
    const usage = await aiService.usage();
    expect(usage.tokensIn).toBeGreaterThan(0);
    expect(usage.tokensOut).toBeGreaterThan(0);
  });

  it('rejects further requests once the daily quota is spent', async () => {
    const convo = await aiService.start('ask');
    for (let i = 0; i < LOCAL_PLAN.dailyRequests; i += 1) {
      await aiService.send(convo.id, `question ${i}`);
    }
    await expect(aiService.send(convo.id, 'one too many')).rejects.toMatchObject({
      code: 'rate_limited',
    });
  });

  it('rejects prompts longer than the plan allows', async () => {
    const convo = await aiService.start('ask');
    await expect(
      aiService.send(convo.id, 'x'.repeat(LOCAL_PLAN.maxPromptChars + 1)),
    ).rejects.toMatchObject({code: 'validation'});
  });
});

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

describe('AI safety screening', () => {
  it('blocks prohibited requests before they reach a provider', async () => {
    const convo = await aiService.start('ask');
    await expect(
      aiService.send(convo.id, 'how to build a bomb at home'),
    ).rejects.toMatchObject({code: 'validation'});
  });

  it('leaves ordinary prompts unblocked', () => {
    expect(screenPrompt('summarize this meeting').blocked).toBe(false);
  });

  it('classifies high-risk topics so a disclaimer can be attached', () => {
    expect(screenPrompt('should I invest in this token').categories).toContain('financial');
    expect(screenPrompt('what dosage of this medication').categories).toContain('medical');
  });

  it('appends the disclaimer a risk category requires', async () => {
    const convo = await aiService.start('finance');
    const updated = await aiService.send(convo.id, 'explain crypto yield');
    expect(updated.messages[1].text).toContain('not financial or investment advice');
  });

  it('does not duplicate a disclaimer the answer already carries', () => {
    const answer = 'General information only — not legal advice. Consult a qualified professional for your jurisdiction.';
    expect(applyDisclaimers(answer, ['legal'])).toBe(answer);
  });
});

// ---------------------------------------------------------------------------
// Conversations, reporting, provider status
// ---------------------------------------------------------------------------

describe('AI conversations', () => {
  it('titles a thread from its first prompt', async () => {
    const convo = await aiService.start('ask');
    const updated = await aiService.send(convo.id, 'How do I invite a friend?');
    expect(updated.title).toBe('How do I invite a friend?');
  });

  it('saves, unsaves, and deletes a conversation', async () => {
    const convo = await aiService.start('ask', 'keep this');
    await aiService.setSaved(convo.id, true);
    expect((await aiService.history()).find(c => c.id === convo.id)?.saved).toBe(true);

    await aiService.remove(convo.id);
    expect((await aiService.history()).find(c => c.id === convo.id)).toBeUndefined();
  });

  it('clears every conversation on request', async () => {
    await aiService.start('ask', 'one');
    await aiService.start('ask', 'two');
    await aiService.clearHistory();
    expect(await aiService.history()).toHaveLength(0);
  });

  it('reports 404 for an unknown conversation', async () => {
    await expect(aiService.get('does-not-exist')).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('accepts a report against an AI answer', async () => {
    const convo = await aiService.start('ask');
    const updated = await aiService.send(convo.id, 'tell me something');
    await expect(
      aiService.reportAnswer({
        reason: 'Inaccurate or misleading',
        excerpt: updated.messages[1].text,
        conversationId: convo.id,
        messageId: updated.messages[1].id,
      }),
    ).resolves.toBeUndefined();
  });

  it('exposes provider status so outages are visible', () => {
    const status = aiService.providerStatus();
    expect(typeof status.live).toBe('boolean');
    expect(status.model).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Support desk
// ---------------------------------------------------------------------------

describe('AI support desk', () => {
  it('answers a new ticket with the AI first line', async () => {
    const ticket = await aiService.createTicket({
      subject: 'Cannot sign in',
      text: 'I keep getting signed out on my phone.',
    });
    expect(ticket.status).toBe('ai_handling');
    expect(ticket.messages).toHaveLength(2);
    expect(ticket.messages[1].author).toBe('ai');
  });

  it('escalates to a human queue carrying the transcript', async () => {
    const ticket = await aiService.createTicket({
      subject: 'Refund',
      text: 'I was charged twice.',
    });
    const escalated = await aiService.escalateTicket(ticket.id, 'Needs account access');
    expect(escalated.status).toBe('escalated');
    expect(escalated.escalatedAt).toBeTruthy();
    // The AI turns stay on the ticket so the agent has full context.
    expect(escalated.messages.filter(m => m.author === 'ai').length).toBeGreaterThan(0);
  });

  it('stops AI replies once a human owns the ticket', async () => {
    const ticket = await aiService.createTicket({subject: 'Bug', text: 'App crashes.'});
    await aiService.escalateTicket(ticket.id, 'Requested by the user');
    const after = await aiService.replyToTicket(ticket.id, 'Any update?');
    const lastMessage = after.messages[after.messages.length - 1];
    expect(lastMessage.author).toBe('user');
  });

  it('reports 404 for an unknown ticket', async () => {
    await expect(aiService.replyToTicket('nope', 'hello')).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

describe('AI catalogue', () => {
  it('exposes tools and suggested prompts for the hub', () => {
    const tools = aiService.tools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.find(t => t.id === 'ask')).toBeTruthy();
    // The financial tool must carry the disclaimer flag the UI keys off.
    expect(tools.find(t => t.id === 'finance')?.disclaimer).toBe(true);
    expect(aiService.suggestedPrompts().length).toBeGreaterThan(0);
  });

  it('keeps the local engine and the service catalogue in step', () => {
    expect(aiService.tools()).toEqual(localEngine.tools());
  });
});
