module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./tests/setup.js'],
  preset: 'ts-jest/presets/js-with-babel',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'Package/dist/**/*.{js,ts}',
    'src/**/*.{js,ts}',
    '!Package/dist/utils/ExtPay.module.js',
    '!Package/dist/utils/browser-polyfill.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'clover'],
  testMatch: ['**/tests/**/*.test.(js|ts)'],
  verbose: false,
  testTimeout: 10000
};
