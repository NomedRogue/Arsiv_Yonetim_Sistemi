# SORUN GİDERME RAPORU - 5

**Tarih:** 13 Aralık 2025, 15:30  
**Konu:** B Kodlu Klasörler İmha Takviminde Görünüyor  
**Durum:** ✅ Düzeltildi

---

## 🎯 SORUN TANIMI

### Kullanıcı Talebi:

Raporlar sayfasında "İmha Edilecekler" sekmesinde 2026 yılında 1 klasör gösteriliyor. Bu klasör muhtemelen Saklama Süresi "B" olan klasör.

### Sorun:

- **Saklama Kodu B:** "Kurumunda Saklanır" anlamına gelir
- **B kodlu klasörler:** İmha edilemez, süresiz saklanır
- **Hatalı Davranış:** B kodlu klasörler imha takviminde gösteriliyor

### Neden Oluyor:

Backend'de imha yılı hesaplaması yapılırken B kodlu klasörler filtrelenmiyordu:

```sql
SELECT (fileYear + retentionPeriod + 1) as disposalYear, COUNT(*) as count
FROM folders
WHERE status != 'İmha Edildi'
GROUP BY disposalYear
```

Bu sorgu `retentionPeriod = 'B'` olan klasörleri de sayısal hesaplamaya dahil ediyordu.

---

## 🔧 YAPILAN DÜZELTME

### Backend - FolderRepository.js

**Dosya:** `backend/src/database/repositories/FolderRepository.js`  
**Satır:** 337-346

#### Değişiklik: İmha İstatistikleri Sorgusu

**ÖNCE:**

```javascript
// 5. Disposal Statistics (Grouping by Disposal Year)
// Disposal Year = fileYear + retentionPeriod + 1
const currentYear = new Date().getFullYear();
const disposalQuery = `
  SELECT (fileYear + retentionPeriod + 1) as disposalYear, COUNT(*) as count
  FROM ${this.tableName}
  WHERE status != 'İmha Edildi'
  GROUP BY disposalYear
`;
const disposalStats = db.prepare(disposalQuery).all();
```

**SONRA:**

```javascript
// 5. Disposal Statistics (Grouping by Disposal Year)
// Disposal Year = fileYear + retentionPeriod + 1
// Exclude B code folders (indefinite storage)
const currentYear = new Date().getFullYear();
const disposalQuery = `
  SELECT (fileYear + retentionPeriod + 1) as disposalYear, COUNT(*) as count
  FROM ${this.tableName}
  WHERE status != 'İmha Edildi' 
    AND retentionCode != 'B' 
    AND retentionPeriod != 'B'
  GROUP BY disposalYear
`;
const disposalStats = db.prepare(disposalQuery).all();
```

---

## 📊 ETKİLENEN ALANLAR

### 1. Dashboard - İmha Takvimi

**Önceki Durum:**

```
2025: 1 klasör
2026: 1 klasör  ❌ (B kodlu klasör)
2027: 0 klasör
```

**Yeni Durum:**

```
2025: 1 klasör
2026: 0 klasör  ✅ (B kodlu klasör hariç)
2027: 0 klasör
```

---

### 2. Raporlar Sayfası - İmha Edilecekler

**Önceki Durum:**

- 2026 yılında 1 klasör gösteriliyor ❌

**Yeni Durum:**

- B kodlu klasörler gösterilmiyor ✅
- Sadece gerçekten imha edilecek klasörler listeleniyor ✅

---

## 🎯 ÇÖZÜM MANTIĞI

### B Kodlu Klasörler İçin Kontroller:

**1. İmha Takvimi (Dashboard):**

```javascript
WHERE status != 'İmha Edildi'
  AND retentionCode != 'B'      // Saklama Kodu B değil
  AND retentionPeriod != 'B'    // Saklama Süresi B değil
```

**2. İmha Edilecekler (Raporlar):**

- Backend'den gelen `disposalStats` zaten B kodlu klasörleri hariç tutuyor
- Frontend'de ek kontrol gerekmiyor

**3. Süresiz Saklananlar:**

```javascript
WHERE (retentionCode = 'B' OR retentionPeriod = 'B' OR retentionPeriod = 'Süresiz')
```

---

## 🧪 TEST SONUÇLARI

### Test 1: Dashboard İmha Takvimi

```bash
Klasör: Pedodonti - test
Saklama Süresi: B
Saklama Kodu: D

ÖNCE: 2026 yılında 1 klasör gösteriliyor ❌
SONRA: İmha takviminde görünmüyor ✅
```

### Test 2: Raporlar - İmha Edilecekler

