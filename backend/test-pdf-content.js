const pdf = require('pdf-parse');
const fs = require('fs');

const testPath = 'C:\\Users\\bekir_n0411\\Desktop\\Arsiv_Yonetim_Sistemi\\backend\\PDFs\\pdf-1763395379230-365914999.pdf';

async function test() {
  const dataBuffer = fs.readFileSync(testPath);
  const data = await pdf(dataBuffer);
  
  console.log('=== PDF İçeriği (İlk 2000 karakter) ===');
  console.log(data.text.substring(0, 2000));
  
  console.log('\n\n=== Hasta Dosya Numaraları (6-7 hane) ===');
  const dosyaNoMatches = data.text.match(/\b\d{6,7}\b/g);
  console.log(dosyaNoMatches ? dosyaNoMatches.slice(0, 10) : 'Bulunamadı');
  
  console.log('\n\n=== Hasta Adları (Büyük Harf) ===');
  const hastaAdiMatches = data.text.match(/\b[A-ZÇĞİÖŞÜ]{2,}(?:\s+[A-ZÇĞİÖŞÜ]{2,}){1,2}\b/g);
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
  console.log(filteredNames.slice(0, 10));
  
  process.exit(0);
}

test().catch(console.error);
