# Tutuklama Hesaplayıcı

LSPD Tools'un bir parçası olan tutuklama hesaplayıcısı. GTA World Türkiye *San Andreas Ceza Kanunu*'na göre
hapis süresini, suç puanını, para cezasını, araç bağlamayı, ehliyete el koymayı, kefaleti ve hücre numarasını hesaplar.

Tamamen statik bir sitedir: sunucu ya da API anahtarı gerekmez, **GitHub Pages** üzerinde çalışır.

- Canlı adres: https://chaseyuu.github.io/arrest-calculator/
- Ana sayfa (LSPD Tools): https://chaseyuu.github.io/lspd-tools/

## Özellikler

- Suçlama, sınıf, suçun tekrarlanma durumu ve suçun tarafı seçimi; madde numarası veya adıyla arama
  (Türkçe karakterlere duyarsız).
- Hesapla'ya basmadan önce süre, puan ve para cezasının anlık önizlemesi.
- Sonuç sayfasında tıklanınca kopyalanan özet kutuları: minimum/maksimum süre, hücre numarası, yeni suç puanı,
  para cezası, araç bağlama, ehliyete el koyma ve kefalet tutarı.
- Hesaplamayı paylaşma linki ve "Suçlamaları Düzenle" ile forma geri dönme.
- Açık ve koyu tema.

## Hesaplama kuralları

### Ceza Kanunu Verisi

`data/gtaw-data/gtaw_penal_code.json` dosyası, kanun metnindeki değerlerin madde madde girildiği
`scripts/build-penal-code.py` betiğiyle üretilir. Bir maddeyi değiştirmek için betiği düzenleyip çalıştırın:

```sh
python3 scripts/build-penal-code.py
```

- Maddeler 001'den 714'e numerik sıradadır. Alt bentleri farklı ceza alan maddeler ayrı suçlamadır
  (örneğin `112a`, `112b`, `112c`; tutara göre kademeli olanlar `123a`–`123e`).
- Kanun yalnızca alt ya da yalnızca üst sınır veriyorsa minimum ve maksimum süre o değere eşitlenir.
- Suç puanı, sınıfın yanındaki parantez içindeki değerdir; parantez yoksa puan 0'dır.
- Toplam süre (minimum ve maksimum) en fazla 28800 dakikadır (20 gün).
- 430 ve 431'de süre, puan ve para cezası suçun kaçıncı kez işlendiğine göre değişir.

### Zorunlu Mahkeme

- 001–004 maddelerinde ceza mahkemenin takdirindedir.
- *Şartlı Tahliye İhlali* seçilirse ya da suçlamalar arasında 001–004 varsa süreler ve kefalet
  *Zorunlu Mahkeme* olarak gösterilir.

### Uyuşturucu Suçlamaları (131, 601–606)

- Bulunan madde türleri seçilir; kategori otomatik belirlenir.
- Seçilen maddeler arasında cezası en ağır olan kategori uygulanır. Madde listesi:
  `data/gtaw-data/gtaw_depa_categories.json`.
- 606'da toplam gram da girilir; bulunan her 75 gram için cezaya 12 saat eklenir.

### Suçun Tarafı (Başlık VIII)

Her suçlama kendi içinde hesaplanır:

| Suçun Tarafı | Süre | Suç puanı |
|---|---|---|
| Suçlu, 801. Suç Ortağı, 803. Nefret Suçu | %100 | %100 |
| 802. Suça Yardım Etme | %50 | %100 |
| 804. Suça Teşebbüs | %50 | %50 |
| 805. Suç İçin Anlaşma | %75 | %75 |
| 806. Suça Teşvik | %75 | %100 |

Küsuratlı puanlar her suçlamada ayrı yuvarlanır ve 1'in altına düşmez (807).

### Suç Puanı

*Mevcut Suç Puanı* (0–30) girilir; sonuçta *Yeni Suç Puanı* = mevcut puan + suçlamalardan gelen puan gösterilir.
30'un üzerinde uyarı çıkar.

### Kefalet

Kefalet tutarları GTA World Türkiye kefalet şablonunun LEO sayfasındaki *Tam Kefalet Tutarı* sütunundan gelir
(`data/bail.json`):

- Kişi daha önce tutuklandıysa kefalete uygun değildir.
- Suçlamalardan birinde *Otomatik Kefalet Yok* varsa kefalete uygun değildir.
- Diğer durumlarda suçlamalar arasındaki en yüksek kefalet tutarı uygulanır; tutarlar toplanmaz.

### Hücre ID

- Kadın: *Boş Bırakabilirsiniz*.
- Çete bağlantısı olmayan erkek: 309, 311, 312, 313, 314, 316, 317, 318, 323, 325, 333 arasından rastgele.
- Çete bağlantısı olan erkek: kökene göre. Hispanik veya Latin ve Beyaz için 305, 306, 307, 308, 310, 320, 322,
  326–332; diğer kökenler için ilk liste.

Hücre, *Hesapla*'ya basıldığında seçilir ve paylaşım linkine yazılır.

## Lisans

Bu proje [MDC Panel+](https://github.com/b00skit/MDC-Panel-plus) tabanlıdır ve onunla aynı lisansı taşır:
GPL-3.0. Ayrıntılar için `LICENSE` dosyasına bakın.
