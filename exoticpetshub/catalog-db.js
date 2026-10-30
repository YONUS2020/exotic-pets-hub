function getTerraSupabaseClient() {
  const config = window.TERRA_SUPABASE_CONFIG;
  const createClient = window.supabase && window.supabase.createClient;

  if (!config || !config.url || !config.publishableKey || !createClient) {
    return null;
  }

  if (!window.terraSupabaseClient) {
    window.terraSupabaseClient = createClient(config.url, config.publishableKey);
  }

  return window.terraSupabaseClient;
}

function deduplicateSpeciesCatalog(speciesList) {
  const byScientificName = new Map();
  for (const species of speciesList) {
    const key = String(species.scientificName || species.id).trim().toLocaleLowerCase('en-US');
    const current = byScientificName.get(key);
    if (!current || getSpeciesImagePriority(species) > getSpeciesImagePriority(current)) {
      byScientificName.set(key, species);
    }
  }
  return Array.from(byScientificName.values());
}

function getSpeciesImagePriority(species) {
  if (species.isUserDefined) return 4;
  if (species.image && !species.imageIsRepresentative && !species.image.includes('dragon.svg')) return 3;
  if (species.imageSource) return 2;
  return 1;
}

async function loadPublishedSpeciesCatalog() {
  const client = getTerraSupabaseClient();
  if (!client) return false;

  let data;
  try {
    const result = await client
      .from('species_catalog')
      .select('id, data')
      .order('id');
    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    console.error('Supabase hayvan kataloğu okunamadı:', error.message);
    const status = document.getElementById('catalogDataStatus');
    if (status) {
      status.textContent = 'Çevrimiçi katalog yüklenemedi. Bağlantını veya Supabase ayarlarını kontrol et.';
      status.classList.remove('hidden');
    }
    return false;
  }

  if (!data.length) return false;

  const catalog = data.map(row => row.data);
  if (catalog.some((animal, index) => !animal || animal.id !== data[index].id)) {
    console.error('Supabase kataloğunda geçersiz tür kaydı bulundu; yerel katalog kullanılmaya devam ediliyor.');
    return false;
  }

  const mergedCatalog = new Map(deduplicateSpeciesCatalog(EXOTIC_ANIMALS_DATA).map(animal => [animal.id, animal]));
  catalog.forEach(animal => mergedCatalog.set(animal.id, animal));
  EXOTIC_ANIMALS_DATA = deduplicateSpeciesCatalog(Array.from(mergedCatalog.values()));
  return true;
}
