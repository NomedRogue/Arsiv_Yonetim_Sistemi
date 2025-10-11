const path = require('path');
const fs = require('fs');

// Dynamic olarak al - her çağrıda güncel değeri kullan
function getUserDataPath(...segments) {
  const userDataPath = process.env.USER_DATA_PATH || process.cwd();
  return path.join(userDataPath, ...segments);
}

function ensureDirExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`[SAFE MKDIR] Dizin oluşturuldu: ${dirPath}`);
    }
  } catch (err) {
    console.error('[SAFE MKDIR] Dizin oluşturulamadı', err);
  }
}

function safeCopyFileSync(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log(`[SAFE COPY] Dosya kopyalandı: ${src} -> ${dest}`);
  } catch (err) {
    console.error('[SAFE COPY] Dosya kopyalanamadı', err);
  }
}

module.exports = {
  getUserDataPath,
  ensureDirExists,
  safeCopyFileSync,
};