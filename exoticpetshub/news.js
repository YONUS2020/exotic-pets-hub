const TERRA_NEWS_SOURCES = window.TERRA_NEWS_SOURCES;
const TERRA_NEWS_CACHE_KEY = 'terra_news_archive_v5';
const TERRA_NEWS_CACHE_DURATION = 24 * 60 * 60 * 1000;
const TERRA_NEWS_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
const TERRA_NEWS_RECENT_AGE = 30 * 24 * 60 * 60 * 1000;
const TERRA_NEWS_ARCHIVE_LIMIT = 250;
const TERRA_NEWS_RELEVANCE = /(?:^|[^a-zığüşöç0-9])(?:egzotik|hayvan(?:lar[ıi]?|ların|lerde|ı|ın)?|köpek(?:ler|lerin|leri|lere|lerden)?|kedi(?:ler|lerin|leri|lere)?|yaban(?:ı|da|dan|ın|hayatı|hayatını|hayatında|yaşamı)?|sürüngen(?:ler|lerin|leri)?|örümcek(?:ler|lerin|leri)?|tarantula(?:lar|ların)?|akrep(?:ler|lerin)?|çıyan(?:lar|ların)?|kırkayak(?:lar|ların)?|gecko|geko|kertenkele(?:ler|lerin)?|yılan(?:lar|ların)?|piton|boa|amfibi(?:ler|lerin)?|kurbağa(?:lar|ların)?|semender(?:ler|lerin)?|böcek(?:ler|lerin)?|habitat|biyoçeşitlilik|biyolojik çeşitlilik|doğa(?:yı|da|dan|nın|sal)?|çevre(?:yi|de|den|nin)?|orman(?:lar|ları|larda|dan|da|lık|ının)?|balık(?:lar|ların)?|kuş(?:lar|ların)?|kaplumbağa(?:lar|ların)?|vaşak|kurt|deniz(?:ler|de|den)?|iklim(?:de|sel)?|ekosistem|tür koruma|kaçak hayvan|yasa dışı ticaret|wildlife|biodiversity|conservation|reptile|spider|snake|scorpion|insect|frog|amphibian|animal|species|ecosystem|endangered|extinction|mammal|bird|marine|ocean|turtle|lizard|evolution|vertebrate|invertebrate)(?:$|[^a-zığüşöç0-9])/;
const TERRA_NEWS_TURKEY = /(türkiye|türk|anadolu|istanbul|ankara|izmir|antalya|muğla|van\b|artvin|rize|kapadokya|marmara|ege bölgesi|akdeniz bölgesi|karadeniz|dicle|fırat|boğaziçi|turkey|anatolia)/;
let latestNewsRefresh = 0;

const newsElements = {
  status: document.getElementById('newsStatus'),
  worldFeed: document.getElementById('worldNewsFeed'),
  turkeyFeed: document.getElementById('turkeyNewsFeed'),
  sources: document.getElementById('newsSourceLinks'),
  refresh: document.getElementById('refreshNewsButton')
};

function setNewsStatus(message, isError = false) {
  newsElements.status.textContent = message;
  newsElements.status.className = `mt-4 text-sm ${isError ? 'text-amber-200' : 'text-slate-400'}`;
}

function safeNewsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function cleanNewsText(value, maxLength) {
  const parsed = new DOMParser().parseFromString(value || '', 'text/html');
  parsed.querySelectorAll('script, style, noscript').forEach(element => element.remove());
  const plainText = parsed.body.textContent
    .replace(/\s+/g, ' ')
    .trim();
  return plainText.length > maxLength ? `${plainText.slice(0, maxLength - 1).trimEnd()}…` : plainText;
}

function validNewsItems(items) {
  return items.filter(item => item && typeof item.title === 'string'
    && typeof item.source === 'string' && typeof item.summary === 'string'
    && typeof item.language === 'string' && typeof item.link === 'string'
    && safeNewsUrl(item.link));
}

function readNewsCache() {
  try {
    const value = localStorage.getItem(TERRA_NEWS_CACHE_KEY);
    if (!value) return null;
    const cache = JSON.parse(value);
    if (!cache || !Number.isFinite(cache.fetchedAt)
      || !Array.isArray(cache.worldItems) || !Array.isArray(cache.turkeyItems)) return null;
    return {
      fetchedAt: cache.fetchedAt,
      worldItems: validNewsItems(cache.worldItems),
      turkeyItems: validNewsItems(cache.turkeyItems),
      fromServer: cache.fromServer === true
    };
  } catch (error) {
    console.warn('Haber arşivi okunamadı:', error.message);
    return null;
  }
}

