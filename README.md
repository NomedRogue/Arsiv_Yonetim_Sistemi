# 📁 Arşiv Yönetim Sistemi Desktop

## 🎯 Proje Hakkında

**Arşiv Yönetim Sistemi Desktop**, modern web teknolojileri kullanılarak geliştirilmiş, güvenli ve kullanıcı dostu bir masaüstü arşiv yönetim uygulamasıdır. Electron framework'ü ile geliştirilmiş bu uygulama, PDF belgelerinin sistematik organizasyonu, kategorilendirmesi ve verimli arama özelliklerini sunar.

## ✨ Özellikler

### 📋 Ana Özellikler
- **📂 Klasör Yönetimi**: Hiyerarşik klasör yapısı ile belge organizasyonu
- **📄 PDF Yönetimi**: PDF belgelerinin upload, görüntüleme ve yönetimi
- **🔍 Gelişmiş Arama**: İçerik bazlı arama ve filtreleme
- **📊 Dashboard**: Sistem durumu ve istatistikleri
- **⚙️ Ayarlar**: Sistem konfigürasyonu ve kişiselleştirme
- **💾 Otomatik Yedekleme**: Zamanlanmış veritabanı yedekleme sistemi
- **🔒 Güvenli Saklama**: SQLite tabanlı güvenli veri saklama

### 🎨 Kullanıcı Deneyimi
- **🌓 Tema Desteği**: Açık ve koyu tema seçenekleri
- **📱 Responsive Tasarım**: Farklı ekran boyutlarına uyum
- **⚡ Hızlı Performans**: Optimize edilmiş bundle ve lazy loading
- **🔔 Bildirimler**: Toast mesajları ile kullanıcı geri bildirimi
- **🎯 Modern UI**: Tailwind CSS ile tasarlanmış modern arayüz

## 🛠️ Teknoloji Stack

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

### Test & Kalite
- **🧪 Jest** - Unit ve integration test framework
- **🐙 Testing Library** - React component testing
- **📊 Test Coverage** - %52+ kod kapsama oranı
- **🔍 ESLint** - Kod kalitesi kontrolü

## 📁 Proje Yapısı

```
arsiv-yonetim-sistemi-desktop/
├── 📁 backend/                    # Backend API servisleri
│   ├── 📁 middleware/             # Express middleware'ları
│   ├── 📁 tests/                  # Backend unit testleri
│   ├── 📄 backup.js               # Yedekleme sistemi
│   ├── 📄 backupScheduler.js      # Otomatik yedekleme zamanlayıcı
│   ├── 📄 constants.js            # Backend sabitler
│   ├── 📄 db.js                   # SQLite veritabanı yönetimi
│   ├── 📄 fileHelper.js           # Dosya işlemleri yardımcıları
│   ├── 📄 logger.js               # Logging sistemi
│   ├── 📄 routes.js               # API route tanımları
│   ├── 📄 server.js               # Express server konfigürasyonu
│   └── 📄 sse.js                  # Server-Sent Events
├── 📁 frontend/                   # React frontend uygulaması
│   ├── 📁 public/                 # Statik dosyalar
│   ├── 📁 src/                    # Kaynak kodlar
│   │   ├── 📁 api/                # API client
│   │   ├── 📁 components/         # React komponentleri
│   │   │   ├── 📁 dashboard/      # Dashboard komponentleri
│   │   │   └── 📁 forms/          # Form komponentleri
│   │   ├── 📁 context/            # React Context API
│   │   ├── 📁 hooks/              # Custom React hooks
│   │   ├── 📁 lib/                # Utility kütüphaneleri
│   │   ├── 📁 pages/              # Sayfa komponentleri
│   │   ├── 📄 App.tsx             # Ana uygulama komponenti
│   │   ├── 📄 constants.ts        # Frontend sabitler
│   │   ├── 📄 index.tsx           # React entry point
│   │   └── 📄 types.ts            # TypeScript tip tanımları
│   ├── 📄 jest.config.js          # Jest test konfigürasyonu
│   ├── 📄 package.json            # Frontend dependencies
│   ├── 📄 tailwind.config.js      # Tailwind CSS konfigürasyonu
│   ├── 📄 tsconfig.json           # TypeScript konfigürasyonu
│   └── 📄 vite.config.ts          # Vite build konfigürasyonu
├── 📁 assets/                     # Uygulama varlıkları
│   └── 📄 icon.ico                # Uygulama ikonu
├── 📁 PDFs/                       # PDF dosya depolama
├── 📄 main.js                     # Electron ana process
├── 📄 preload.js                  # Electron preload script
├── 📄 package.json                # Ana proje dependencies
├── 📄 jest.config.js              # Jest global konfigürasyonu
└── 📄 README.md                   # Proje dokümantasyonu
```

## 🚀 Kurulum ve Çalıştırma

### Ön Gereksinimler
- **Node.js** v18+ 
- **npm** v8+
- **Git** (opsiyonel)

### 1️⃣ Projeyi İndirme
```bash
git clone <repository-url>
cd arsiv-yonetim-sistemi-desktop
```

### 2️⃣ Dependencies Kurulumu
```bash
# Ana dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 3️⃣ Geliştirme Modunda Çalıştırma
```bash
# Tüm uygulamayı çalıştır (Frontend + Electron)
npm run dev

# Sadece frontend geliştirme server'ı
npm run frontend

# Sadece Electron uygulaması
npm run electron
```

### 4️⃣ Build ve Packaging
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
- **Toplam Test:** 98 test ✅
- **Test Coverage:** %52.69
- **Backend Coverage:** %51.84
- **Frontend Coverage:** %72.72

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
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER,
  created_at DATETIME,
  updated_at DATETIME
)

-- Belgeler tablosu  
documents (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  folder_id INTEGER,
  file_size INTEGER,
  created_at DATETIME,
  FOREIGN KEY (folder_id) REFERENCES folders(id)
)
```

### API Endpoints
```
GET    /api/folders              # Klasörleri listele
POST   /api/folders              # Yeni klasör oluştur
PUT    /api/folders/:id          # Klasör güncelle
DELETE /api/folders/:id          # Klasör sil

GET    /api/documents            # Belgeleri listele
POST   /api/documents            # Belge yükle
GET    /api/documents/:id        # Belge detayı
DELETE /api/documents/:id        # Belge sil

GET    /api/search               # Arama yap
GET    /api/stats                # İstatistikler
GET    /api/backup               # Yedekleme işlemleri
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

### Optimizasyonlar
- **Lazy Loading**: Route-based code splitting
- **React Memoization**: Gereksiz re-render önleme
- **Database Indexing**: Hızlı sorgular için index'ler
- **File Streaming**: Büyük dosyalar için stream işleme
- **Caching**: SWR ile client-side caching

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

### v1.0.0 (Current)
- ✅ İlk stabil sürüm
- ✅ Tam özellik seti
- ✅ Kapsamlı test coverage
- ✅ Güvenlik optimizasyonları
- ✅ Performans iyileştirmeleri

## 📜 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakınız.

## 👥 İletişim ve Destek

- **Proje Sahibi**: Arşiv Yönetim Sistemi Team
- **Lisans**: MIT
- **Node.js Sürümü**: v18+
- **Platform Desteği**: Windows, macOS, Linux

---

**⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!**

*Son güncelleme: Eylül 2025*