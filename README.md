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
- **📊 Grafiksel analiz**: Pasta grafikleri, treemap görselleştirmeleri
- **📅 Zaman bazlı analiz**: Aylık/yıllık klasör oluşturma trendleri
- **🏥 Departman analizi**: Tıbbi/İdari birimler bazında dağılım
- **⚡ Gerçek zamanlı güncellemeler**: SSE ile canlı veri akışı

### 💾 Yedekleme ve Güvenlik
- **⏰ Otomatik yedekleme**: Günlük/Haftalık/Aylık zamanlanmış yedekler
- **🔄 Manuel yedekleme**: İstek üzerine anında yedek alma
- **📁 Yedek yönetimi**: Eski yedeklerin otomatik temizlenmesi
- **🔒 Veri güvenliği**: Şifrelenmiş SQLite veritabanı
- **📤 Geri yükleme**: Yedekten sistem geri yükleme özelliği

### 🎨 Kullanıcı Deneyimi
- **🌓 Tema desteği**: Açık ve koyu tema geçişleri
- **📱 Responsive tasarım**: Tüm ekran boyutlarına uyumlu arayüz
- **⚡ Hızlı performans**: Lazy loading ve bundle optimizasyonu
- **🔔 Bildirimler**: Toast mesajları ile kullanıcı geri bildirimi
- **🎯 Modern UI**: Tailwind CSS ile tasarlanmış kullanıcı dostu arayüz
- **⌨️ Klavye kısayolları**: Hızlı navigasyon için hotkey desteği

## 🛠️ Teknoloji stack

### Frontend
- **⚛️ React 18** - Modern komponent tabanlı UI framework
- **📘 TypeScript** - Tip güvenli JavaScript geliştirme
- **🎨 Tailwind CSS** - Utility-first CSS framework
- **⚡ Vite** - Hızlı geliştirme ve build aracı
- **🔄 SWR** - Veri fetching ve caching
- **📊 Recharts** - Data visualization kütüphanesi
- **🎭 React Window** - Performanslı liste render

### Backend
- **🟢 Node.js** - JavaScript runtime
- **🚀 Express.js** - Web application framework
- **💾 better-sqlite3** - Embedded SQLite database
- **📁 Multer** - File upload middleware
- **🔄 SSE (Server-Sent Events)** - Real-time event streaming
- **📋 Winston** - Logging framework

### Desktop
- **⚡ Electron** - Cross-platform desktop framework
- **🔧 Electron Builder** - Build ve packaging aracı
- **🔄 Concurrently** - Çoklu process yönetimi

### Test & kalite
- **🧪 Jest** - Unit ve integration test framework
- **🐙 Testing Library** - React component testing
- **📊 Test Coverage** - %56+ kod kapsama oranı
- **🔍 ESLint** - Kod kalitesi kontrolü
- **🛠️ TypeScript** - Tip güvenliği ve kod kalitesi

## 🎯 Kullanım Senaryoları

### 📋 Günlük İşlemler
1. **Klasör Oluşturma**: Yeni hasta dosyası veya administrative belge için klasör açma
2. **PDF Yükleme**: Belgeleri ilgili klasörlere upload etme
3. **Çıkış İşlemi**: Belge veya klasörün geçici çıkışı için kayıt oluşturma
4. **Arama**: Hasta adı, dosya kodu veya konu ile hızlı belge bulma

### 📊 Yönetim ve Analiz
1. **Dashboard İnceleme**: Günlük/aylık klasör durumu analizi
2. **İmha Takibi**: Retention süresi dolan belgeler için imha planlaması
3. **Kapasite Yönetimi**: Depo doluluk oranları ve yer optimizasyonu
4. **Raporlama**: Departman bazlı istatistiksel raporlar

### 🔧 Sistem Yönetimi
1. **Yedekleme**: Manual veya otomatik veri yedekleme
2. **Ayar Yönetimi**: Sistem parametreleri ve kullanıcı tercihleri
3. **Departman Yönetimi**: Yeni birimler ekleme veya mevcut birimleri düzenleme
4. **Depo Konfigürasyonu**: Kompakt dolap ve stand sistemleri düzenleme

