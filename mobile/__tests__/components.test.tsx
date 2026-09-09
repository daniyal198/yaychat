/**
 * Design-kit interaction tests (Milestone 1 test plan).
 */
import React from 'react';
import {TextInput} from 'react-native';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {
  AsyncView,
  Avatar,
  Badge,
  Button,
  CountBubble,
  EmptyState,
  ErrorState,
  ListRow,
  OfflineState,
  SearchBar,
  TextField,
  YayText,
} from '../src/yaychat/design/components';

const render = (element: React.ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
};

const textContent = (tree: ReactTestRenderer.ReactTestRenderer): string =>
  JSON.stringify(tree.toJSON());

describe('Button', () => {
  it('fires onPress and exposes an accessibility label', () => {
    const onPress = jest.fn();
    const tree = render(<Button label="Continue" onPress={onPress} />);
    const button = tree.root.findByProps({accessibilityLabel: 'Continue'});
    act(() => {
      button.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while loading', () => {
    const onPress = jest.fn();
    const tree = render(<Button label="Save" onPress={onPress} loading />);
    const button = tree.root.findByProps({accessibilityLabel: 'Save'});
    expect(button.props.disabled).toBe(true);
  });
});

describe('TextField', () => {
  it('renders label, error, and hint states', () => {
    const withError = render(<TextField label="Email" error="Enter a valid email address." />);
    expect(textContent(withError)).toContain('Enter a valid email address.');
    const withHint = render(<TextField label="Email" hint="We never share this." />);
    expect(textContent(withHint)).toContain('We never share this.');
  });

  it('toggles password visibility', () => {
    const tree = render(<TextField label="Password" value="secret123" secureTextEntry />);
    expect(tree.root.findByType(TextInput).props.secureTextEntry).toBe(true);
    act(() => {
      tree.root.findByProps({accessibilityLabel: 'Show password'}).props.onPress();
    });
    expect(tree.root.findByType(TextInput).props.secureTextEntry).toBe(false);
    expect(tree.root.findByProps({accessibilityLabel: 'Hide password'})).toBeTruthy();
  });
});

describe('SearchBar', () => {
  it('shows a clear affordance only when there is text', () => {
    const onChange = jest.fn();
    const empty = render(<SearchBar value="" onChangeText={onChange} />);
    expect(textContent(empty)).not.toContain('close-circle');
    const filled = render(<SearchBar value="yay" onChangeText={onChange} />);
    expect(textContent(filled)).toContain('close-circle');
  });
});

describe('state views', () => {
  it('renders empty, error, and offline states with retry actions', () => {
    const retry = jest.fn();
    expect(textContent(render(<EmptyState title="Nothing here yet" />))).toContain(
      'Nothing here yet',
    );
    const error = render(<ErrorState message="Boom" onRetry={retry} />);
    expect(textContent(error)).toContain('Boom');
    act(() => {
      error.root.findByProps({accessibilityLabel: 'Try again'}).props.onPress();
    });
    expect(retry).toHaveBeenCalled();
    expect(textContent(render(<OfflineState />))).toContain('You are offline');
  });
});

describe('AsyncView', () => {
  const children = (data: string[]) => <YayText>{`loaded:${data.length}`}</YayText>;

  it('renders skeleton while loading', () => {
    const tree = render(
      <AsyncView loading data={null} children={children} skeleton={<YayText>skeleton</YayText>} />,
    );
    expect(textContent(tree)).toContain('skeleton');
  });

  it('renders error state with message', () => {
    const tree = render(
      <AsyncView loading={false} error="Server exploded" data={null} children={children} />,
    );
    expect(textContent(tree)).toContain('Server exploded');
  });

  it('renders offline state', () => {
    const tree = render(
      <AsyncView loading={false} offline data={null} children={children} />,
    );
    expect(textContent(tree)).toContain('You are offline');
  });

  it('renders empty state when isEmpty', () => {
    const tree = render(
      <AsyncView
        loading={false}
        isEmpty
        emptyTitle="No chats"
        data={[]}
        children={children}
      />,
    );
    expect(textContent(tree)).toContain('No chats');
  });

  it('renders content when data is present', () => {
    const tree = render(<AsyncView loading={false} data={['a', 'b']} children={children} />);
    expect(textContent(tree)).toContain('loaded:2');
  });
});

describe('ListRow and Badge', () => {
  it('renders a selected profile picture instead of initials', () => {
    const tree = render(<Avatar name="Test User" imageUri="file:///profile.jpg" />);
    const svg = tree.root.findByProps({accessibilityLabel: 'Test User profile picture'});
    // The photo fills the whole oval: clipped to the oval silhouette and
    // cover-fitted ("slice") rather than inset in a smaller shape.
    const image = svg.findByProps({preserveAspectRatio: 'xMidYMid slice'});
    expect(image.props.href).toEqual({uri: 'file:///profile.jpg'});
    expect(textContent(tree)).not.toContain('TU');
  });

  it('renders title, subtitle, and avatar initials', () => {
    const tree = render(
      <ListRow title="Amara Okafor" subtitle="online" avatarName="Amara Okafor" onPress={() => {}} />,
    );
    const text = textContent(tree);
    expect(text).toContain('Amara Okafor');
    expect(text).toContain('online');
    expect(text).toContain('AO');
  });

  it('renders badge tones', () => {
    expect(textContent(render(<Badge label="Preview" tone="warning" />))).toContain('Preview');
  });

  it('caps large unread counts in count bubbles', () => {
    expect(textContent(render(<CountBubble count={22013} />))).toContain('999+');
  });
});
