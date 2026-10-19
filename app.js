/**
 * TerraExotica - Egzotik Hayvan Ansiklopedisi ve Hobici Takip Portalı
 * Ana Uygulama Mantığı (State, Filtreleme, CRUD, Chart.js, LocalStorage)
 */

// Global State
let currentCategoryFilter = 'all';
let currentDifficultyFilter = 'all';
let currentSearchQuery = '';

let pets = [];
let activePetId = null;
let feedingLogs = [];
let sheddingLogs = [];
let weightLogs = [];
let weightChartInstance = null;

// Tarih Formatlayıcı Yardımcıları
const formatTurkishDate = (dateStr) => {
  if (!dateStr) return 'Tarih Yok';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

const formatTurkishDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  try {
    const d = new Date(dateTimeStr);
    return d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateTimeStr;
  }
};

const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

// =========================================================================
// 1. BAŞLATMA & VERİ YÖNETİMİ (LOCAL STORAGE)
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadPublishedSpeciesCatalog();
  loadSavedCustomSpecies();
  const hasPetTracker = Boolean(document.getElementById('activePetDashboard'));

  if (hasPetTracker) {
    initStorage();
    populateSpeciesSelectOptions();
    renderPetsTabs();
    renderActivePetDashboard();
    updateTodayDisplay();
  }

  initSpeciesCounts();
  renderEncyclopedia();
  renderFeaturedAnimals();
  setupEventListeners();
});

function initStorage() {
  const savedPets = localStorage.getItem('terra_pets');
  const savedFeedings = localStorage.getItem('terra_feedings');
  const savedSheddings = localStorage.getItem('terra_sheddings');
  const savedWeights = localStorage.getItem('terra_weights');
  const savedActivePetId = localStorage.getItem('terra_active_pet_id');

  if (savedPets) {
    try {
      pets = JSON.parse(savedPets);
      feedingLogs = savedFeedings ? JSON.parse(savedFeedings) : [];
      sheddingLogs = savedSheddings ? JSON.parse(savedSheddings) : [];
      weightLogs = savedWeights ? JSON.parse(savedWeights) : [];
      activePetId = savedActivePetId || (pets.length > 0 ? pets[0].id : null);
    } catch (e) {
      console.error('LocalStorage okuma hatası, varsayılan demo yükleniyor:', e);
      loadDefaultSeedData();
    }

  } else {
    // İlk açılış: hobicinin deneyimleyebilmesi için hazır demo verileriyle doldur
    loadDefaultSeedData();
  }
}

function loadSavedCustomSpecies() {
  const saved = localStorage.getItem('terra_custom_species');
  if (!saved) return;

  try {
    const customSpecies = JSON.parse(saved);
    if (!Array.isArray(customSpecies)) {
      throw new Error('Özel tür verisi bir liste olmalıdır.');
    }
    const knownIds = new Set(EXOTIC_ANIMALS_DATA.map(species => species.id));
    const validSpecies = customSpecies.filter(species =>
      species &&
      typeof species.id === 'string' &&
      species.id.startsWith('custom-') &&
      typeof species.name === 'string' &&
      ['reptile', 'amphibian', 'invertebrate', 'mammal', 'aquatic'].includes(species.category) &&
      !knownIds.has(species.id)
    );
    EXOTIC_ANIMALS_DATA = [...EXOTIC_ANIMALS_DATA, ...validSpecies];
  } catch (error) {
    console.error('Kullanıcının tür listesi okunamadı:', error);
    showToast('Kaydedilmiş özel türler açılamadı. Tarayıcı depolamasını kontrol edin.', 'error');
  }
}

function loadDefaultSeedData() {
  pets = [...DEFAULT_USER_PETS];
  feedingLogs = [...DEFAULT_FEEDING_LOGS];
  sheddingLogs = [...DEFAULT_SHEDDING_LOGS];
  weightLogs = [...DEFAULT_WEIGHT_LOGS];
  activePetId = pets.length > 0 ? pets[0].id : null;
  saveAllToStorage();
}

function saveAllToStorage() {
  localStorage.setItem('terra_pets', JSON.stringify(pets));
  localStorage.setItem('terra_feedings', JSON.stringify(feedingLogs));
  localStorage.setItem('terra_sheddings', JSON.stringify(sheddingLogs));
  localStorage.setItem('terra_weights', JSON.stringify(weightLogs));
  if (activePetId) {
    localStorage.setItem('terra_active_pet_id', activePetId);
  } else {
    localStorage.removeItem('terra_active_pet_id');
  }
}

function loadDemoData() {
  if (confirm('Örnek hobici verilerini yüklemek istiyor musunuz? Mevcut kayıtlarınız güncellenecektir.')) {
    loadDefaultSeedData();
    renderPetsTabs();
    renderActivePetDashboard();
    showToast('Örnek hobici verileri başarıyla yüklendi!', 'success');
  }
}

