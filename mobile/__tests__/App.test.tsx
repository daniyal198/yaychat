/**
 * Smoke test: the Yay-chat shell (providers + splash) renders and finishes
 * its boot sequence.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {AppProviders} from '../src/yaychat/state/AppProviders';
import {SplashView} from '../src/yaychat/screens/shared/SharedScreens';

test('renders the Yay-chat shell', async () => {
  jest.useFakeTimers();
  let tree!: ReactTestRenderer.ReactTestRenderer;
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
  expect(JSON.stringify(tree.toJSON())).toContain('Yay-chat');
  await ReactTestRenderer.act(async () => {
    tree.unmount();
  });
  jest.useRealTimers();
});