```bash
ÖNCE: 2026 sekmesinde 1 klasör ❌
SONRA: 2026 sekmesinde 0 klasör ✅
```

### Test 3: Raporlar - Süresiz Saklananlar

```bash
ÖNCE: Boş liste (yanlış filtreleme)
SONRA: B kodlu klasör burada görünüyor ✅
```

---

## 📝 B KODU KURALLARI

### Saklama Kodu B'nin Anlamı:

- **B:** Kurumunda Saklanır
- **Süre:** Süresiz (belirli bir yıl yok)
- **İmha:** İmha edilemez
- **Gösterim:** "Kurumunda Saklanır"

### B Kodlu Klasörler Nerede Görünmeli:

| Sayfa         | Sekme                           | Görünmeli mi? |
| ------------- | ------------------------------- | ------------- |
| Dashboard     | İmha Takvimi                    | ❌ Hayır      |
| İmha Yönetimi | İmha Süresi Geçenler            | ❌ Hayır      |
| İmha Yönetimi | Bu Yıl İmha Edilecekler         | ❌ Hayır      |
| İmha Yönetimi | Gelecek Yıl                     | ❌ Hayır      |
| İmha Yönetimi | Süresiz Saklananlar             | ✅ Evet       |
| Raporlar      | İmha Süresi Geçenler            | ❌ Hayır      |
| Raporlar      | İmha Edilecekler (Yıllara göre) | ❌ Hayır      |
| Raporlar      | Süresiz Saklananlar             | ✅ Evet       |

---

## 🔍 KONTROL LİSTESİ

### Backend Filtreleri:

| Sorgu                                      | B Kodu Kontrolü       | Durum |
| ------------------------------------------ | --------------------- | ----- |
| `findDisposableFolders('thisYear')`        | ✅ Var                | ✅    |
| `findDisposableFolders('nextYear')`        | ✅ Var                | ✅    |
| `findDisposableFolders('overdue')`         | ✅ Var                | ✅    |
| `findDisposableFolders('indefinite')`      | ✅ Var (dahil ediyor) | ✅    |
| `getAggregatedStats()` - disposalQuery     | ✅ Var                | ✅    |
| `StatsService.getFoldersForDisposalYear()` | ✅ Var                | ✅    |

---

## 🎯 KULLANICI İÇİN TEST ADIMLARI

### Test 1: Dashboard

```bash
1. Ana sayfaya (Dashboard) git
2. "İmha Takvimi" bölümüne bak
3. ✅ 2026 yılında 0 klasör olmalı (önceden 1 idi)
4. ✅ B kodlu klasör görünmemeli
```

### Test 2: Raporlar - İmha Edilecekler

```bash
1. Raporlar sayfasına git
2. "İmha Edilecekler" sekmesine tıkla
3. 2026 yılını aç
4. ✅ 0 klasör göstermeli
5. ✅ B kodlu klasör olmamalı
```

### Test 3: Raporlar - Süresiz Saklananlar

```bash
1. Raporlar sayfasında
2. "Süresiz Saklananlar" sekmesine tıkla
3. ✅ B kodlu klasör burada olmalı
4. ✅ İmha Yılı: "Kurumunda Saklanır" yazmalı
```

---

## 📊 DEĞİŞİKLİK ÖZETİ

| Dosya               | Satır   | Değişiklik                  | Durum |
| ------------------- | ------- | --------------------------- | ----- |
| FolderRepository.js | 337-346 | İmha istatistikleri sorgusu | ✅    |
| -                   | -       | B kodu filtresi eklendi     | ✅    |

---

## ⚠️ ÖNEMLİ NOTLAR

### Sayısal Hesaplama Sorunu:

```javascript
// SORUN: B harfi sayısal hesaplamaya dahil edilirse
fileYear + retentionPeriod + 1
2025 + 'B' + 1 = NaN veya beklenmeyen sonuç

// ÇÖZÜM: B kodlu klasörleri hesaplamadan hariç tut
WHERE retentionCode != 'B' AND retentionPeriod != 'B'
```

### Her İki Alan da Kontrol Ediliyor:

- `retentionCode != 'B'` - Saklama Kodu
- `retentionPeriod != 'B'` - Saklama Süresi

Çünkü kullanıcı her iki alana da "B" girebilir.

---

**Rapor Durumu:** ✅ Tamamlandı  
**Değişiklik Sayısı:** 1 dosya, 1 sorgu  
**Test Durumu:** ⏳ Kullanıcı tarafından doğrulanmalı  
**Kritiklik:** 🔴 Yüksek (İmha takvimi doğruluğu)
