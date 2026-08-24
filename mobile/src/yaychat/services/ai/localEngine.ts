/**
 * Local AI engine.
 *
 * Implements exactly the contract `aiService` expects from the backend, so the
 * app is fully functional in two situations the backend cannot cover:
 *
 *  - preview builds running with `YAYCHAT_USE_BACKEND=false`;
 *  - a deployed backend that does not yet expose `/api/v1/ai` (the adapter
 *    detects the 404 once and routes here for the rest of the session).
 *
 * Consent, quota, safety screening, disclaimers, and cost accounting are all
 * reproduced here so those behaviours are exercised in either mode.
 */
import type {
  AiAssistResult,
  AiConsent,
  AiConversation,
  AiTool,
  AiUsage,
  SupportTicket,
  SupportTicketMessage,
} from '../../types/models';
import {ApiError} from '../client';

// ---------------------------------------------------------------------------
// Catalogue (mirrors backend/services/ai/catalog.ts)
// ---------------------------------------------------------------------------

export const AI_TOOLS: AiTool[] = [
  {id: 'ask', title: 'Ask a question', icon: 'help-circle', prompt: 'Ask me anything.'},
  {id: 'summarize', title: 'Summarize text', icon: 'reader', prompt: 'Paste text and I will summarize it.'},
  {id: 'translate', title: 'Translate', icon: 'language', prompt: 'Tell me what to translate and into which language.'},
  {id: 'email', title: 'Write an email', icon: 'mail', prompt: 'Describe the email you need.'},
  {id: 'study', title: 'Study assistant', icon: 'school', prompt: 'What are you studying today?'},
  {id: 'code', title: 'Coding assistant', icon: 'code-slash', prompt: 'Share code or describe the bug.'},
  {
    id: 'finance',
    title: 'Financial assistant',
    icon: 'trending-up',
    prompt: 'General financial information only — never investment advice.',
    disclaimer: true,
  },
  {id: 'support', title: 'Support desk', icon: 'help-buoy', prompt: 'Describe the problem and I will try to help or raise a ticket.'},
  {
    id: 'image',
    title: 'Generate an image',
    icon: 'color-palette',
    prompt: 'Image generation is coming soon.',
    comingSoon: true,
  },
];

export const SUGGESTED_PROMPTS = [
  'Summarize this text into three bullet points',
  'Translate "good morning" into Portuguese',
  'Help me plan a study schedule for finals',
  'Draft a friendly reminder email',
  'Explain what a blockchain nugget is, simply',
];

// ---------------------------------------------------------------------------
// Safety (mirrors backend/services/ai/safety.ts)
// ---------------------------------------------------------------------------

type RiskCategory = 'financial' | 'legal' | 'medical';

export const DISCLAIMERS: Record<RiskCategory, string> = {
  financial:
    'General information only — not financial or investment advice. YaysApp never guarantees returns. Do your own research before acting.',
  legal:
    'General information only — not legal advice. Consult a qualified professional for your jurisdiction.',
  medical:
    'General information only — not medical advice. Consult a qualified healthcare professional.',
};

const BLOCKED: {pattern: RegExp; reason: string}[] = [
  {
    pattern: /\b(build|make|synthesi[sz]e|manufacture)\b[^.]{0,40}\b(bomb|explosive|nerve agent|bioweapon)\b/i,
    reason: 'This request involves weapons or explosives, which aiainai cannot help with.',
  },
  {
    pattern: /\b(csam|child (porn|sexual))\b/i,
    reason: 'This request involves child sexual abuse material and cannot be answered.',
  },
  {
    pattern: /\b(how to)\b[^.]{0,40}\b(kill myself|end my life|commit suicide)\b/i,
    reason:
      'aiainai cannot help with this. If you are in crisis, please contact your local emergency number or a suicide prevention line.',
  },
  {
    pattern: /\b(steal|crack|bypass)\b[^.]{0,30}\b(private key|seed phrase|wallet)\b/i,
    reason: "This request involves compromising someone's wallet, which aiainai cannot help with.",
  },
];

const RISKS: {category: RiskCategory; pattern: RegExp}[] = [
  {
    category: 'financial',
    pattern:
      /\b(invest|investment|portfolio|buy|sell|trade|trading|token|crypto|stock|shares?|returns?|yield|apy|price target|btcy|nugget)\b/i,
  },
  {category: 'legal', pattern: /\b(legal|lawsuit|sue|contract|attorney|lawyer|court|liability|tax(es|ation)?)\b/i},
  {
    category: 'medical',
    pattern: /\b(medical|doctor|diagnos(e|is)|symptom|prescription|medication|dosage|treatment|therapy)\b/i,
  },
];

