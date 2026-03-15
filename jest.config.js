/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: [
    'R1-adapter-repository/after/**/*.ts',
    'R2-command-sync/after/**/*.ts',
    'R3-builder-dosing/after/**/*.ts',
    '!**/*.d.ts'
  ],
  coverageReporters: ['text', 'lcov'],
  testMatch: ['**/tests/**/*.test.ts'],
  verbose: true
};
