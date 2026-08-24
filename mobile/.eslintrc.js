module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // Jest globals are injected by the test runner, not imported.
      files: ['__tests__/**/*', 'jest.setup.js', '*.test.ts', '*.test.tsx'],
      env: {jest: true},
    },
  ],
};
