module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./tests/setup.js'],
  collectCoverageFrom: [
    'Package/dist/hooks/popupState.js',
    'Package/dist/hooks/backgroundState.js',
    'Package/dist/utils/crypto.js',
    'Package/dist/utils/appSecret.js',
    'Package/dist/contentScript.js',
    'Package/dist/components/menu.js',
    'Package/dist/components/remove.js',
    'Package/dist/components/favorite.js',
    'Package/dist/components/history.js',
    'Package/dist/components/gemini.js',
    'Package/dist/components/modal.js',
    'Package/dist/utils/payment.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'clover'],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: false,
  testTimeout: 10000
};
