const Database = require('better-sqlite3');
const db = new Database(':memory:');
try {
  const row = db.prepare("SELECT json_extract('{\"a\":1}', '$.a') as val").get();
  console.log('JSON Support:', row.val === 1 ? 'YES' : 'NO');
} catch (e) {
  console.log('JSON Error:', e.message);
}
console.log('Better-sqlite3 version loaded.');
