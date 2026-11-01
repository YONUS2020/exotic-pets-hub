# 🌿 exoticpetshub - Egzotik Hayvan Ansiklopedisi ve Hobici Takip Portalı

Egzotik hayvan tutkunları ve hobicileri için özel olarak tasarlanmış, doğa/teraryum temalı modern web platformu.
Ana sayfada yüksek çözünürlüklü doğa videosu ve seçili türler; tam filtrelenebilir hayvan kataloğu ise ayrı bir sayfada bulunur.

---

## 🦎 Öne Çıkan Özellikler

### 1. Kapsamlı Egzotik Canlı Ansiklopedisi
- **Tüm Egzotik Kategoriler:** Sürüngenler, İkiyaşamlılar, örümcekler, tarantulalar, akrepler, kırkayaklar, çıyanlar, böcekler, egzotik memeliler ve akuatik canlılar.
- **Bakım rehberleri:** Editoryal tür rehberlerine ek olarak kullanıcı listesindeki 400 tür de kataloğa eklenir. Yeni kayıtlar Wikimedia Commons fotoğraf adaylarıyla gösterilir; bulunamayan görseller mevcut güvenli fallback görseline döner ve bakım değerleri doğrulama gerektiğini açıkça belirtir.
- **Doğal yaşam ansiklopedisi:** Aslan, kaplan, timsah, fil, ayı, çeşitli sincaplar, kartallar, baykuşlar ve diğer yabani türler ayrı bir ansiklopedi paketiyle görsel adaylarıyla listelenir. Bu kayıtlar evcil hayvan önerisi değildir; koruma, gözlem ve tür bilgisi içindir.
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
- **Günlük Bakım Rutini (Checklist):** Su tazeleme, sıcaklık/nem kontrolü, temizlik ve türe göre gerekli olabilecek nemlendirme/aydınlatma adımlarını işaretleyin; tüm görevler her türe zorunlu bakım gibi sunulmaz.
- **Yemleme Takibi (Feeding Log):** Verilen yem türü (Dubia, un kurdu, kemirgen vb.), kalsiyum/vitamin takviyesi, iştah durumu ve tarih/saat kaydı.
- **Kabuk Değişimi & Deri Dökümü (Shedding / Molt Tracker):** Sürüngen ve eklem bacaklılar için kritik deri döküm periyodu ve kabuk kalitesi takibi.
- **Kilo & Büyüme Grafiği (Weight Chart):** Chart.js ile dinamik interaktif büyüme eğrisi.
- **Teraryum İklimi & Akıllı Uyarılar:** Termometre ve higrometre ölçümlerini girin; canlının ihtiyaçlarıyla otomatik kıyaslansın.
- **Yerel bakım kayıtları:** İlk açılışta sahte demo canlıları otomatik eklenmez. Hobi takip verileri cihazdaki tarayıcı `localStorage` alanında saklanır; katalog veritabanı erişiminden bağımsızdır. JSON yedek alma ve geri yükleme araçları farklı cihaza geçişi sağlar. Takip paneli mobilde taşmayan canlı seçimi ve iki sütunlu kayıt sekmeleri sunar.
- **Yönetici kataloğu:** Supabase Auth, e-posta bağlantılı giriş ve PostgreSQL Row Level Security ile tür kataloğunu yönet. Yönetici rolü yalnızca veritabanında tanımlı tek sahip e-postasına verilir.
- **Fotoğraflı topluluk:** Onaylanmış fotoğraflar herkese açıktır; e-posta bağlantısıyla oturum açan üyeler fotoğraf paylaşabilir ve yorum yazabilir. E-posta ve hesap kimliği herkese açık API yanıtlarına verilmez; yalnızca takma ad yayımlanır. Bekleyen görseller özel depoda kalır, gönderi onaylanana kadar gösterilmez.
- **Yerel fotoğraflı katalog:** Hayvanların fotoğrafları, kısa tanıtımları ve temel bakım bilgileri bu sitedeki kartlarda gösterilir. Kartı açarak ayrıntılı rehbere ulaşabilir, türleri arama ve kategori/zorluk filtreleriyle keşfedebilirsiniz.
- **İki akışlı günlük haber arşivi:** Vercel Cron; Mongabay, Phys.org, BBC News Türkçe, DW Türkçe ve Hürriyet RSS akışlarını her gün alıp Supabase'e yazar. İngilizce dünya haberleri Google Cloud Translation ile Türkçeye çevrilir; özgün başlık ve yayıncı bağlantısı korunur. Türkiye akışında doğa/hayvan haberleri öne çıkar, tarihli diğer yerel haberler de boşluğu önler. Arşiv 180 gün saklanır. Otomatik çeviri hatalı olabileceğinden kaynak habere bağlantı verilir.

