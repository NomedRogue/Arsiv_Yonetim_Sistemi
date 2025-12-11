/** @type {import('jest').Config} */
const config = {
  displayName: 'Backend',
  testEnvironment: 'node',
  testMatch: ['**/backend/tests/**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    'backup.test.js',        // Legacy - uses deprecated backup.js
    'db.test.js',            // Legacy - uses deprecated dbAdapter.js
    'backupScheduler.test.js' // Legacy - uses deprecated code
  ],
  clearMocks: true,
  transform: {}, // Explicitly disable any transformers
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};

module.exports = config;