### ⚠️ İmha Yönetimi Rehberi

#### Saklama Kodlarının Açılımı
- **A**: Devlet Arşivlerine Gönderilir
- **A1**: Örnek Yıllar Gönderilir
- **A2**: Örnek Seçilenler Gönderilir
- **A3**: Özellikli Olanlar Devlet Arşivlerine Gönderilir
- **B**: Kurumunda Saklanır
- **C**: Ayıklama İmha Komisyonunca Değerlendirilir
- **D**: Devlet Arşivlerine Gönderilmez

#### İmha Takip Özellikleri
1. **Otomatik Hesaplama**: Retention kodu + klasör tarihi = İmha tarihi
2. **Uyarı Sistemi**: İmha tarihinden 30-90 gün önce bildirimler
3. **İmha Listesi**: İmha edilecek belgelerin filtrelenmesi
4. **İmha Kaydı**: İmha edilen belgelerin kalıcı kayıt altına alınması
5. **Raporlama**: İmha istatistikleri ve compliance raporları

## 📁 Proje Yapısı


```
boş-proje-taslağı/
├── backend/
│   ├── arsiv.db
│   ├── arsiv.db-shm
│   ├── arsiv.db-wal
│   ├── backup.js
│   ├── backupScheduler.js
│   ├── constants.js
│   ├── db.js
│   ├── fileHelper.js
│   ├── logger.js
│   ├── routes.js
│   ├── server.js
│   ├── sse.js
│   ├── jest.config.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── PDFs/
│   ├── Backups/
│   ├── tests/
│   │   ├── backup.test.js
│   │   ├── backupScheduler.test.js
│   │   ├── constants.test.js
│   │   ├── db.test.js
│   │   ├── fileHelper.test.js
│   │   ├── logger.test.js
│   │   ├── routes.test.js
│   │   └── sse.test.js
│   └── tmp/
├── frontend/
│   ├── babel.config.cjs
│   ├── index.html
│   ├── jest.config.cjs
│   ├── jest.setup.js
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Badge.tsx
│   │   │   ├── CheckoutModal.tsx
│   │   │   ├── CheckoutModal.test.tsx
│   │   │   ├── DashboardCard.tsx
│   │   │   ├── EnhancedErrorBoundary.tsx
│   │   │   ├── EnhancedErrorBoundary.test.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LocationSelector.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── dashboard/
│   │   │   └── forms/
│   │   ├── constants.ts
│   │   ├── context/
│   │   │   ├── ArchiveContext.tsx
│   │   │   ├── ArchiveProvider.tsx
│   │   │   ├── archiveReducer.ts
│   │   │   └── archiveReducer.test.ts
│   │   ├── hooks/
│   │   │   ├── useArchiveActions.ts
│   │   │   ├── useArchiveActions.test.ts
│   │   │   ├── useArchiveSSE.ts
│   │   │   ├── useArchiveState.ts
│   │   │   ├── useBackendStatus.ts
│   │   │   └── useTheme.ts
│   │   ├── lib/
│   │   │   ├── errorLogger.ts
│   │   │   ├── theme.ts
│   │   │   └── toast.ts
│   │   ├── pages/
│   │   │   ├── CheckoutReturn.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Disposal.tsx
│   │   │   ├── FolderForm.tsx
│   │   │   ├── FolderForm.test.tsx
│   │   │   ├── FolderList.tsx
│   │   │   ├── FolderList.test.tsx
│   │   │   ├── Search.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Settings.test.tsx
│   │   ├── styles/
│   │   ├── types/
│   │   │   └── declarations.d.ts
│   │   ├── index.css
│   │   ├── index.tsx
│   │   └── types.ts
├── assets/
│   └── icon.ico
├── .vscode/
│   ├── settings.json
│   ├── css_custom_data.json
│   ├── extensions.json
│   └── launch.json
├── main.js
├── preload.js
├── package.json
├── jest.config.js
├── metadata.json
├── tsconfig.json
├── README.md
```

## 🚀 Kurulum ve çalıştırma

