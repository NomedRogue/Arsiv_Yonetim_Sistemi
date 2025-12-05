<p align="center">
  <img src="assets/icon.ico" alt="Arşiv Yönetim Sistemi" width="128" height="128">
</p>

<h1 align="center">📁 Arşiv Yönetim Sistemi</h1>

<p align="center">
  <strong>Sağlık Bakanlığı Arşiv Mevzuatına Uygun Profesyonel Masaüstü Arşiv Yönetim Uygulaması</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/electron-28.3.3-47848F.svg" alt="Electron">
  <img src="https://img.shields.io/badge/react-18.2.0-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/typescript-5.1.6-3178C6.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/tests-90%20passing-brightgreen.svg" alt="Tests">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6.svg" alt="Platform">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933.svg" alt="Node">
</p>

---

## 📋 İçindekiler

- [🎯 Proje Hakkında](#-proje-hakkında)
- [✨ Özellikler](#-özellikler)
- [🛠️ Teknoloji Stack](#️-teknoloji-stack)
- [🚀 Kurulum ve Çalıştırma](#-kurulum-ve-çalıştırma)
- [📁 Proje Yapısı](#-proje-yapısı)
- [📊 Veritabanı Şeması](#-veritabanı-şeması)
- [🔌 API Dokümantasyonu](#-api-dokümantasyonu)
- [🧪 Test](#-test)
- [📦 Build ve Deployment](#-build-ve-deployment)
- [🔒 Güvenlik](#-güvenlik)
- [⚠️ Sorun Giderme](#️-sorun-giderme)
- [🤝 Katkıda Bulunma](#-katkıda-bulunma)
- [📄 Lisans](#-lisans)

---

## 🎯 Proje Hakkında

**Arşiv Yönetim Sistemi**, modern web teknolojileri kullanılarak geliştirilmiş, güvenli ve kullanıcı dostu bir masaüstü arşiv yönetim uygulamasıdır. Electron framework'ü ile geliştirilmiş bu uygulama, PDF ve Excel belgelerinin sistematik organizasyonu, kategorilendirmesi ve verimli arama özelliklerini sunar.

### 🏥 Mevzuat Uyumluluğu

Bu sistem, **Sağlık Bakanlığı Arşiv Mevzuatı - Yataklı ve Yataksız Tedavi Kurumlarında Yapılan Arşiv Malzemesi Tespit ve Değerlendirme Çalışmalarına** tam uyumlu olarak tasarlanmıştır. Sağlık kurumlarının arşiv yönetimi gereksinimlerini karşılamak üzere geliştirilmiştir.

### 🎯 Temel Hedefler

| Hedef | Açıklama |
|-------|----------|
| 📂 **Organizasyon** | Hiyerarşik klasör yapısı ile sistematik arşivleme |
| 🔍 **Erişilebilirlik** | Gelişmiş arama ve filtreleme özellikleri |
| 📤 **Takip** | Çıkış/iade ve imha süreçlerinin yönetimi |
| 💾 **Güvenlik** | Otomatik yedekleme ve veri koruma |
| 📊 **Raporlama** | Kapsamlı istatistik ve PDF rapor araçları |

---

## ✨ Özellikler

### 📂 Klasör ve Belge Yönetimi

- **Hiyerarşik Klasör Yapısı**: Tıbbi ve İdari birimler bazında klasör organizasyonu
  - Tıbbi birimler: Dahiliye, Cerrahi, Pediatri, Kardiyoloji vb.
  - İdari birimler: İnsan Kaynakları, Mali İşler, Satın Alma vb.
- **PDF Belge Yönetimi**: 
  - PDF upload ve güvenli saklama
  - Tarayıcı içi PDF görüntüleme
  - Dosya boyutu ve sayfa bilgisi
- **Excel Belge Yönetimi**:
  - Excel dosyası yükleme (.xlsx, .xls)
  - Excel içerik arama (tüm hücrelerde arama)
  - Eşleşen satırları listeleme
- **Gelişmiş Arama ve Filtreleme**:
  - Klasör adı, dosya kodu, konu bazlı arama
  - Departman, yıl, durum filtreleme
  - Lokasyon bazlı filtreleme (Kompakt/Stand)
- **Klasör Detayları**:
  - Dosya sayısı ve boyutu
  - Oluşturma ve güncelleme tarihleri
  - Lokasyon bilgisi
- **Kategorizasyon**:
  - Dar/Geniş klasör tipleri
  - Retention kodları (A, A1, A2, A3, B, C, D)
  - Saklama süreleri (yıl bazında)

### 📤 Çıkış ve İade Takibi

- **Çıkış İşlemleri**:
  - Tam çıkış: Tüm klasörün çıkışı
  - Kısmi çıkış: Belirli belgelerin çıkışı
- **Talep Bilgileri**:
  - Talep eden kişi adı ve unvanı
  - Çıkış sebebi
  - Beklenen iade tarihi
- **İade Takibi**:
  - Otomatik iade hatırlatmaları
  - Gecikmiş iadeler için kırmızı uyarılar
  - İade tarihi kaydı
- **Çıkış Geçmişi**:
  - Tüm çıkış işlemlerinin kronolojik listesi
  - Filtreleme ve arama

### 🗑️ İmha Yönetimi

- **Retention Süresi Takibi**:
  - Dosya yılı + Saklama süresi = İmha yılı hesaplama
  - Yıl bazında imha edilecek klasör listesi
- **İmha Uyarıları**:
  - İmha süresi geçmiş klasörler (kırmızı)
  - Bu yıl imha edilecek klasörler (turuncu)
  - Gelecek yıllarda imha edilecekler
- **PDF Rapor Oluşturma** (3 farklı rapor):
  1. **İmha Edilecek Klasörler Raporu**: Belirli yıl için imha listesi
  2. **İmha Süresi Geçmiş Klasörler Raporu**: Gecikmiş imhalar
  3. **İmha Edilmiş Klasörler Raporu**: Tamamlanan imhalar
- **Onay Mekanizması**:
  - İmha onayı ve tarih kaydı
  - Onaylayan kişi bilgisi

### 📍 Depo ve Lokasyon Yönetimi

- **Kompakt Dolap Sistemi**:
  - Ünite numarası (1, 2, 3...)
  - Yüz (A/B/Gizli)
  - Bölüm numarası
  - Raf numarası
- **Stand Sistemi**:
  - Stand numarası
  - Raf numarası
- **Kapasite Yönetimi**:
  - Doluluk oranları hesaplama
  - Boş raf tespiti
  - Kapasite optimizasyonu önerileri
- **Lokasyon Takibi**:
  - Her klasörün tam lokasyon bilgisi
  - Lokasyon değişikliği kaydı

### 📊 Dashboard ve Raporlama

- **İstatistiksel Dashboard**:
  - Toplam klasör sayısı
  - Tıbbi/İdari dağılım
  - Çıkıştaki klasör sayısı
  - İmha bekleyen klasör sayısı
- **Arşiv Doluluk Göstergesi**:
  - Animasyonlu SVG circular progress
  - Yüzde bazlı doluluk oranı
  - Renk kodlu gösterim (yeşil/sarı/kırmızı)
- **Lokasyon Doluluk Analizi**:
  - Kompakt/Stand bazlı detaylı doluluk haritası
  - Ünite ve stand bazlı istatistikler
- **Grafiksel Analiz**:
  - Pasta grafikleri (kategori dağılımı)
  - Bar grafikleri (departman bazlı)
  - Treemap görselleştirmeleri
- **Zaman Bazlı Analiz**:
  - Aylık klasör oluşturma trendleri
  - Yıllık istatistikler
- **Son İşlemler**:
  - Sistem loglarının kronolojik listesi
  - İşlem tipi ve detayları
- **Gerçek Zamanlı Güncellemeler**:
  - SSE (Server-Sent Events) ile canlı veri akışı
  - Otomatik dashboard yenileme

### 💾 Yedekleme ve Güvenlik

- **Otomatik Yedekleme**:
  - Günlük veya Haftalık seçeneği
  - Ayarlanabilir yedekleme saati
  - Özelleştirilebilir yedek klasörü
- **Manuel Yedekleme**:
  - İstek üzerine anında yedek alma
  - İndirilebilir .db dosyası
- **Yedek Yönetimi**:
  - Son 5 yedek otomatik korunur
  - Eski yedeklerin otomatik temizlenmesi
  - Yedek listesi görüntüleme
- **Geri Yükleme**:
  - Yedekten sistem geri yükleme
  - Yedek dosyası seçme
- **SSE Bildirimleri**:
  - Otomatik yedekleme tamamlandığında gerçek zamanlı bildirim
  - Yedekleme durumu takibi

### 🎨 Kullanıcı Deneyimi

- **Tema Desteği**:
  - Açık tema (light mode)
  - Koyu tema (dark mode)
  - Sistem temasına uyum
- **Responsive Tasarım**:
  - Tüm ekran boyutlarına uyumlu
  - Esnek layout
- **Performans**:
  - Lazy loading ile hızlı yükleme
  - Bundle optimizasyonu
  - React Window ile performanslı listeler
- **Bildirimler**:
  - Toast mesajları ile kullanıcı geri bildirimi
  - Başarı, hata, uyarı bildirimleri
- **Modern UI**:
  - Tailwind CSS ile tasarım
  - Lucide ikonları
  - Animasyonlar ve geçişler
- **Klavye Kısayolları**:
  - Hızlı navigasyon
  - Form kısayolları

---

## 🛠️ Teknoloji Stack

### Frontend
| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| React | 18.2.0 | Modern komponent tabanlı UI framework |
| TypeScript | 5.1.6 | Tip güvenli JavaScript geliştirme |
| Tailwind CSS | 3.3.2 | Utility-first CSS framework |
| Vite | 7.1.5 | Hızlı geliştirme ve build aracı |
| Recharts | 2.7.3 | Data visualization kütüphanesi |
| React Window | 1.8.8 | Performanslı liste render |
| Lucide React | 0.263.1 | Modern ikon kütüphanesi |
| jsPDF | 3.0.4 | PDF oluşturma |
| SWR | 2.2.0 | Data fetching |

### Backend
| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| Node.js | ≥18.0.0 | JavaScript runtime |
| Express.js | 4.19.2 | Web application framework |
| better-sqlite3 | 11.7.0 | Hızlı SQLite veritabanı |
| Multer | 1.4.5 | Dosya upload middleware |
| Winston | - | Logging framework |
| XLSX | 0.18.5 | Excel dosya işleme |
| UUID | 9.0.0 | Benzersiz ID oluşturma |

### Desktop
| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| Electron | 28.3.3 | Cross-platform desktop framework |
| Electron Builder | 24.13.3 | Build ve packaging aracı |
| Electron Log | 5.1.6 | Electron loglama |
| Concurrently | 8.2.2 | Çoklu process yönetimi |

### Test & Kalite
| Teknoloji | Açıklama |
|-----------|----------|
| Jest | Unit ve integration test framework |
| Testing Library | React component testing |
| Supertest | API endpoint testing |

---

## 🚀 Kurulum ve Çalıştırma

### Ön Gereksinimler

```bash
# Gerekli yazılımlar
Node.js    ≥ 18.0.0
npm        ≥ 8.0.0
Python     3.x (better-sqlite3 native modül için)
Git        (opsiyonel)

# Windows için ek gereksinim
Visual Studio Build Tools (C++ desktop development workload)
```

### 1️⃣ Projeyi İndirme

```bash
git clone https://github.com/NomedRogue/Arsiv_Yonetim_Sistemi.git
cd Arsiv_Yonetim_Sistemi
```

### 2️⃣ Bağımlılıkları Kurma

```bash
# Ana proje bağımlılıkları
npm install

# Frontend bağımlılıkları
cd frontend
npm install
cd ..

# better-sqlite3'ü Electron için rebuild
npm run rebuild
```

### 3️⃣ Geliştirme Modunda Çalıştırma

```bash
# Tüm uygulamayı çalıştır (Backend + Frontend + Electron)
npm run dev
```

| Script | Açıklama |
|--------|----------|
| `npm run dev` | Tüm sistemi başlatır (rebuild dahil) |
| `npm run backend` | Sadece backend server |
| `npm run frontend` | Sadece frontend dev server |
| `npm run electron` | Sadece Electron uygulaması |

### 4️⃣ Production Build

```bash
# Frontend build ve Electron package
npm run package

# Çıktı: release/Arşiv Yönetim Sistemi Setup 1.0.0.exe
```

### 5️⃣ Production Test

```bash
# Production modunda test
npm start
```

---

## 📁 Proje Yapısı

```
Arsiv_Yonetim_Sistemi/
│
├── 📄 main.js                          # Electron ana process
├── 📄 preload.js                       # Electron preload script
├── 📄 package.json                     # Root dependencies
├── 📄 tsconfig.json                    # TypeScript config
├── 📄 jest.config.js                   # Jest config
├── 📄 extraUninstall.nsh               # NSIS uninstall script
├── 📄 metadata.json                    # Uygulama metadata
│
├── 🖼️ assets/
│   └── icon.ico                        # Uygulama ikonu
│
├── ⚙️ backend/
│   ├── 📄 server.js                    # Express server entry
│   ├── 📄 backup.js                    # Yedekleme modülü
│   ├── 📄 backupScheduler.js           # Otomatik yedekleme zamanlayıcı
│   ├── 📄 dbAdapter.js                 # Database adapter
│   ├── 📄 jest.config.js               # Backend Jest config
│   │
│   ├── 📂 src/
│   │   ├── 📄 app.js                   # Express app setup
│   │   │
│   │   ├── 📂 config/
│   │   │   ├── constants.js            # Sabitler (magic numbers)
│   │   │   ├── corsOptions.js          # CORS ayarları
│   │   │   └── database.js             # Veritabanı yapılandırma
│   │   │
│   │   ├── 📂 controllers/
│   │   │   ├── BackupController.js     # Yedekleme işlemleri
│   │   │   ├── CheckoutController.js   # Çıkış/iade işlemleri
│   │   │   ├── ConfigController.js     # Ayar işlemleri
│   │   │   ├── DisposalController.js   # İmha işlemleri
│   │   │   ├── ExcelController.js      # Excel upload/arama
│   │   │   ├── FolderController.js     # Klasör CRUD
│   │   │   ├── LogController.js        # Log işlemleri
│   │   │   ├── PdfController.js        # PDF upload/serve
│   │   │   ├── SearchController.js     # Arama işlemleri
│   │   │   └── StatsController.js      # İstatistik işlemleri
│   │   │
│   │   ├── 📂 database/
│   │   │   ├── connection.js           # DB bağlantısı ve migration
│   │   │   └── 📂 repositories/        # Repository pattern
│   │   │       ├── BaseRepository.js   # Temel repository
│   │   │       ├── FolderRepository.js
│   │   │       ├── CheckoutRepository.js
│   │   │       ├── DisposalRepository.js
│   │   │       ├── ConfigRepository.js
│   │   │       ├── LogRepository.js
│   │   │       └── index.js
│   │   │
│   │   ├── 📂 middleware/
│   │   │   ├── asyncHandler.js         # Async error wrapper
│   │   │   ├── errorHandler.js         # Global error handler
│   │   │   ├── rateLimiter.js          # Rate limiting
│   │   │   └── 📂 validators/          # Request validation
│   │   │
│   │   ├── 📂 routes/
│   │   │   ├── index.js                # Route aggregator
│   │   │   ├── folders.routes.js
│   │   │   ├── checkouts.routes.js
│   │   │   ├── disposals.routes.js
│   │   │   ├── backups.routes.js
│   │   │   ├── config.routes.js
│   │   │   ├── stats.routes.js
│   │   │   ├── logs.routes.js
│   │   │   ├── pdf.routes.js
│   │   │   ├── excel.routes.js
│   │   │   └── search.routes.js
│   │   │
│   │   ├── 📂 services/
│   │   │   ├── BackupService.js        # Yedekleme iş mantığı
│   │   │   ├── CheckoutService.js      # Çıkış/iade iş mantığı
│   │   │   ├── FolderService.js        # Klasör iş mantığı
│   │   │   ├── StatsService.js         # İstatistik hesaplama
│   │   │   └── ExcelSearchService.js   # Excel arama
│   │   │
│   │   └── 📂 utils/
│   │       ├── fileHelper.js           # Dosya işlemleri & path traversal koruması
│   │       ├── logger.js               # Winston logger & sensitive data masking
│   │       └── sse.js                  # Server-Sent Events
│   │
│   ├── 📂 tests/                       # Backend testleri (60 test)
│   │   ├── backup.test.js
│   │   ├── backupScheduler.test.js
│   │   ├── constants.test.js
│   │   ├── db.test.js
│   │   ├── fileHelper.test.js
│   │   ├── logger.test.js
│   │   ├── routes.test.js
│   │   └── sse.test.js
│   │
│   ├── 📁 Backups/                     # Yedek dosyaları (.db)
│   ├── 📁 PDFs/                        # Yüklenen PDF dosyaları
│   ├── 📁 Excels/                      # Yüklenen Excel dosyaları
│   └── 📁 tmp/                         # Geçici dosyalar
│
├── 🎨 frontend/
│   ├── 📄 index.html
│   ├── 📄 package.json
│   ├── 📄 vite.config.ts
│   ├── 📄 tsconfig.json
│   ├── 📄 tailwind.config.js
│   ├── 📄 postcss.config.js
│   ├── 📄 jest.config.cjs
│   ├── 📄 jest.setup.js
│   ├── 📄 babel.config.cjs
│   │
│   └── 📂 src/
│       ├── 📄 App.tsx                  # Ana uygulama & routing
│       ├── 📄 index.tsx                # React entry point
│       ├── 📄 index.css                # Global CSS & Tailwind
│       ├── 📄 constants.ts             # Frontend sabitleri
│       ├── 📄 types.ts                 # TypeScript type definitions
│       │
│       ├── 📂 api/
│       │   └── index.ts                # API istemci (fetch wrapper)
│       │
│       ├── 📂 components/              # Paylaşılan komponentler
│       │   ├── Header.tsx              # Üst menü
│       │   ├── Sidebar.tsx             # Sol navigasyon
│       │   ├── Modal.tsx               # Modal wrapper
│       │   ├── Toast.tsx               # Bildirim komponenti
│       │   ├── Badge.tsx               # Durum badge'leri
│       │   ├── ErrorBoundary.tsx       # Hata yakalama
│       │   ├── EnhancedErrorBoundary.tsx
│       │   └── 📂 forms/               # Form komponentleri
│       │
│       ├── 📂 context/                 # React Context (State Management)
│       │   ├── ArchiveContext.tsx      # Ana context
│       │   ├── ArchiveProvider.tsx     # Provider wrapper
│       │   ├── archiveReducer.ts       # State reducer
│       │   └── ThemeContext.tsx        # Tema context
│       │
│       ├── 📂 features/                # Feature-based modüller
│       │   │
│       │   ├── 📂 dashboard/           # Dashboard & İstatistikler
│       │   │   ├── Dashboard.tsx
│       │   │   ├── 📂 components/
│       │   │   │   ├── DashboardCharts.tsx
│       │   │   │   ├── LocationAnalysis.tsx
│       │   │   │   └── RecentActivityList.tsx
│       │   │   ├── 📂 hooks/
│       │   │   ├── 📂 types/
│       │   │   ├── 📂 utils/
│       │   │   └── index.ts
│       │   │
│       │   ├── 📂 folders/             # Klasör Yönetimi
│       │   │   ├── 📂 components/
│       │   │   │   ├── FolderForm.tsx
│       │   │   │   ├── FolderList.tsx
│       │   │   │   └── LocationSelector.tsx
│       │   │   ├── 📂 hooks/
│       │   │   │   └── useFolderActions.ts
│       │   │   ├── 📂 types/
│       │   │   ├── 📂 utils/
│       │   │   │   └── folderHelpers.ts
│       │   │   ├── 📂 __tests__/
│       │   │   └── index.ts
│       │   │
│       │   ├── 📂 checkout/            # Çıkış/İade İşlemleri
│       │   │   ├── CheckoutReturn.tsx
│       │   │   ├── 📂 components/
│       │   │   │   └── CheckoutModal.tsx
│       │   │   ├── 📂 hooks/
│       │   │   ├── 📂 types/
│       │   │   ├── 📂 utils/
│       │   │   └── index.ts
│       │   │
│       │   ├── 📂 disposal/            # İmha Yönetimi
│       │   │   ├── Disposal.tsx
│       │   │   ├── 📂 components/
│       │   │   ├── 📂 hooks/
│       │   │   ├── 📂 types/
│       │   │   ├── 📂 utils/
│       │   │   ├── 📂 __tests__/
│       │   │   └── index.ts
│       │   │
│       │   ├── 📂 excel-search/        # Excel Arama
│       │   │   ├── ExcelSearch.tsx
│       │   │   ├── 📂 components/
│       │   │   ├── 📂 hooks/
│       │   │   ├── 📂 types/
│       │   │   ├── 📂 utils/
│       │   │   ├── 📂 __tests__/
│       │   │   └── index.ts
│       │   │
│       │   ├── 📂 settings/            # Ayarlar
│       │   │   ├── Settings.tsx
│       │   │   ├── 📂 components/
│       │   │   │   ├── SettingInput.tsx
│       │   │   │   ├── FilePathInput.tsx
│       │   │   │   └── AccordionSection.tsx
│       │   │   ├── 📂 hooks/
│       │   │   │   ├── useBackupManagement.ts
│       │   │   │   ├── useDepartmentManagement.ts
│       │   │   │   └── useStorageManagement.ts
│       │   │   ├── 📂 types/
│       │   │   ├── 📂 utils/
│       │   │   ├── 📂 __tests__/
│       │   │   └── index.ts
│       │   │
│       │   └── 📂 reports/             # PDF Raporlar
│       │       ├── Reports.tsx         # 3 farklı PDF rapor
│       │       └── index.ts
│       │
│       ├── 📂 hooks/                   # Paylaşılan Custom Hooks
│       │   ├── useArchiveActions.ts    # CRUD işlemleri
│       │   ├── useArchiveSSE.ts        # SSE bağlantısı
│       │   ├── useArchiveState.ts      # State erişimi
│       │   ├── useBackendStatus.ts     # Backend durum kontrolü
│       │   └── useTheme.ts             # Tema yönetimi
│       │
│       ├── 📂 lib/                     # Utility Fonksiyonlar
│       │   ├── apiErrorHandler.ts      # API hata yönetimi
│       │   ├── errorLogger.ts          # Hata loglama
│       │   ├── fileUtils.ts            # Dosya yardımcıları
│       │   ├── theme.ts                # Tema helpers
│       │   └── toast.ts                # Toast yönetimi
│       │
│       ├── 📂 styles/                  # Ek CSS dosyaları
│       ├── 📂 types/                   # TypeScript declarations
│       └── 📂 __tests__/               # Frontend testleri (30 test)
│
└── 📁 release/                         # Build çıktısı
    ├── Arşiv Yönetim Sistemi Setup 1.0.0.exe
    ├── latest.yml
    └── win-unpacked/
```

---

## 📊 Veritabanı Şeması

### Tablolar

#### folders
```sql
CREATE TABLE folders (
    id TEXT PRIMARY KEY,                    -- UUID
    category TEXT,                          -- Tıbbi/İdari
    departmentId INTEGER,                   -- Birim ID
    clinic TEXT,                            -- Klinik adı
    unitCode TEXT,                          -- Birim kodu
    fileCode TEXT,                          -- Dosya kodu
    subject TEXT,                           -- Konu
    specialInfo TEXT,                       -- Özel bilgiler
    retentionPeriod INTEGER,                -- Saklama süresi (yıl)
    retentionCode TEXT,                     -- Saklama kodu
    fileYear INTEGER,                       -- Dosya yılı
    fileCount INTEGER,                      -- Dosya sayısı
    folderType TEXT,                        -- Dar/Geniş
    pdfPath TEXT,                           -- PDF dosya yolu
    excelPath TEXT,                         -- Excel dosya yolu
    locationStorageType TEXT,               -- Kompakt/Stand
    locationUnit INTEGER,                   -- Ünite
    locationFace TEXT,                      -- Yüz (A/B/Gizli)
    locationSection INTEGER,                -- Bölüm
    locationShelf INTEGER,                  -- Raf
    locationStand INTEGER,                  -- Stand
    status TEXT DEFAULT 'Arşivde',          -- Durum
    createdAt TEXT,                         -- Oluşturma tarihi
    updatedAt TEXT                          -- Güncelleme tarihi
);
```

#### checkouts
```sql
CREATE TABLE checkouts (
    id TEXT PRIMARY KEY,
    folderId TEXT REFERENCES folders(id),
    checkoutType TEXT,                      -- Tam/Kısmi
    requesterName TEXT,
    requesterTitle TEXT,
    reason TEXT,
    checkoutDate TEXT,
    expectedReturnDate TEXT,
    actualReturnDate TEXT,
    status TEXT,                            -- Çıkışta/İade Edildi
    notes TEXT,
    createdAt TEXT,
    updatedAt TEXT
);
```

#### disposals
```sql
CREATE TABLE disposals (
    id TEXT PRIMARY KEY,
    folderId TEXT REFERENCES folders(id),
    disposalDate TEXT,
    disposalReason TEXT,
    approvedBy TEXT,
    notes TEXT,
    createdAt TEXT
);
```

#### configs
```sql
CREATE TABLE configs (
    key TEXT PRIMARY KEY,
    value TEXT                              -- JSON string
);
```

#### logs
```sql
CREATE TABLE logs (
    id TEXT PRIMARY KEY,
    action TEXT,
    details TEXT,
    userId TEXT,
    timestamp TEXT
);
```

### 🏷️ Saklama Kodları (Retention Codes)

| Kod | Açıklama | İmha Durumu |
|:---:|----------|:-----------:|
| **A** | Devlet Arşivlerine Gönderilir | ❌ İmha Edilemez |
| **A1** | Örnek Yıllar Devlet Arşivlerine Gönderilir | ❌ İmha Edilemez |
| **A2** | Örnek Seçilenler Devlet Arşivlerine Gönderilir | ❌ İmha Edilemez |
| **A3** | Özellikli Olanlar Devlet Arşivlerine Gönderilir | ❌ İmha Edilemez |
| **B** | Kurumunda Saklanır | ⏳ Süresiz Saklama |
| **C** | Ayıklama İmha Komisyonunca Değerlendirilir | ⚠️ Değerlendirme Sonrası |
| **D** | Devlet Arşivlerine Gönderilmez | ✅ Süre Sonunda İmha |

---

## 🔌 API Dokümantasyonu

**Base URL:** `http://localhost:3001/api`

### Folders API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/folders` | Tüm klasörleri listele (pagination, filter) |
| `GET` | `/folders/:id` | Klasör detayı |
| `POST` | `/folders` | Yeni klasör oluştur |
| `PUT` | `/folders/:id` | Klasör güncelle |
| `DELETE` | `/folders/:id` | Klasör sil |

### Checkouts API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/checkouts` | Tüm çıkışları listele |
| `GET` | `/checkouts/active` | Aktif çıkışlar |
| `POST` | `/checkouts` | Yeni çıkış oluştur |
| `PUT` | `/checkouts/:id/return` | İade işlemi |

### Disposals API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/disposals` | İmha listesi |
| `GET` | `/disposals/pending` | Bekleyen imhalar |
| `GET` | `/disposals/by-year` | Yıl bazlı imha verileri |
| `POST` | `/disposals` | İmha kaydı oluştur |

### Backups API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/backups` | Yedek listesi |
| `POST` | `/backups` | Manuel yedek al |
| `POST` | `/backups/restore` | Yedekten geri yükle |
| `DELETE` | `/backups/:filename` | Yedek sil |

### Stats API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/stats` | Genel istatistikler |
| `GET` | `/stats/location-analysis` | Lokasyon doluluk analizi |
| `GET` | `/stats/department-distribution` | Departman dağılımı |

### PDF API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/pdf/upload` | PDF yükle |
| `GET` | `/pdf/:filename` | PDF görüntüle |
| `DELETE` | `/pdf/:filename` | PDF sil |

### Excel API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/excel/upload` | Excel yükle |
| `GET` | `/excel/search` | Excel içerik ara |
| `GET` | `/excel/:filename` | Excel indir |
| `DELETE` | `/excel/:filename` | Excel sil |

### SSE (Server-Sent Events)

```javascript
// Bağlantı
const eventSource = new EventSource('http://localhost:3001/api/events');

// Event türleri
eventSource.addEventListener('folder-created', (e) => { /* ... */ });
eventSource.addEventListener('folder-updated', (e) => { /* ... */ });
eventSource.addEventListener('folder-deleted', (e) => { /* ... */ });
eventSource.addEventListener('checkout-created', (e) => { /* ... */ });
eventSource.addEventListener('checkout-returned', (e) => { /* ... */ });
eventSource.addEventListener('disposal-created', (e) => { /* ... */ });
eventSource.addEventListener('backup-completed', (e) => { /* ... */ });
eventSource.addEventListener('stats-updated', (e) => { /* ... */ });
```

---

## 🧪 Test

### Test Çalıştırma

```bash
# Tüm testler
npm test

# Backend testleri
npm run test:backend

# Frontend testleri
cd frontend && npm test

# Watch modunda
npm test -- --watch

# Coverage raporu
npm test -- --coverage
```

### Test İstatistikleri

| Kategori | Test Sayısı | Durum |
|----------|:-----------:|:-----:|
| Backend | 60 | ✅ |
| Frontend | 30 | ✅ |
| **Toplam** | **90** | **✅** |

### Backend Test Dosyaları

| Dosya | Test Sayısı | Açıklama |
|-------|:-----------:|----------|
| backup.test.js | 8 | Yedekleme fonksiyonları |
| backupScheduler.test.js | 7 | Otomatik yedekleme |
| constants.test.js | 5 | Sabit değerler |
| db.test.js | 12 | Veritabanı işlemleri |
| fileHelper.test.js | 6 | Dosya yardımcıları |
| logger.test.js | 4 | Loglama sistemi |
| routes.test.js | 15 | API endpoints |
| sse.test.js | 5 | Server-Sent Events |

---

## 📦 Build ve Deployment

### Windows Build

```bash
# 1. Bağımlılıkları kur
npm install
npm run rebuild

# 2. Full build ve package
npm run package

# Çıktı: release/Arşiv Yönetim Sistemi Setup 1.0.0.exe
```

### Build Çıktısı

```
release/
├── Arşiv Yönetim Sistemi Setup 1.0.0.exe    # Windows NSIS installer
├── Arşiv Yönetim Sistemi Setup 1.0.0.exe.blockmap
├── latest.yml                                # Auto-update manifest
├── builder-debug.yml
├── builder-effective-config.yaml
└── win-unpacked/                             # Portable versiyon
    ├── Arşiv Yönetim Sistemi.exe
    ├── resources/
    └── ...
```

### NSIS Installer Özellikleri

- ✅ Kullanıcı bazlı kurulum (perMachine: false)
- ✅ Özelleştirilebilir kurulum dizini
- ✅ Desktop ve Start Menu kısayolları
- ✅ Kaldırma sırasında AppData temizliği
- ✅ Kurulum sonrası otomatik başlatma

---

## 🔒 Güvenlik

### Uygulanan Güvenlik Önlemleri

| Özellik | Açıklama |
|---------|----------|
| 🚫 Path Traversal Koruması | Dosya yolları validate edilir, `..` engellenir |
| ⏱️ Rate Limiting | API istekleri sınırlandırılır (100 req/15 min) |
| 🔄 Transaction Wrapper | Veritabanı işlemleri atomic olarak çalışır |
| 💾 Disk Space Check | Yedekleme öncesi disk alanı kontrolü |
| 🔐 Sensitive Data Masking | Log dosyalarında hassas veri maskelenir |
| 🛑 Graceful Shutdown | Düzgün kapatma mekanizması (10s timeout) |
| ⏰ Database Busy Timeout | SQLite busy handling (5000ms) |
| 🎯 Async Error Handler | Tüm async hatalar yakalanır |
| 📝 Winston Logger | Yapılandırılmış loglama |

### 📍 Veri Konumları

| Veri | Geliştirme Modu | Production Modu |
|------|-----------------|-----------------|
| **Veritabanı** | `backend/arsiv.db` | `%APPDATA%\arsiv-yonetim-sistemi\arsiv.db` |
| **PDF Dosyaları** | `backend/PDFs/` | `backend/PDFs/` |
| **Excel Dosyaları** | `backend/Excels/` | `backend/Excels/` |
| **Yedekler** | `backend/Backups/` veya özel klasör | Kullanıcının seçtiği klasör |
| **Loglar** | Konsol | `%APPDATA%\arsiv-yonetim-sistemi\` |

### Yedekleme Stratejisi

1. **Otomatik Yedekleme**: Günlük/Haftalık zamanlanmış (varsayılan 03:00)
2. **Manuel Yedekleme**: İstek üzerine anında
3. **Yedek Rotasyonu**: Son 5 yedek otomatik korunur
4. **Doğrulama**: Yedekleme bütünlük kontrolü

---

## ⚠️ Sorun Giderme

### 🔴 "Backend Hatası - better-sqlite3 module version mismatch"

**Hata Mesajı:**
```
The module was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version of Node.js requires
NODE_MODULE_VERSION 119.
```

**Çözüm:**
```bash
# better-sqlite3'ü yeniden derle
npm run rebuild

# veya manuel olarak
npm rebuild better-sqlite3 --build-from-source
```

### 🔴 "EBUSY: resource busy or locked"

**Sebep:** Veritabanı dosyası başka bir process tarafından kullanılıyor.

**Çözüm:**
```bash
# Tüm Node ve Electron processlerini kapat
Stop-Process -Name "node","electron" -Force -ErrorAction SilentlyContinue

# Tekrar başlat
npm run dev
```

### 🔴 "npm run package" başarısız oluyor

**Çözüm:**
```bash
# 1. Çalışan uygulamaları kapat
Stop-Process -Name "node","electron","Arşiv Yönetim Sistemi" -Force -ErrorAction SilentlyContinue

# 2. Temizlik yap
npm run clean

# 3. Release klasörünü manuel sil
Remove-Item -Recurse -Force release -ErrorAction SilentlyContinue

# 4. Tekrar dene
npm run package
```

### 🔴 Python veya Build Tools hatası

**Hata Mesajı:**
```
gyp ERR! find Python
gyp ERR! find VS
```

**Çözüm:**
```bash
# 1. Python 3.x yükle
# https://www.python.org/downloads/

# 2. Visual Studio Build Tools yükle
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
# "C++ ile masaüstü geliştirme" workload'ını seç

# 3. npm cache temizle ve tekrar kur
npm cache clean --force
npm install
npm run rebuild
```

### 🔴 Port 3001 kullanımda

**Çözüm:**
```bash
# Windows'ta portu kullanan process'i bul ve kapat
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### 🔴 Electron penceresi açılmıyor

**Çözüm:**
1. Backend'in başladığından emin ol (http://localhost:3001/api/health)
2. Frontend'in başladığından emin ol (http://localhost:5173)
3. Tüm processleri kapatıp `npm run dev` ile yeniden başlat

### 🔴 PDF/Excel yüklenemiyor

**Olası Sebepler:**
- Dosya boyutu çok büyük (max 50MB)
- Dosya formatı desteklenmiyor
- backend/PDFs veya backend/Excels klasörü yok

**Çözüm:**
```bash
# Klasörleri oluştur
mkdir backend\PDFs
mkdir backend\Excels
```

### 🔴 Otomatik yedekleme çalışmıyor

**Kontrol Et:**
1. Ayarlar → Yedekleme → Otomatik Yedekleme aktif mi?
2. Yedekleme klasörü seçilmiş mi?
3. Seçilen klasöre yazma izni var mı?

---

## 🤝 Katkıda Bulunma

### Development Workflow

```bash
# 1. Fork yapın
# 2. Feature branch oluşturun
git checkout -b feature/amazing-feature

# 3. Değişikliklerinizi commit edin
git commit -m 'feat: Add amazing feature'

# 4. Branch'inizi push edin
git push origin feature/amazing-feature

# 5. Pull Request açın
```

### Commit Mesaj Formatı

```
<type>(<scope>): <description>

# Tipler:
feat     - Yeni özellik
fix      - Bug düzeltme
docs     - Dokümantasyon
style    - Kod stili (formatting)
refactor - Refactoring
test     - Test ekleme
chore    - Bakım işleri

# Örnekler:
feat(folders): add bulk delete functionality
fix(backup): resolve scheduler timing issue
docs(readme): update installation guide
```

### Kod Standartları

- ✅ TypeScript strict mode
- ✅ ESLint kurallarına uyum
- ✅ Her yeni özellik için test yazma
- ✅ Anlamlı değişken ve fonksiyon isimleri
- ✅ Türkçe yorum satırları

---

## 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır.

```
MIT License

Copyright (c) 2025 NomedRogue

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🙏 Teşekkürler

Bu proje aşağıdaki açık kaynak projelerden faydalanmaktadır:

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Express.js](https://expressjs.com/)
- [Recharts](https://recharts.org/)
- [jsPDF](https://github.com/parallax/jsPDF)

---

## 📞 İletişim

- **GitHub**: [NomedRogue/Arsiv_Yonetim_Sistemi](https://github.com/NomedRogue/Arsiv_Yonetim_Sistemi)
- **Issues**: [GitHub Issues](https://github.com/NomedRogue/Arsiv_Yonetim_Sistemi/issues)

---

<p align="center">
  <strong>Sürüm:</strong> 1.0.0 &nbsp;|&nbsp;
  <strong>Son Güncelleme:</strong> Aralık 2025 &nbsp;|&nbsp;
  <strong>Durum:</strong> ✅ Production Ready
</p>

<p align="center">
  <strong>Mimari:</strong> ✨ Feature-Based Architecture (Modern & Scalable)
</p>

<p align="center">
  Made with ❤️ in Turkey
</p>
