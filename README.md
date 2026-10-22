# 🌿 TerraExotica - Egzotik Hayvan Ansiklopedisi ve Hobici Takip Portalı

Egzotik hayvan tutkunları ve hobicileri için özel olarak tasarlanmış, doğa/teraryum temalı modern web platformu.
Ana sayfada yüksek çözünürlüklü doğa videosu ve seçili türler; tam filtrelenebilir hayvan kataloğu ise ayrı bir sayfada bulunur.

---

## 🦎 Öne Çıkan Özellikler

### 1. Kapsamlı Egzotik Canlı Ansiklopedisi
- **Tüm Egzotik Kategoriler:** Sürüngenler, İkiyaşamlılar, örümcekler, tarantulalar, akrepler, kırkayaklar, çıyanlar, böcekler, egzotik memeliler ve akuatik canlılar.
- **Bakım rehberleri:** 70 kaynaklı tür rehberi; Bredl ve Dumeril gibi boa/pitonlar, geckolar ve tarantulalar dahil. Kaynağı eklenmiş türlerde bakım referansı ve fotoğraf lisans atfı gösterilir; referansı henüz doğrulanmamış türlerde bu eksik açıkça belirtilir.
- **Canlı Kartları & Filtreleme:** Kategoriye, bakım zorluğuna (Başlangıç, Orta, İleri, Uzman) ve anlık arama kelimesine göre filtreleme.
- **Detaylı Bakım Kartı (Modal):**
  - Bilimsel Ad & Doğal Habitat
  - Sıcak Alan, Soğuk Alan & Nem İhtiyacı
  - UVB Aydınlatma gereksinimleri
  - Beslenme & Favori Besinler (Gut Loading taktikleri)
  - Ele Alışkınlık (Handling) & Karakter
  - Kritik Tehlike / Dikkat Notları

### 2. Hobicilere Özel Günlük Takip Paneli (Keeper Dashboard)
- **Evcil Hayvanlarım Yönetimi:** Kendi canlılarınızı ekleyin, yaşını, türünü ve teraryum boyutunu takip edin.
- **Günlük Bakım Rutini (Checklist):** Su tazeleme, sıcaklık/nem kontrolü, dışkı temizliği (spot cleaning), sisleme ve UVB kontrolünü her gün işaretleyin.
- **Yemleme Takibi (Feeding Log):** Verilen yem türü (Dubia, un kurdu, kemirgen vb.), kalsiyum/vitamin takviyesi, iştah durumu ve tarih/saat kaydı.
- **Kabuk Değişimi & Deri Dökümü (Shedding / Molt Tracker):** Sürüngen ve eklem bacaklılar için kritik deri döküm periyodu ve kabuk kalitesi takibi.
- **Kilo & Büyüme Grafiği (Weight Chart):** Chart.js ile dinamik interaktif büyüme eğrisi.
- **Teraryum İklimi & Akıllı Uyarılar:** Termometre ve higrometre ölçümlerini girin; canlının ihtiyaçlarıyla otomatik kıyaslansın.
- **Yerel bakım kayıtları:** Hobi takip verileri tarayıcı `localStorage` alanında saklanır; katalog veritabanı erişiminden bağımsızdır.
- **Yönetici kataloğu:** Supabase Auth, e-posta bağlantılı giriş ve PostgreSQL Row Level Security ile tür kataloğunu yönet.
- **Fotoğraflı topluluk:** E-posta bağlantısıyla oturum açan üyeler tek fotoğraf ve kısa sorular paylaşabilir; yorumlar ve gönderiler yönetici onayına kadar herkese kapalı kalır. Özel görseller imzalı bağlantılarla sunulur.
- **Bilimsel tür keşfi:** Bakım rehberlerinden ayrı olarak, iNaturalist taksonomisi üzerinden sürüngen, örümceğimsi, böcek ve iki yaşamlı gruplarında binlerce türü arayabilir ve sayfalar arasında gezebilirsin. Sonuçlar sayfa açıldığında yüklenir. Bu taksonomik kayıtlar bakım tavsiyesi veya evcil hayvan uygunluğu iddiası değildir.
- **İki akışlı haber sayfası:** Ana sayfa ve `news.html`; Mongabay, Phys.org, BBC News Türkçe ve DW Türkçe RSS kaynaklarından güncel dünya haberleri ile Türkiye'den tarihli, Türkçe doğa/yaban hayatı haberlerini gösterir. İngilizce haberler çevrilmez; kaynak bağlantısı korunur. Akışlar ziyaret sırasında günde bir kez yenilenir, arşiv 180 güne kadar yalnızca ilgili ziyaretçinin tarayıcısında saklanır. Bu statik sitede ortak/merkezi arşiv veya ziyaret edilmeden çalışan zamanlanmış görev bulunmaz.

