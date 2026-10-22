const TAXONOMY_API_URL = 'https://api.inaturalist.org/v1/taxa';
const TAXONOMY_PAGE_SIZE = 24;
const TAXONOMY_MOBILE_PAGE_SIZE = 8;
const TAXONOMY_FALLBACK_PAGE_SIZE = 6;
const TAXONOMY_REQUEST_TIMEOUT = 10000;
const TAXONOMY_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const TAXONOMY_CACHE_PREFIX = 'terra-taxonomy-v1:';
const TAXONOMY_IMAGE_HOSTS = new Set([
  'inaturalist-open-data.s3.amazonaws.com',
  'static.inaturalist.org'
]);
const TAXONOMY_REUSABLE_PHOTO_LICENSES = new Map([
  ['cc0', { name: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' }],
  ['cc-by', { name: 'CC BY', url: 'https://creativecommons.org/licenses/by/4.0/' }],
  ['cc-by-sa', { name: 'CC BY-SA', url: 'https://creativecommons.org/licenses/by-sa/4.0/' }],
  ['cc-by-nc', { name: 'CC BY-NC', url: 'https://creativecommons.org/licenses/by-nc/4.0/' }],
  ['cc-by-nc-sa', { name: 'CC BY-NC-SA', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' }],
  ['cc-by-nc-nd', { name: 'CC BY-NC-ND', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/' }],
  ['cc-by-nc-sa-nd', { name: 'CC BY-NC-SA-ND', url: 'https://creativecommons.org/licenses/by-nc-sa-nd/4.0/' }]
]);

const taxonomyElements = {
  form: document.getElementById('taxonomySearchForm'),
  group: document.getElementById('taxonomyGroup'),
  query: document.getElementById('taxonomyQuery'),
  search: document.getElementById('taxonomySearchButton'),
  status: document.getElementById('taxonomyStatus'),
  results: document.getElementById('taxonomyResults'),
  previous: document.getElementById('taxonomyPrevious'),
  next: document.getElementById('taxonomyNext')
};

let taxonomyPage = 1;
let taxonomyTotalResults = 0;
let taxonomyRequestController = null;

function getTaxonomyPageSize() {
  return window.matchMedia('(max-width: 639px)').matches
    ? TAXONOMY_MOBILE_PAGE_SIZE
    : TAXONOMY_PAGE_SIZE;
}

function setTaxonomyStatus(message, isError = false) {
  taxonomyElements.status.textContent = message;
  taxonomyElements.status.className = `text-sm ${isError ? 'text-amber-200' : 'text-slate-300'}`;
}

function readCachedTaxonomyResults(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (!cached || Date.now() - cached.savedAt > TAXONOMY_CACHE_MAX_AGE) return null;
    return {
      payload: readTaxonomyResponse(cached.payload),
      savedAt: cached.savedAt
    };
  } catch (error) {
    console.warn('Kaydedilmiş taksonomi sonuçları okunamadı:', error.message);
    return null;
  }
}

function saveCachedTaxonomyResults(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify({ payload, savedAt: Date.now() }));
  } catch (error) {
    console.warn('Taksonomi sonuçları çevrimdışı kullanım için kaydedilemedi:', error.message);
  }
}

function safeTaxonomyImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && TAXONOMY_IMAGE_HOSTS.has(url.hostname) ? url.href : '';
  } catch {
    return '';
  }
}

function safeTaxonomySourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function getLocalTaxonomyFallback(groupId, query) {
  const groupMatchers = {
    '26036': animal => animal.category === 'reptile',
    '85553': animal => animal.category === 'reptile'
      && /yılan|snake|boa|python|piton|morelia|pantherophis|heterodon|lampropeltis|antare?si?a|epicrates|corallus/i.test(`${animal.name} ${animal.scientificName}`),
    '47118': animal => animal.category === 'invertebrate'
      && /tarantula|örümcek|spider|akrep|scorpion|brachypelma|grammostola|heterometrus|pandinus/i.test(`${animal.name} ${animal.scientificName}`),
    '47424': animal => animal.category === 'invertebrate'
      && /tarantula|brachypelma|tliltocatl|grammostola|caribena|poecilotheria|aphonopelma|chromatopelma|lasiodora|psalmopoeus|pterinochilus/i.test(`${animal.name} ${animal.scientificName}`),
    '48894': animal => animal.category === 'invertebrate'
      && /akrep|scorpion|pandinus|heterometrus|centruroides/i.test(`${animal.name} ${animal.scientificName}`),
    '47158': animal => animal.category === 'invertebrate'
      && /böcek|mantis|cockroach|hamam böceği|beetle|stick insect|phasmid/i.test(`${animal.name} ${animal.scientificName}`),
    '20978': animal => animal.category === 'amphibian',
    '49556': animal => animal.category === 'invertebrate'
      && /çıyan|centipede|scolopendra/i.test(`${animal.name} ${animal.scientificName}`),
    '47735': animal => animal.category === 'invertebrate'
      && /kırkayak|millipede|archispirostreptus/i.test(`${animal.name} ${animal.scientificName}`)
  };
  const matchesGroup = groupMatchers[groupId];
  if (!matchesGroup || typeof EXOTIC_ANIMALS_DATA === 'undefined') return [];

  const normalizedQuery = query.toLocaleLowerCase('tr');
  return EXOTIC_ANIMALS_DATA
    .filter(animal => !animal.isUserDefined && animal.imageSource && animal.imageLicense)
    .filter(matchesGroup)
    .filter(animal => !normalizedQuery
      || `${animal.name} ${animal.scientificName}`.toLocaleLowerCase('tr').includes(normalizedQuery))
    .slice(0, TAXONOMY_FALLBACK_PAGE_SIZE);
}

function buildLocalTaxonomyFallbackCard(animal, index) {
  const card = document.createElement('article');
  card.className = 'flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80';

  const imageFrame = document.createElement('div');
  imageFrame.className = 'relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950';
  const localImage = /^assets\/species\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/i.test(animal.image)
    ? animal.image
    : '';
  if (localImage) {
    const image = document.createElement('img');
    image.src = localImage;
    image.alt = `${animal.name} fotoğrafı`;
    image.loading = index < 2 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.className = 'absolute inset-0 h-full w-full object-cover';
    image.addEventListener('error', () => {
      image.remove();
      imageFrame.classList.add('flex', 'items-center', 'justify-center');
      const fallback = document.createElement('span');
      fallback.className = 'px-5 text-center text-sm font-semibold text-emerald-100/80';
      fallback.textContent = `${animal.name} · fotoğraf açılamadı`;
      imageFrame.append(fallback);
    }, { once: true });
    imageFrame.append(image);
  }

  const body = document.createElement('div');
  body.className = 'flex flex-1 flex-col items-start gap-2 p-4';
  const title = document.createElement('h3');
  title.className = 'text-base font-bold leading-snug text-white';
  title.textContent = animal.name;
  const scientificName = document.createElement('p');
  scientificName.className = 'text-sm italic text-emerald-200';
  scientificName.textContent = animal.scientificName;
  const sourceLink = document.createElement('a');
  sourceLink.href = safeTaxonomySourceUrl(animal.imageSource) || 'https://www.inaturalist.org/';
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  sourceLink.className = 'text-xs text-slate-400 underline hover:text-emerald-300';
  sourceLink.textContent = `Fotoğraf: ${animal.imageCredit || 'Kaynak'} · ${animal.imageLicense}`;
  const detailsButton = document.createElement('button');
  detailsButton.type = 'button';
  detailsButton.className = 'mt-auto min-h-11 text-left text-sm font-semibold text-emerald-300 underline hover:text-emerald-200';
  detailsButton.textContent = 'Bakım rehberini aç';
  detailsButton.addEventListener('click', () => openAnimalModal(animal.id));
  body.append(title, scientificName, sourceLink, detailsButton);
  card.append(imageFrame, body);
  return card;
}

function renderTaxonomyFallback(groupId, query) {
  const animals = getLocalTaxonomyFallback(groupId, query);
  taxonomyElements.results.replaceChildren();
  if (!animals.length) return false;

  animals.forEach((animal, index) => {
    taxonomyElements.results.append(buildLocalTaxonomyFallbackCard(animal, index));
  });
  return true;
}

function buildTaxonomyCard(taxon, index) {
  const card = document.createElement('article');
  card.className = 'flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 transition-colors hover:border-emerald-700/70';
  const taxonUrl = `https://www.inaturalist.org/taxa/${encodeURIComponent(taxon.id)}`;
  const photo = taxon.default_photo;
  const license = photo && TAXONOMY_REUSABLE_PHOTO_LICENSES.get(photo.license_code);
  const imageUrl = license
    ? safeTaxonomyImageUrl(photo.medium_url || photo.square_url || photo.url)
    : '';

  const imageFrame = document.createElement('div');
  imageFrame.className = 'relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950';
  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = `${taxon.preferred_common_name || taxon.name} fotoğrafı`;
    image.loading = index < (window.matchMedia('(max-width: 639px)').matches ? 2 : 4) ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.className = 'absolute inset-0 h-full w-full object-cover';
    image.addEventListener('error', () => {
      image.remove();
      imageFrame.classList.add('flex', 'items-center', 'justify-center');
      const fallback = document.createElement('span');
      fallback.className = 'px-5 text-center text-sm font-semibold text-emerald-100/80';
      fallback.textContent = `${taxon.name} · fotoğraf yüklenemedi`;
      imageFrame.append(fallback);
    }, { once: true });
    imageFrame.append(image);
  } else {
    imageFrame.classList.add('flex', 'items-center', 'justify-center');
    const placeholder = document.createElement('div');
    placeholder.className = 'px-5 text-center';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-leaf text-3xl text-emerald-400/70';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('p');
    label.className = 'mt-3 text-sm font-semibold text-emerald-100/80';
    label.textContent = 'Bu tür için yeniden kullanıma açık fotoğraf yok';
    placeholder.append(icon, label);
    imageFrame.append(placeholder);
  }
  card.append(imageFrame);

  const body = document.createElement('div');
  body.className = 'flex flex-1 flex-col items-start gap-2 p-4';
  const scientificName = document.createElement('h3');
  scientificName.className = 'text-base font-bold italic leading-snug text-white';
  const nameLink = document.createElement('a');
  nameLink.href = taxonUrl;
  nameLink.target = '_blank';
  nameLink.rel = 'noopener noreferrer';
  nameLink.textContent = taxon.name;
  scientificName.append(nameLink);
  body.append(scientificName);

  if (taxon.preferred_common_name) {
    const commonName = document.createElement('p');
    commonName.className = 'text-sm text-emerald-200';
    commonName.textContent = taxon.preferred_common_name;
    body.append(commonName);
  }

  const observations = document.createElement('p');
  observations.className = 'text-xs text-slate-400';
  const count = Number.isSafeInteger(taxon.observations_count)
    ? taxon.observations_count.toLocaleString('tr-TR')
    : 'Bilinmiyor';
  observations.textContent = `Gözlem sayısı: ${count}`;
  body.append(observations);

  if (imageUrl) {
    const attribution = document.createElement('p');
    attribution.className = 'mt-auto pt-1 text-[11px] leading-relaxed text-slate-500';
    attribution.append(document.createTextNode(`Fotoğraf: ${photo.attribution || photo.attribution_name || 'iNaturalist katkıcısı'} · `));
    const licenseLink = document.createElement('a');
    licenseLink.href = license.url;
    licenseLink.target = '_blank';
    licenseLink.rel = 'noopener noreferrer';
    licenseLink.className = 'underline hover:text-emerald-300';
    licenseLink.textContent = license.name;
    attribution.append(licenseLink);
    body.append(attribution);
  }

  const externalLink = document.createElement('a');
  externalLink.href = taxonUrl;
  externalLink.target = '_blank';
  externalLink.rel = 'noopener noreferrer';
  externalLink.className = 'inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 underline hover:text-emerald-200';
  externalLink.textContent = 'Tür ayrıntılarını gör';
  body.append(externalLink);
  card.append(body);
  return card;
}

