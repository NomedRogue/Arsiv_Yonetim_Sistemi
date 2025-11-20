const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// AppData production PDFs klasöründeki PDF'i test et
const pdfFolder = 'C:\\Users\\bekir_n0411\\AppData\\Roaming\\arsiv-yonetim-sistemi\\PDFs';
const files = fs.readdirSync(pdfFolder).filter(f => f.toLowerCase().endsWith('.pdf'));

console.log(`=== ${files.length} PDF bulundu ===\n`);

async function testPdf(filePath, fileName) {
  console.log(`\n=== Testing: ${fileName} ===`);
  
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text || '';
    
    console.log('\n--- İlk 3000 Karakter ---');
    console.log(text.substring(0, 3000));
    
    console.log('\n--- Hasta Dosya Numaraları (6-7 hane) ---');
    const dosyaNoMatches = text.match(/\b\d{6,7}\b/g);
    console.log(dosyaNoMatches ? dosyaNoMatches.slice(0, 20).join(', ') : 'Bulunamadı');
    
    console.log('\n--- Hasta Adları (Büyük Harf 2-3 kelime) ---');
    const hastaAdiMatches = text.match(/\b[A-ZÇĞİÖŞÜ]{2,}(?:\s+[A-ZÇĞİÖŞÜ]{2,}){1,2}\b/g);
    const filteredNames = hastaAdiMatches ? hastaAdiMatches.filter(name => 
      !name.includes('KLASÖR') && 
      !name.includes('SIRA') && 
      !name.includes('SAYFA') &&
      !name.includes('TARIH') &&
      !name.includes('SAYI') &&
      !name.includes('KONU') &&
      !name.includes('AÇIKLAMA') &&
      name.length > 5
    ) : [];
    console.log(filteredNames.slice(0, 20).join(', '));
    
    console.log('\n--- TABLO SATIRI TESPITI ---');
    // Tabloda her satır: SIRA_NO TABİP DOSYA_NO AÇIKLAMALAR formatında
    // Örnek: "122 EVRAK 26.05.2025 1172685 DIŞ ÇEKİMİ BİLGİLENDİRME VE RIZA FORMU 1 YUSUF ÇELİK"
    const tableLineRegex = /(\d{3,4})\s+(?:EVRAK|TABİP)\s+[\d.]+\s+(\d{6,7})\s+([^\d]+?)\s+\d+\s+([A-ZÇĞİÖŞÜ\s]+?)(?=\n|\d{3,4}\s|$)/g;
    const tableMatches = [...text.matchAll(tableLineRegex)];
    
    console.log('Bulunan tablo satırları:', tableMatches.length);
    if (tableMatches.length > 0) {
      tableMatches.slice(0, 5).forEach(match => {
        console.log(`  Sıra: ${match[1]}, Dosya No: ${match[2]}, Hasta: ${match[4].trim()}`);
      });
    }
    
  } catch (error) {
    console.error('HATA:', error.message);
  }
}

async function main() {
  for (const file of files) {
    await testPdf(path.join(pdfFolder, file), file);
  }
  process.exit(0);
}

main();
