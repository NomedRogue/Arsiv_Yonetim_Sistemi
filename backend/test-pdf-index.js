const pdfSearchService = require('./pdfSearchService');

async function test() {
  try {
    console.log('=== PDF İndexleme Başlatılıyor ===');
    const result = await pdfSearchService.indexAllPdfs();
    console.log('\n=== Sonuç ===');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n=== Index İstatistikleri ===');
    const stats = pdfSearchService.getIndexStats();
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('\n=== Test Arama ===');
    const searchResults = pdfSearchService.searchPdfs('test');
    console.log('Bulunan:', searchResults.length);
    
    process.exit(0);
  } catch (error) {
    console.error('HATA:', error);
    process.exit(1);
  }
}

test();