### Veteriner sağlık merkezi
- `veterinarian.html` acil belirtiler, koruyucu gözlem ve egzotik hayvan veterinerine hazırlanma konularında genel bilgilendirme sunar.
- İçerikler ARAV, VCA Animal Hospitals ve RSPCA gibi yabancı veterinerlik/hayvan refahı kaynaklarına bağlanır. Sayfa tanı veya tedavi yerine geçmez; klinik belirtilerde veteriner desteği alın.
- Tür bakım özetleri kaynak bağlantısı ve belirsizlik uyarısıyla sunulur; hobi kaynakları klinik/veteriner tavsiyesi değildir.

---

## 🚀 Nasıl Çalıştırılır?

Statik sayfaları yerelde açabilirsin. Supabase kullanan yönetici paneli ve çevrimiçi katalog için sayfaları HTTPS üzerinden yayınla; Supabase ayarlarını ve veritabanı kurulumunu tamamla. Arama görünürlüğü garanti edilemez; gerçek ve kaynaklı içerik, erişilebilir HTML, doğru canonical/sitemap adresi, Search Console doğrulaması ve kullanıcı deneyimi gerekir. Botlara ve ziyaretçilere farklı içerik sunma veya yapay zekâ kullanımını gizlemek için cloaking yapma.

### Arama motoru görünürlüğü

- Ana sayfa ve tür kataloğunda başlık, açıklama ve sosyal önizleme etiketleri ile JSON-LD bulunur; yapılandırılmış verinin metni sayfada gerçekten görünen içerikle eşleşmelidir.
- `robots.txt` ve `sitemap.xml` yalnızca yayımlanmış URL’lere işaret etmelidir. Şu an yapılandırılmış `https://terraexotica.vercel.app/` adresinin yayında olduğunu doğrula (kontrol sırasında ana sayfa 404 döndürdü); gerçek üretim alan adını belirleyip canonical, Open Graph URL'leri, yapılandırılmış veriler, robots ve sitemap'te birlikte güncelle. Alan adı çalışmadan Google'da indekslenme beklenemez.
- `animals.html` içindeki iNaturalist araması sayfa açılınca yüklenir; bu sonuçlar tek tek indekslenebilir sayfalar olarak yayınlanmaz. Sitemap'e API sayfaları veya sorgu URL'leri ekleme. Yalnızca editoryal olarak araştırılmış 70 tür, bakım rehberi sayısına dahildir.

1. `index.html` dosyasını Google Chrome, Microsoft Edge, Mozilla Firefox veya dilediğiniz bir tarayıcıda çift tıklayarak açın.
2. Veya VS Code kullanıyorsanız *Live Server* eklentisiyle çalıştırabilirsiniz.

### Supabase kurulumu

1. Supabase'de proje oluştur. SQL Editor'da `supabase-schema.sql` dosyasının tamamını çalıştır. Bu; katalog tabloları, admin izin listesi, topluluk tabloları, RLS ve yalnızca onaylanan fotoğrafların okunabildiği özel `community-media` deposunu kurar; `eskinyunus5@gmail.com` ilk yönetici kaydıdır.
2. Supabase Project Settings → API'den Project URL ile **publishable/anon** anahtarını al. `catalog-config.js` içindeki `url` ve `publishableKey` alanlarına yerleştir. `service_role` veya secret anahtarını istemci koduna hiçbir zaman ekleme.
3. Supabase Authentication'da Email sağlayıcısını etkinleştir. Topluluk için e-posta OTP ile kullanıcı kaydı açık olmalıdır; bu kullanıcılar yalnızca yayımlanmış topluluk içeriğini görebilir ve kendi gönderilerini moderasyona yollar. Yönetici yetkisi ayrıca `admin_allowlist` ve RLS ile sınırlandırılır. Owner hesabını Dashboard üzerinden davet et veya oluştur.
4. Siteyi HTTPS üzerinden yayınla. Supabase Redirect URLs'e `admin.html` ve `community.html` dönüş adreslerini ekle; dosya URL'leri e-posta kimlik doğrulaması için uygun değildir. Üretimde e-posta SMTP ve rate-limit ayarlarını yapılandır.
5. `admin.html` sayfasında owner e-postasıyla giriş yap. **Mevcut türleri veritabanına aktar** düğmesi başlangıç kataloğunu Supabase'e kopyalar. Sonraki tür ekleme, düzenleme ve silme işlemleri veritabanına yazılır. Aynı panelde topluluk gönderilerini ve yorumlarını onayla/reddet.
6. Ek yöneticileri Supabase Dashboard'da önce Auth → Users alanından davet et; sonra SQL Editor'da `insert into public.admin_allowlist (email) values (lower('kisi@example.com'));` çalıştır. İzin listesi tarayıcıdan okunamaz veya düzenlenemez.

