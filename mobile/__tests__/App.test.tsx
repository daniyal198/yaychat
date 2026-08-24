/**
 * Smoke test: the YaysApp shell (providers + splash) renders and finishes
 * its boot sequence.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {AppProviders} from '../src/yaychat/state/AppProviders';
import {SplashView} from '../src/yaychat/screens/shared/SharedScreens';

const visibleText = (tree: ReactTestRenderer.ReactTestRenderer): string[] =>
  tree.root
    .findAllByType(Text)
    .flatMap(node =>
      React.Children.toArray(node.props.children).filter((child): child is string => typeof child === 'string'),
    );

// Rendering the whole provider tree takes ~1s alone but can exceed Jest's 5s
// default when the other suites are running on parallel workers.
const SHELL_RENDER_TIMEOUT_MS = 30_000;

test('renders the YaysApp shell', async () => {
  jest.useFakeTimers();
  let tree: ReactTestRenderer.ReactTestRenderer | null = null;

  try {
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <AppProviders>
          <SplashView />
        </AppProviders>,
      );
    });
    // Let the mocked session restore (delay 300ms) settle before assertions.
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(visibleText(tree!)).toEqual(expect.arrayContaining(['YaysApp', 'Chat. Learn. Earn. Together.']));
  } finally {
    const rendered = tree as ReactTestRenderer.ReactTestRenderer | null;
    if (rendered) {
      await ReactTestRenderer.act(async () => {
        rendered.unmount();
      });
    }
    jest.useRealTimers();
  }
}, SHELL_RENDER_TIMEOUT_MS);
