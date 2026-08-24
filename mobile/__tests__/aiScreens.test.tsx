/**
 * Module 5 — AI screen render tests.
 *
 * These mount the real screens against the real service layer, with only the
 * two app-level contexts stubbed. They catch the class of failure that would
 * otherwise only show up as a redbox on device: a bad import, a missing prop,
 * or a crash in first render / first effect.
 */
import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

const mockToast = {show: jest.fn()};

// Stub the app-level contexts so each screen renders in isolation. The full
// provider tree is already covered by App.test.tsx.
jest.mock('../src/yaychat/state/AppProviders', () => ({
  useToast: () => mockToast,
  useAuth: () => ({
    session: {token: 't', onboarded: true, user: {id: 'u1', name: 'Test User'}},
  }),
}));

import {
  AiChatScreen,
  AiHistoryScreen,
  AiHomeScreen,
  AiSupportScreen,
  AiSupportThreadScreen,
  formatCost,
} from '../src/yaychat/screens/ai/AiScreens';
import {aiService, simulation} from '../src/yaychat/services';
import {resetLocalEngine} from '../src/yaychat/services/ai/localEngine';

const navigation: any = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  goBack: jest.fn(),
};

const route = (name: string, params?: object): any => ({key: name, name, params});

/**
 * The first mount in this file pays the whole service layer's module-init cost,
 * which can exceed Jest's 5s default when the other suites are running on
 * parallel workers. Same reasoning as App.test.tsx's shell-render budget.
 */
const FIRST_RENDER_TIMEOUT_MS = 30_000;

/** Mount, then let effects and their promises settle. */
const renderScreen = async (element: React.ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return tree;
};

/**
 * Concatenate the rendered text. Walks `children` only — `props` can hold React
 * elements whose `_owner` back-references make JSON.stringify throw on cycles.
 */
const collectText = (node: unknown): string => {
  if (typeof node === 'string') {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join(' ');
  }
  if (node && typeof node === 'object' && 'children' in node) {
    return collectText((node as {children: unknown}).children);
  }
  return '';
};

const asText = (tree: ReactTestRenderer.ReactTestRenderer): string =>
  collectText(tree.toJSON());

beforeAll(() => {
  simulation.latencyMs = 0;
});

beforeEach(() => {
  resetLocalEngine();
  jest.clearAllMocks();
});

describe('AiHomeScreen', () => {
  it('renders the hub with usage, privacy, and tools', async () => {
    const tree = await renderScreen(
      <AiHomeScreen navigation={navigation} route={route('AiHome')} />,
    );
    const text = asText(tree);
    expect(text).toContain('aiainai');
    expect(text).toContain('AI privacy');
    expect(text).toContain('Ask a question');
    expect(text).toContain('Support desk');
    await act(async () => tree.unmount());
  }, FIRST_RENDER_TIMEOUT_MS);

  it('warns when no live AI provider is connected', async () => {
    const tree = await renderScreen(
      <AiHomeScreen navigation={navigation} route={route('AiHome')} />,
    );
    expect(asText(tree)).toContain('AI provider unavailable');
    await act(async () => tree.unmount());
  });

  it('shows today’s request quota and cost', async () => {
    const tree = await renderScreen(
      <AiHomeScreen navigation={navigation} route={route('AiHome')} />,
    );
    const text = asText(tree);
    expect(text).toContain('requests today');
    expect(text).toContain('Resets at midnight UTC');
    await act(async () => tree.unmount());
  });
});

describe('AiChatScreen', () => {
  it('renders an empty thread for a new session', async () => {
    const tree = await renderScreen(
      <AiChatScreen navigation={navigation} route={route('AiChat', {toolId: 'ask'})} />,
    );
    expect(asText(tree)).toContain('Ask me anything');
    await act(async () => tree.unmount());
  });

  it('shows the high-risk disclaimer on the financial tool', async () => {
    const tree = await renderScreen(
      <AiChatScreen navigation={navigation} route={route('AiChat', {toolId: 'finance'})} />,
    );
    expect(asText(tree)).toContain('never financial, legal, or medical advice');
    await act(async () => tree.unmount());
  });
});

describe('AiHistoryScreen', () => {
  it('renders the empty state when there are no sessions', async () => {
    const tree = await renderScreen(
      <AiHistoryScreen navigation={navigation} route={route('AiHistory')} />,
    );
    expect(asText(tree)).toContain('No AI sessions yet');
    await act(async () => tree.unmount());
  });
});

describe('Support desk screens', () => {
  it('renders the ticket list empty state', async () => {
    const tree = await renderScreen(
      <AiSupportScreen navigation={navigation} route={route('AiSupport')} />,
    );
    const text = asText(tree);
    expect(text).toContain('No support requests');
    expect(text).toContain('escalate');
    await act(async () => tree.unmount());
  });

  it('renders an existing ticket thread with its AI reply', async () => {
    const ticket = await aiService.createTicket({
      subject: 'Cannot sign in',
      text: 'I keep getting signed out.',
    });
    const tree = await renderScreen(
      <AiSupportThreadScreen
        navigation={navigation}
        route={route('AiSupportThread', {ticketId: ticket.id})}
      />,
    );
    const text = asText(tree);
    expect(text).toContain('I keep getting signed out.');
    expect(text).toContain('Escalate to a human agent');
    await act(async () => tree.unmount());
  });

  it('tells the user an agent owns an escalated ticket', async () => {
    const ticket = await aiService.createTicket({subject: 'Refund', text: 'Charged twice.'});
    await aiService.escalateTicket(ticket.id, 'Needs account access');
    const tree = await renderScreen(
      <AiSupportThreadScreen
        navigation={navigation}
        route={route('AiSupportThread', {ticketId: ticket.id})}
      />,
    );
    expect(asText(tree)).toContain('A human agent owns this request');
    await act(async () => tree.unmount());
  });
});

describe('formatCost', () => {
  it('renders sub-cent spend without rounding it away to zero', () => {
    expect(formatCost(0)).toBe('$0.00');
    expect(formatCost(0.0004)).toBe('<$0.01');
    expect(formatCost(1.5)).toBe('$1.50');
  });
});
