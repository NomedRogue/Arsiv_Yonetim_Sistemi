const excelSearchService = require('./excelSearchService');

async function main() {
  try {
    console.log('Excel indexleme başlıyor...');
    const result = await excelSearchService.indexAllExcels();
    console.log('Başarılı:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

main();
