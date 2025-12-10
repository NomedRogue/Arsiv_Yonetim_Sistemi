# KAPSAMLI FULL-STACK MİMARİ DENETİM VE İYİLEŞTİRME PLANI

## 1. EXECUTIVE SUMMARY

**Proje Genel Durumu:** 6/10 (Geliştirilebilir, Kritik İyileştirmeler Gerekli)

Bu denetim, Electron tabanlı Arşiv Yönetim Sistemi'nin mevcut mimari durumunu analiz etmiş ve kritik darboğazları belirlemiştir. Proje fonksiyonel olarak çalışmakla birlikte, özellikle veri yönetimi ve frontend-backend iletişiminde ölçeklenebilirlik sorunları taşımaktadır.

**En Kritik 5 Problem:**
1.  **Frontend Over-fetching (KRİTİK):** Frontend, her yenilemede tüm klasör verisini (`getAllFoldersForAnalysis`) belleğe yüklemekteydi. Bu, veri seti büyüdüğünde uygulamanın çökmesine neden olacaktı. (Çözüldü)
2.  **Veri İşleme Yükü:** Doluluk oranları ve imha edilecek klasörler gibi hesaplamalar, SQL yerine Node.js belleğinde (Service katmanı) yapılıyordu. (Çözüldü)
3.  **API İletişim Tutarsızlığı:** Bileşenler, merkezi API istemcisi (`api/index.ts`) yerine doğrudan `fetch` kullanarak hata yönetimi ve yetkilendirme standartlarını delmektedir.
4.  **Tip Güvenliği:** TypeScript projesi olmasına rağmen 90+ yerde `any` tipi kullanılarak tip güvenliği devre dışı bırakılmıştır.
5.  **Güvenlik (Environment):** `better-sqlite3` gibi native modüllerin derlenmesi ve çalışma ortamı bağımlılıkları CI/CD süreçlerini zorlaştırmaktadır.

**Tahmini Teknik Borç:** 3 Adam/Hafta (Kritik düzeltmeler ve refactoring dahil)

---

## 2. DETAYLI BULGULAR

### 🔴 KRİTİK SORUNLAR (Acil Müdahale - Tamamlandı/Planlandı)

**Sorun 1: Frontend Over-fetching**
*   **Konum:** `frontend/src/hooks/useArchiveState.ts`
*   **Risk:** Büyük veri setlerinde tarayıcı sekmesinin kilitlenmesi (OOM) ve UI donmaları.
*   **Çözüm:** `getAllFoldersForAnalysis` çağrısının global state yüklemesinden kaldırılması.
*   **Durum:** ✅ Düzeltildi. `FolderList` artık verileri sayfalayarak çekiyor, doluluk oranları ise backend'de hesaplanıyor.
*   **Effort:** 4 Saat (Tamamlandı)

**Sorun 2: In-Memory Data Processing**
*   **Konum:** `backend/src/services/FolderService.js` (Eski Hali)
*   **Risk:** Sunucu belleğinin tükenmesi ve yavaş yanıt süreleri.
*   **Çözüm:** `FolderRepository.js` içine `getOccupancyStats` ve `findDisposableFolders` SQL metodlarının eklenmesi.
*   **Durum:** ✅ Düzeltildi. Servis katmanı artık veritabanı aggregasyonunu kullanıyor.
*   **Effort:** 3 Saat (Tamamlandı)

### 🟡 ÖNEMLİ İYİLEŞTİRMELER (Kısa Vade)

**Sorun 3: API İletişim Tutarsızlığı**
*   **Konum:** `frontend/src/features/folders/components/FolderList.tsx`, `useBackendStatus.ts`, `Disposal.tsx`
*   **Risk:** Auth token süresi dolduğunda tutarsız davranışlar, yakalanmayan 401 hataları, kod tekrarı.
*   **Çözüm:** Tüm direkt `fetch` çağrılarının `api/index.ts` üzerinden yapılması.
*   **Durum:** `FolderList.tsx` düzeltildi, diğerleri sırada.
*   **Effort:** 1 Gün

**Sorun 4: Zayıf Tip Güvenliği (`any`)**
*   **Konum:** Genel proje (`grep -r "any" frontend/src/` -> 90+ sonuç)
*   **Risk:** Runtime hatalarının compile time'da yakalanamaması, refactoring zorluğu.
*   **Çözüm:** `Folder`, `Checkout` gibi mevcut interfacelerin daha sıkı uygulanması ve `tsconfig.json`'da `noImplicitAny: true`'ya geçiş.
*   **Effort:** 3 Gün

### 🔵 İYİLEŞTİRME ÖNERİLERİ (Orta-Uzun Vade)

**Sorun 5: Test Kapsamı ve Environment**
*   **Konum:** `backend/tests/`
*   **Sorun:** Native modüller (`better-sqlite3`, `archiver`) test ortamında doğru mocklanmadığı için `npm run test:backend` hata veriyor.
*   **Çözüm:** Dockerize edilmiş test ortamı veya Jest mock yapılandırmasının iyileştirilmesi.
*   **Effort:** 2 Gün

**Sorun 6: Frontend Bundle Size**
*   **Konum:** `frontend/src`
*   **Sorun:** Lazy loading (Code splitting) yeterince kullanılmamış. Tüm feature'lar ana bundle'da olabilir.
*   **Çözüm:** React `lazy` ve `Suspense` kullanarak route bazlı code splitting.
*   **Effort:** 1 Gün

---

## 3. DOSYA BAZINDA ANALİZ

