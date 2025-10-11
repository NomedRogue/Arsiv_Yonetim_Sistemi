# 📁 Arşiv Yönetim Sistemi

## 🎯 Proje Hakkında

**Arşiv Yönetim Sistemi**, modern web teknolojileri kullanılarak geliştirilmiş, güvenli ve kullanıcı dostu bir masaüstü arşiv yönetim uygulamasıdır. Electron framework'ü ile geliştirilmiş bu uygulama, PDF belgelerinin sistematik organizasyonu, kategorilendirmesi ve verimli arama özelliklerini sunar.

### 🏥 Mevzuat Uyumluluğu
Bu sistem, **Sağlık Bakanlığı Arşiv Mevzuatı Yataklı ve Yataksız Tedavi Kurumlarında Yapılan Arşiv Malzemesi Tespit ve Değerlendirme Çalışmalarına** uygun olarak tasarlanmıştır. Sağlık kurumlarının arşiv yönetimi gereksinimlerini karşılamak üzere geliştirilmiştir.

## ✨ Özellikler

### 📋 Klasör ve Belge Yönetimi
- **📂 Hiyerarşik klasör yapısı**: Tıbbi ve İdari birimler bazında klasör organizasyonu
- **📄 PDF belge yönetimi**: PDF upload, görüntüleme ve güvenli saklama
- **🔍 Gelişmiş arama**: Klasör adı, dosya kodu, konu ve departman bazlı filtreleme
- **📊 Klasör detayları**: Dosya sayısı, boyutu, oluşturma tarihi gibi meta veriler
- **🏷️ Kategorizasyon**: Dar/Geniş klasör tipleri ve retention kodları

### 📋 Çıkış ve İmha Takibi
- **📤 Çıkış işlemleri**: Tam/Kısmi çıkış türleri ile belge takibi
- **⏰ İade takibi**: Gecikmiş iadeler için otomatik uyarılar
- **🗑️ İmha yönetimi**: Retention süreleri dolmuş belgeler için imha takibi
- **📅 İmha planlama**: Yaklaşan imha tarihleri için önceden bildirimler
- **📊 İmha raporları**: İmha edilen belge istatistikleri ve raporlama

### 🏥 Depo ve Lokasyon Yönetimi
- **🏗️ Kompakt dolap sistemi**: Çok yüzlü kompakt dolap yapılandırması
- **📐 Stand sistemi**: Geleneksel raf sistemleri için destek
- **📍 Lokasyon takibi**: Unit, Yüz, Bölüm, Raf ve Stand bazlı konumlama
- **📊 Doluluk analizi**: Depo kapasitesi ve doluluk oranları
- **🎯 Optimizasyon**: Yer tahsisi ve kapasite optimizasyonu önerileri

### 📊 Dashboard ve Raporlama
- **📈 İstatistiksel dashboard**: Toplam klasör sayısı, birim dağılımları
- **🎨 Arşiv Doluluk Durumu**: Animasyonlu SVG circular progress ile görsel doluluk göstergesi
- **📍 Lokasyon Doluluk Analizi**: Kompakt/Stand bazlı detaylı doluluk haritası
- **📊 Grafiksel analiz**: Pasta grafikleri, treemap görselleştirmeleri
- **📅 Zaman bazlı analiz**: Aylık/yıllık klasör oluşturma trendleri
- **🏥 Departman analizi**: Tıbbi/İdari birimler bazında dağılım
- **⚡ Gerçek zamanlı güncellemeler**: SSE ile canlı veri akışı
- **📋 Son İşlemler**: Sistem loglarının kronolojik listesi