Yönetici girişi veritabanı RLS politikalarıyla da sınırlandırılır; arayüzdeki giriş kontrolü tek başına güvenlik sınırı değildir. Topluluk içeriği kısa uzunluk sınırları, temel kaba dil filtresi, saatte en fazla 5 gönderi/15 yorum, fotoğraf yükleme limiti ve zorunlu yönetici onayından geçer. Fotoğraflar yüklenirken konum gibi EXIF üst verileri kaldırılır. İçerik denetimi kesin değildir; kullanıcı bildirimleri ve düzenli moderasyon gerekir. Katalog JSON verisi istemciden yalnızca admin RLS yetkisiyle yazılır. Tür listesi sonlu olmadığından yeni türleri yönetici panelinden ekle.

---

## 📁 Dosya Yapısı

- `index.html`: Ana sayfa, öne çıkan türler, haber akışı, günlük takip paneli ve modallar.
- `news.html`: Dünyadan güncel ve Türkiye'den tarihli haberler için ayrı akış ve tarayıcı tabanlı arşiv sayfası.
- `animals.html`: Arama, kategori ve bakım seviyesi filtreleri olan tam tür kataloğu; tarantula, yılan, akrep ve böcek türleri için ayrı hızlı filtreler sunar.
- `taxonomy.js`: iNaturalist API üzerinden taksonomik tür araması; yalnızca CC0/CC BY/CC BY-SA fotoğrafları atıf ve lisans bağlantısıyla gösterilir.
- `community.html`, `community.js`: E-posta ile giriş, fotoğraflı soru gönderimi, yayımlanmış akış ve moderasyon bekleyen kendi içeriklerinin durumu.
- `news.js`: İki haber akışı, RSS ayrıştırma, günlük ziyaret kontrolü ve tarayıcıya özel arşivleme.
- `veterinarian.html`: Güvenilir kaynak bağlantılı, genel veteriner sağlık ve acil yönlendirme merkezi.
- `admin.html`: İzin listesine bağlı Supabase yönetici girişi, katalog düzenleyicisi ve topluluk moderasyonu.
- `admin.js`, `catalog-db.js`: Yönetici oturumu/katalog CRUD, moderasyon ve genel katalog veritabanı entegrasyonu.
- `catalog-config.js`: Supabase URL ve public/publishable key ayar yeri; secret anahtarlar buraya konmamalıdır.
- `supabase-schema.sql`: PostgreSQL katalog/topluluk tabloları, izin listesi, RLS politikaları, moderasyon ve özel depolama şeması.
- `style.css`: Egzotik orman/teraryum karanlık modu, cam efektleri (glassmorphism), neon rozetler ve animasyonlar.
- `data.js`, `additional-species.js`: Kaynak/ bakım kartı derinliği farklı olan 70 editoryal tür rehberi ve hazır başlangıç hobici demo kayıtları.
- `app.js`: Filtreleme, arama, veri depolama (CRUD), interaktif grafikler ve bildirim sistemi.
- `assets/species/`: Tür adıyla eşleştirilmiş yerel fotoğraflar; sanatçı ve lisans bilgileri her tür kartında gösterilir.
- Tür rehberinde olmayan hayvanları takip formundan kendi tür adınla ekleyebilirsin. Bu özel adlar ve hayvan kayıtları yalnızca o tarayıcıda saklanır; bakım değerleri uydurulmaz.
- `assets/hero-exotic.mp4`: Ana sayfadaki kullanıcının sağladığı, sessiz ve döngüsel oynatılan hero videosu.
- `assets/hero-forest.webm`: 720p hero videosu (Tom Hawkins, Wikimedia Commons; [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)).
- `assets/dragon.svg`: Sekme simgesi; Font Awesome Dragon ikonu ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
