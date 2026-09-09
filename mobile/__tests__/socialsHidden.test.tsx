/**
 * The social linking row is not offered while linking is unbuilt (BUG-002).
 *
 * There is no provider OAuth behind these tiles — no developer apps, no
 * credentials, no callback route — so tapping one could only ever produce a
 * fake "connected" state. Mounts the real Explore screen and asserts the
 * section is absent, which a screenshot below the fold would not prove.
 */
import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

const mockToast = {show: jest.fn()};

// The screen reads safe-area insets; the library needs a provider it does not
// have when a screen is mounted on its own.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = {top: 0, bottom: 0, left: 0, right: 0};
  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
    SafeAreaView: ({children}: {children: React.ReactNode}) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({x: 0, y: 0, width: 390, height: 844}),
    initialWindowMetrics: {insets: inset, frame: {x: 0, y: 0, width: 390, height: 844}},
  };
});

jest.mock('../src/yaychat/state/AppProviders', () => ({
  useToast: () => mockToast,
  useAuth: () => ({
    session: {token: 't', onboarded: true, user: {id: 'u1', name: 'Test User'}},
  }),
  useUnread: () => ({total: 0, byConversation: {}}),
  formatUnreadBadge: (n: number) => String(n),
}));

import {ExploreHomeScreen} from '../src/yaychat/screens/explore/ExploreScreens';
import {socialLinkingIsLive} from '../src/yaychat/services';

const navigation: any = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  goBack: jest.fn(),
};

/** Every string rendered anywhere in the tree. */
const textOf = (tree: ReactTestRenderer.ReactTestRenderer): string => {
  const out: string[] = [];
  const walk = (node: any) => {
    if (node == null) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    walk(node.children);
  };
  walk(tree.toJSON() as any);
  return out.join(' | ');
};

describe('social linking on Explore', () => {
  it('is switched off, so nothing offers a connection that cannot happen', () => {
    expect(socialLinkingIsLive()).toBe(false);
  });

  it('renders no "Connect your socials" section', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <ExploreHomeScreen navigation={navigation} route={{key: 'k', name: 'ExploreHome'} as any} />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    const text = textOf(tree);
    expect(text).not.toContain('Connect your socials');
    expect(text).not.toContain('Link your accounts to invite friends');

    // The screen itself still rendered — otherwise the assertions above would
    // pass on an empty tree.
    expect(text.length).toBeGreaterThan(0);

    await act(async () => {
      tree.unmount();
    });
  });
});