### Ön gereksinimler
- **Node.js** v18+ 
- **npm** v8+
- **Git** (opsiyonel)
- **Python** (better-sqlite3 için gerekli)
- **Visual Studio Build Tools** (Windows için)

### 1️⃣ Projeyi indirme
```bash
git clone https://github.com/NomedRogue/Arsiv_Yonetim_Sistemi.git
cd Arsiv_Yonetim_Sistemi
```

### 2️⃣ Dependencies kurulumu
```bash
# Ana dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 3️⃣ Geliştirme modunda çalıştırma
```bash
# Tüm uygulamayı çalıştır (Frontend + Electron)
npm run dev

# Sadece frontend geliştirme server'ı
npm run frontend

# Sadece Electron uygulaması
npm run electron
```

### 4️⃣ Build ve packaging
```bash
# Frontend build
npm run build

# Electron uygulaması packaging
npm run package
```

## 🧪 Test ve Kalite

### Test Çalıştırma
```bash
# Tüm testleri çalıştır
npm test

# Backend testleri
npm run test:backend

# Coverage raporu ile
npm test -- --coverage
```

### Test İstatistikleri

- **Toplam Test:** 90+ test ✅
- **Backend Tests:** 40+ test (tamamı geçiyor)
- **Frontend Tests:** 50+ test (kritik smoke/fonksiyonel testler)
- **Test Coverage:** %56+ (hedef %60+)
- **Backend Coverage:** %79+
- **Frontend Coverage:** %50+
- **Kritik komponentler:** %90+ coverage

### Kalite Kontrolleri
```bash
# Dependencies güvenlik kontrolü
npm audit

# Linting (opsiyonel)
npm run lint
```

## 📊 Uygulama Mimarisi

### Database Schema
```sql
-- Klasörler tablosu
folders (
  id TEXT PRIMARY KEY,
  category TEXT,                    -- Tıbbi/İdari
  departmentId INTEGER,             -- Birim ID
  clinic TEXT,                      -- Klinik adı
  unitCode TEXT,                    -- Birim kodu
  fileCode TEXT,                    -- Dosya kodu
  subject TEXT,                     -- Konu
  specialInfo TEXT,                 -- Özel bilgiler
  retentionPeriod INTEGER,          -- Saklama süresi
  retentionCode TEXT,               -- Saklama kodu (A: Devlet Arşivlerine Gönderilir, A1: Örnek Yıllar Gönderilir, A2: Örnek Seçilenler Gönderilir, A3: Özellikli Olanlar Devlet Arşivlerine Gönderilir, B: Kurumunda Saklanır, C: Ayıklama İmha Komisyonunca Değerlendirilir, D: Devlet Arşivlerine Gönderilmez)
  fileYear INTEGER,                 -- Dosya yılı
  fileCount INTEGER,                -- Dosya sayısı
  folderType TEXT,                  -- Dar/Geniş
  pdfPath TEXT,                     -- PDF dosya yolu
  locationStorageType TEXT,         -- Kompakt/Stand
  locationUnit INTEGER,             -- Ünite numarası
  locationFace TEXT,                -- Yüz (A,B,Gizli)
  locationSection INTEGER,          -- Bölüm
  locationShelf INTEGER,            -- Raf
  locationStand INTEGER,            -- Stand
  status TEXT,                      -- Arşivde/Çıkışta/İmha
  createdAt TEXT,                   -- Oluşturma tarihi
  updatedAt TEXT                    -- Güncelleme tarihi
)

-- Çıkış işlemleri tablosu
checkouts (
  id TEXT PRIMARY KEY,
  folderId TEXT,                    -- Klasör ID
  checkoutType TEXT,                -- Tam/Kısmi
  requesterName TEXT,               -- Talep eden
  requesterTitle TEXT,              -- Talep eden unvan
  reason TEXT,                      -- Çıkış sebebi
  checkoutDate TEXT,                -- Çıkış tarihi
  expectedReturnDate TEXT,          -- Beklenen iade tarihi
  actualReturnDate TEXT,            -- Gerçek iade tarihi
  status TEXT,                      -- Çıkışta/İade Edildi
  notes TEXT,                       -- Notlar
  createdAt TEXT,
  updatedAt TEXT
)

