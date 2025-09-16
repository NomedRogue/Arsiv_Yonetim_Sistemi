const path = require('path');
const fs = require('fs');

const userDataPath = process.env.USER_DATA_PATH || process.cwd();

function getUserDataPath(...segments) {
  return path.join(userDataPath, ...segments);
}

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = {
  getUserDataPath,
  ensureDirExists,
};