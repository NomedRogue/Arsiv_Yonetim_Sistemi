const Category = {
  Tibbi: 'Tıbbi',
  Idari: 'İdari',
};

const IDARI_BIRIMLER = [
  { name: 'Memur Maaş Mutemetliği' }, { name: 'İşçi Maaş Mutemetliği' },
  { name: 'Gelir Tahakkuk Birimi' }, { name: 'Gider Tahakkuk Birimi' },
  { name: 'Kalite Birimi' }, { name: 'Eğitim Birimi' }, { name: 'Bilgi İşlem' },
  { name: 'Personel Birimi' }, { name: 'Arşiv Birimi' }, { name: 'Biomedikal Birimi' },
  { name: 'Ayniyat Birimi' }, { name: 'Tıbbi Sart Birimi' }, { name: 'Disiplin Birimi' },
  { name: 'Satın Alma Birimi' }, { name: 'İstatistik Birimi' }, { name: 'Temizlik Birimi' },
  { name: 'Protez Birimi' }, { name: 'Hasta Hakları Birimi' }, { name: 'Vezne' },
  { name: 'İş Sağlığı ve Güvenliği Birimi' }
];

const TIBBI_BIRIMLER = [
  { name: 'Evde Sağlık Birimi' }, { name: 'Ameliyathane' },
  { name: 'İlk Müdahale Polikliniği' }, { name: 'Klinikler' }
];

const ALL_DEPARTMENTS = [
  ...IDARI_BIRIMLER.map((birim, index) => ({ id: index + 1, ...birim, category: Category.Idari })),
  ...TIBBI_BIRIMLER.map((birim, index) => ({
    id: IDARI_BIRIMLER.length + index + 1,
    ...birim,
    category: Category.Tibbi
  }))
];

const RETENTION_CODES = [
  { code: 'A', description: 'Sürekli saklanacak' },
  { code: 'B', description: '30 yıl saklanacak' },
  { code: 'C', description: '10 yıl saklanacak' },
  { code: 'D', description: '5 yıl saklanacak' },
  { code: 'E', description: '3 yıl saklanacak' }
];

const DEFAULT_SETTINGS = {
  yedeklemeKlasoru: 'backups',
  pdfKayitKlasoru: 'PDFs',
  backupFrequency: 'Günlük',
  backupTime: '20:00',
  maxBackupCount: 5,
  theme: 'light'
};

const INITIAL_STORAGE_STRUCTURE = {
  kompakt: [
    {
      id: 1,
      enabled: true,
      faces: [
        {
          name: 'A',
          sections: 5
        },
        {
          name: 'B', 
          sections: 5
        }
      ]
    }
  ],
  stand: [
    {
      id: 1,
      shelves: 3
    }
  ]
};

module.exports = { 
  ALL_DEPARTMENTS, 
  RETENTION_CODES, 
  DEFAULT_SETTINGS,
  INITIAL_STORAGE_STRUCTURE,
  Category,
  IDARI_BIRIMLER,
  TIBBI_BIRIMLER
};