-- İmha işlemleri tablosu
disposals (
  id TEXT PRIMARY KEY,
  folderId TEXT,                    -- Klasör ID
  disposalDate TEXT,                -- İmha tarihi
  disposalReason TEXT,              -- İmha sebebi
  approvedBy TEXT,                  -- Onaylayan
  notes TEXT,                       -- Notlar
  createdAt TEXT
)

-- Sistem ayarları
configs (
  key TEXT PRIMARY KEY,             -- Ayar anahtarı
  value TEXT                        -- Ayar değeri (JSON)
)

-- Sistem logları
logs (
  id TEXT PRIMARY KEY,
  action TEXT,                      -- İşlem türü
  details TEXT,                     -- İşlem detayları
  userId TEXT,                      -- Kullanıcı (gelecek özellik)
  timestamp TEXT                    -- Zaman damgası
)
```

### API Endpoints
```
# Klasör İşlemleri
GET    /api/folders                     # Tüm klasörleri listele
POST   /api/folders                     # Yeni klasör oluştur
PUT    /api/folders/:id                 # Klasör güncelle
DELETE /api/folders/:id                 # Klasör sil
GET    /api/folders/:id                 # Klasör detayı
GET    /api/folders-by-location         # Lokasyon bazlı listeleme
GET    /api/all-folders-for-analysis    # Analiz için klasör verileri
GET    /api/folders/disposable          # İmha edilebilir klasörler

# Çıkış İşlemleri
GET    /api/checkouts                   # Çıkış işlemlerini listele
POST   /api/checkouts                   # Yeni çıkış işlemi
PUT    /api/checkouts/:id               # Çıkış işlemi güncelle
GET    /api/checkouts/active            # Aktif çıkışlar

# İmha İşlemleri
GET    /api/disposals                   # İmha işlemlerini listele
POST   /api/disposals                   # İmha işlemi kaydet

# Dashboard ve İstatistikler
GET    /api/dashboard-stats             # Dashboard istatistikleri
GET    /api/all-data                    # Tüm sistem verileri

# Dosya İşlemleri
POST   /api/upload-pdf                  # PDF dosya yükleme
DELETE /api/delete-pdf/:filename        # PDF dosya silme

# Yedekleme İşlemleri
GET    /api/list-backups                # Yedek dosyaları listele
POST   /api/backup                      # Manuel yedek oluştur
POST   /api/restore                     # Yedekten geri yükle
DELETE /api/delete-backup/:filename     # Yedek dosya sil

# Sistem İşlemleri
GET    /api/health                      # Sistem sağlık kontrolü
POST   /api/save-configs                # Ayarları kaydet
GET    /api/events                      # SSE event stream
POST   /api/logs                        # Log kaydı oluştur