function renderNews(items, container) {
  container.replaceChildren();
  const limit = Number(container.dataset.newsLimit) || TERRA_NEWS_ARCHIVE_LIMIT;
  const shownItems = items.slice(0, limit);
  if (!shownItems.length) {
    const empty = document.createElement('p');
    empty.className = 'rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm leading-relaxed text-slate-300';
    empty.textContent = 'Bu akışta henüz eşleşen haber yok. Kaynaklar günlük yenilenir; daha sonra tekrar bakabilirsin.';
    container.append(empty);
    return;
  }

  for (const item of shownItems) {
    const itemUrl = safeNewsUrl(item.link);
    if (!itemUrl) continue;
    const card = document.createElement('article');
    card.className = 'glass-panel flex h-full flex-col rounded-2xl p-5';
    const source = document.createElement('p');
    source.className = 'text-xs font-semibold uppercase tracking-wider text-emerald-300';
    source.textContent = item.source;
    const title = document.createElement('h3');
    title.className = 'mt-2 text-lg font-bold leading-snug text-white';
    const link = document.createElement('a');
    link.href = itemUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.title;
    title.append(link);
    const summary = document.createElement('p');
    summary.className = 'mt-3 flex-1 text-sm leading-relaxed text-slate-300';
    summary.textContent = item.summary || 'Haberi kaynağında okuyun.';
    const translationNote = document.createElement('p');
    translationNote.className = 'mt-2 text-xs text-amber-200';
    let originalDetails = null;
    if (item.translated && item.originalTitle) {
      translationNote.textContent = `Google Cloud Translation · makine çevirisi${item.originalLanguage ? ` (${item.originalLanguage.toLocaleUpperCase('tr-TR')} → TR)` : ''}`;
      originalDetails = document.createElement('details');
      originalDetails.className = 'mt-2 text-xs text-slate-400';
      const originalSummary = document.createElement('summary');
      originalSummary.className = 'cursor-pointer text-emerald-300';
      originalSummary.textContent = 'Özgün başlık ve özet';
      const originalTitle = document.createElement('p');
      originalTitle.className = 'mt-2 font-semibold text-slate-300';
      originalTitle.textContent = item.originalTitle;
      const originalDescription = document.createElement('p');
      originalDescription.className = 'mt-1';
      originalDescription.textContent = item.originalSummary;
      originalDetails.append(originalSummary, originalTitle, originalDescription);
    } else if (item.originalLanguage === 'en' || item.language === 'en') {
      translationNote.textContent = 'İngilizce kaynak · çeviri kullanılamıyor';
    }
    const meta = document.createElement('p');
    meta.className = 'mt-4 text-xs text-slate-500';
    meta.textContent = `${item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'} · Kaynak habere git`;
    card.append(source, title);
    if (translationNote.textContent) card.append(translationNote);
    if (originalDetails) card.append(originalDetails);
    card.append(summary, meta);
    container.append(card);
  }
}

function renderNewsFeeds(worldItems, turkeyItems) {
  renderNews(worldItems, newsElements.worldFeed);
  renderNews(turkeyItems, newsElements.turkeyFeed);
}

function renderNewsSources() {
  newsElements.sources.replaceChildren();
  for (const source of TERRA_NEWS_SOURCES) {
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'underline hover:text-emerald-300';
    link.textContent = `${source.name} RSS`;
    newsElements.sources.append(link);
  }
}

function parseNewsFeed(xml, source) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error(`${source.name}: RSS/XML biçimi okunamadı.`);
  return Array.from(document.querySelectorAll('item')).map(item => {
    const title = cleanNewsText(item.querySelector('title')?.textContent, 180);
    const description = cleanNewsText(item.querySelector('description')?.textContent, 280);
    const rawLink = item.querySelector('link')?.textContent?.trim()
      || item.querySelector('link')?.getAttribute('href');
    const link = safeNewsUrl(rawLink);
    const rawDate = item.querySelector('pubDate')?.textContent
      || item.querySelector('date')?.textContent
      || item.querySelector('published')?.textContent;
    const category = cleanNewsText(item.querySelector('category')?.textContent, 80);
    const timestamp = rawDate ? Date.parse(rawDate) : NaN;
    const publishedAt = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
    return {
      source: source.name,
      language: source.language,
      category,
      title,
      summary: description,
      link,
      publishedAt,
      timestamp: Number.isFinite(timestamp) ? timestamp : 0
    };
  }).filter(item => item.title && item.link
    && (source.includeAll || TERRA_NEWS_RELEVANCE.test(`${item.title} ${item.summary}`.toLocaleLowerCase('tr-TR'))));
}