*   **`backend/src/database/repositories/FolderRepository.js`**:
    *   *Durum:* İyi. SQL sorguları optimize edildi (`getDashboardStats`, `getOccupancyStats`).
    *   *Öneri:* Karmaşık sorgular için Query Builder (Knex.js) geçişi değerlendirilebilir.
*   **`backend/src/services/FolderService.js`**:
    *   *Durum:* İyi. Repository katmanını doğru kullanıyor. Validation mantığı burada.
    *   *Öneri:* Validation mantığı ayrı bir `validator` katmanına taşınabilir.
*   **`frontend/src/features/folders/components/FolderList.tsx`**:
    *   *Durum:* Refactor edildi. God Component olmaya meyilli.
    *   *Öneri:* Filtreleme formu (`FolderSearchForm`) ayrı bir bileşene bölünmeli.
*   **`frontend/src/api/index.ts`**:
    *   *Durum:* Kritik. Merkezi nokta ama proje genelinde yeterince kullanılmıyor.

---

## 4. MİMARİ YENİDEN YAPILANDIRMA PLANI

### Sprint 1: Kritik Performans ve Veri Akışı (TAMAMLANDI)
*   [x] **Backend:** `FolderRepository` SQL optimizasyonları (Occupancy, Disposal).
*   [x] **Backend:** `FolderService` bellek kullanımını azaltma.
*   [x] **Frontend:** Global State (`useArchiveState`) üzerinden devasa veri yükünün kaldırılması.
*   [x] **Frontend:** `FolderList` bileşeninin API layer kullanacak şekilde güncellenmesi.

### Sprint 2: Kod Kalitesi ve Standardizasyon (Sırada)
*   [ ] **Frontend:** Diğer bileşenlerdeki (`Disposal`, `Checkout`, `UserManagement`) direkt `fetch` kullanımlarının temizlenmesi.
*   [ ] **Frontend:** `FolderList` içindeki arama formunun (`FolderSearchForm`) component olarak ayrılması.
*   [ ] **Frontend:** `any` tiplerinin temizlenmesi (öncelik: API response tipleri).

### Sprint 3: Test ve DevOps
*   [ ] **Backend:** Test ortamının (Jest) native modül sorunlarını çözecek şekilde yapılandırılması.
*   [ ] **Security:** `JWT_SECRET` ve hassas verilerin `.env` yönetiminin sıkılaştırılması.

### Sprint 4: UI/UX ve Optimizasyon
*   [ ] **Frontend:** Route-based lazy loading implementasyonu.
*   [ ] **Frontend:** Uzun listeler için `react-window` veya `react-virtualized` entegrasyonu (gerçi server-side pagination bunu kısmen çözdü).

---

## 5. DOSYA TAŞIMA PLANI

Mevcut yapı feature-based (`src/features/`) olduğu için genel olarak modern standartlara uygun. Ancak bazı düzeltmeler önerilir:

1.  **Shared Components Ayrımı:**
    *   `src/features/folders/components/FolderList.tsx` içindeki `FolderRow` -> `src/components/FolderRow.tsx` (Eğer başka yerde kullanılacaksa).
    *   `src/features/checkout/CheckoutModal.tsx` -> `src/components/modals/CheckoutModal.tsx`.

2.  **API Services:**
    *   `src/api/index.ts` dosyasının parçalanması:
        *   `src/api/folders.ts`
        *   `src/api/auth.ts`
        *   `src/api/reports.ts`
    *   Bu sayede dosya 500+ satır olmaktan kurtulur.

3.  **Hooks Konsolidasyonu:**
    *   `src/hooks/` altında kullanılmayan veya `grep` ile bulunamayan hookların temizlenmesi (Örn: `usePrevious`, `useWhyDidYouUpdate` eğer kullanılmıyorsa).

---

## 6. RİSK ANALİZİ

*   **Veritabanı Büyümesi (Yüksek Risk):** SQLite dosya tabanlıdır. Veri 1-2 GB'ı geçerse performans düşebilir.
    *   *Mitigation:* Düzenli yedekleme ve PostgreSQL geçiş planı.
*   **Native Modules (Orta Risk):** `better-sqlite3`, Node.js sürüm değişikliklerinde `rebuild` gerektirir.
    *   *Mitigation:* `npm scripts` içinde `rebuild` komutlarının korunması.

---

## 7. QUICK WINS (Düşük Efor, Yüksek Etki)

1.  **[Frontend] Log Temizliği:** Production build'de `console.log`'ların kaldırılması için Vite plugin ayarı ekle (`terser`). (Tahmin: 1 saat)
2.  **[Backend] Security Headers:** `helmet` paketini ekle ve Express app'e uygula. (Tahmin: 30 dk)
3.  **[Code] Unused Imports:** VS Code "Organize Imports" veya ESLint ile kullanılmayan importları temizle. (Tahmin: 2 saat)
4.  **[Frontend] API Refactor (Kısmi):** `api/index.ts` dosyasını feature bazlı 3 dosyaya böl. (Tahmin: 4 saat)

---

## 8. TEKNİK BORÇ ÖLÇÜMÜ

*   **Toplam Tespit Edilen Issue:** ~15
*   **Çözülen Kritik Issue:** 4 (Sprint 1 kapsamında - Performans ve Veri Yönetimi)
*   **Kalan Kritik:** API Standardizasyonu (Kısmen çözüldü)
*   **TOPLAM BORÇ:** 3 Adam/Hafta (Frontend refactoring ağırlıklı)

Bu rapor, projenin mevcut durumunu şeffaf bir şekilde ortaya koymakta ve uygulanan ilk faz iyileştirmelerin (Sprint 1) başarısını belgelemektedir.