### 💾 Yedekleme ve Güvenlik
- **⏰ Otomatik yedekleme**: Günlük/Haftalık zamanlanmış yedekler
- **🔄 Manuel yedekleme**: İstek üzerine anında yedek alma
- **📁 Yedek yönetimi**: Eski yedeklerin otomatik temizlenmesi (son 5 yedek)
- **🔒 Veri güvenliği**: SQLite veritabanı
- **📤 Geri yükleme**: Yedekten sistem geri yükleme özelliği
- **🔔 SSE Bildirimleri**: Otomatik yedekleme tamamlandığında gerçek zamanlı bildirim

### 🎨 Kullanıcı Deneyimi
- **🌓 Tema desteği**: Açık ve koyu tema geçişleri (tema-aware renk paleti)
- **📱 Responsive tasarım**: Tüm ekran boyutlarına uyumlu arayüz
- **⚡ Hızlı performans**: Lazy loading ve bundle optimizasyonu
- **🔔 Bildirimler**: Toast mesajları ile kullanıcı geri bildirimi
- **🎯 Modern UI**: Tailwind CSS ile tasarlanmış kullanıcı dostu arayüz
- **🖱️ İntuitive Cursor**: Tıklanabilir alanlar için pointer cursor
- **⌨️ Klavye kısayolları**: Hızlı navigasyon için hotkey desteği

## 🛠️ Teknoloji Stack

### Frontend
- **⚛️ React 18** - Modern komponent tabanlı UI framework
- **📘 TypeScript** - Tip güvenli JavaScript geliştirme
- **🎨 Tailwind CSS** - Utility-first CSS framework
- **⚡ Vite** - Hızlı geliştirme ve build aracı
- **📊 Recharts** - Data visualization kütüphanesi
- **🎭 React Window** - Performanslı liste render
- **🔄 Context API** - State management

### Backend
- **🟢 Node.js** - JavaScript runtime
- **🚀 Express.js** - Web application framework
- **💾 better-sqlite3** - Embedded SQLite database
- **📁 Multer** - File upload middleware
- **🔄 SSE (Server-Sent Events)** - Real-time event streaming
- **📋 Winston** - Logging framework
- **🕒 Scheduler** - Otomatik yedekleme zamanlayıcı

### Desktop
- **⚡ Electron 28.2.0** - Cross-platform desktop framework
- **🔧 Electron Builder** - Build ve packaging aracı
- **🔄 Concurrently** - Çoklu process yönetimi
- **🔒 Single Instance Lock** - Tek instance kontrolü

### Test & Kalite
- **🧪 Jest** - Unit ve integration test framework
- **🐙 Testing Library** - React component testing
- **📊 Test Coverage** - %56+ kod kapsama oranı
- **🔍 ESLint** - Kod kalitesi kontrolü
- **🛠️ TypeScript** - Tip güvenliği ve kod kalitesi

## 🚀 Kurulum ve Çalıştırma

### Ön Gereksinimler
- **Node.js** v18+ 
- **npm** v8+
- **Python** 3.x (better-sqlite3 için gerekli)
- **Visual Studio Build Tools** (Windows için)
- **Git** (opsiyonel)

### 1️⃣ Projeyi İndirme
```bash
git clone https://github.com/NomedRogue/Arsiv_Yonetim_Sistemi.git
cd Arsiv_Yonetim_Sistemi
```

### 2️⃣ Dependencies Kurulumu
```bash
# Ana dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..

# better-sqlite3'ü Electron için rebuild et
npm run rebuild
# veya
npx @electron/rebuild --version 28.2.0
```

### 3️⃣ Geliştirme Modunda Çalıştırma
```bash
# Tüm uygulamayı çalıştır (Backend + Frontend + Electron)
npm run dev

# Sadece backend geliştirme server'ı
npm run backend

# Sadece frontend geliştirme server'ı
npm run frontend

# Sadece Electron uygulaması
npm run electron
```

### 4️⃣ Build ve Packaging
```bash
# Frontend build
npm run build

# Electron uygulaması packaging (Windows NSIS installer)
npm run package

# Build çıktısı: release/ klasöründe Setup.exe dosyası
```

