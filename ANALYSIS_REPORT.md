# Arşiv Yönetim Sistemi - Teknik Denetim ve İyileştirme Raporu

**Tarih:** 25 Ekim 2025
**Kapsam:** Backend, Frontend, Electron Yapısı, Veritabanı ve Güvenlik
**Durum:** Detaylı Analiz Tamamlandı

---

## 1. Yönetici Özeti

Proje, modern ve modüler bir mimari (Feature-based structure) üzerine kurulmuş, React, Electron ve Express teknolojilerini kullanan hibrit bir masaüstü uygulamasıdır. Kod kalitesi genel olarak yüksektir ancak **Türkçe karakter arama sorunları (Collation)** ve **büyük veri setlerinde performans darboğazları** gibi kritik riskler barındırmaktadır. Güvenlik tarafında Electron best-practice'lerine büyük ölçüde uyulmuştur.

---

## 2. Detaylı Analiz Bulguları

### 🚩 Kategori 1: Kritik Sorunlar (Acil Düzeltme Gerektirir)

1.  **SQLite Türkçe Karakter Desteği (Collation) Eksikliği**
    *   **Konum:** `backend/src/database/connection.js`, `FolderRepository.js`
    *   **Sorun:** SQLite varsayılan olarak `LIKE` sorgularında sadece ASCII karakterler için case-insensitive (büyük/küçük harf duyarsız) çalışır.
    *   **Risk:** Kullanıcı "istanbul" yazdığında "İSTANBUL" veya "İstanbul" kayıtlarını bulamayacaktır. Bu, bir arşiv sistemi için kabul edilemez bir veri erişim sorunudur.
    *   **Çözüm:** `better-sqlite3` ile veritabanı bağlantısı kurulurken özel bir Türkçe collation veya `lower` fonksiyonu tanımlanmalıdır.

2.  **Dashboard Performans Darboğazı (Memory Leak Riski)**
    *   **Konum:** `FolderRepository.js` -> `getAllForAnalysis()`
    *   **Sorun:** Dashboard istatistikleri için `folders` tablosundaki *tüm* kayıtlar (`status != 'İmha Edildi'`) belleğe çekilmektedir.
    *   **Risk:** Kayıt sayısı 50.000-100.000'e ulaştığında bu sorgu Node.js heap belleğini doldurabilir ve uygulamayı kitleyebilir (OOM Crash).
    *   **Çözüm:** İstatistik hesaplamaları veritabanı seviyesinde `COUNT`, `GROUP BY` sorguları ile yapılmalı, ham veri asla backend'den frontend'e toplu taşınmamalıdır.

3.  **Excel Arama Mantığı (Scalability Issue)**
    *   **Konum:** `SearchController.js` -> `searchInExcel`
    *   **Sorun:** Arama yaparken önce tüm klasörler belleğe çekilmekte (`repos.folder.getAll()`), ardından JavaScript tarafında `find` ile eşleştirme yapılmaktadır.
    *   **Risk:** Veri seti büyüdükçe arama süresi lineer değil, katlanarak artacaktır.
    *   **Çözüm:** İlişkisel veriler veritabanında join edilerek veya filtrelenerek sorgulanmalıdır.

### ⚠️ Kategori 2: Önemli İyileştirmeler (Kısa Vade)

1.  **Native Modül Yönetimi (better-sqlite3)**
    *   **Tespit:** `package.json` içinde `rebuild` scriptleri mevcut, bu iyi bir önlem. Ancak production ortamında Node.js sürümü ile Electron'un kullandığı V8 sürümü uyumsuzluğu sık yaşanır.
    *   **Öneri:** CI/CD pipeline'ına veya `postinstall` sürecine `electron-rebuild` tam entegrasyonu sağlanmalı.

2.  **Veritabanı Migrasyon Yönetimi**
    *   **Tespit:** `connection.js` içinde manuel bir `if (version < 1)` kontrolü var.
    *   **Risk:** Proje büyüdükçe bu yöntem hataya açık hale gelir ve takibi zorlaşır.
    *   **Öneri:** `knex` veya `umzug` gibi hafif bir migrasyon kütüphanesine geçilmeli.

3.  **Loglama Stratejisi**
    *   **Tespit:** Loglar `app-log.txt` dosyasına yazılıyor ancak rotasyon (log rotation) mekanizması `electron-log` kütüphanesine devredilmiş gibi görünse de backend tarafında manuel `fs.append` kullanımları da var (`main.js` -> `writeLog`).
    *   **Öneri:** Tüm loglama işlemleri tek bir standart (örn: Winston veya electron-log) üzerinden yönetilmeli ve eski logların diski doldurması engellenmeli.

