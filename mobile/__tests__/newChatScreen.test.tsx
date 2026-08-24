/**
 * New chat / group creation.
 *
 * Mounts the real screen against the real service layer, with only the app
 * contexts stubbed. The behaviour under test is the one that made the screen
 * unusable: with an empty contact list there was no way to put anyone in a
 * group, because typing an email only worked in Direct mode.
 */
import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

const mockToast = {show: jest.fn()};

// `@react-navigation/elements` pulls in a PNG that Jest cannot transform, and
// the screen only needs the header height from it.
jest.mock('@react-navigation/elements', () => ({useHeaderHeight: () => 0}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('../src/yaychat/state/AppProviders', () => ({
  useToast: () => mockToast,
  useAuth: () => ({
    session: {token: 't', onboarded: true, user: {id: 'u1', name: 'Test User'}},
  }),
  useUnread: () => ({
    total: 0,
    refresh: jest.fn(),
    getConversationUnread: () => 0,
    recordIncoming: jest.fn(),
    clearConversation: jest.fn(),
    syncConversations: jest.fn(),
    setActiveConversation: jest.fn(),
  }),
  useNetwork: () => ({offline: false}),
}));

import {NewChatScreen} from '../src/yaychat/screens/chats/ChatScreens';
import {Button, CheckRow, SearchBar, TextField} from '../src/yaychat/design/components';
import {simulation, userService} from '../src/yaychat/services';

const navigation: any = {
  navigate: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  goBack: jest.fn(),
};

const render = async (group: boolean) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <NewChatScreen
        navigation={navigation}
        route={{key: 'NewChat', name: 'NewChat', params: {group}} as any}
      />,
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
  return tree;
};

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

const buttonLabelled = (tree: ReactTestRenderer.ReactTestRenderer, match: string) =>
  tree.root
    .findAllByType(Button)
    .find(b => String(b.props.label || '').includes(match));

const type = async (tree: ReactTestRenderer.ReactTestRenderer, text: string) => {
  const search = tree.root.findByType(SearchBar);
  await act(async () => {
    search.props.onChangeText(text);
  });
};

beforeAll(() => {
  simulation.latencyMs = 0;
});

beforeEach(() => jest.clearAllMocks());

describe('group creation', () => {
  it('lets a full email be added as a participant', async () => {
    const tree = await render(true);
    await type(tree, 'newperson@example.com');

    const row = tree.root
      .findAllByType(CheckRow)
      .find(r => String(r.props.label).includes('newperson@example.com'));

    // This is the regression that made the screen unusable: with no contacts,
    // a typed email produced nothing in Group mode and the group could never
    // be populated.
    expect(row).toBeTruthy();
    expect(row!.props.checked).toBe(false);

    await act(async () => row!.props.onToggle());
    expect(asText(tree)).toContain('newperson@example.com');
    await act(async () => tree.unmount());
  });

  it('keeps Next disabled until two people are chosen', async () => {
    const tree = await render(true);
    expect(buttonLabelled(tree, 'Next')!.props.disabled).toBe(true);

    await type(tree, 'one@example.com');
    await act(async () =>
      tree.root
        .findAllByType(CheckRow)
        .find(r => String(r.props.label).includes('one@example.com'))!
        .props.onToggle(),
    );

    // One participant would create a direct chat, not a group.
    expect(buttonLabelled(tree, 'Next')!.props.disabled).toBe(true);

    await type(tree, 'two@example.com');
    await act(async () =>
      tree.root
        .findAllByType(CheckRow)
        .find(r => String(r.props.label).includes('two@example.com'))!
        .props.onToggle(),
    );

    expect(buttonLabelled(tree, 'Next')!.props.disabled).toBe(false);
    expect(buttonLabelled(tree, 'Next')!.props.label).toContain('2 selected');
    await act(async () => tree.unmount());
  });

  it('moves to a details step that asks for a name before creating', async () => {
    const tree = await render(true);
    for (const email of ['a@example.com', 'b@example.com']) {
      await type(tree, email);
      await act(async () =>
        tree.root
          .findAllByType(CheckRow)
          .find(r => String(r.props.label).includes(email))!
          .props.onToggle(),
      );
    }

    await act(async () => buttonLabelled(tree, 'Next')!.props.onPress());

    const text = asText(tree);
    expect(text).toContain('Group name');
    expect(text).toContain('Participants (2)');

    // A nameless group is not creatable.
    const create = buttonLabelled(tree, 'Create group')!;
    expect(create.props.disabled).toBe(true);

    await act(async () => tree.root.findByType(TextField).props.onChangeText('Weekend plans'));
    expect(buttonLabelled(tree, 'Create group')!.props.disabled).toBe(false);
    await act(async () => tree.unmount());
  });

  it('can go back from details without losing the participants', async () => {
    const tree = await render(true);
    for (const email of ['a@example.com', 'b@example.com']) {
      await type(tree, email);
      await act(async () =>
        tree.root
          .findAllByType(CheckRow)
          .find(r => String(r.props.label).includes(email))!
          .props.onToggle(),
      );
    }
    await act(async () => buttonLabelled(tree, 'Next')!.props.onPress());
    await act(async () => buttonLabelled(tree, 'Back to participants')!.props.onPress());

    expect(buttonLabelled(tree, 'Next')!.props.label).toContain('2 selected');
    await act(async () => tree.unmount());
  });

  // The state the user hit: nobody matches, so the screen has to say how to
  // add someone rather than dead-ending on "No contacts".
  it('tells the user how to add someone when nothing matches', async () => {
    const tree = await render(true);
    await type(tree, 'zzzznobody');

    const text = asText(tree);
    expect(text).toContain('No one matched');
    expect(text).toContain('add someone');
    await act(async () => tree.unmount());
  });
});

// The state the user hit: the contacts directory timed out, and an <AsyncView>
// around the whole list took the typed-email row down with it, so no chat of
// any kind could be started.
describe('when the contacts directory fails', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest
      .spyOn(userService, 'contacts')
      .mockRejectedValue(new Error('This is taking longer than expected.'));
  });

  afterEach(() => spy.mockRestore());

  it('still lets a group be built by email', async () => {
    const tree = await render(true);
    expect(asText(tree)).toContain('add people by typing their full email address');

    for (const email of ['a@example.com', 'b@example.com']) {
      await type(tree, email);
      const row = tree.root
        .findAllByType(CheckRow)
        .find(r => String(r.props.label).includes(email));
      expect(row).toBeTruthy();
      await act(async () => row!.props.onToggle());
    }

    expect(buttonLabelled(tree, 'Next')!.props.disabled).toBe(false);
    await act(async () => tree.unmount());
  });

  it('still lets a direct chat be started by email', async () => {
    const tree = await render(false);
    await type(tree, 'someone@example.com');
    expect(asText(tree)).toContain('someone@example.com');
    await act(async () => tree.unmount());
  });

  it('offers a retry rather than stranding the screen', async () => {
    const tree = await render(true);
    expect(buttonLabelled(tree, 'Retry loading contacts')).toBeTruthy();
    await act(async () => tree.unmount());
  });
});

describe('direct chat', () => {
  it('still opens a conversation straight from a typed email', async () => {
    const tree = await render(false);
    await type(tree, 'someone@example.com');
    expect(asText(tree)).toContain('someone@example.com');
    // Direct mode shows no participant picker and no Next step.
    expect(tree.root.findAllByType(CheckRow).length).toBe(0);
    expect(buttonLabelled(tree, 'Next')).toBeUndefined();
    await act(async () => tree.unmount());
  });
});