### 5️⃣ Production Test
```bash
# Production modunda test (frontend build gerekli)
npm start
```

## 📁 Proje Yapısı

```
Arsiv_Yonetim_Sistemi/
├── 📦 backend/                          # Backend API ve veritabanı
│   ├── 💾 arsiv.db                      # SQLite veritabanı
│   ├── 💾 arsiv.db-shm                  # Shared memory file
│   ├── 💾 arsiv.db-wal                  # Write-ahead log
│   ├── 🔄 backup.js                     # Yedekleme işlemleri
│   ├── ⏰ backupScheduler.js            # Otomatik yedekleme zamanlayıcı
│   ├── 📋 constants.js                  # Backend sabitleri
│   ├── 💾 db.js                         # Veritabanı yöneticisi
│   ├── 📁 fileHelper.js                 # Dosya işlemleri
│   ├── 📋 logger.js                     # Winston logger
│   ├── 🛣️ routes.js                     # API endpoints
│   ├── 🚀 server.js                     # Express server
│   ├── 🔄 sse.js                        # Server-Sent Events
│   ├── 🧪 jest.config.js                # Jest configuration
│   ├── ⚠️ middleware/
│   │   └── errorHandler.js              # Global error handler
│   ├── 📄 PDFs/                         # Yüklenen PDF dosyaları
│   │   └── pdf-*.pdf                    # PDF dosyaları (timestamp-random)
│   ├── 💾 Backups/                      # Otomatik ve manual yedekler
│   │   └── arsiv_*.db                   # Yedek dosyaları (timestamp)
│   ├── 🧪 tests/                        # Backend test dosyaları
│   │   ├── backup.test.js
│   │   ├── backupScheduler.test.js
│   │   ├── constants.test.js
│   │   ├── db.test.js
│   │   ├── fileHelper.test.js
│   │   ├── logger.test.js
│   │   ├── routes.test.js
│   │   └── sse.test.js
│   └── 🗂️ tmp/                          # Geçici dosyalar
│
├── 🎨 frontend/                         # React + TypeScript frontend
│   ├── 📄 index.html                    # Ana HTML dosyası
│   ├── 📦 package.json                  # Frontend dependencies
│   ├── ⚡ vite.config.ts                # Vite configuration
│   ├── 📘 tsconfig.json                 # TypeScript configuration
│   ├── 🎨 tailwind.config.js            # Tailwind CSS config
│   ├── 📝 postcss.config.js             # PostCSS config
│   ├── 🧪 jest.config.cjs               # Jest configuration
│   ├── 🧪 jest.setup.js                 # Jest setup file
│   ├── 🔧 babel.config.cjs              # Babel configuration
│   ├── 📦 dist/                         # Production build çıktısı
│   │   ├── index.html
│   │   └── assets/                      # Compiled assets
│   └── 📂 src/                          # Kaynak kodları
│       ├── 🎯 App.tsx                   # Ana uygulama komponenti
│       ├── 🚀 index.tsx                 # React entry point
│       ├── 🎨 index.css                 # Global CSS
│       ├── 📋 constants.ts              # Frontend sabitleri
│       ├── 📘 types.ts                  # TypeScript type definitions
│       ├── 🔌 api/                      # API istemci fonksiyonları
│       │   └── index.ts                 # Axios API wrapper
│       ├── 🧩 components/               # React komponentleri
│       │   ├── Badge.tsx
│       │   ├── CheckoutModal.tsx
│       │   ├── DashboardCard.tsx
│       │   ├── EnhancedErrorBoundary.tsx
│       │   ├── ErrorBoundary.tsx
│       │   ├── Header.tsx
│       │   ├── LocationSelector.tsx
│       │   ├── Modal.tsx
│       │   ├── Sidebar.tsx
│       │   ├── Toast.tsx
│       │   ├── 📊 dashboard/            # Dashboard komponentleri
│       │   │   ├── DashboardCharts.tsx
│       │   │   ├── LocationAnalysis.tsx
│       │   │   └── RecentActivityList.tsx
│       │   └── 📋 forms/                # Form komponentleri
│       ├── 🔄 context/                  # React Context providers
│       │   ├── ArchiveContext.tsx
│       │   ├── ArchiveProvider.tsx
│       │   └── archiveReducer.ts
│       ├── 🪝 hooks/                    # Custom React hooks
│       │   ├── useArchiveActions.ts
│       │   ├── useArchiveSSE.ts
│       │   ├── useArchiveState.ts
│       │   ├── useBackendStatus.ts
│       │   └── useTheme.ts
│       ├── 📚 lib/                      # Utility functions
│       │   ├── errorLogger.ts
│       │   ├── theme.ts
│       │   └── toast.ts
│       ├── 📄 pages/                    # Sayfa komponentleri
│       │   ├── Dashboard.tsx
│       │   ├── CheckoutReturn.tsx
│       │   ├── Disposal.tsx
│       │   ├── FolderForm.tsx
│       │   ├── FolderList.tsx
│       │   ├── Search.tsx
│       │   └── Settings.tsx
│       ├── 🎨 styles/                   # CSS dosyaları
│       │   ├── liquid-gauge.css
│       │   ├── dashboard-grid.css
│       │   └── *.css
│       └── 📘 types/                    # TypeScript tip tanımları
│           └── declarations.d.ts
│
├── 🖼️ assets/                          # Statik kaynaklar
│   └── icon.ico                         # Uygulama ikonu
│
├── 🔧 .vscode/                         # VS Code ayarları
│   ├── settings.json
│   ├── css_custom_data.json
│   ├── extensions.json
│   └── launch.json
│
├── ⚡ main.js                           # Electron ana process
├── 🔒 preload.js                       # Electron preload script
├── 📦 package.json                      # Root package.json
├── 🧪 jest.config.js                    # Root Jest configuration
├── 📋 metadata.json                     # Uygulama metadata
├── 📘 tsconfig.json                     # Root TypeScript config
├── 📦 extraUninstall.nsh                # NSIS uninstall script
└── 📖 README.md                         # Bu dosya
```