# Arama ve Filtreleme
GET    /api/search                      # Klasör arama
GET    /api/filter                      # Filtreleme işlemleri
```

## 🔧 Konfigürasyon

### Environment Variables
```env
NODE_ENV=development|production
DB_PATH=./arsiv.db
BACKUP_PATH=./backups
LOG_LEVEL=info|debug|error
```

### Build Konfigürasyonu
- **Bundle Optimization**: Terser ile minification
- **Code Splitting**: Manual chunks ile optimize bundle
- **Tree Shaking**: Kullanılmayan kod eliminasyonu
- **Source Maps**: Development için detaylı hata ayıklama

## 🔒 Güvenlik

### Güvenlik Önlemleri
- **SQL Injection**: Parameterized queries
- **File Upload**: MIME type kontrolü ve dosya boyutu sınırı
- **Path Traversal**: Dosya yolu doğrulama
- **XSS Protection**: React'in built-in XSS koruması
- **Content Security Policy**: Electron security best practices

### Güvenlik Güncellemeleri
- Tüm dependencies güncel
- Güvenlik açıkları: ✅ 0 critical, 0 high, 0 moderate

## 📈 Performans

### Bundle Optimizasyonları
- **Lazy Loading**: Route-based code splitting ile %82 boyut azaltma
- **React Memoization**: Gereksiz re-render önleme
- **Manual Chunks**: React, Charts, Icons ayrı bundle'lar
- **Tree Shaking**: Kullanılmayan kod eliminasyonu
- **CSS Code Splitting**: Dinamik CSS yükleme
- **Terser Minification**: Production build optimizasyonu

### Runtime Performansı
- **Database Indexing**: Hızlı sorgular için optimize edilmiş index'ler
- **SQLite WAL Mode**: Eşzamanlı okuma/yazma operasyonları
- **File Streaming**: Büyük dosyalar için stream işleme
- **SWR Caching**: Client-side data caching
- **SSE Optimization**: Gerçek zamanlı veri güncellemeleri
- **Memory Management**: Gelişmiş error logging ve breadcrumb tracking

### Bundle Boyutları (Gzipped)
- **Main Bundle**: ~11.7KB (React excluded)
- **React Bundle**: ~44.8KB
- **Charts Bundle**: ~108.7KB (lazy loaded)
- **Dashboard**: ~4.97KB (lazy loaded)
- **Total CSS**: ~7.5KB
- **Icons**: ~3.4KB (lazy loaded)

### Performans Metrikleri
- **First Paint**: <200ms
- **Time to Interactive**: <1s
- **Bundle Load**: <500ms
- **Database Queries**: <50ms average
- **File Operations**: <100ms average

### Bundle Analizi
```bash
npm run build:analyze
```

## 🐛 Sorun Giderme

### Yaygın Sorunlar

**better-sqlite3 modül hatası:**
```bash
npm rebuild better-sqlite3
npx electron-rebuild
```

**Port çakışması:**
```bash
# Port 5173 veya 8080 kullanımda ise
netstat -ano | findstr ":5173"
taskkill /f /pid <PID>
```

**Test hatası:**
```bash
npm run pretest:backend
npm test
```

## 🤝 Katkı Sağlama

### Development Workflow
1. Feature branch oluştur
2. Değişiklikleri yap
3. Testleri çalıştır ve geçir
4. Pull request oluştur

### Kod Standartları
- TypeScript tip tanımları zorunlu
- Jest testleri ile coverage %50+
- ESLint kurallarına uyum
- Commit message konvansiyonları

## 📝 Changelog

### v1.2.0 (Current - Eylül 2025)
- ✅ **Performance**: Bundle boyutu %82 azaldı (lazy loading)
- ✅ **Tests**: Backend testleri %100 geçiyor (60/60)
- ✅ **UI/UX**: Tema uyumluluğu düzeltmeleri (tarih/saat alanları)
- ✅ **Code Quality**: Enhanced error logging sistemi
- ✅ **Optimization**: CSS code splitting ve chunk optimization
- ✅ **Coverage**: Test coverage %56.5'e yükseltildi
- ✅ **Architecture**: Lazy loading implementasyonu

### v1.1.0 (Ağustos 2025)
- ✅ **İmha Takibi**: Retention kodları ve otomatik imha uyarıları
- ✅ **Çıkış Yönetimi**: Tam/Kısmi çıkış türleri ve iade takibi
- ✅ **Dashboard**: Gelişmiş istatistiksel analizler
- ✅ **Lokasyon**: Kompakt dolap ve stand sistemi yönetimi
- ✅ **SSE**: Gerçek zamanlı veri güncellemeleri

### v1.0.0 (Temmuz 2025)
- ✅ İlk stabil sürüm
- ✅ Temel klasör ve PDF yönetimi
- ✅ SQLite veritabanı mimarisi
- ✅ Electron desktop uygulaması
- ✅ Otomatik yedekleme sistemi

## 📜 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakınız.

## 👥 İletişim ve Destek

### Geliştirici
- **Geliştirici**: Bekir YILDIZ
- **E-posta**: bekir.yildiz1@outlook.com
- **Proje Sahibi**: Bekir YILDIZ
- **Lisans**: MIT
- **Node.js Sürümü**: v18+
- **Platform Desteği**: Windows, macOS, Linux

---

**⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!**

*Son güncelleme: 17 Eylül 2025 - v1.2.0 Performance & Quality Update*