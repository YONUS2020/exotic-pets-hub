const TAXONOMY_API_URL = 'https://api.inaturalist.org/v1/taxa';
const TAXONOMY_PAGE_SIZE = 24;
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

function setTaxonomyStatus(message, isError = false) {
  taxonomyElements.status.textContent = message;
  taxonomyElements.status.className = `text-sm ${isError ? 'text-amber-200' : 'text-slate-300'}`;
}

function safeTaxonomyImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && TAXONOMY_IMAGE_HOSTS.has(url.hostname) ? url.href : '';
  } catch {
    return '';
  }
}

function buildTaxonomyCard(taxon) {
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
    image.loading = 'eager';
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
  for (let index = 0; index < TAXONOMY_PAGE_SIZE; index++) {
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
  const groupLabel = taxonomyElements.group.options[taxonomyElements.group.selectedIndex]?.textContent || 'Seçilen grup';
  const params = new URLSearchParams({
    taxon_id: taxonomyElements.group.value,
    rank: 'species',
    per_page: String(TAXONOMY_PAGE_SIZE),
    page: String(page),
    order_by: 'observations_count',
    locale: 'tr'
  });
  if (query) params.set('q', query);

  taxonomyElements.search.disabled = true;
  taxonomyElements.previous.disabled = true;
  taxonomyElements.next.disabled = true;
  if (!taxonomyElements.results.childElementCount) renderTaxonomyLoading();
  setTaxonomyStatus(`${groupLabel} taksonomisi sorgulanıyor...`);

  const timeout = window.setTimeout(() => activeController.abort(), 12000);
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
    taxonomyPage = payload.page;
    taxonomyTotalResults = payload.total_results;
    payload.results.forEach(taxon => taxonomyElements.results.append(buildTaxonomyCard(taxon)));

    if (!payload.results.length) {
      taxonomyElements.results.append(Object.assign(document.createElement('p'), {
        className: 'rounded-xl border border-slate-800 p-4 text-sm text-slate-300 sm:col-span-2 lg:col-span-3',
        textContent: query ? 'Bu canlı grubunda eşleşen tür bulunamadı. Bilimsel adla veya daha kısa arama terimiyle dene.' : 'Bu grupta gösterilecek tür kaydı bulunamadı.'
      }));
    }

    const firstResult = payload.results.length ? (taxonomyPage - 1) * TAXONOMY_PAGE_SIZE + 1 : 0;
    const lastResult = Math.min(taxonomyPage * TAXONOMY_PAGE_SIZE, taxonomyTotalResults);
    setTaxonomyStatus(`${groupLabel}: ${taxonomyTotalResults.toLocaleString('tr-TR')} tür kaydı. ${firstResult}-${lastResult} arası gösteriliyor; görseller lisans ve katkıcı bilgileriyle sunulur.`);
    taxonomyElements.previous.disabled = taxonomyPage <= 1;
    taxonomyElements.next.disabled = lastResult >= taxonomyTotalResults || payload.results.length === 0;
  } catch (error) {
    if (taxonomyRequestController !== activeController) return;
    const message = error.name === 'AbortError'
      ? 'Taksonomi servisi zaman aşımına uğradı. Bağlantıyı kontrol edip yeniden dene.'
      : error.message;
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
    if (taxonomyPage * TAXONOMY_PAGE_SIZE < taxonomyTotalResults) {
      void searchTaxonomy(taxonomyPage + 1);
    }
  });
  void searchTaxonomy(1);
});