## 📊 Database Schema

### Folders Tablosu
```sql
CREATE TABLE folders (
  id TEXT PRIMARY KEY,              -- UUID
  category TEXT,                    -- Tıbbi/İdari
  departmentId INTEGER,             -- Birim ID
  clinic TEXT,                      -- Klinik adı
  unitCode TEXT,                    -- Birim kodu
  fileCode TEXT,                    -- Dosya kodu
  subject TEXT,                     -- Konu
  specialInfo TEXT,                 -- Özel bilgiler
  retentionPeriod INTEGER,          -- Saklama süresi (yıl)
  retentionCode TEXT,               -- Saklama kodu (A/A1/A2/A3/B/C/D)
  fileYear INTEGER,                 -- Dosya yılı
  fileCount INTEGER,                -- Dosya sayısı
  folderType TEXT,                  -- Dar/Geniş
  pdfPath TEXT,                     -- PDF dosya yolu
  locationStorageType TEXT,         -- Kompakt/Stand
  locationUnit INTEGER,             -- Ünite numarası
  locationFace TEXT,                -- Yüz (A/B/Gizli)
  locationSection INTEGER,          -- Bölüm
  locationShelf INTEGER,            -- Raf
  locationStand INTEGER,            -- Stand
  status TEXT,                      -- Arşivde/Çıkışta/İmha
  createdAt TEXT,                   -- ISO timestamp
  updatedAt TEXT                    -- ISO timestamp
);
```

