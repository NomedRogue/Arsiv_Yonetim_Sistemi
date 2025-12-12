# Arayüz Tutarlılık ve Tipografi Analiz Raporu

Bu rapor, uygulamanın frontend kod tabanındaki (özellikle `components/` ve `features/` dizinleri altındaki) yazı tipleri, boyutlar, buton stilleri ve genel tasarım dili üzerindeki incelemelere dayanmaktadır.

## 1. Genel Tespitler

Uygulama genelinde **Tailwind CSS** etkin bir şekilde kullanılıyor ve **Dark Mode (Koyu Tema)** desteği bileşenlerin çoğunda tutarlı bir şekilde uygulanmış durumda. Ancak, yazı boyutları (typography) ve bileşen boyutlandırmaları konusunda belirgin tutarsızlıklar tespit edilmiştir.

### 🔍 Tipografi (Yazı Boyutları) Analizi

Uygulamanın en büyük tutarsızlığı yazı boyutlarında görülmektedir. Bir masaüstü uygulaması için "okunabilirlik" standardı olan `text-sm` (14px) yerine, yer yer çok küçük puntolar tercih edilmiştir.

| Alan / Bileşen                  | Mevcut Durum               | Standart Dışı Kullanım                                                                                                | Önerilen             |
| :------------------------------ | :------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :------------------- |
| **Klasör Formu (`FolderForm`)** | `text-xs` (12px) ağırlıklı | Etiketler, inputlar ve hatta **Kaydet/Vazgeç butonları** 12px olarak ayarlanmış. Bu, form doldurmayı zorlaştırabilir. | `text-sm` (14px)     |
| **Modallar (`Modal`)**          | `text-base` & `text-sm`    | Başlıklar `text-lg`, butonlar `text-sm`. Bu **doğru** bir kullanımdır.                                                | Aynen kalmalı        |
| **Bildirimler (`Toast`)**       | `text-xs` (12px)           | Kullanıcının anlık görmesi gereken mesajlar için 12px biraz küçük kalabilir.                                          | `text-sm` (14px)     |
| **Dashboard Kartları**          | `text-[0.65rem]` (~10px)   | Kart başlıkları çok küçük. Okunabilirlik sınırının altında.                                                           | `text-xs` (12px)     |
| **Login Ekranı**                | Custom CSS (`Login.css`)   | Diğer sayfalardan farklı bir tasarım dili kullanıyor (Floating labels, farklı input stilleri).                        | Tailwind'e taşınmalı |

### 🎨 Renk ve Tema Analizi

- **Renk Paleti:** `index.css` içerisinde `--color-archive-primary` gibi CSS değişkenleri tanımlanmış olsa da, bileşenlerin çoğu (örn. `FolderForm.tsx`, `Modal.tsx`) doğrudan `bg-teal-600`, `text-teal-600` gibi hardcoded Tailwind sınıfları kullanıyor. Bu, ileride tema rengini değiştirmek istediğinizde (örneğin Teal'den Blue'ya geçiş) zorluk çıkaracaktır.
- **Koyu Tema:** Koyu tema uyumluluğu genel olarak başarılı. `dark:bg-slate-700`, `dark:border-gray-600` gibi kullanımlar tutarlı.

### 🔘 Buton ve Etkileşim Elemanları

- **Boyut Tutarsızlığı:**
  - Form butonları: `py-2 px-4 text-xs` (Küçük yazı, geniş boşluk)
  - Modal butonları: `py-2 px-4 text-sm` (İdeal oran)
  - Liste aksiyon butonları: `p-1.5` ve `icon size 15` (Biraz küçük, tıklama alanı dar olabilir)
- **Login Sayfası:** Login sayfasındaki butonlar ve inputlar, uygulamanın geri kalanındaki `CustomInput` ve Tailwind buton stillerinden tamamen farklı.

## 2. İyileştirme Önerileri

Bu tutarsızlıkları gidermek ve kullanıcı deneyimini (UX) artırmak için aşağıdaki adımları öneriyorum:

### 🚀 Öncelikli İyileştirmeler

1.  **Form Yazı Boyutlarını Büyütün:**

    - `FolderForm.tsx` içerisindeki tüm `text-xs` sınıflarını `text-sm` ile değiştirin.
    - Form elemanları (input, select) masaüstü uygulamasında rahat okunur olmalıdır.

2.  **Toast Bildirimlerini Belirginleştirin:**

    - `Toast.tsx` içerisindeki metni `text-sm` ve `font-medium` yaparak bildirimlerin gözden kaçmasını engelleyin.

3.  **Dashboard Tipografisini Düzenleyin:**

    - Kart başlıklarını `text-xs` (12px), değerleri (sayıları) ise `text-xl` veya `text-2xl` yaparak hiyerarşiyi güçlendirin. Şu anki 10px başlıklar çok silik kalıyor.

4.  **Renk Değişkenlerini Kullanın:**
    - Hardcoded `teal-600` yerine, tanımladığınız `archive-primary` veya Tailwind config üzerinden genişletilmiş renkleri kullanmaya başlayın.

### 📦 Uzun Vadeli Öneriler

- **Ortak Bileşen Kütüphanesi:** Projede `Button.tsx` gibi temel bir bileşen eksik. Her sayfada buton stili yeniden yazılıyor. Ortak bir `<Button variant="primary|secondary" size="sm|md" />` bileşeni oluşturulup tüm sayfalarda bu kullanılmalı.
- **Login Sayfası Modernizasyonu:** `Login.tsx` ve `Login.css`, projenin geri kalanıyla (Tailwind yapısı) uyumlu hale getirilmeli.

## 3. Sonuç

Uygulamanın altyapısı ve fonksiyonelliği güçlü olsa da, arayüzdeki bu **"punto karmaşası"** profesyonel görünümü zedelemektedir. Özellikle veri giriş formlarındaki (Klasör Ekle/Düzenle) küçük yazı tipleri, uzun süreli kullanımda kullanıcıyı yoracaktır.

Önerilen değişiklikler (özellikle madde 1 ve 2), kodda büyük bir "refactor" gerektirmeden, sadece "bul/değiştir" mantığıyla hızlıca uygulanabilir ve net bir kalite artışı sağlar.
