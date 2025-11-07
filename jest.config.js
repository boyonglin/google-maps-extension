module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./tests/setup.js'],
  collectCoverageFrom: [
    'Package/dist/hooks/popupState.js',
    'Package/dist/hooks/backgroundState.js',
    'Package/dist/utils/crypto.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'clover'],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: false,
  testTimeout: 10000
};
