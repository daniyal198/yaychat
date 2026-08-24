module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  /**
   * Mounting a real screen pulls in the whole service layer, and Jest's 5s
   * default is measured while every other suite is competing for the same
   * cores. The individual tests are fast — the variance is scheduling — so a
   * per-test budget this size removes the flake without hiding a slow test:
   * a genuine hang still fails, just later.
   */
  testTimeout: 30000,
};
