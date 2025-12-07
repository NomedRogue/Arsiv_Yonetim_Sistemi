/**
 * Repository Index
 * Central export for all repositories
 */

const FolderRepository = require('./FolderRepository');
const CheckoutRepository = require('./CheckoutRepository');
const DisposalRepository = require('./DisposalRepository');
const LogRepository = require('./LogRepository');
const ConfigRepository = require('./ConfigRepository');
const UserRepository = require('./UserRepository');

// Singleton instances
let folderRepo = null;
let checkoutRepo = null;
let disposalRepo = null;
let logRepo = null;
let configRepo = null;
let userRepo = null;

/**
 * Get repository instances (lazy initialization)
 */
function getRepositories() {
  if (!folderRepo) {
    folderRepo = new FolderRepository();
    checkoutRepo = new CheckoutRepository();
    disposalRepo = new DisposalRepository();
    logRepo = new LogRepository();
    configRepo = new ConfigRepository();
    userRepo = new UserRepository();
  }

  return {
    folder: folderRepo,
    checkout: checkoutRepo,
    disposal: disposalRepo,
    log: logRepo,
    config: configRepo,
    user: userRepo
  };
}

/**
 * Reset all repository instances (used after database restore)
 */
function resetRepositories() {
  folderRepo = null;
  checkoutRepo = null;
  disposalRepo = null;
  logRepo = null;
  configRepo = null;
  userRepo = null;
}

module.exports = {
  getRepositories,
  resetRepositories,
  FolderRepository,
  CheckoutRepository,
  DisposalRepository,
  LogRepository,
  ConfigRepository
};