export const screenPrompt = (prompt: string) => {
  const blocked = BLOCKED.find(rule => rule.pattern.test(prompt));
  if (blocked) {
    return {blocked: true, reason: blocked.reason, categories: [] as RiskCategory[]};
  }
  return {
    blocked: false,
    reason: undefined,
    categories: RISKS.filter(rule => rule.pattern.test(prompt)).map(rule => rule.category),
  };
};

export const applyDisclaimers = (answer: string, categories: RiskCategory[]): string => {
  const missing = categories
    .map(category => DISCLAIMERS[category])
    .filter(line => !answer.includes(line));
  return missing.length ? `${answer}\n\n${missing.join('\n\n')}` : answer;
};

// ---------------------------------------------------------------------------
// Plan + state
// ---------------------------------------------------------------------------

export const LOCAL_PLAN = {
  id: 'free',
  label: 'Free plan (offline)',
  dailyRequests: 40,
  dailyCostUsd: 0.5,
  maxPromptChars: 8000,
};

let sequence = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(sequence += 1)}`;

const utcDay = () => new Date().toISOString().slice(0, 10);
const endOfUtcDay = () => `${utcDay()}T24:00:00Z`;

interface LocalState {
  consent: AiConsent;
  usage: {day: string; requests: number; tokensIn: number; tokensOut: number; costUsd: number};
  conversations: AiConversation[];
  tickets: SupportTicket[];
  reports: {id: string; reason: string; excerpt: string; createdAt: string}[];
}

const freshUsage = () => ({day: utcDay(), requests: 0, tokensIn: 0, tokensOut: 0, costUsd: 0});

const state: LocalState = {
  consent: {
    // Deny by default — matches the backend schema.
    shareChatContent: false,
    shareCommunityContent: false,
    saveHistory: true,
    personalization: true,
    acceptedAt: null,
  },
  usage: freshUsage(),
  conversations: [],
  tickets: [],
  reports: [],
};

/** Test hook — restores first-run state. */
export const resetLocalEngine = () => {
  state.consent = {
    shareChatContent: false,
    shareCommunityContent: false,
    saveHistory: true,
    personalization: true,
    acceptedAt: null,
  };
  state.usage = freshUsage();
  state.conversations = [];
  state.tickets = [];
  state.reports = [];
  sequence = 0;
};

const rollUsageDay = () => {
  if (state.usage.day !== utcDay()) {
    state.usage = freshUsage();
  }
};

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

const assertQuota = () => {
  rollUsageDay();
  if (state.usage.requests >= LOCAL_PLAN.dailyRequests) {
    throw new ApiError(
      `You have used all ${LOCAL_PLAN.dailyRequests} AI requests for today. Your quota resets at midnight UTC.`,
      'rate_limited',
    );
  }
};

// ---------------------------------------------------------------------------
// Answer generation
// ---------------------------------------------------------------------------

const TOOL_ANSWERS: Record<string, (prompt: string) => string> = {
  translate: prompt =>
    `Translation of “${prompt.slice(0, 60)}”:\n\n“Bom dia!”\n\nOffline mode — connect an AI provider for real translations.`,
  summarize: () =>
    'Summary:\n\n• The text covers three main points.\n• The overall tone is positive.\n• Action items are listed at the end.',
  study: () =>
    'Study plan:\n\n1. Review the core concepts (25 min)\n2. Work through practice problems (25 min)\n3. Recap with flashcards (10 min)',
  code: () =>
    'The most likely cause is an off-by-one error in the loop bounds — iterate to `length - 1` rather than `length`.',
  finance: () =>
    'Diversification means spreading holdings across assets so no single position can dominate the outcome.',
};

const generateAnswer = (toolId: string, prompt: string, userName: string): string => {
  if (toolId === 'email') {
    return `Subject: Quick follow-up\n\nHi there,\n\nI wanted to follow up on our conversation.\n\nBest,\n${userName}`;
  }
  if (toolId === 'support') {
    return [
      'Here is what usually fixes this:',
      '',
      '1. Force-quit YaysApp and reopen it.',
      '2. Check Profile → Devices and sign out of any session you do not recognise.',
      '3. Confirm you are on the latest build.',
      '',
      'If none of that helps, escalate this ticket and a human agent will pick it up with the full transcript.',
    ].join('\n');
  }
  const canned = TOOL_ANSWERS[toolId];
  if (canned) {
    return canned(prompt);
  }
  return `Here is an offline answer to “${prompt.slice(0, 60)}”.\n\naiainai is running without a connected provider, so this response is generated on-device. Connect a provider to get real answers.`;
};

/** Run one completion through the same gates the backend applies. */
const complete = (options: {
  toolId: string;
  prompt: string;
  userName: string;
  scope: 'assistant' | 'chat' | 'community';
}): AiAssistResult => {
  const prompt = options.prompt.trim();
  if (!prompt) {
    throw new ApiError('A prompt is required.', 'validation');
  }
  if (prompt.length > LOCAL_PLAN.maxPromptChars) {
    throw new ApiError(
      `That is too long — up to ${LOCAL_PLAN.maxPromptChars} characters per request.`,
      'validation',
    );
  }
  if (options.scope === 'chat' && !state.consent.shareChatContent) {
    throw new ApiError(
      "Turn on 'Share chat content with AI' before using AI inside a conversation.",
      'unauthorized',
    );
  }
  if (options.scope === 'community' && !state.consent.shareCommunityContent) {
    throw new ApiError(
      "Turn on 'Share community content with AI' before using AI inside a community.",
      'unauthorized',
    );
  }

  assertQuota();

  const verdict = screenPrompt(prompt);
  if (verdict.blocked) {
    throw new ApiError(verdict.reason || 'Request blocked.', 'validation');
  }

  const text = applyDisclaimers(
    generateAnswer(options.toolId, prompt, options.userName),
    verdict.categories,
  );
  const tokensIn = estimateTokens(prompt);
  const tokensOut = estimateTokens(text);

  state.usage.requests += 1;
  state.usage.tokensIn += tokensIn;
  state.usage.tokensOut += tokensOut;
  // Offline answers cost nothing — the field still moves so the UI is exercised.
  state.usage.costUsd += 0;

  return {text, degraded: true, costUsd: 0, tokensIn, tokensOut};
};

// ---------------------------------------------------------------------------
// Public API — mirrors the backend routes one-for-one
// ---------------------------------------------------------------------------

export const localEngine = {
  tools: (): AiTool[] => AI_TOOLS,
  suggestedPrompts: (): string[] => SUGGESTED_PROMPTS,

  providerStatus: () => ({id: 'offline', model: 'yaysapp-offline-v1', live: false}),

  usage: (): AiUsage => {
    rollUsageDay();
    return {
      plan: LOCAL_PLAN.id,
      planLabel: LOCAL_PLAN.label,
      usedRequests: state.usage.requests,
      totalRequests: LOCAL_PLAN.dailyRequests,
      tokensIn: state.usage.tokensIn,
      tokensOut: state.usage.tokensOut,
      costUsd: state.usage.costUsd,
      costCapUsd: LOCAL_PLAN.dailyCostUsd,
      resetsAt: endOfUtcDay(),
    };
  },

  consent: (): AiConsent => ({...state.consent}),

  updateConsent: (patch: Partial<AiConsent>): AiConsent => {
    const grantsSharing =
      patch.shareChatContent === true || patch.shareCommunityContent === true;
    state.consent = {
      ...state.consent,
      ...patch,
      acceptedAt: grantsSharing ? new Date().toISOString() : state.consent.acceptedAt,
    };
    return {...state.consent};
  },

  history: (): AiConversation[] =>
    [...state.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

  conversation: (id: string): AiConversation => {
    const found = state.conversations.find(c => c.id === id);
    if (!found) {
      throw new ApiError('Conversation not found.', 'not_found');
    }
    return found;
  },

  startConversation: (toolId: string, firstPrompt?: string): AiConversation => {
    const tool = AI_TOOLS.find(t => t.id === toolId) ?? AI_TOOLS[0];
    const conversation: AiConversation = {
      id: nextId('ai'),
      title: firstPrompt?.trim().slice(0, 60) || `New ${tool.title} session`,
      tool: tool.id,
      saved: false,
      updatedAt: new Date().toISOString(),
      messages: [],
      costUsd: 0,
    };
    state.conversations.unshift(conversation);
    return conversation;
  },

  sendMessage: (conversationId: string, prompt: string, userName: string): AiConversation => {
    const conversation = localEngine.conversation(conversationId);
    const result = complete({
      toolId: conversation.tool,
      prompt,
      userName,
      scope: 'assistant',
    });
    const now = new Date().toISOString();
    if (state.consent.saveHistory) {
      conversation.messages.push(
        {id: nextId('am'), role: 'user', text: prompt.trim(), createdAt: now},
        {id: nextId('am'), role: 'assistant', text: result.text, createdAt: now, degraded: true},
      );
    } else {
      // History off: keep only the turn currently on screen.
      conversation.messages = [
        {id: nextId('am'), role: 'user', text: prompt.trim(), createdAt: now},
        {id: nextId('am'), role: 'assistant', text: result.text, createdAt: now, degraded: true},
      ];
    }
    if (conversation.messages.length === 2) {
      conversation.title = prompt.trim().slice(0, 60);
    }
    conversation.updatedAt = now;
    conversation.costUsd = (conversation.costUsd ?? 0) + result.costUsd;
    return conversation;
  },

  setSaved: (id: string, saved: boolean) => {
    const conversation = state.conversations.find(c => c.id === id);
    if (conversation) {
      conversation.saved = saved;
    }
  },

  remove: (id: string) => {
    const index = state.conversations.findIndex(c => c.id === id);
    if (index >= 0) {
      state.conversations.splice(index, 1);
    }
  },

  clearHistory: () => {
    state.conversations = [];
  },

  assist: (options: {
    kind: 'summarize_conversation' | 'translate_message';
    content: string;
    scope: 'chat' | 'community';
  }): AiAssistResult => {
    const toolId = options.kind === 'translate_message' ? 'translate' : 'summarize';
    return complete({
      toolId,
      prompt: options.content,
      userName: 'You',
      scope: options.scope,
    });
  },

  reportAnswer: (reason: string, excerpt: string) => {
    state.reports.unshift({
      id: nextId('rep'),
      reason,
      excerpt: excerpt.slice(0, 2000),
      createdAt: new Date().toISOString(),
    });
  },

  tickets: (): SupportTicket[] =>
    [...state.tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

  createTicket: (subject: string, text: string, product: string): SupportTicket => {
    const result = complete({toolId: 'support', prompt: text, userName: 'You', scope: 'assistant'});
    const now = new Date().toISOString();
    const messages: SupportTicketMessage[] = [
      {id: nextId('sm'), author: 'user', text, createdAt: now},
      {id: nextId('sm'), author: 'ai', text: result.text, createdAt: now},
    ];
    const ticket: SupportTicket = {
      id: nextId('tkt'),
      subject: (subject || text).slice(0, 120),
      product,
      status: 'ai_handling',
      messages,
      escalatedAt: null,
      updatedAt: now,
    };
    state.tickets.unshift(ticket);
    return ticket;
  },

  replyToTicket: (ticketId: string, text: string): SupportTicket => {
    const ticket = state.tickets.find(t => t.id === ticketId);
    if (!ticket) {
      throw new ApiError('Ticket not found.', 'not_found');
    }
    const now = new Date().toISOString();
    ticket.messages.push({id: nextId('sm'), author: 'user', text, createdAt: now});
    // Once a human owns it the AI stops replying; the message just queues.
    if (ticket.status !== 'escalated') {
      const result = complete({
        toolId: 'support',
        prompt: text,
        userName: 'You',
        scope: 'assistant',
      });
      ticket.messages.push({id: nextId('sm'), author: 'ai', text: result.text, createdAt: now});
    }
    ticket.updatedAt = now;
    return ticket;
  },

  escalateTicket: (ticketId: string, reason: string): SupportTicket => {
    const ticket = state.tickets.find(t => t.id === ticketId);
    if (!ticket) {
      throw new ApiError('Ticket not found.', 'not_found');
    }
    const now = new Date().toISOString();
    ticket.status = 'escalated';
    ticket.escalatedAt = now;
    ticket.updatedAt = now;
    ticket.messages.push({
      id: nextId('sm'),
      author: 'agent',
      text: `Escalated to the human support queue${
        reason ? ` — ${reason}` : ''
      }. An agent will reply here with the full transcript in view.`,
      createdAt: now,
    });
    return ticket;
  },
};
