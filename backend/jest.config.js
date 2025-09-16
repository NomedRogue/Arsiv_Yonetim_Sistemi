/** @type {import('jest').Config} */
const config = {
  displayName: 'Backend',
  testEnvironment: 'node',
  testMatch: ['**/backend/tests/**/*.test.js'],
  clearMocks: true,
  transform: {}, // Explicitly disable any transformers
};

module.exports = config;