function renderTaxonomyLoading() {
  taxonomyElements.results.replaceChildren();
  for (let index = 0; index < getTaxonomyPageSize(); index++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80';
    const image = document.createElement('div');
    image.className = 'aspect-[4/3] animate-pulse bg-slate-800';
    const text = document.createElement('div');
    text.className = 'space-y-3 p-4';
    for (let line = 0; line < 3; line++) {
      const placeholder = document.createElement('div');
      placeholder.className = `h-3 animate-pulse rounded bg-slate-800 ${line === 0 ? 'w-3/4' : 'w-1/2'}`;
      text.append(placeholder);
    }
    skeleton.append(image, text);
    taxonomyElements.results.append(skeleton);
  }
}

function readTaxonomyResponse(payload) {
  if (!payload || !Array.isArray(payload.results)
    || !Number.isSafeInteger(payload.total_results)
    || !Number.isSafeInteger(payload.page)) {
    throw new Error('Taksonomi servisi beklenmeyen bir yanıt verdi.');
  }
  return payload;
}

async function searchTaxonomy(page = 1) {
  if (taxonomyRequestController) taxonomyRequestController.abort();
  taxonomyRequestController = new AbortController();
  const activeController = taxonomyRequestController;
  const query = taxonomyElements.query.value.trim();
  const pageSize = getTaxonomyPageSize();
  const cacheKey = `${TAXONOMY_CACHE_PREFIX}${taxonomyElements.group.value}:${pageSize}:${query.toLocaleLowerCase('tr')}:${page}`;
  const groupLabel = taxonomyElements.group.options[taxonomyElements.group.selectedIndex]?.textContent || 'Seçilen grup';
  const params = new URLSearchParams({
    taxon_id: taxonomyElements.group.value,
    rank: 'species',
    per_page: String(pageSize),
    page: String(page),
    order_by: 'observations_count',
    locale: 'tr'
  });
  if (query) params.set('q', query);

  taxonomyElements.search.disabled = true;
  taxonomyElements.previous.disabled = true;
  taxonomyElements.next.disabled = true;
  const cached = readCachedTaxonomyResults(cacheKey);
  if (cached) {
    taxonomyPage = cached.payload.page;
    taxonomyTotalResults = cached.payload.total_results;
    taxonomyElements.results.replaceChildren();
    cached.payload.results.forEach((taxon, index) => taxonomyElements.results.append(buildTaxonomyCard(taxon, index)));
    setTaxonomyStatus(`${groupLabel} için kayıtlı türler gösteriliyor; çevrimiçi liste güncelleniyor...`);
  } else if (renderTaxonomyFallback(taxonomyElements.group.value, query)) {
    setTaxonomyStatus(`${groupLabel} çevrimiçi listesi yükleniyor. Bu sırada cihazdaki fotoğraflı tür rehberleri gösteriliyor...`);
  } else {
    taxonomyElements.results.replaceChildren();
    setTaxonomyStatus(`${groupLabel} çevrimiçi listesi yükleniyor...`);
  }

  const timeout = window.setTimeout(() => activeController.abort(), TAXONOMY_REQUEST_TIMEOUT);
  try {
    const response = await fetch(`${TAXONOMY_API_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: activeController.signal
    });
    if (!response.ok) {
      const detail = response.status === 429
        ? 'Çok sık sorgu gönderildi; kısa süre sonra yeniden dene.'
        : `HTTP ${response.status}`;
      throw new Error(`iNaturalist taksonomi araması başarısız: ${detail}`);
    }
    const payload = readTaxonomyResponse(await response.json());
    if (taxonomyRequestController !== activeController) return;
    saveCachedTaxonomyResults(cacheKey, payload);
    taxonomyPage = payload.page;
    taxonomyTotalResults = payload.total_results;
    taxonomyElements.results.replaceChildren();
    payload.results.forEach((taxon, index) => taxonomyElements.results.append(buildTaxonomyCard(taxon, index)));

    if (!payload.results.length) {
      taxonomyElements.results.append(Object.assign(document.createElement('p'), {
        className: 'rounded-xl border border-slate-800 p-4 text-sm text-slate-300 sm:col-span-2 lg:col-span-3',
        textContent: query ? 'Bu canlı grubunda eşleşen tür bulunamadı. Bilimsel adla veya daha kısa arama terimiyle dene.' : 'Bu grupta gösterilecek tür kaydı bulunamadı.'
      }));
    }

    const firstResult = payload.results.length ? (taxonomyPage - 1) * pageSize + 1 : 0;
    const lastResult = Math.min(taxonomyPage * pageSize, taxonomyTotalResults);
    setTaxonomyStatus(`${groupLabel}: ${taxonomyTotalResults.toLocaleString('tr-TR')} tür kaydı${query ? ` · “${query}” araması` : ''}. ${firstResult}-${lastResult} arası gösteriliyor; görseller lisans ve katkıcı bilgileriyle sunulur.`);
    taxonomyElements.previous.disabled = taxonomyPage <= 1;
    taxonomyElements.next.disabled = lastResult >= taxonomyTotalResults || payload.results.length === 0;
  } catch (error) {
    if (taxonomyRequestController !== activeController) return;
    if (cached) {
      const payload = cached.payload;
      taxonomyPage = payload.page;
      taxonomyTotalResults = payload.total_results;
      taxonomyElements.results.replaceChildren();
      payload.results.forEach((taxon, index) => taxonomyElements.results.append(buildTaxonomyCard(taxon, index)));
      if (!payload.results.length) {
        taxonomyElements.results.append(Object.assign(document.createElement('p'), {
          className: 'rounded-xl border border-slate-800 p-4 text-sm text-slate-300',
          textContent: 'Bu grupta gösterilecek kayıt bulunamadı.'
        }));
      }
      const firstResult = payload.results.length ? (taxonomyPage - 1) * pageSize + 1 : 0;
      const lastResult = Math.min(taxonomyPage * pageSize, taxonomyTotalResults);
      setTaxonomyStatus(
        `İnternet bağlantısı yok veya servis yanıt vermedi. ${groupLabel}: ${taxonomyTotalResults.toLocaleString('tr-TR')} tür kaydından ${firstResult}-${lastResult} arası, ${new Date(cached.savedAt).toLocaleDateString('tr-TR')} tarihinde kaydedilen sonuçlar gösteriliyor.`
      );
      taxonomyElements.previous.disabled = taxonomyPage <= 1;
      taxonomyElements.next.disabled = lastResult >= taxonomyTotalResults || payload.results.length === 0;
      return;
    }
    if (renderTaxonomyFallback(taxonomyElements.group.value, query)) {
      const reason = error.name === 'AbortError'
        ? 'Tür servisi zaman aşımına uğradı.'
        : 'Tür servisine şu anda ulaşılamıyor.';
      setTaxonomyStatus(`${reason} İnternet bağlantını kontrol et; aşağıda cihazda kayıtlı fotoğraflı bakım rehberleri gösteriliyor.`, true);
      taxonomyElements.previous.disabled = true;
      taxonomyElements.next.disabled = true;
      return;
    }
    const message = error.name === 'AbortError'
      ? 'Taksonomi servisi zaman aşımına uğradı. Bağlantıyı kontrol edip yeniden dene.'
      : error.message;
    const errorCard = document.createElement('p');
    errorCard.className = 'rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100 sm:col-span-2 xl:col-span-4';
    errorCard.textContent = 'Tür listesi şu anda yüklenemedi. Biraz bekleyip yeniden dene.';
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'ml-2 font-bold underline hover:text-white';
    retryButton.textContent = 'Yeniden dene';
    retryButton.addEventListener('click', () => void searchTaxonomy(1));
    errorCard.append(retryButton);
    taxonomyElements.results.replaceChildren(errorCard);
    setTaxonomyStatus(message, true);
  } finally {
    window.clearTimeout(timeout);
    if (taxonomyRequestController === activeController) {
      taxonomyElements.search.disabled = false;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  taxonomyElements.form.addEventListener('submit', event => {
    event.preventDefault();
    void searchTaxonomy(1);
  });
  taxonomyElements.previous.addEventListener('click', () => {
    if (taxonomyPage > 1) void searchTaxonomy(taxonomyPage - 1);
  });
  taxonomyElements.next.addEventListener('click', () => {
    if (taxonomyPage * getTaxonomyPageSize() < taxonomyTotalResults) {
      void searchTaxonomy(taxonomyPage + 1);
    }
  });
  void searchTaxonomy(1);
});