async function fetchNewsSource(source) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(source.url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
    return parseNewsFeed(await response.text(), source);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`${source.name}: yanıt zaman aşımına uğradı.`);
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function mergeNewsItems(existingItems, incomingItems, cutoff, requireRelevance = true) {
  const unique = new Map();
  for (const item of [...existingItems, ...incomingItems]) {
    if (item.timestamp && item.timestamp < cutoff) continue;
    if (requireRelevance && !TERRA_NEWS_RELEVANCE.test(`${item.title} ${item.summary}`.toLocaleLowerCase('tr-TR'))) continue;
    const key = item.link.toLowerCase();
    if (!unique.has(key)) unique.set(key, item);
  }
  return Array.from(unique.values())
    .sort((a, b) => {
      const relevanceOrder = Number(TERRA_NEWS_RELEVANCE.test(`${b.title} ${b.summary}`.toLocaleLowerCase('tr-TR')))
        - Number(TERRA_NEWS_RELEVANCE.test(`${a.title} ${a.summary}`.toLocaleLowerCase('tr-TR')));
      if (relevanceOrder) return relevanceOrder;
      const languageOrder = Number(a.language !== 'tr') - Number(b.language !== 'tr');
      return languageOrder || b.timestamp - a.timestamp;
    })
    .slice(0, TERRA_NEWS_ARCHIVE_LIMIT);
}