### Checkouts Tablosu
```sql
CREATE TABLE checkouts (
  id TEXT PRIMARY KEY,              -- UUID
  folderId TEXT,                    -- Foreign key
  checkoutType TEXT,                -- Tam/Kısmi
  requesterName TEXT,               -- Talep eden kişi
  requesterTitle TEXT,              -- Talep eden unvan
  reason TEXT,                      -- Çıkış sebebi
  checkoutDate TEXT,                -- Çıkış tarihi
  expectedReturnDate TEXT,          -- Beklenen iade tarihi
  actualReturnDate TEXT,            -- Gerçek iade tarihi
  status TEXT,                      -- Çıkışta/İade Edildi
  notes TEXT,                       -- Notlar
  createdAt TEXT,
  updatedAt TEXT
);
```

### Disposals Tablosu
```sql
CREATE TABLE disposals (
  id TEXT PRIMARY KEY,              -- UUID
  folderId TEXT,                    -- Foreign key
  disposalDate TEXT,                -- İmha tarihi
  disposalReason TEXT,              -- İmha sebebi
  approvedBy TEXT,                  -- Onaylayan
  notes TEXT,                       -- Notlar
  createdAt TEXT
);
```

### Configs Tablosu
```sql
CREATE TABLE configs (
  key TEXT PRIMARY KEY,             -- Ayar anahtarı
  value TEXT                        -- JSON string
);
```

### Logs Tablosu
```sql
CREATE TABLE logs (
  id TEXT PRIMARY KEY,              -- UUID
  action TEXT,                      -- İşlem türü
  details TEXT,                     -- İşlem detayları
  userId TEXT,                      -- Kullanıcı (gelecek özellik)
  timestamp TEXT                    -- ISO timestamp
);
```

### Saklama Kodları (Retention Codes)

| Kod | Açıklama | İmha Durumu |
|-----|----------|-------------|
| **A** | Devlet Arşivlerine Gönderilir | ❌ İmha Edilemez |
| **A1** | Örnek Yıllar Gönderilir | ❌ İmha Edilemez |
| **A2** | Örnek Seçilenler Gönderilir | ❌ İmha Edilemez |
| **A3** | Özellikli Olanlar Devlet Arşivlerine Gönderilir | ❌ İmha Edilemez |
| **B** | Kurumunda Saklanır | ⏳ Süresiz Saklama |
| **C** | Ayıklama İmha Komisyonunca Değerlendirilir | ✅ Değerlendirme Sonrası |
| **D** | Devlet Arşivlerine Gönderilmez | ✅ Süre Sonunda İmha |

## 🧪 Test ve Kalite

### Test Çalıştırma
```bash
# Tüm testleri çalıştır
npm test

# Backend testleri
npm run test:backend

# Watch modunda test
npm test -- --watch

# Coverage raporu ile
npm test -- --coverage
```

### Test İstatistikleri

#### Backend Tests
- ✅ **backup.test.js** - Yedekleme fonksiyonları (8 test)
- ✅ **backupScheduler.test.js** - Otomatik yedekleme (7 test)
- ✅ **constants.test.js** - Sabitler validasyonu (5 test)
- ✅ **db.test.js** - Veritabanı işlemleri (12 test)
- ✅ **fileHelper.test.js** - Dosya yardımcıları (6 test)
- ✅ **logger.test.js** - Loglama sistemi (4 test)
- ✅ **routes.test.js** - API endpoints (15 test)
- ✅ **sse.test.js** - Server-Sent Events (5 test)

#### Frontend Tests
- ✅ **CheckoutModal.test.tsx** - Modal komponent testleri
- ✅ **EnhancedErrorBoundary.test.tsx** - Error boundary testleri
- ✅ **FolderForm.test.tsx** - Form validasyon testleri
- ✅ **FolderList.test.tsx** - Liste render testleri
- ✅ **Settings.test.tsx** - Ayarlar sayfası testleri
- ✅ **archiveReducer.test.ts** - State reducer testleri
- ✅ **useArchiveActions.test.ts** - Custom hook testleri