### 🔹 Kategori 3: İyileştirme Önerileri (Nice-to-Have)

1.  **Frontend State Yönetimi:** Context API kullanılıyor, bu orta ölçek için uygun. Ancak çok sık değişen veriler (örn: upload progress) için `zustand` veya `jotai` gibi atomik state yöneticileri performansı artırabilir.
2.  **Test Kapsamı:** Backend testleri (%90 coverage) iyi durumda. Frontend testleri artırılabilir. E2E testleri (Playwright/Cypress) eklenerek kritik akışlar (Login -> Klasör Oluştur -> Çıkış Ver) garanti altına alınmalı.

---

## 3. Önceliklendirilmiş Aksiyon Planı

### 1. Hafta: Veri Bütünlüğü ve Kritik Düzeltmeler (Sprint 1)
*   **Task 1.1 (Yüksek):** `better-sqlite3` bağlantısına Türkçe uyumlu `LOWER` ve `UPPER` fonksiyonlarının eklenmesi.
*   **Task 1.2 (Yüksek):** `FolderRepository.js` içindeki `findWithFilters` fonksiyonunun yeni collation fonksiyonlarını kullanacak şekilde güncellenmesi.
*   **Task 1.3 (Orta):** `getAllForAnalysis` yerine veritabanı seviyesinde `GROUP BY` kullanan `getDashboardStats` metotlarının yazılması.

### 2. Hafta: Performans Optimizasyonu (Sprint 2)
*   **Task 2.1 (Yüksek):** `SearchController` içindeki Excel arama mantığının refactor edilmesi. In-memory filtreleme yerine SQL sorgusuna dönüştürülmesi.
*   **Task 2.2 (Orta):** FTS5 (Full Text Search) tablosunun Türkçe karakterler için optimize edilmesi (gerekirse custom tokenizer araştırması).

### 3. Hafta: Altyapı ve Güvenlik (Sprint 3)
*   **Task 3.1 (Orta):** `main.js` içindeki manuel loglama fonksiyonlarının `electron-log` ile birleştirilmesi.
*   **Task 3.2 (Düşük):** Playwright ile temel bir E2E test senaryosunun (Smoke Test) yazılması.

---

## 4. Refactoring Stratejisi ve Risk Analizi

**Yaklaşım:** "Strangler Fig Pattern" (Boğucu İncir Modeli) benzeri bir yaklaşım izlenecek. Mevcut çalışan sistem bozulmadan, önce en riskli fonksiyonlar (`getAllForAnalysis`) yeni versiyonlarıyla değiştirilecek.

**Risk:** `better-sqlite3` versiyon güncellemesi veya collation değişikliği, mevcut veritabanı indekslerini geçersiz kılabilir (`REINDEX` gerekebilir).
**Mitigation (Önlem):** Herhangi bir veritabanı değişikliğinden önce `backup.js` modülü kullanılarak otomatik yedek alınması zorunlu hale getirilecek.

---

## 5. Tahmini Efor (Estimated Effort)

| Görev | Öncelik | Tahmini Süre | Etki |
|-------|---------|--------------|------|
| Türkçe Karakter (Collation) Fix | 🔥 Kritik | 4-6 Saat | Arama doğruluğu %100 artar |
| Dashboard Query Optimizasyonu | 🔥 Kritik | 6-8 Saat | Bellek kullanımı %90 azalır |
| Excel Arama Refactor | 🔸 Yüksek | 4-5 Saat | Arama hızı artar, CPU düşer |
| Loglama Standardizasyonu | 🔹 Düşük | 2-3 Saat | Hata takibi kolaylaşır |
| **Toplam Tahmini Efor** | | **~3 Gün (20-25 Saat)** | |

---

## 6. Hızlı Kazanımlar (Quick Wins)

1.  **Hemen Yap:** `main.js` içindeki `ipcMain.handle` bloklarına `try-catch` ekleyerek uygulamanın çökmesini engelle (Mevcut kodda çoğu yerde var, eksikler tamamlanmalı).
2.  **Hemen Yap:** `SearchController.js` içinde en az 2 karakter kontrolü var, bunu frontend'de de yaparak gereksiz request'i engelle.