### Veteriner sağlık merkezi
- `veterinarian.html` acil belirtiler, koruyucu gözlem ve egzotik hayvan veterinerine hazırlanma konularında genel bilgilendirme sunar.
- İçerikler ARAV, VCA Animal Hospitals ve RSPCA gibi yabancı veterinerlik/hayvan refahı kaynaklarına bağlanır. Sayfa tanı veya tedavi yerine geçmez; klinik belirtilerde veteriner desteği alın.
- Tür bakım özetleri kaynak bağlantısı ve belirsizlik uyarısıyla sunulur; hobi kaynakları klinik/veteriner tavsiyesi değildir.

---

## 🚀 Nasıl Çalıştırılır?

Statik sayfaları yerelde açabilirsin. Supabase kullanan yönetici paneli ve çevrimiçi katalog için sayfaları HTTPS üzerinden yayınla; Supabase ayarlarını ve veritabanı kurulumunu tamamla. Arama görünürlüğü garanti edilemez; gerçek ve kaynaklı içerik, erişilebilir HTML, doğru canonical/sitemap adresi, Search Console doğrulaması ve kullanıcı deneyimi gerekir. Botlara ve ziyaretçilere farklı içerik sunma veya yapay zekâ kullanımını gizlemek için cloaking yapma.

### Arama motoru görünürlüğü

- Ana sayfa ve tür kataloğunda başlık, açıklama ve sosyal önizleme etiketleri ile JSON-LD bulunur; yapılandırılmış verinin metni sayfada gerçekten görünen içerikle eşleşmelidir.
- Yayındaki adres `https://exotic-pets-hub.vercel.app/` olarak doğrulandı; eski `terraexotica.vercel.app` adresi 404 döndürüyor. Canonical, Open Graph URL'leri, yapılandırılmış veriler, robots ve sitemap bu çalışan Vercel alan adını kullanmalıdır.
- `animals.html` kataloğunda editoryal kayıtlar ile `requested-species.js` içindeki 400 kullanıcı listesi türü birlikte gösterilir. İsim veya bilimsel adı mevcut kayıtlarda bulunan türler tekrar eklenmez; yeni kayıtların görselleri Wikimedia Commons üzerinden aday olarak yüklenir.

1. `index.html` dosyasını Google Chrome, Microsoft Edge, Mozilla Firefox veya dilediğiniz bir tarayıcıda çift tıklayarak açın.
2. Veya VS Code kullanıyorsanız *Live Server* eklentisiyle çalıştırabilirsiniz.

### Supabase kurulumu