async function fetchServerNews() {
  const response = await fetch('/api/news', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Merkezi haber arşivi HTTP ${response.status} yanıtı verdi.`);
  const archive = await response.json();
  if (!archive || !Number.isFinite(archive.fetchedAt) || archive.fetchedAt <= 0
    || !Array.isArray(archive.worldItems) || !Array.isArray(archive.turkeyItems)
    || (!archive.worldItems.length && !archive.turkeyItems.length)) {
    throw new Error('Merkezi haber arşivi henüz doldurulmamış.');
  }
  const now = Date.now();
  return {
    worldItems: mergeNewsItems(
      [],
      validNewsItems(archive.worldItems),
      now - TERRA_NEWS_RECENT_AGE
    ),
    turkeyItems: mergeNewsItems(
      [],
      validNewsItems(archive.turkeyItems),
      now - TERRA_NEWS_MAX_AGE,
      false
    ),
    fetchedAt: archive.fetchedAt,
    errors: [],
    fromServer: true,
    translationEnabled: archive.translationEnabled === true,
    translatedEnglishCount: Number(archive.translatedEnglishCount) || 0,
    untranslatedEnglishCount: Number(archive.untranslatedEnglishCount) || 0
  };
}

async function fetchLatestNewsFromFeeds(cache) {
  const results = await Promise.allSettled(TERRA_NEWS_SOURCES.map(fetchNewsSource));
  const incomingWorld = [];
  const incomingTurkey = [];
  const errors = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      errors.push(result.reason.message);
      return;
    }
    const source = TERRA_NEWS_SOURCES[index];
    result.value.forEach(item => {
      if (source.groups.includes('world')) incomingWorld.push(item);
      if (source.groups.includes('turkey') && item.language === 'tr'
        && (source.includeAll
          ? !/(^|\s)(dünya|world)(\s|$)/i.test(item.category)
          : TERRA_NEWS_TURKEY.test(`${item.title} ${item.summary}`.toLocaleLowerCase('tr-TR')))) {
        incomingTurkey.push(item);
      }
    });
  });

  const now = Date.now();
  const worldItems = mergeNewsItems(
    cache?.worldItems || [],
    incomingWorld.filter(item => !item.timestamp || item.timestamp >= now - TERRA_NEWS_RECENT_AGE),
    now - TERRA_NEWS_RECENT_AGE
  );
  const turkeyItems = mergeNewsItems(
    cache?.turkeyItems || [],
    incomingTurkey,
    now - TERRA_NEWS_MAX_AGE,
    false
  );
  if (!results.some(result => result.status === 'fulfilled')) {
    throw new Error(errors.join(' · ') || 'Haber kaynaklarına erişilemedi.');
  }
  return { worldItems, turkeyItems, errors, fromServer: false };
}

async function fetchLatestNews(cache) {
  try {
    return await fetchServerNews();
  } catch (archiveError) {
    const fallback = await fetchLatestNewsFromFeeds(cache);
    fallback.archiveError = archiveError.message;
    return fallback;
  }
}

async function refreshTerraNews(force = false) {
  const now = Date.now();
  const cache = readNewsCache();
  if (!force && cache && now - cache.fetchedAt < TERRA_NEWS_CACHE_DURATION) {
    renderNewsFeeds(cache.worldItems, cache.turkeyItems);
    latestNewsRefresh = cache.fetchedAt;
    const cacheNote = cache.fromServer
      ? 'Merkezi akış Vercel zamanlamasıyla her gün yenilenir.'
      : 'Bu yedek akış yalnızca bu tarayıcıya aittir.';
    setNewsStatus(`Haber arşivi bu tarayıcıda önbellekli · ${new Date(cache.fetchedAt).toLocaleString('tr-TR')}. ${cacheNote}`);
    return;
  }

  newsElements.refresh.disabled = true;
  if (cache) renderNewsFeeds(cache.worldItems, cache.turkeyItems);
  setNewsStatus('Haber kaynakları yenileniyor...');
  try {
    const result = await fetchLatestNews(cache);
    renderNewsFeeds(result.worldItems, result.turkeyItems);
    latestNewsRefresh = result.fetchedAt || now;
    let cacheWarning = '';
    try {
      localStorage.setItem(TERRA_NEWS_CACHE_KEY, JSON.stringify({
        fetchedAt: result.fetchedAt || now,
        worldItems: result.worldItems,
        turkeyItems: result.turkeyItems,
        fromServer: result.fromServer
      }));
    } catch (error) {
      console.warn('Haber arşivi kaydedilemedi:', error.message);
      cacheWarning = ' Tarayıcı arşivi kaydedilemedi; haberler sayfa açıkken gösterilir.';
    }
    const sourceNote = result.errors.length
      ? ` Bazı kaynaklar yanıt vermedi: ${result.errors.join(' · ')}`
      : '';
    let archiveNote = ` Merkezi arşiv kullanılamıyor (${result.archiveError}). Tarayıcı bu oturumda RSS kaynaklarını doğrudan kontrol etti; arşiv bu cihaza özeldir.`;
    if (result.fromServer) {
      archiveNote = ' Merkezi Vercel/Supabase arşivi; RSS kaynakları her gün otomatik güncellenir.';
      if (!result.translationEnabled) {
        archiveNote += ' Google Cloud Translation anahtarı tanımlı değil; İngilizce haberler özgün dilinde gösterilir.';
      } else if (result.translatedEnglishCount) {
        archiveNote += ` ${result.translatedEnglishCount} İngilizce haber Türkçeye çevrildi.`;
        if (result.untranslatedEnglishCount) archiveNote += ` ${result.untranslatedEnglishCount} haber çevirilemedi ve özgün dilinde bırakıldı.`;
      } else if (!result.untranslatedEnglishCount) {
        archiveNote += ' Arşivde şu anda İngilizce haber bulunmuyor.';
      } else {
        archiveNote += ' İngilizce haberler henüz çevrilmedi; kaynak dilinde gösteriliyor.';
      }
    }
    setNewsStatus(`Son arşiv kontrolü ${new Date(result.fetchedAt || now).toLocaleString('tr-TR')}.${archiveNote}${sourceNote}${cacheWarning}`, Boolean(result.errors.length || cacheWarning || !result.fromServer));
  } catch (error) {
    if (cache?.worldItems.length || cache?.turkeyItems.length) {
      renderNewsFeeds(cache.worldItems, cache.turkeyItems);
      latestNewsRefresh = cache.fetchedAt;
      setNewsStatus(`Güncel haberler alınamadı; bu tarayıcıdaki son kayıtlı akış gösteriliyor (${new Date(cache.fetchedAt).toLocaleString('tr-TR')}). ${error.message}`, true);
    } else {
      renderNewsFeeds([], []);
      setNewsStatus(`Haberler yüklenemedi. Bağlantıyı kontrol edip yeniden dene. ${error.message}`, true);
    }
  } finally {
    newsElements.refresh.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!newsElements.status || !newsElements.worldFeed || !newsElements.turkeyFeed
    || !newsElements.sources || !newsElements.refresh) return;
  renderNewsSources();
  newsElements.refresh.addEventListener('click', () => void refreshTerraNews(true));
  void refreshTerraNews();
  window.setInterval(() => {
    if (Date.now() - latestNewsRefresh >= TERRA_NEWS_CACHE_DURATION) void refreshTerraNews(true);
  }, TERRA_NEWS_CACHE_DURATION);
});