function exportData() {
  const exportObject = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    customSpecies: EXOTIC_ANIMALS_DATA.filter(species => species.isUserDefined),
    pets,
    feedingLogs,
    sheddingLogs,
    weightLogs
  };

  const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `terra-exotica-yedek-${getTodayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Tüm verileriniz JSON dosyası olarak indirildi.', 'info');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.pets)) {
        const importedCustomSpecies = Array.isArray(data.customSpecies)
          ? data.customSpecies.filter(species => species && species.isUserDefined)
          : [];
        localStorage.setItem('terra_custom_species', JSON.stringify(importedCustomSpecies));
        EXOTIC_ANIMALS_DATA = [
          ...EXOTIC_ANIMALS_DATA.filter(species => !species.isUserDefined),
          ...importedCustomSpecies
        ];
        pets = data.pets;
        feedingLogs = Array.isArray(data.feedingLogs) ? data.feedingLogs : [];
        sheddingLogs = Array.isArray(data.sheddingLogs) ? data.sheddingLogs : [];
        weightLogs = Array.isArray(data.weightLogs) ? data.weightLogs : [];
        activePetId = pets.length > 0 ? pets[0].id : null;
        saveAllToStorage();
        renderPetsTabs();
        renderActivePetDashboard();
        showToast('Yedek başarıyla içe aktarıldı!', 'success');
      } else {
        showToast('Geçersiz yedek dosyası formatı!', 'error');
      }
    } catch (err) {
      showToast('Dosya okunurken bir hata oluştu: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// =========================================================================
// 2. ANSİKLOPEDİ & TÜR REHBERİ İŞLEMLERİ
// =========================================================================

function initSpeciesCounts() {
  const stat = document.getElementById('statSpeciesCount');
  const allCount = document.getElementById('count-all');
  if (stat) stat.innerText = EXOTIC_ANIMALS_DATA.length;
  if (allCount) allCount.innerText = EXOTIC_ANIMALS_DATA.length;

  const counts = {
    reptile: 0,
    amphibian: 0,
    invertebrate: 0,
    mammal: 0,
    aquatic: 0
  };

  EXOTIC_ANIMALS_DATA.forEach(a => {
    if (counts[a.category] !== undefined) counts[a.category]++;
  });

  Object.keys(counts).forEach(cat => {
    const el = document.getElementById(`count-${cat}`);
    if (el) el.innerText = counts[cat];
  });
}

function populateSpeciesSelectOptions() {
  const select = document.getElementById('petInputSpecies');
  if (!select) return;

  const searchInput = document.getElementById('petSpeciesSearch');
  const query = searchInput ? searchInput.value.trim().toLocaleLowerCase('tr') : '';
  const selectedId = select.value;
  const categories = [
    ['reptile', 'Sürüngenler'],
    ['invertebrate', 'Örümcekler, akrepler ve diğer eklem bacaklılar'],
    ['amphibian', 'İkiyaşamlılar'],
    ['mammal', 'Memeliler'],
    ['aquatic', 'Akuatik canlılar']
  ];

  select.replaceChildren(new Option('Tür seçin...', ''));
  categories.forEach(([category, label]) => {
    const species = EXOTIC_ANIMALS_DATA
      .filter(item => item.category === category)
      .filter(item => !query || `${item.name} ${item.scientificName} ${item.categoryName}`.toLocaleLowerCase('tr').includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    if (!species.length) return;

    const group = document.createElement('optgroup');
    group.label = label;
    species.forEach(item => {
      const option = new Option(`${item.name} (${item.scientificName})`, item.id);
      option.dataset.category = item.category;
      group.append(option);
    });
    select.append(group);
  });

  select.append(new Option('Türüm listede yok — adını kendim yazacağım', '__custom__'));
  select.value = Array.from(select.options).some(option => option.value === selectedId) ? selectedId : '';
  updateCustomSpeciesFields();
}

function updateCustomSpeciesFields() {
  const select = document.getElementById('petInputSpecies');
  const fields = document.getElementById('customSpeciesFields');
  const nameInput = document.getElementById('customSpeciesName');
  if (!select || !fields || !nameInput) return;

  const isCustom = select.value === '__custom__';
  fields.classList.toggle('hidden', !isCustom);
  nameInput.required = isCustom;
}

function getCategoryName(category) {
  return {
    reptile: 'Sürüngen',
    amphibian: 'İkiyaşamlı',
    invertebrate: 'Eklem Bacaklı',
    mammal: 'Memeli',
    aquatic: 'Akuatik canlı'
  }[category] || 'Diğer';
}

function createCustomSpecies(name, scientificName, category) {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  const existing = EXOTIC_ANIMALS_DATA.find(species =>
    species.isUserDefined &&
    species.name.toLocaleLowerCase('tr') === normalizedName.toLocaleLowerCase('tr')
  );
  if (existing) return existing;

  const slug = normalizedName
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || `tur-${Date.now()}`;
  const id = `custom-${slug}`;
  const sameId = EXOTIC_ANIMALS_DATA.find(species => species.id === id);
  if (sameId && !sameId.isUserDefined) {
    throw new Error('Bu tür kimliği katalogda zaten kullanılıyor. Tür adını biraz daha açıklayıcı yaz.');
  }

  const species = {
    id,
    name: normalizedName,
    scientificName: scientificName.trim() || 'Bilimsel adı eklenmedi',
    category,
    categoryName: getCategoryName(category),
    difficulty: 'Bilgi eklenmedi',
    difficultyLevel: 1,
    habitat: 'Bilgi eklenmedi',
    origin: 'Bilgi eklenmedi',
    lifespan: 'Bilgi eklenmedi',
    adultSize: 'Bilgi eklenmedi',
    tempHot: 'Türe özel bilgi ekleyin',
    tempCold: 'Türe özel bilgi ekleyin',
    humidity: 'Türe özel bilgi ekleyin',
    dietType: 'Bilgi eklenmedi',
    favoriteFood: 'Bilgi eklenmedi',
    uvbRequired: 'Türe özel bilgi ekleyin',
    handling: 'Bakım ve güvenli temas bilgilerini türe özel kaynaklardan doğrulayın.',
    badgeColor: 'emerald',
    image: 'assets/dragon.svg',
    shortDesc: 'Hobi takip listesi için kullanıcı tarafından eklenen tür. Bu kayıt için bakım bilgileri henüz doğrulanmamıştır.',
    careSummary: 'Bu türe ait bakım koşullarını güvenilir tür rehberlerinden veya egzotik hayvan veterinerinden doğrulayın.',
    dangerNotes: 'Bakım sıcaklığı, nem, beslenme ve temas güvenliğini türü doğrulamadan varsaymayın.',
    isUserDefined: true
  };

  EXOTIC_ANIMALS_DATA = [...EXOTIC_ANIMALS_DATA, species];
  localStorage.setItem('terra_custom_species', JSON.stringify(
    EXOTIC_ANIMALS_DATA.filter(item => item.isUserDefined)
  ));
  return species;
}

function setCategoryFilter(category) {
  currentCategoryFilter = category;
  document.querySelectorAll('.category-btn').forEach(btn => {
    if (btn.getAttribute('data-category') === category) {
      btn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-500');
      btn.classList.remove('bg-slate-900/80', 'text-slate-300', 'border-slate-800');
    } else {
      btn.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-500');
      btn.classList.add('bg-slate-900/80', 'text-slate-300', 'border-slate-800');
    }
  });
  renderEncyclopedia();
}

function setDifficultyFilter(diff) {
  currentDifficultyFilter = diff;
  document.querySelectorAll('.diff-btn').forEach(btn => {
    if (btn.getAttribute('data-diff') === diff) {
      btn.classList.add('border-emerald-500/40', 'bg-emerald-950/60', 'text-emerald-300');
      btn.classList.remove('border-slate-800', 'bg-slate-900/60', 'text-slate-400');
    } else {
      btn.classList.remove('border-emerald-500/40', 'bg-emerald-950/60', 'text-emerald-300');
      btn.classList.add('border-slate-800', 'bg-slate-900/60', 'text-slate-400');
    }
  });
  renderEncyclopedia();
}

function resetFilters() {
  currentCategoryFilter = 'all';
  currentDifficultyFilter = 'all';
  currentSearchQuery = '';
  document.getElementById('searchInput').value = '';
  setCategoryFilter('all');
  setDifficultyFilter('all');
  renderEncyclopedia();
}

function renderEncyclopedia() {
  const grid = document.getElementById('animalGrid');
  const noResults = document.getElementById('noResults');
  if (!grid) return;

  const query = currentSearchQuery.toLowerCase().trim();

  const filtered = EXOTIC_ANIMALS_DATA.filter(animal => {
    const matchesCategory = currentCategoryFilter === 'all' || animal.category === currentCategoryFilter;
    const matchesDifficulty = currentDifficultyFilter === 'all' || animal.difficultyLevel.toString() === currentDifficultyFilter;
    const matchesSearch = query === '' || 
      animal.name.toLowerCase().includes(query) || 
      animal.scientificName.toLowerCase().includes(query) ||
      animal.categoryName.toLowerCase().includes(query) ||
      animal.habitat.toLowerCase().includes(query) ||
      animal.favoriteFood.toLowerCase().includes(query);

    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');
  grid.innerHTML = filtered.map(animal => renderAnimalCard(animal)).join('');
}

function renderFeaturedAnimals() {
  const grid = document.getElementById('featuredAnimalGrid');
  if (!grid) return;

  const featuredIds = ['leopard-gecko', 'red-knee-tarantula', 'emperor-scorpion', 'jumping-spider'];
  const featuredAnimals = featuredIds
    .map(id => EXOTIC_ANIMALS_DATA.find(animal => animal.id === id))
    .filter(Boolean);

  grid.innerHTML = featuredAnimals.map(animal => renderAnimalCard(animal)).join('');
}

function renderAnimalCard(animal) {
  // Zorluk badge rengi
  let diffBadge = 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50';
  if (animal.difficultyLevel === 2) diffBadge = 'bg-amber-950/80 text-amber-400 border-amber-700/50';
  if (animal.difficultyLevel === 3) diffBadge = 'bg-rose-950/80 text-rose-400 border-rose-700/50';
  if (animal.difficultyLevel === 4) diffBadge = 'bg-purple-950/80 text-purple-400 border-purple-700/50';

  return `
    <div class="glass-panel rounded-3xl overflow-hidden glass-panel-hover flex flex-col justify-between group border border-emerald-950/60">
      
      <div>
        <!-- Görsel ve Rozetler -->
        <div class="relative h-48 w-full overflow-hidden bg-slate-900">
          <img 
            src="${animal.image}" 
            alt="${escapeHtml(animal.name)}" 
            loading="lazy" 
            decoding="async"
            class="w-full h-full ${animal.isUserDefined ? 'object-contain p-12' : 'object-cover group-hover:scale-110'} transition-transform duration-500 ease-out"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
          
          <!-- Kategori ve Zorluk Rozeti -->
          <div class="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30 shadow">
              ${escapeHtml(animal.categoryName)}
            </span>
            <span class="px-2 py-1 rounded-lg text-[10px] font-semibold border backdrop-blur-md ${diffBadge}">
              ${escapeHtml(animal.difficulty)}
            </span>
          </div>

          <div class="absolute bottom-3 left-3 right-3">
            <h3 class="text-xl font-bold font-cinzel text-white leading-tight drop-shadow-md">
              ${escapeHtml(animal.name)}
            </h3>
            <span class="text-xs italic text-emerald-400/90 font-serif">
              ${escapeHtml(animal.scientificName)}
            </span>
          </div>
        </div>

        <!-- Kart İçi Özellikler Tablosu -->
        <div class="p-5 space-y-3">
          <p class="text-xs text-slate-300 leading-relaxed line-clamp-2">
            ${escapeHtml(animal.shortDesc)}
          </p>

          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-950/60 text-[11px]">
            <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span class="text-slate-400 block text-[10px]">Sıcak Alan</span>
              <strong class="text-emerald-400">${escapeHtml(animal.tempHot)}</strong>
            </div>
            <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span class="text-slate-400 block text-[10px]">Nem Oranı</span>
              <strong class="block whitespace-normal break-words text-xs leading-snug text-cyan-400">${escapeHtml(animal.humidity || 'Bilgi eklenmedi')}</strong>
            </div>
            <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span class="text-slate-400 block text-[10px]">Yetişkin Boyut</span>
              <strong class="text-amber-300">${escapeHtml(animal.adultSize)}</strong>
            </div>
            <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span class="text-slate-400 block text-[10px]">Yaşam Süresi</span>
              <strong class="text-purple-300">${escapeHtml(animal.lifespan)}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Kart Alt Aksiyonları -->
      <div class="p-5 pt-0">
        <button onclick="openAnimalModal('${animal.id}')" class="w-full py-2.5 px-4 rounded-xl bg-emerald-950/70 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-700/40 hover:border-emerald-500 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-emerald-900/30">
          <span>Detaylı Bakım Rehberi</span>
          <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
        ${animal.isUserDefined ? '<p class="mt-2 text-center text-xs text-slate-500">Kişisel tür kaydı · görsel eklenmedi</p>' : `<div class="mt-2 flex items-center justify-center gap-1 truncate text-[10px] text-slate-500">
          <a class="truncate hover:text-emerald-300" href="${animal.imageSource || 'https://commons.wikimedia.org/'}" target="_blank" rel="noopener noreferrer">
            Fotoğraf: ${escapeHtml(animal.imageCredit || 'Wikimedia Commons')}
          </a>
          <span>·</span>
          <a class="shrink-0 hover:text-emerald-300" href="${animal.imageLicenseUrl || animal.imageSource || 'https://commons.wikimedia.org/'}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(animal.imageLicense || 'Kaynak')}
          </a>
        </div>`}
      </div>

    </div>
  `;
}

// =========================================================================
// 3. HAYVAN DETAY MODAL'I (ANSİKLOPEDİ)
// =========================================================================

function openAnimalModal(animalId) {
  const animal = EXOTIC_ANIMALS_DATA.find(a => a.id === animalId);
  if (!animal) return;

  const modal = document.getElementById('animalDetailModal');
  const body = document.getElementById('modalBody');

  let diffBadge = 'bg-emerald-950 text-emerald-400 border-emerald-700';
  if (animal.difficultyLevel === 2) diffBadge = 'bg-amber-950 text-amber-400 border-amber-700';
  if (animal.difficultyLevel === 3) diffBadge = 'bg-rose-950 text-rose-400 border-rose-700';
  if (animal.difficultyLevel === 4) diffBadge = 'bg-purple-950 text-purple-400 border-purple-700';

  body.innerHTML = `
    <div class="flex flex-col md:flex-row gap-6 mb-6">
      <div class="md:w-1/2 relative rounded-2xl overflow-hidden border border-emerald-800/40 shadow-xl bg-slate-900 h-64 md:h-auto">
        <img src="${animal.image}" alt="${escapeHtml(animal.name)}" class="w-full h-full ${animal.isUserDefined ? 'object-contain p-16' : 'object-cover'}" decoding="async">
        <div class="absolute top-3 left-3 flex gap-2">
          <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/80 text-emerald-300 border border-emerald-500/30">
            ${escapeHtml(animal.categoryName)}
          </span>
          <span class="px-2.5 py-1 rounded-md text-[10px] font-bold border ${diffBadge}">
            ${escapeHtml(animal.difficulty)}
          </span>
        </div>
      </div>
      ${animal.isUserDefined ? '<p class="mb-5 text-sm text-slate-500">Kişisel tür kaydı · görsel eklenmedi</p>' : `<div class="mb-5 flex items-center gap-2 text-xs text-slate-500">
        <a class="hover:text-emerald-300" href="${animal.imageSource || 'https://commons.wikimedia.org/'}" target="_blank" rel="noopener noreferrer">
          Fotoğraf: ${escapeHtml(animal.imageCredit || 'Wikimedia Commons')}
        </a>
        <span>·</span>
        <a class="hover:text-emerald-300" href="${animal.imageLicenseUrl || animal.imageSource || 'https://commons.wikimedia.org/'}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(animal.imageLicense || 'Kaynak')}
        </a>
      </div>`}

      <div class="md:w-1/2 flex flex-col justify-between">
        <div>
          <h2 class="text-3xl font-extrabold font-cinzel text-white">${escapeHtml(animal.name)}</h2>
          <p class="text-sm italic text-emerald-400 font-serif mb-3">${escapeHtml(animal.scientificName)}</p>
          <p class="text-xs text-slate-300 leading-relaxed mb-4">${escapeHtml(animal.shortDesc)}</p>
        </div>

        <div class="space-y-2 text-xs">
          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span class="text-slate-400"><i class="fa-solid fa-map-location-dot text-emerald-400 mr-2"></i>Doğal Yaşam:</span>
            <span class="font-medium text-slate-200">${escapeHtml(animal.origin)}</span>
          </div>
          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span class="text-slate-400"><i class="fa-solid fa-tree text-emerald-400 mr-2"></i>Habitat:</span>
            <span class="font-medium text-slate-200">${escapeHtml(animal.habitat)}</span>
          </div>
          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span class="text-slate-400"><i class="fa-solid fa-hourglass-half text-amber-400 mr-2"></i>Ömür:</span>
            <span class="font-medium text-slate-200">${escapeHtml(animal.lifespan)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- İklim & Ortam Tablosu -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
        <span class="text-slate-400 block text-[10px] uppercase">Sıcak Alan / Baskı</span>
        <strong class="text-base text-rose-400 block mt-0.5">${escapeHtml(animal.tempHot)}</strong>
      </div>
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
        <span class="text-slate-400 block text-[10px] uppercase">Soğuk Alan</span>
        <strong class="text-base text-blue-400 block mt-0.5">${escapeHtml(animal.tempCold)}</strong>
      </div>
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
        <span class="text-slate-400 block text-[10px] uppercase">Nem İhtiyacı</span>
        <strong class="text-base text-cyan-400 block mt-0.5">${escapeHtml(animal.humidity)}</strong>
      </div>
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
        <span class="text-slate-400 block text-[10px] uppercase">UVB Gereksinimi</span>
        <strong class="text-xs text-amber-300 block mt-1">${escapeHtml(animal.uvbRequired)}</strong>
      </div>
    </div>

    <!-- Beslenme & Bakım Notları -->
    <div class="mb-4 rounded-2xl border border-amber-700/40 bg-amber-950/30 p-4 text-sm leading-relaxed text-amber-100">
      Bu kart genel bilgilendirme içindir; bakım değerleri tanı veya tedavi önerisi değildir. Sağlık belirtileri için
      <a href="veterinarian.html" class="font-bold underline hover:text-white">Veteriner Sağlık Merkezi</a>
      sayfasına bakın ve türe uygun veterinerle görüşün.
    </div>
    <div class="space-y-4 text-xs">
      <div class="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-900/50">
        <h4 class="font-bold text-emerald-400 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-2">
          <i class="fa-solid fa-utensils"></i> Beslenme Şekli & Favori Besinler
        </h4>
        <p class="text-slate-200 font-medium">${escapeHtml(animal.dietType)}</p>
        <p class="text-slate-400 mt-1">${escapeHtml(animal.favoriteFood)}</p>
      </div>

      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <h4 class="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-2">
          <i class="fa-solid fa-hand"></i> Karakter ve Ele Alışkınlık (Handling)
        </h4>
        <p class="text-slate-300">${escapeHtml(animal.handling)}</p>
      </div>

      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <h4 class="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-2">
          <i class="fa-solid fa-house-chimney-window"></i> Teraryum & Yaşam Alanı Kurulumu
        </h4>
        <p class="text-slate-300 leading-relaxed">${escapeHtml(animal.careSummary)}</p>
      </div>

      <div class="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/40 text-rose-200">
        <h4 class="font-bold text-rose-400 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation"></i> Kritik Dikkat & Tehlike Notları
        </h4>
        <p class="text-rose-200/90 leading-relaxed">${escapeHtml(animal.dangerNotes)}</p>
      </div>

      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <h4 class="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-2">
          <i class="fa-solid fa-book-open"></i> Bakım Kaynağı ve Bilgilendirme
        </h4>
        <p class="text-sm text-slate-300 leading-relaxed">Bakım özeti hobi kaynağına dayanır; veteriner tanısı veya tedavisi değildir. Birey, gelişim evresi ve kurulum koşulları farklılık gösterebilir. Sağlık endişesinde egzotik hayvan veterinerine danışın.</p>
        ${safeExternalUrl(animal.careSourceUrl) ? `<a class="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 underline hover:text-emerald-200" href="${escapeHtml(safeExternalUrl(animal.careSourceUrl))}" target="_blank" rel="noopener noreferrer">${escapeHtml(animal.careSourceLabel || 'Tür bakım kaynağını aç')} <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i></a>` : '<p class="mt-2 text-xs text-amber-200">Bu kayıt için doğrulanmış tür bakım bağlantısı henüz eklenmedi; bakım koşullarını varsaymayın.</p>'}
      </div>
    </div>

    <!-- Alt Buton: Bu Canlıyı Takip Paneline Ekle -->
    <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
      <span class="text-xs text-slate-400">Bu türe mi sahipsiniz?</span>
      <button onclick="prefillAddPetModal('${animal.id}')" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider shadow flex items-center gap-2">
        <i class="fa-solid fa-plus-circle"></i> Bu Hayvanı Takip Listeme Ekle
      </button>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAnimalModal() {
  const modal = document.getElementById('animalDetailModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

function prefillAddPetModal(speciesId) {
  closeAnimalModal();
  if (!document.getElementById('petInputSpecies')) {
    window.location.href = 'index.html#tracker';
    return;
  }
  openAddPetModal();
  const select = document.getElementById('petInputSpecies');
  if (select) {
    select.value = speciesId;
    onSpeciesSelectChange();
  }
}

// =========================================================================
// 4. HOBİCİ GÜNLÜK TAKİP PANELİ & HAYVAN YÖNETİMİ
// =========================================================================

function renderPetsTabs() {
  const container = document.getElementById('petsListContainer');
  if (!container) return;

  if (pets.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-500 italic">Kayıtlı canlı bulunamadı.</span>';
    return;
  }

  container.innerHTML = pets.map(pet => {
    const isActive = pet.id === activePetId;
    const activeClasses = isActive 
      ? 'border-emerald-400 bg-emerald-950/80 shadow-lg shadow-emerald-900/40 text-white' 
      : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 text-slate-300';

    return `
      <button
        data-pet-id="${escapeHtml(pet.id)}"
        class="flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap ${activeClasses}"
      >
        <img src="${escapeHtml(pet.avatar || 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=150&q=80')}" alt="" class="w-10 h-10 rounded-full object-cover border border-emerald-500/50">
        <div class="text-left">
          <div class="text-sm font-bold leading-tight">${escapeHtml(pet.name)}</div>
          <div class="text-xs text-emerald-400/80">${escapeHtml(pet.speciesName)}</div>
        </div>
      </button>
    `;
    container.querySelectorAll('[data-pet-id]').forEach(button => {
      button.addEventListener('click', () => setActivePet(button.dataset.petId));
    });
  }).join('') + `
    <button onclick="openAddPetModal()" class="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-dashed border-emerald-600/50 hover:border-emerald-400 bg-emerald-950/20 text-emerald-400 hover:text-emerald-300 text-xs font-semibold whitespace-nowrap transition-all">
      <i class="fa-solid fa-plus"></i> Yeni Ekle
    </button>
  `;
}

function setActivePet(petId) {
  activePetId = petId;
  saveAllToStorage();
  renderPetsTabs();
  renderActivePetDashboard();
}

function renderActivePetDashboard() {
  const dashboard = document.getElementById('activePetDashboard');
  const emptyState = document.getElementById('emptyPetsState');

  if (pets.length === 0 || !activePetId) {
    if (dashboard) dashboard.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (dashboard) dashboard.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');

  const pet = pets.find(p => p.id === activePetId) || pets[0];
  activePetId = pet.id;

  // Künye Bilgileri
  document.getElementById('activePetName').innerText = pet.name;
  document.getElementById('activePetSpecies').innerText = pet.speciesName;
  document.getElementById('activePetGender').innerText = pet.gender || 'Bilinmiyor';
  document.getElementById('activePetAvatar').src = pet.avatar || 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=300&q=80';
  document.getElementById('activePetCategoryBadge').innerText = pet.category ? pet.category.toUpperCase() : 'EGZOTİK';

  // Yaş hesabı
  if (pet.birthDate) {
    const bDate = new Date(pet.birthDate);
    const now = new Date();
    const diffMonths = (now.getFullYear() - bDate.getFullYear()) * 12 + (now.getMonth() - bDate.getMonth());
    if (diffMonths < 12) {
      document.getElementById('activePetAge').innerText = `Yaş: ~${Math.max(1, diffMonths)} Aylık (${formatTurkishDate(pet.birthDate)})`;
    } else {
      const years = (diffMonths / 12).toFixed(1);
      document.getElementById('activePetAge').innerText = `Yaş: ~${years} Yaşında (${formatTurkishDate(pet.birthDate)})`;
    }
  } else {
    document.getElementById('activePetAge').innerText = 'Yaş: Belirtilmemiş';
  }

  // Ağırlık, Sıcaklık, Nem
  document.getElementById('activePetWeightDisplay').innerText = pet.weight ? `${pet.weight} gr` : '-- gr';
  document.getElementById('activePetTempDisplay').innerText = pet.currentTemp ? `${pet.currentTemp} °C` : '-- °C';
  document.getElementById('activePetHumidityDisplay').innerText = pet.currentHumidity ? `${pet.currentHumidity} %` : '-- %';
  document.getElementById('activePetNotes').innerText = pet.notes || 'Özel not veya veteriner kaydı bulunmuyor.';

  // İklim inputlarını doldur
  const inputT = document.getElementById('inputClimateTemp');
  const inputH = document.getElementById('inputClimateHumidity');
  if (inputT && pet.currentTemp) inputT.value = pet.currentTemp;
  if (inputH && pet.currentHumidity) inputH.value = pet.currentHumidity;
  updateClimateFeedback(pet.speciesId, pet.currentTemp, pet.currentHumidity);

  // Günlük Rutin Kontrolünü Yükle
  loadTodayRoutineChecks();

  // Yemleme Loglarını Çiz
  renderFeedingLogs();

  // Kabuk Loglarını Çiz
  renderSheddingLogs();

  // Kilo Grafiğini Güncelle
  renderWeightChart();
}

function updateTodayDisplay() {
  const el = document.getElementById('todayDateStr');
  if (el) el.innerText = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

// =========================================================================
// 5. GÜNLÜK BAKIM RUTİNİ CHECKLIST
// =========================================================================

function getChecklistStorageKey() {
  return `terra_routine_${getTodayKey()}_${activePetId}`;
}

function loadTodayRoutineChecks() {
  if (!activePetId) return;
  const key = getChecklistStorageKey();
  const saved = localStorage.getItem(key);
  const checklistData = saved ? JSON.parse(saved) : { water: false, temp: false, cleaning: false, mist: false, uvb: false };

  const items = ['water', 'temp', 'cleaning', 'mist', 'uvb'];
  let checkedCount = 0;

  items.forEach(item => {
    const el = document.getElementById(`check-${item}`);
    if (el) {
      el.checked = !!checklistData[item];
      if (el.checked) checkedCount++;
    }
  });

  updateRoutineProgress(checkedCount, items.length);
}

function toggleRoutineCheck(item) {
  if (!activePetId) return;
  const key = getChecklistStorageKey();
  const saved = localStorage.getItem(key);
  const checklistData = saved ? JSON.parse(saved) : { water: false, temp: false, cleaning: false, mist: false, uvb: false };

  const el = document.getElementById(`check-${item}`);
  checklistData[item] = el ? el.checked : false;

  localStorage.setItem(key, JSON.stringify(checklistData));

  const items = ['water', 'temp', 'cleaning', 'mist', 'uvb'];
  let checkedCount = 0;
  items.forEach(i => {
    const elem = document.getElementById(`check-${i}`);
    if (elem && elem.checked) checkedCount++;
  });

  updateRoutineProgress(checkedCount, items.length);

  if (checkedCount === items.length) {
    showToast('Tebrikler! Bugünün tüm bakım adımlarını tamamladınız.', 'success');
  }
}

function updateRoutineProgress(completed, total) {
  const progressPercent = Math.round((completed / total) * 100);
  const bar = document.getElementById('dailyProgressBar');
  const text = document.getElementById('dailyProgressText');

  if (bar) bar.style.width = `${progressPercent}%`;
  if (text) {
    text.innerText = `${completed} / ${total} Yapıldı (%${progressPercent})`;
    if (completed === total) {
      text.classList.remove('bg-emerald-950', 'text-emerald-300');
      text.classList.add('bg-emerald-600', 'text-white');
    } else {
      text.classList.add('bg-emerald-950', 'text-emerald-300');
      text.classList.remove('bg-emerald-600', 'text-white');
    }
  }
}

function resetTodayChecklist() {
  if (!activePetId) return;
  const key = getChecklistStorageKey();
  localStorage.removeItem(key);
  loadTodayRoutineChecks();
  showToast('Bugünün kontrol listesi sıfırlandı.', 'info');
}

// =========================================================================
// 6. SEKME GEÇİŞLERİ & YEMLEME / KABUK / KİLO / İKLİM
// =========================================================================

function switchTrackerSubTab(subtabName) {
  document.querySelectorAll('.tracker-subtab').forEach(btn => {
    if (btn.getAttribute('data-subtab') === subtabName) {
      btn.classList.add('bg-emerald-950', 'text-emerald-300', 'border-emerald-700');
      btn.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-800');
    } else {
      btn.classList.remove('bg-emerald-950', 'text-emerald-300', 'border-emerald-700');
      btn.classList.add('bg-slate-900', 'text-slate-400', 'border-slate-800');
    }
  });

  document.querySelectorAll('.subtab-content').forEach(content => {
    content.classList.add('hidden');
  });

  const activeContent = document.getElementById(`subtab-${subtabName}`);
  if (activeContent) activeContent.classList.remove('hidden');

  if (subtabName === 'weight') {
    setTimeout(renderWeightChart, 100);
  }
}

// --- Yemleme Logları ---
function renderFeedingLogs() {
  const container = document.getElementById('feedingLogsContainer');
  if (!container || !activePetId) return;

  const logs = feedingLogs
    .filter(log => log.petId === activePetId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
        Bu hayvan için henüz yemleme kaydı girilmedi. 
        <button onclick="openAddFeedingModal()" class="block mx-auto mt-2 text-emerald-400 hover:underline">İlk yemlemeyi kaydet</button>
      </div>
    `;
    return;
  }

  container.innerHTML = logs.map(log => `
    <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg ${log.eaten ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'} flex items-center justify-center text-sm border ${log.eaten ? 'border-emerald-800' : 'border-rose-800'}">
          <i class="fa-solid ${log.eaten ? 'fa-check' : 'fa-xmark'}"></i>
        </div>
        <div>
          <div class="text-xs font-bold text-slate-200">${log.food}</div>
          <div class="text-[10px] text-slate-400">${formatTurkishDateTime(log.date)} ${log.note ? `• <span class="italic text-slate-300">${log.note}</span>` : ''}</div>
        </div>
      </div>
      <button onclick="deleteFeedingLog('${log.id}')" class="text-slate-500 hover:text-rose-400 p-1.5 transition-colors" title="Kaydı Sil">
        <i class="fa-solid fa-trash text-xs"></i>
      </button>
    </div>
  `).join('');
}

function openAddFeedingModal() {
  if (!activePetId) {
    showToast('Önce bir hayvan seçmelisiniz!', 'error');
    return;
  }
  const modal = document.getElementById('feedingModal');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16);
  document.getElementById('feedInputDate').value = dateStr;
  document.getElementById('feedInputFood').value = '';
  document.getElementById('feedInputNote').value = '';
  document.getElementById('feedInputEaten').checked = true;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFeedingModal() {
  document.getElementById('feedingModal').classList.remove('active');
  document.body.style.overflow = '';
}

function handleFeedingSubmit(e) {
  e.preventDefault();
  if (!activePetId) return;

  const newLog = {
    id: 'feed-' + Date.now(),
    petId: activePetId,
    date: document.getElementById('feedInputDate').value,
    food: document.getElementById('feedInputFood').value.trim(),
    eaten: document.getElementById('feedInputEaten').checked,
    note: document.getElementById('feedInputNote').value.trim()
  };

  feedingLogs.push(newLog);
  saveAllToStorage();
  closeFeedingModal();
  renderFeedingLogs();
  showToast('Yemleme kaydı başarıyla eklendi.', 'success');
}

function deleteFeedingLog(logId) {
  if (confirm('Bu yemleme kaydını silmek istediğinize emin misiniz?')) {
    feedingLogs = feedingLogs.filter(l => l.id !== logId);
    saveAllToStorage();
    renderFeedingLogs();
    showToast('Yemleme kaydı silindi.', 'info');
  }
}

// --- Kabuk / Molt Logları ---
function renderSheddingLogs() {
  const container = document.getElementById('sheddingLogsContainer');
  if (!container || !activePetId) return;

  const logs = sheddingLogs
    .filter(log => log.petId === activePetId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
        Henüz kabuk değişimi kaydı girilmedi.
        <button onclick="openAddSheddingModal()" class="block mx-auto mt-2 text-amber-400 hover:underline">İlk kabuk kaydını ekle</button>
      </div>
    `;
    return;
  }

  container.innerHTML = logs.map(log => `
    <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center text-sm border border-amber-800">
          <i class="fa-solid fa-scroll"></i>
        </div>
        <div>
          <div class="text-xs font-bold text-slate-200">${formatTurkishDate(log.date)}</div>
          <div class="text-[10px] text-amber-400 font-medium">${log.status} ${log.note ? `• <span class="text-slate-400 italic">${log.note}</span>` : ''}</div>
        </div>
      </div>
      <button onclick="deleteSheddingLog('${log.id}')" class="text-slate-500 hover:text-rose-400 p-1.5 transition-colors" title="Kaydı Sil">
        <i class="fa-solid fa-trash text-xs"></i>
      </button>
    </div>
  `).join('');
}

function openAddSheddingModal() {
  if (!activePetId) return;
  const modal = document.getElementById('sheddingModal');
  document.getElementById('shedInputDate').value = getTodayKey();
  document.getElementById('shedInputNote').value = '';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSheddingModal() {
  document.getElementById('sheddingModal').classList.remove('active');
  document.body.style.overflow = '';
}

function handleSheddingSubmit(e) {
  e.preventDefault();
  if (!activePetId) return;

  const newLog = {
    id: 'shed-' + Date.now(),
    petId: activePetId,
    date: document.getElementById('shedInputDate').value,
    status: document.getElementById('shedInputStatus').value,
    note: document.getElementById('shedInputNote').value.trim()
  };

  sheddingLogs.push(newLog);
  saveAllToStorage();
  closeSheddingModal();
  renderSheddingLogs();
  showToast('Kabuk değişimi kaydedildi.', 'success');
}

function deleteSheddingLog(logId) {
  if (confirm('Bu kabuk kaydını silmek istediğinize emin misiniz?')) {
    sheddingLogs = sheddingLogs.filter(l => l.id !== logId);
    saveAllToStorage();
    renderSheddingLogs();
    showToast('Kabuk kaydı silindi.', 'info');
  }
}

// --- Kilo & Büyüme Grafiği (Chart.js) ---
function renderWeightChart() {
  const canvas = document.getElementById('weightChart');
  if (!canvas || !activePetId) return;

  const logs = weightLogs
    .filter(log => log.petId === activePetId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const ctx = canvas.getContext('2d');

  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  const labels = logs.map(l => formatTurkishDate(l.date));
  const dataPoints = logs.map(l => l.weight);

  weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Kayıt Yok'],
      datasets: [{
        label: 'Ağırlık (Gram)',
        data: dataPoints.length ? dataPoints : [0],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#22d3ee',
        pointBorderColor: '#083344',
        pointHoverRadius: 6,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#020617',
          borderColor: '#06b6d4',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              return ` ${context.parsed.y} Gram`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        }
      }
    }
  });
}

function openAddWeightModal() {
  if (!activePetId) return;
  const modal = document.getElementById('weightModal');
  document.getElementById('weightInputDate').value = getTodayKey();
  document.getElementById('weightInputVal').value = '';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWeightModal() {
  document.getElementById('weightModal').classList.remove('active');
  document.body.style.overflow = '';
}

function handleWeightSubmit(e) {
  e.preventDefault();
  if (!activePetId) return;

  const val = parseFloat(document.getElementById('weightInputVal').value);
  const date = document.getElementById('weightInputDate').value;

  if (isNaN(val) || val <= 0) {
    showToast('Lütfen geçerli bir ağırlık girin.', 'error');
    return;
  }

  const newLog = {
    id: 'w-' + Date.now(),
    petId: activePetId,
    date: date,
    weight: val
  };

  weightLogs.push(newLog);

  // Hayvanın güncel ağırlığını da güncelle
  const pet = pets.find(p => p.id === activePetId);
  if (pet) {
    pet.weight = val;
  }

  saveAllToStorage();
  closeWeightModal();
  renderActivePetDashboard();
  showToast('Tartım kaydedildi ve büyüme grafiği güncellendi.', 'success');
}

// --- Teraryum İklimi ---
function saveClimateValues(e) {
  e.preventDefault();
  if (!activePetId) return;

  const pet = pets.find(p => p.id === activePetId);
  if (!pet) return;

  const temp = parseFloat(document.getElementById('inputClimateTemp').value);
  const hum = parseInt(document.getElementById('inputClimateHumidity').value);

  pet.currentTemp = temp;
  pet.currentHumidity = hum;

  saveAllToStorage();
  renderActivePetDashboard();
  updateClimateFeedback(pet.speciesId, temp, hum);
  showToast('Teraryum ölçümleri güncellendi.', 'success');
}

function updateClimateFeedback(speciesId, temp, hum) {
  const feedbackEl = document.getElementById('climateFeedback');
  if (!feedbackEl) return;

  const species = EXOTIC_ANIMALS_DATA.find(s => s.id === speciesId);
  const hasTemperature = temp !== null && temp !== undefined && temp !== '' && Number.isFinite(Number(temp));
  const hasHumidity = hum !== null && hum !== undefined && hum !== '' && Number.isFinite(Number(hum));
  if (!hasTemperature && !hasHumidity) {
    feedbackEl.textContent = 'Henüz iklim ölçümü girilmedi. Değerleri türe özgü veteriner kaynağıyla karşılaştırın.';
    return;
  }

  const speciesName = species ? `${species.name} için ` : '';
  feedbackEl.textContent = `${speciesName}ölçümler kaydedildi. Bu kayıt otomatik sağlık değerlendirmesi veya güvenli aralık doğrulaması değildir; türünüze özel kaynak ve veteriner önerisiyle karşılaştırın.`;
}

// =========================================================================
// 7. EVCİL HAYVAN EKLE / DÜZENLE / SİL MODAL'LARI
// =========================================================================

function openAddPetModal() {
  document.getElementById('petFormTitle').innerText = 'Yeni Egzotik Canlı Ekle';
  document.getElementById('petFormId').value = '';
  document.getElementById('petForm').reset();
  document.getElementById('petSpeciesSearch').value = '';
  const select = document.getElementById('petInputSpecies');
  if (select) {
    select.value = '';
    populateSpeciesSelectOptions();
  }
  document.getElementById('customSpeciesName').value = '';
  document.getElementById('customSpeciesScientificName').value = '';
  updateCustomSpeciesFields();
  
  const modal = document.getElementById('petFormModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function editCurrentPet() {
  if (!activePetId) return;
  const pet = pets.find(p => p.id === activePetId);
  if (!pet) return;

  document.getElementById('petFormTitle').innerText = `${pet.name} Profilini Düzenle`;
  document.getElementById('petFormId').value = pet.id;
  document.getElementById('petInputName').value = pet.name;
  document.getElementById('petSpeciesSearch').value = '';
  populateSpeciesSelectOptions();
  document.getElementById('petInputSpecies').value = pet.speciesId;
  updateCustomSpeciesFields();
  document.getElementById('petInputGender').value = pet.gender || 'Bilinmiyor';
  document.getElementById('petInputBirthDate').value = pet.birthDate || '';
  document.getElementById('petInputWeight').value = pet.weight || '';
  document.getElementById('petInputEnclosure').value = pet.enclosureSize || '';
  document.getElementById('petInputAvatar').value = pet.avatar || '';
  document.getElementById('petInputNotes').value = pet.notes || '';

  const modal = document.getElementById('petFormModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePetFormModal() {
  document.getElementById('petFormModal').classList.remove('active');
  document.body.style.overflow = '';
}

function onSpeciesSelectChange() {
  const speciesId = document.getElementById('petInputSpecies').value;
  updateCustomSpeciesFields();
  const avatarInput = document.getElementById('petInputAvatar');
  if (!speciesId || speciesId === '__custom__') return;

  const species = EXOTIC_ANIMALS_DATA.find(s => s.id === speciesId);
  if (species && (!avatarInput.value || avatarInput.value.trim() === '')) {
    avatarInput.value = species.image;
  }
}

function handlePetFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('petFormId').value;
  const name = document.getElementById('petInputName').value.trim();
  let speciesId = document.getElementById('petInputSpecies').value;
  const gender = document.getElementById('petInputGender').value;
  const birthDate = document.getElementById('petInputBirthDate').value;
  const weightVal = parseFloat(document.getElementById('petInputWeight').value) || null;
  const enclosure = document.getElementById('petInputEnclosure').value.trim();
  let avatar = document.getElementById('petInputAvatar').value.trim();
  const notes = document.getElementById('petInputNotes').value.trim();

  let species;
  if (speciesId === '__custom__') {
    const customName = document.getElementById('customSpeciesName').value.trim();
    const scientificName = document.getElementById('customSpeciesScientificName').value.trim();
    const category = document.getElementById('customSpeciesCategory').value;
    if (!customName) {
      showToast('Takip listene eklemek için tür adını yaz.', 'error');
      document.getElementById('customSpeciesName').focus();
      return;
    }
    try {
      species = createCustomSpecies(customName, scientificName, category);
      speciesId = species.id;
    } catch (error) {
      showToast(error.message, 'error');
      return;
    }
  } else {
    species = EXOTIC_ANIMALS_DATA.find(s => s.id === speciesId);
  }
  if (!species) {
    showToast('Lütfen geçerli bir tür seçin.', 'error');
    return;
  }

  if (!avatar) {
    avatar = species.image;
  }

  if (id) {
    // Düzenleme
    const pet = pets.find(p => p.id === id);
    if (pet) {
      pet.name = name;
      pet.speciesId = speciesId;
      pet.speciesName = species.name;
      pet.category = species.category;
      pet.gender = gender;
      pet.birthDate = birthDate;
      pet.weight = weightVal;
      pet.enclosureSize = enclosure;
      pet.avatar = avatar;
      pet.notes = notes;
      showToast(`${pet.name} bilgileri güncellendi.`, 'success');
    }
  } else {
    // Yeni ekleme
    const newPetId = 'pet-' + Date.now();
    const newPet = {
      id: newPetId,
      name,
      speciesId,
      speciesName: species.name,
      category: species.category,
      gender,
      birthDate,
      weight: weightVal,
      enclosureSize: enclosure,
      currentTemp: null,
      currentHumidity: null,
      avatar,
      notes
    };
    pets.push(newPet);
    activePetId = newPetId;

    if (weightVal) {
      weightLogs.push({
        id: 'w-' + Date.now(),
        petId: newPetId,
        date: getTodayKey(),
        weight: weightVal
      });
    }

    showToast(`${name} başarıyla takip listenize eklendi!`, 'success');
  }

  saveAllToStorage();
  closePetFormModal();
  document.getElementById('petForm').reset();
  document.getElementById('petSpeciesSearch').value = '';
  document.getElementById('petInputAvatar').value = '';
  populateSpeciesSelectOptions();
  renderPetsTabs();
  renderActivePetDashboard();
}

function deleteCurrentPet() {
  if (!activePetId) return;
  const pet = pets.find(p => p.id === activePetId);
  if (!pet) return;

  if (confirm(`${pet.name} adlı canlıyı ve tüm geçmiş takip kayıtlarını silmek istediğinize emin misiniz?`)) {
    pets = pets.filter(p => p.id !== activePetId);
    feedingLogs = feedingLogs.filter(l => l.petId !== activePetId);
    sheddingLogs = sheddingLogs.filter(l => l.petId !== activePetId);
    weightLogs = weightLogs.filter(l => l.petId !== activePetId);

    activePetId = pets.length > 0 ? pets[0].id : null;
    saveAllToStorage();
    renderPetsTabs();
    renderActivePetDashboard();
    showToast(`${pet.name} silindi.`, 'info');
  }
}

// =========================================================================
// 8. DİĞER ETKİNLİKLER & BİLDİRİM (TOAST)
// =========================================================================

function setupEventListeners() {
  const speciesSearch = document.getElementById('petSpeciesSearch');
  if (speciesSearch) {
    speciesSearch.addEventListener('input', () => {
      populateSpeciesSelectOptions();
      onSpeciesSelectChange();
    });
  }

  // Canlı arama
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      renderEncyclopedia();
    });
  }

  // Mobil Menü
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
      const isExpanded = mobileMenu.classList.toggle('hidden') === false;
      mobileBtn.setAttribute('aria-expanded', String(isExpanded));
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Esc ile modal kapatma
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAnimalModal();
      if (document.getElementById('petFormModal')) closePetFormModal();
      if (document.getElementById('feedingModal')) closeFeedingModal();
      if (document.getElementById('sheddingModal')) closeSheddingModal();
      if (document.getElementById('weightModal')) closeWeightModal();
    }
  });

  // Modal dışına tıklayınca kapatma
  ['animalDetailModal', 'petFormModal', 'feedingModal', 'sheddingModal', 'weightModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          el.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    }
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  let bg = 'bg-slate-900 border-slate-700 text-slate-100';
  let icon = 'fa-info-circle text-cyan-400';

  if (type === 'success') {
    bg = 'bg-emerald-950 border-emerald-500/40 text-emerald-100';
    icon = 'fa-circle-check text-emerald-400';
  } else if (type === 'error') {
    bg = 'bg-rose-950 border-rose-500/40 text-rose-100';
    icon = 'fa-circle-exclamation text-rose-400';
  }

  const toast = document.createElement('div');
  toast.className = `p-4 rounded-2xl border shadow-xl flex items-center gap-3 text-xs max-w-sm pointer-events-auto transition-all duration-300 transform translate-y-4 opacity-0 ${bg}`;
  const toastIcon = document.createElement('i');
  toastIcon.className = `fa-solid ${icon} text-base`;
  const toastMessage = document.createElement('span');
  toastMessage.className = 'font-medium';
  toastMessage.textContent = message;
  toast.append(toastIcon, toastMessage);

  container.appendChild(toast);

  // Animasyonla göster
  setTimeout(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  }, 10);

  // 3.5 saniye sonra yok et
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
