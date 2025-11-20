const xlsx = require('xlsx');
const path = require('path');

const excelPath = 'C:\\Users\\bekir_n0411\\Desktop\\Arsiv_Yonetim_Sistemi\\backend\\Excels\\excel-1763658786584-930661704.xls';

const workbook = xlsx.readFile(excelPath);

console.log('=== EXCEL BİLGİLERİ ===');
console.log('Dosya:', excelPath);
console.log('Sheet isimleri:', workbook.SheetNames);
console.log('Toplam sheet sayısı:', workbook.SheetNames.length);

// İlk sheet'i oku
const sheetName = workbook.SheetNames[0];
console.log('\nOkunan sheet:', sheetName);

const worksheet = workbook.Sheets[sheetName];

// Sheet aralığını kontrol et
console.log('Sheet aralığı:', worksheet['!ref']);

const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log('JSON olarak okunan toplam satır:', data.length);
console.log('\n=== İlk 5 satır ===');
data.slice(0, 5).forEach((row, i) => {
  console.log(`Satır ${i}:`, row.slice(0, 10));
});

// Başlık satırını bul
let headerRowIndex = -1;
for (let i = 0; i < Math.min(20, data.length); i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;
  
  const hasSayi = row.some(cell => {
    if (!cell) return false;
    const normalized = cell.toString().toUpperCase()
      .replace(/İ/g, 'I')
      .replace(/Ş/g, 'S')
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C');
    return normalized === 'SAYI' || 
           (normalized.includes('SAYI') && 
            !normalized.includes('SAYFA') && 
            !normalized.includes('SAYISI'));
  });
  
  const hasAciklamalar = row.some(cell => {
    if (!cell) return false;
    const normalized = cell.toString().toUpperCase()
      .replace(/İ/g, 'I')
      .replace(/Ş/g, 'S')
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C');
    return normalized.includes('ACIKLAMA');
  });
  
  if (hasSayi && hasAciklamalar) {
    headerRowIndex = i;
    break;
  }
}

console.log('\n=== Başlık satırı (index:', headerRowIndex, ') ===');
console.log(data[headerRowIndex]);

const headers = data[headerRowIndex];
const sayiColIndex = headers.findIndex(h => {
  if (!h) return false;
  const normalized = h.toString().toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');
  return normalized === 'SAYI' || 
         (normalized.includes('SAYI') && 
          !normalized.includes('SAYFA') && 
          !normalized.includes('SAYISI'));
});

const aciklamalarColIndex = headers.findIndex(h => {
  if (!h) return false;
  const normalized = h.toString().toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');
  return normalized.includes('ACIKLAMA');
});

console.log('\nSAYI kolon index:', sayiColIndex);
console.log('AÇIKLAMALAR kolon index:', aciklamalarColIndex);

console.log('\n=== TÜM veri satırları (başlıktan sonra) ===');
for (let i = headerRowIndex + 1; i < data.length; i++) {
  const row = data[i];
  if (row && row.length > 0) {
    console.log(`Satır ${i}:`, {
      SAYI: row[sayiColIndex],
      AÇIKLAMALAR: row[aciklamalarColIndex],
      'Tüm sütunlar': row
    });
  }
}
