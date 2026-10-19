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

  const mergedCatalog = new Map(
    (typeof TERRA_SPECIES_SEED === 'undefined' ? EXOTIC_ANIMALS_DATA : TERRA_SPECIES_SEED)
      .map(animal => [animal.id, animal])
  );
  catalog.forEach(animal => mergedCatalog.set(animal.id, animal));
  EXOTIC_ANIMALS_DATA = Array.from(mergedCatalog.values());
  return true;
}
