const dbManager = require('./db');

async function debug() {
  const db = dbManager.getDbInstance();
  
  console.log('\n=== FOLDERS TABLE pdfPath VALUES ===');
  const rows = db.prepare('SELECT id, fileCode, pdfPath FROM folders WHERE pdfPath IS NOT NULL LIMIT 10').all();
  console.log(JSON.stringify(rows, null, 2));
  
  console.log('\n=== PDF_METADATA TABLE pdf_path VALUES ===');
  const metadata = db.prepare('SELECT pdf_path, dosya_no, hasta_adi FROM pdf_metadata LIMIT 10').all();
  console.log(JSON.stringify(metadata, null, 2));
  
  process.exit(0);
}

debug().catch(console.error);
