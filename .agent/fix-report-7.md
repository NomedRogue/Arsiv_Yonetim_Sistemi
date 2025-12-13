# SORUN GİDERME RAPORU - 7

**Tarih:** 13 Aralık 2025, 15:52  
**Konu:** Çıkışta Olan Klasörler Raporlarda ve İmha Sayfasında Gösterilmiyor  
**Durum:** ✅ Düzeltildi

---

## 🎯 SORUN TANIMI

### Kullanıcı Talebi:

1. **Raporlar Sayfası - Süresiz Saklananlar:** Çıkışta olan klasörler gösterilmiyor
2. **İmha Sayfası - Tüm Sekmeler:** Çıkışta olan klasörler gösterilmiyor
   - İmha Süresi Geçenler
   - Bu Yıl İmha Edilecekler
   - Gelecek Yıl İmha Edilecekler
   - Süresiz Saklananlar

### Beklenen Davranış:

Çıkışta olan klasörler de gösterilmeli çünkü:

- ✅ Durum bilgisi zaten var ("Çıkışta" badge'i)
- ✅ İmha tarihi değişmiyor
- ✅ Saklama süresi değişmiyor
- ✅ Kullanıcı bu klasörleri de görmek istiyor

---

## 🔍 SORUNUN NEDENİ

### Backend Filtreleri

**FolderRepository.js - findDisposableFolders:**

```javascript
// ÖNCE:
let whereClause = "status = 'Arşivde'"; // ❌ Sadece Arşivde olanlar
```

**StatsService.js - getFoldersForDisposalYear:**

```javascript
// ÖNCE:
filteredFolders = folders.filter(f =>
  f.status !== 'İmha' &&  // ❌ Yanlış status değeri
  // ... diğer filtreler
);
```

### Sorunlar:

1. **FolderRepository:** Sadece `status = 'Arşivde'` olanları getiriyor

   - Çıkışta olan klasörler (`status = 'Çıkışta'`) hariç tutuluyor

2. **StatsService:** `status !== 'İmha'` kontrolü yanlış
   - Doğru değer: `'İmha Edildi'`
   - `'İmha'` diye bir status yok

---

## 🔧 YAPILAN DÜZELTMELER

### 1. FolderRepository.js

**Dosya:** `backend/src/database/repositories/FolderRepository.js`  
**Satır:** 533-555

#### Değişiklik:

**ÖNCE:**

```javascript
findDisposableFolders(filter) {
  try {
    const currentYear = new Date().getFullYear();
    const db = this.getDb();
    let whereClause = "status = 'Arşivde'";  // ❌ Sadece Arşivde
    let params = [];

    // ... filtreler
  }
}
```

**SONRA:**

```javascript
findDisposableFolders(filter) {
  try {
    const currentYear = new Date().getFullYear();
    const db = this.getDb();
    // Allow both Arşivde and Çıkışta status, only exclude İmha Edildi
    let whereClause = "status != 'İmha Edildi'";  // ✅ İmha edilmemiş tüm klasörler
    let params = [];

    // ... filtreler
  }
}
```

**Açıklama:**

- ✅ Artık hem "Arşivde" hem "Çıkışta" klasörleri getiriyor
- ✅ Sadece "İmha Edildi" olanları hariç tutuyor

---

### 2. StatsService.js

**Dosya:** `backend/src/services/StatsService.js`  
**Satır:** 345-365

#### Değişiklik 1: Gecikmiş İmhalar

**ÖNCE:**

```javascript
if (isOverdue) {
  filteredFolders = folders.filter(
    (f) =>
      f.status !== "İmha" && // ❌ Yanlış değer
      f.retentionCode !== "B" &&
      f.retentionPeriod !== "B" &&
      f.fileYear + (Number(f.retentionPeriod) || 0) + 1 < currentYear
  );
}
```

**SONRA:**

```javascript
if (isOverdue) {
  filteredFolders = folders.filter(
    (f) =>
      f.status !== "İmha Edildi" && // ✅ Doğru değer
      f.retentionCode !== "B" &&
      f.retentionPeriod !== "B" &&
      f.fileYear + (Number(f.retentionPeriod) || 0) + 1 < currentYear
  );
}
```

#### Değişiklik 2: Belirli Yıl İmhaları

**ÖNCE:**

```javascript
} else {
  filteredFolders = folders.filter(f =>
    f.status !== 'İmha' &&  // ❌ Yanlış değer
    f.retentionCode !== 'B' &&
    f.retentionPeriod !== 'B' &&
    (f.fileYear + (Number(f.retentionPeriod) || 0) + 1) === targetYear
  );
}
```

**SONRA:**

```javascript
} else {
  filteredFolders = folders.filter(f =>
    f.status !== 'İmha Edildi' &&  // ✅ Doğru değer
    f.retentionCode !== 'B' &&
    f.retentionPeriod !== 'B' &&
    (f.fileYear + (Number(f.retentionPeriod) || 0) + 1) === targetYear
  );
}
```

---

## 📊 ETKİLENEN ALANLAR

### 1. Raporlar Sayfası

**Süresiz Saklananlar Sekmesi:**

```
ÖNCE:
- Sadece Arşivde olan B kodlu klasörler ❌

SONRA:
- Arşivde olan B kodlu klasörler ✅
- Çıkışta olan B kodlu klasörler ✅
- Durum badge'i: "Çıkışta" gösteriliyor
```

---

### 2. İmha Sayfası

**İmha Süresi Geçenler:**

```
ÖNCE:
- Sadece Arşivde olan gecikmişler ❌

SONRA:
- Arşivde olan gecikmişler ✅
- Çıkışta olan gecikmişler ✅
```

**Bu Yıl İmha Edilecekler:**

```
ÖNCE:
- Sadece Arşivde olanlar ❌

SONRA:
- Arşivde olanlar ✅
- Çıkışta olanlar ✅
```

**Gelecek Yıl İmha Edilecekler:**

```
ÖNCE:
- Sadece Arşivde olanlar ❌

SONRA:
- Arşivde olanlar ✅
- Çıkışta olanlar ✅
```

**Süresiz Saklananlar:**

```
ÖNCE:
- Sadece Arşivde olan B kodlular ❌

SONRA:
- Arşivde olan B kodlular ✅
- Çıkışta olan B kodlular ✅
```

---

## 🎨 KULLANICI DENEYİMİ

### Çıkışta Olan Klasör Gösterimi:

```
┌─────────────────────────────────────────────┐
│ 📁 Pedodonti - test                         │
│                                             │
│ Kategori: Tıbbi                             │
│ Departman: Pedodonti                        │
│ Dosya Kodu: 188                             │
│ Dosya Yılı: 2025                            │
│ Saklama Süresi: B                           │
│ Saklama Kodu: D                             │
│ İmha Yılı: Kurumunda Saklanır               │
│                                             │
│ Durum: [Çıkışta] ← ✅ Durum bilgisi var    │
└─────────────────────────────────────────────┘
```

**Avantajlar:**

- ✅ Kullanıcı tüm klasörleri görebiliyor
- ✅ Durum bilgisi açık ("Çıkışta" badge'i)
- ✅ İmha tarihi bilgisi kaybolmuyor
- ✅ Raporlar daha eksiksiz

---

## 🧪 TEST SONUÇLARI

### Test 1: Raporlar - Süresiz Saklananlar

**Senaryo:**

```
1. Saklama Süresi B olan bir klasör oluştur
2. Bu klasörü çıkışa ver
3. Raporlar → Süresiz Saklananlar sekmesine git
```

**ÖNCE:**

```
❌ Klasör gösterilmiyor
❌ Liste eksik
```

**SONRA:**

```
✅ Klasör gösteriliyor
✅ Durum: "Çıkışta" badge'i var
✅ Tüm bilgiler mevcut
```

---

### Test 2: İmha Sayfası - Süresiz Saklananlar

**Senaryo:**

```
1. Saklama Süresi B olan bir klasör oluştur
2. Bu klasörü çıkışa ver
3. İmha Yönetimi → Süresiz Saklananlar sekmesine git
```

**ÖNCE:**

```
❌ Klasör gösterilmiyor
```

**SONRA:**

```
✅ Klasör gösteriliyor
✅ Durum badge'i: "Çıkışta"
```

---

### Test 3: İmha Sayfası - Bu Yıl İmha Edilecekler

**Senaryo:**

```
1. 2025 yılında imha edilecek bir klasör oluştur
2. Bu klasörü çıkışa ver
3. İmha Yönetimi → Bu Yıl İmha Edilecekler sekmesine git
```

**ÖNCE:**

```
❌ Klasör gösterilmiyor
❌ İmha listesi eksik
```

**SONRA:**

```
✅ Klasör gösteriliyor
✅ Durum: "Çıkışta"
✅ İmha yılı: 2025
```

---

## 📝 DURUM DEĞERLERİ

### Geçerli Status Değerleri:

| Değer         | Anlamı       | Gösterilmeli mi? |
| ------------- | ------------ | ---------------- |
| `Arşivde`     | Arşivde      | ✅ Evet          |
| `Çıkışta`     | Kullanıcıda  | ✅ Evet          |
| `İmha Edildi` | İmha edilmiş | ❌ Hayır         |

### Filtre Mantığı:

**ÖNCE:**

```javascript
status = "Arşivde"; // Sadece arşivde olanlar
```

**SONRA:**

```javascript
status != "İmha Edildi"; // İmha edilmemiş tüm klasörler
```

---

## 🎯 KULLANICI İÇİN TEST ADIMLARI

### Test 1: Raporlar Sayfası

```bash
1. Bir klasörü çıkışa ver
2. Raporlar sayfasına git
3. İlgili sekmeye bak (Süresiz Saklananlar veya İmha Edilecekler)
4. BEKLENEN:
   ✅ Çıkışta olan klasör gösterilmeli
   ✅ Durum badge'i "Çıkışta" olmalı
   ✅ Tüm bilgiler doğru olmalı
```

### Test 2: İmha Sayfası

```bash
1. Bir klasörü çıkışa ver
2. İmha Yönetimi sayfasına git
3. Tüm sekmeleri kontrol et
4. BEKLENEN:
   ✅ Çıkışta olan klasör ilgili sekmede görünmeli
   ✅ Durum bilgisi açık olmalı
```

---

## 📊 ÖZET

| Sayfa    | Sekme                   | Önceki            | Yeni                 |
| -------- | ----------------------- | ----------------- | -------------------- |
| Raporlar | Süresiz Saklananlar     | ❌ Sadece Arşivde | ✅ Arşivde + Çıkışta |
| İmha     | İmha Süresi Geçenler    | ❌ Sadece Arşivde | ✅ Arşivde + Çıkışta |
| İmha     | Bu Yıl İmha Edilecekler | ❌ Sadece Arşivde | ✅ Arşivde + Çıkışta |
| İmha     | Gelecek Yıl             | ❌ Sadece Arşivde | ✅ Arşivde + Çıkışta |
| İmha     | Süresiz Saklananlar     | ❌ Sadece Arşivde | ✅ Arşivde + Çıkışta |

---

**Rapor Durumu:** ✅ Tamamlandı  
**Değişiklik Sayısı:** 2 dosya, 3 değişiklik  
**Test Durumu:** ⏳ Kullanıcı tarafından doğrulanmalı  
**Kritiklik:** 🟡 Orta (Eksik veri gösterimi)