1. Supabase'de proje oluştur. SQL Editor'da `supabase-schema.sql` dosyasının tamamını çalıştır. Bu; katalog ve haber arşivi tablolarını, tek sahip hesabı denetimini, topluluk tablolarını, sütun düzeyinde veri erişimini, RLS ve yalnızca onaylanan fotoğrafların okunabildiği özel `community-media` deposunu kurar. Yönetici hesabı `yeskin85@gmail.com` olarak sabitlenmiştir; eski `admin_allowlist` tablosu varsa kaldırılır. Şema değişikliği mevcut gönderi/yorum takma adlarını profillerden yeni herkese açık görünen alanlara aktarır; çalıştırmadan önce Supabase yedeği al. Eski topluluk fotoğraf yollarında kullanıcı UUID'si bulunduğu için SQL bu yolları algılarsa açık hata vererek durur; varsa bu görselleri Supabase Storage API ile yeniden adlandırıp gönderi `image_path` değerlerini güncellemeden şemayı çalıştırma.
2. Supabase Project Settings → API'den Project URL ile **publishable/anon** anahtarını al. `catalog-config.js` içindeki `url` ve `publishableKey` alanlarına yerleştir. `service_role` veya secret anahtarını istemci koduna hiçbir zaman ekleme.
3. Supabase Authentication'da Email sağlayıcısını etkinleştir. Topluluk için e-posta OTP ile kullanıcı kaydı açık olmalıdır; bu kullanıcılar yalnızca yayımlanmış topluluk içeriğini görebilir ve kendi gönderilerini moderasyona yollar. Yönetici girişi yeni kullanıcı oluşturmaz (`shouldCreateUser: false`); yönetici yetkisi RLS içinde yalnızca `yeskin85@gmail.com` e-postasına verilir. Bu e-posta Supabase Auth → Users içinde bulunmalı ve doğrulanmış olmalıdır. Dashboard'da Invite user görünmüyorsa Users ekranındaki Add user veya Create user seçeneğini kullan.
4. Siteyi HTTPS üzerinden yayınla. Supabase Authentication → URL Configuration alanındaki Site URL'yi üretim alan adına, Redirect URLs'i `admin.html` ve `community.html` dönüş adreslerine ayarla. E-posta bağlantısını giriş isteğinin yapıldığı bilgisayardaki aynı tarayıcıda aç; Supabase oturumu bu cihazın tarayıcısına kaydedilir. Dosya URL'leri e-posta kimlik doğrulaması için uygun değildir. Üretimde e-posta SMTP ve rate-limit ayarlarını yapılandır.
5. `admin.html` sayfasında owner e-postasıyla giriş yap. **Mevcut türleri veritabanına aktar** düğmesi başlangıç kataloğunu Supabase'e kopyalar. Sonraki tür ekleme, düzenleme ve silme işlemleri veritabanına yazılır. Aynı panelde topluluk gönderilerini ve yorumlarını onayla/reddet.

### Vercel haber otomasyonu

1. Google Cloud Console'da Cloud Translation API'yi etkinleştir ve faturalandırma/kota ayarlarını yap. Vercel Project → Settings → Environment Variables alanında `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, uzun/rastgele `CRON_SECRET` ve `GOOGLE_TRANSLATE_API_KEY` değerlerini Production ortamına ekle. Topluluk paylaşımı bildirimleri için ayrıca `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, doğrulanmış gönderici adresi `RESEND_FROM_EMAIL` ve `ADMIN_NOTIFICATION_EMAIL` değişkenlerini ekle. Google anahtarını Translation API ile sınırla. `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` ve Google anahtarı yalnızca Vercel sunucu fonksiyonlarında kullanılmalı; `catalog-config.js` veya başka tarayıcı dosyalarına koyma.
2. Güncellenmiş `supabase-schema.sql` dosyasını Supabase SQL Editor'da çalıştır. Vercel'e yeniden deploy et; `vercel.json` her gün 03:00 UTC için `/api/cron/news` işini tanımlar. Haber ekranı ortak Supabase arşivini `/api/news` üzerinden okur.
3. İlk arşivi beklemeden doldurmak için `CRON_SECRET` ortam değişkenini ayarladıktan sonra PowerShell'de `Invoke-RestMethod -Uri "https://<üretim-alan-adın>/api/cron/news" -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }` çalıştır. Vercel Cron sonraki günlerde otomatik devam eder.
Yönetici girişi veritabanı RLS politikalarıyla da sınırlandırılır; arayüzdeki giriş kontrolü tek başına güvenlik sınırı değildir. Yönetici hesabını değiştirmek istersen `supabase-schema.sql` içindeki `is_terra_admin()` fonksiyonunda e-posta sabitini güncelle ve şemayı yeniden çalıştır; ikinci bir yönetici ekleme mekanizması yoktur. Topluluk içeriği kısa uzunluk sınırları, temel kaba dil filtresi, saatte en fazla 5 gönderi/15 yorum, fotoğraf yükleme limiti ve zorunlu yönetici onayından geçer. Fotoğraflar yüklenirken konum gibi EXIF üst verileri kaldırılır; fotoğraf yollarında hesap UUID'si bulunmaz. İçerik denetimi kesin değildir; kullanıcı bildirimleri ve düzenli moderasyon gerekir. Katalog JSON verisi istemciden yalnızca admin RLS yetkisiyle yazılır. Tür listesi sonlu olmadığından yeni türleri yönetici panelinden ekle.