#### Coverage Stats
- **Backend Coverage:** %79+ ✅
- **Frontend Coverage:** %50+ ✅
- **Genel Coverage:** %56+ ✅
- **Kritik Komponentler:** %90+ ✅

### Kalite Kontrolleri
```bash
# Dependencies güvenlik kontrolü
npm audit

# Temizlik komutları
npm run clean              # Development dosyalarını temizle
npm run clean:appdata      # AppData dosyalarını temizle
``` 

## 📦 Build ve Deployment

### Windows Build
```bash
# Dependencies kurulumu
npm install
npm run rebuild

# Frontend build
npm run build

# Electron packaging
npm run package
```

### Build Çıktısı
```
release/
├── Setup.exe                    # Windows installer (NSIS)
├── win-unpacked/                # Unpacked application
│   ├── Arşiv Yönetim Sistemi.exe
│   ├── resources/
│   │   └── app.asar             # Packaged application
│   └── ...
└── ...
```

### NSIS Installer Özellikleri
- Kullanıcı bazlı kurulum (perMachine: false)
- Özelleştirilebilir kurulum dizini
- Desktop ve Start Menu kısayolları
- Kaldırma sırasında AppData temizliği
- Kurulum sonrası otomatik başlatma

## 🔒 Güvenlik ve Veri Yönetimi

### Veri Konumu
- **Veritabanı**: `%APPDATA%\arsiv-yonetim-sistemi\arsiv.db`
- **PDF Dosyaları**: `backend/PDFs/`
- **Yedekler**: Kullanıcının seçtiği klasör
- **Loglar**: `%APPDATA%\arsiv-yonetim-sistemi\app-log.txt`

### Yedekleme Stratejisi
1. **Otomatik Yedekleme**: Günlük/Haftalık zamanlanmış
2. **Manual Yedekleme**: İstek üzerine
3. **Yedek Saklama**: Son 5 yedek otomatik korunur
4. **Temizleme**: Eski yedekler otomatik silinir

### Veri Güvenliği
- SQLite veritabanı dosya bazlı güvenlik
- PDF dosyaları unique isimlerle saklanır
- Tek instance kontrolü (aynı anda tek uygulama)
- Transaction-based database operations

## 🔄 Güncelleme ve Bakım

### Dependency Güncellemeleri
```bash
# Outdated paketleri kontrol et
npm outdated

# Güvenlik güncellemeleri
npm audit fix

# Major version updates
npm update
```

### Veritabanı Bakımı
```bash
# Veritabanı vacuum (optimize)
sqlite3 arsiv.db "VACUUM;"

# Veritabanı integrity check
sqlite3 arsiv.db "PRAGMA integrity_check;"
```

## 📚 Kaynaklar ve Referanslar

### Dokümantasyon
- [Electron Documentation](https://www.electronjs.org/docs/latest)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

### Mevzuat
- [Sağlık Bakanlığı Arşiv Mevzuatı](https://www.saglik.gov.tr)
- [Devlet Arşivleri Başkanlığı](https://www.devletarsivleri.gov.tr)

## 👥 Katkıda Bulunma

### Development Workflow
1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

### Kod Standartları
- TypeScript strict mode
- ESLint kurallarına uyum
- Jest testleri yazma
- Anlamlı commit mesajları
- Code review süreci

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 🙏 Teşekkürler

Bu proje aşağıdaki açık kaynak projelerden faydalanmaktadır:
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Express.js](https://expressjs.com/)
- [Recharts](https://recharts.org/)

## 📞 İletişim

- **GitHub**: [NomedRogue/Arsiv_Yonetim_Sistemi](https://github.com/NomedRogue/Arsiv_Yonetim_Sistemi)
- **Issues**: [GitHub Issues](https://github.com/NomedRogue/Arsiv_Yonetim_Sistemi/issues)

---

**Sürüm**: 1.0.0  
**Son Güncelleme**: Ekim 2025  
**Durum**: ✅ Production Ready
