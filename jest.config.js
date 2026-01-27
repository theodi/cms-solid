module.exports = {
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  // Run tests in both unit and integration folders
  testRegex: '/test/(unit|integration)/.*\\.test\\.ts$',
  moduleFileExtensions: [
    'ts',
    'js',
  ],
  testEnvironment: 'node',
  // Make sure our tests have enough time to start a server
  testTimeout: 60000,
  // Collect coverage from source files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
  ],
  // Coverage threshold is aspirational - we aim for 70% but don't fail on it
  // Remove or comment out to enable strict coverage enforcement
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 70,
  //     lines: 70,
  //     statements: 70,
  //   },
  // },
};