---

## 📁 Dosya Yapısı

- `index.html`: Ana sayfa, öne çıkan türler, haber akışı, günlük takip paneli ve modallar.
- `news.html`: Dünyadan güncel ve Türkiye gündeminden tarihli haberler için ayrı akış ve Supabase merkezi arşiv sayfası.
- `api/cron/news.js`, `api/news.js`: Vercel günlük RSS eşitleme/Google çeviri işi ve herkese açık salt-okunur haber arşivi uç noktası.
- `news-sources.js`: Tarayıcı RSS yedek akışı ve Vercel zamanlayıcısının ortak kaynak listesi.
- `animals.html`: Arama, kategori ve bakım seviyesi filtreleri olan tam tür kataloğu.
- `community.html`, `community.js`: E-posta ile giriş/kayıt, bilgisayardan veya telefondan fotoğraflı soru gönderimi, yayımlanmış akış ve moderasyon bekleyen kendi içeriklerinin durumu. Fotoğraf seçicisi dosya/görüntü seçer (zorunlu kamera açmaz); görüntü verisi yeniden kodlanarak EXIF üst verileri temizlenir.
- `privacy.html`: Topluluk, yerel takip verileri ve harici servisler hakkında kullanıcıya açık gizlilik özeti; talepler için yayımlanan iletişim e-postası.
- `news.js`: Merkezi haber API'si, tarayıcı önbelleği ve sunucu arşivi bulunmadığında doğrudan RSS yedeği.
- `veterinarian.html`: Güvenilir kaynak bağlantılı, genel veteriner sağlık ve acil yönlendirme merkezi.
- `admin.html`: Tek sahip hesabına bağlı Supabase yönetici girişi, katalog düzenleyicisi ve topluluk moderasyonu.
- `admin.js`, `catalog-db.js`: Yönetici oturumu/katalog CRUD, moderasyon ve genel katalog veritabanı entegrasyonu.
- `catalog-config.js`: Supabase URL ve public/publishable key ayar yeri; secret anahtarlar buraya konmamalıdır.
- `supabase-schema.sql`: PostgreSQL katalog/topluluk tabloları, tek sahip yetkilendirmesi, topluluk için sütun düzeyinde izinler ve RLS, moderasyon ve özel depolama şeması. Public istemciler gönderi sahibinin UUID/e-posta alanlarını okuyamaz; yalnızca moderasyondan geçmiş içerik ve takma ad görünür.
- `style.css`: Egzotik orman/teraryum karanlık modu, cam efektleri (glassmorphism), neon rozetler ve animasyonlar.
- `data.js`, `additional-species.js`, `extra-species.js`: Kaynak/bakım kartı derinliği farklı olan editoryal tür rehberleri ve hazır başlangıç hobici demo kayıtları. `requested-species.js`, kullanıcı tarafından sağlanan geniş tür listesindeki mevcut olmayan kayıtları ekler.
- `app.js`: Filtreleme, arama, veri depolama (CRUD), interaktif grafikler ve bildirim sistemi.
- `assets/species/`: Tür adıyla eşleştirilmiş yerel fotoğraflar; sanatçı ve lisans bilgileri her tür kartında gösterilir.
- Tür rehberinde olmayan hayvanları takip formundan kendi tür adınla ekleyebilirsin. Bu özel adlar ve hayvan kayıtları yalnızca o tarayıcıda saklanır; bakım değerleri uydurulmaz.
- `assets/hero-exotic.mp4`: Ana sayfadaki kullanıcının sağladığı, sessiz ve döngüsel oynatılan hero videosu.
- `assets/hero-forest.webm`: 720p hero videosu (Tom Hawkins, Wikimedia Commons; [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)).
- `assets/dragon.svg`: Sekme simgesi; Font Awesome Dragon ikonu ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
