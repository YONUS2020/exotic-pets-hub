const adminElements = {
  setup: document.getElementById('setupNotice'),
  login: document.getElementById('loginPanel'),
  denied: document.getElementById('accessDenied'),
  panel: document.getElementById('adminPanel'),
  identity: document.getElementById('adminIdentity'),
  status: document.getElementById('adminStatus'),
  list: document.getElementById('speciesList'),
  form: document.getElementById('speciesForm'),
  editor: document.getElementById('speciesJson'),
  editorTitle: document.getElementById('editorTitle'),
  deleteButton: document.getElementById('deleteSpeciesButton')
};

let adminSpeciesClient = null;
let selectedSpeciesId = null;
let moderatorUserId = null;

function showAdminStatus(message, isError = false) {
  adminElements.status.textContent = message;
  adminElements.status.className = `mx-auto mt-5 max-w-4xl text-sm ${isError ? 'text-rose-300' : 'text-slate-300'}`;
}

function setAdminView(view) {
  adminElements.setup.classList.toggle('hidden', view !== 'setup');
  adminElements.login.classList.toggle('hidden', view !== 'login');
  adminElements.denied.classList.toggle('hidden', view !== 'denied');
  adminElements.panel.classList.toggle('hidden', view !== 'panel');
}

function validateSpeciesRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('Tür verisi JSON nesnesi olmalıdır.');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id || '')) {
    throw new Error('id küçük harf, rakam ve tire içermelidir (ör. gecko-ornek).');
  }
  for (const field of ['name', 'scientificName', 'category', 'difficulty', 'image', 'shortDesc']) {
    if (typeof record[field] !== 'string' || !record[field].trim()) {
      throw new Error(`${field} alanı boş olmayan metin olmalıdır.`);
    }
  }
  if (!['reptile', 'amphibian', 'invertebrate', 'mammal', 'aquatic'].includes(record.category)) {
    throw new Error('category: reptile, amphibian, invertebrate, mammal veya aquatic olmalıdır.');
  }
  if (typeof record.image !== 'string' || !record.image.startsWith('assets/species/')) {
    throw new Error('image yolu assets/species/ ile başlamalıdır.');
  }
  return record;
}

function showSpeciesEditor(record) {
  selectedSpeciesId = record ? record.id : null;
  adminElements.editorTitle.textContent = record ? `${record.name} kaydını düzenle` : 'Yeni tür ekle';
  adminElements.editor.value = record ? JSON.stringify(record, null, 2) : JSON.stringify({
    id: '',
    name: '',
    scientificName: '',
    category: 'reptile',
    categoryName: 'Sürüngen',
    difficulty: 'Başlangıç',
    difficultyLevel: 1,
    image: 'assets/species/',
    imageSource: '',
    imageCredit: '',
    imageLicense: '',
    imageLicenseUrl: '',
    shortDesc: '',
    careSummary: '',
    dangerNotes: ''
  }, null, 2);
  adminElements.deleteButton.classList.toggle('hidden', !record);
}

async function refreshSpeciesList() {
  const { data, error } = await adminSpeciesClient
    .from('species_catalog')
    .select('id, data')
    .order('id');
  if (error) throw error;

  adminElements.list.replaceChildren();
  for (const row of data) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'block w-full rounded-lg border border-slate-800 px-3 py-2 text-left hover:border-emerald-600';
    button.textContent = `${row.data.name || row.id} · ${row.data.scientificName || 'Bilimsel ad yok'}`;
    button.addEventListener('click', () => showSpeciesEditor(row.data));
    adminElements.list.append(button);
  }
  showAdminStatus(`${data.length} tür veritabanında kayıtlı.`);
}

function createModerationActions(id, table) {
  const actions = document.createElement('div');
  actions.className = 'mt-3 flex flex-wrap gap-2';

  for (const [status, label, className] of [
    ['published', 'Onayla ve yayımla', 'bg-emerald-700 hover:bg-emerald-600'],
    ['rejected', 'Reddet', 'border border-rose-800 text-rose-200 hover:bg-rose-950']
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `rounded-lg px-3 py-2 text-sm font-semibold ${className}`;
    button.textContent = label;
    button.addEventListener('click', () => moderateCommunityItem(id, table, status));
    actions.append(button);
  }
  return actions;
}

async function moderateCommunityItem(id, table, status) {
  const updates = {
    status,
    moderated_at: new Date().toISOString(),
    moderated_by: moderatorUserId
  };
  const { data, error } = await adminSpeciesClient
    .from(table)
    .update(updates)
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, image_path')
    .maybeSingle();
  if (error) {
    showAdminStatus(`Topluluk içeriği güncellenemedi: ${error.message}`, true);
    return;
  }
  if (!data) {
    showAdminStatus('Bu içerik artık bekleyen durumda değil; kuyruğu yenileyin.', true);
    await refreshCommunityModeration();
    return;
  }

  let cleanupError = null;
  if (table === 'community_posts' && status === 'rejected') {
    const { error: removeError } = await adminSpeciesClient
      .storage
      .from('community-media')
      .remove([data.image_path]);
    cleanupError = removeError;
  }
  await refreshCommunityModeration();
  showAdminStatus(cleanupError
    ? `Gönderi reddedildi ancak özel görsel temizlenemedi: ${cleanupError.message}`
    : `Topluluk içeriği ${status === 'published' ? 'onaylandı ve yayımlandı' : 'reddedildi'}.`,
    Boolean(cleanupError));
}

async function refreshCommunityModeration() {
  const postsRoot = document.getElementById('pendingCommunityPosts');
  const commentsRoot = document.getElementById('pendingCommunityComments');
  postsRoot.replaceChildren();
  commentsRoot.replaceChildren();
  const [postsResult, commentsResult] = await Promise.all([
    adminSpeciesClient
      .from('community_posts')
      .select('id, question, species_name, image_path, created_at, community_profiles(display_name)')
      .eq('status', 'pending')
      .order('created_at'),
    adminSpeciesClient
      .from('community_comments')
      .select('id, body, created_at, community_profiles(display_name), community_posts(question, species_name)')
      .eq('status', 'pending')
      .order('created_at')
  ]);

  if (postsResult.error || commentsResult.error) {
    const errors = [postsResult.error, commentsResult.error].filter(Boolean).map(error => error.message);
    showAdminStatus(`Moderasyon kuyruğu yüklenemedi: ${errors.join(' · ')}`, true);
    return false;
  }

  if (!postsResult.data.length) {
    const emptyPosts = document.createElement('p');
    emptyPosts.className = 'text-sm text-slate-500';
    emptyPosts.textContent = 'Bekleyen gönderi yok.';
    postsRoot.append(emptyPosts);
  }

  const signedResult = postsResult.data.length
    ? await adminSpeciesClient.storage.from('community-media')
      .createSignedUrls(postsResult.data.map(post => post.image_path), 300)
    : { data: [], error: null };
  const signedUrls = new Map((signedResult.data || [])
    .filter(item => item.signedUrl)
    .map(item => [item.path, item.signedUrl]));

  for (const post of postsResult.data) {
    const card = document.createElement('article');
    card.className = 'rounded-xl border border-slate-800 bg-slate-950/60 p-4';
    const signedUrl = signedUrls.get(post.image_path);
    if (!signedUrl) {
      const imageError = document.createElement('p');
      imageError.className = 'mb-3 text-xs text-rose-300';
      imageError.textContent = `Özel fotoğraf için güvenli bağlantı alınamadı: ${signedResult.error?.message || 'Kayıt bulunamadı.'}`;
      card.append(imageError);
    } else {
      const image = document.createElement('img');
      image.src = signedUrl;
      image.alt = 'Onay bekleyen topluluk gönderisi fotoğrafı';
      image.loading = 'lazy';
      image.className = 'mb-3 max-h-64 w-full rounded-lg object-contain';
      card.append(image);
    }
    const author = document.createElement('p');
    author.className = 'text-xs text-emerald-300';
    author.textContent = `${post.community_profiles?.display_name || 'İsimsiz kullanıcı'} · ${new Date(post.created_at).toLocaleString('tr-TR')}`;
    const species = document.createElement('p');
    species.className = 'mt-1 text-xs text-slate-400';
    species.textContent = post.species_name || 'Tür belirtilmedi';
    const question = document.createElement('p');
    question.className = 'mt-2 whitespace-pre-wrap break-words text-sm text-slate-100';
    question.textContent = post.question;
    card.append(author, species, question, createModerationActions(post.id, 'community_posts'));
    postsRoot.append(card);
  }

  if (!commentsResult.data.length) {
    const emptyComments = document.createElement('p');
    emptyComments.className = 'text-sm text-slate-500';
    emptyComments.textContent = 'Bekleyen yorum yok.';
    commentsRoot.append(emptyComments);
  }

  for (const comment of commentsResult.data) {
    const card = document.createElement('article');
    card.className = 'rounded-xl border border-slate-800 bg-slate-950/60 p-4';
    const author = document.createElement('p');
    author.className = 'text-xs text-emerald-300';
    author.textContent = `${comment.community_profiles?.display_name || 'İsimsiz kullanıcı'} · ${new Date(comment.created_at).toLocaleString('tr-TR')}`;
    const context = document.createElement('p');
    context.className = 'mt-2 border-l-2 border-slate-700 pl-3 text-xs text-slate-400';
    context.textContent = `Gönderi: ${comment.community_posts?.question || 'Gönderi bulunamadı'}`;
    const body = document.createElement('p');
    body.className = 'mt-2 whitespace-pre-wrap break-words text-sm text-slate-100';
    body.textContent = comment.body;
    card.append(author, context, body, createModerationActions(comment.id, 'community_comments'));
    commentsRoot.append(card);
  }
  return true;
}

async function authorizeAdmin(session) {
  if (!session) {
    setAdminView('login');
    return;
  }

  const { data, error } = await adminSpeciesClient.rpc('is_terra_admin');
  if (error) {
    setAdminView('denied');
    adminElements.denied.textContent = 'Yönetici yetkisi doğrulanamadı. Veritabanı kurulum adımlarını ve allowlist kaydını kontrol et.';
    showAdminStatus(error.message, true);
    return;
  }

  if (data !== true) {
    setAdminView('denied');
    adminElements.denied.textContent = 'Bu hesap yönetim paneline izinli değil. Yönetici erişimi için izin listesine eklenmesi gerekir.';
    await adminSpeciesClient.auth.signOut();
    return;
  }

  setAdminView('panel');
  moderatorUserId = session.user.id;
  adminElements.identity.textContent = `Oturum: ${session.user.email}`;
  try {
    await refreshSpeciesList();
    const queueRefreshed = await refreshCommunityModeration();
    if (!queueRefreshed) return;
  } catch (error) {
    showAdminStatus(`Tür listesi yüklenemedi: ${error.message}`, true);
  }
}

async function initializeAdminPanel() {
  adminSpeciesClient = getTerraSupabaseClient();
  if (!adminSpeciesClient) {
    setAdminView('setup');
    return;
  }

  setAdminView('login');
  document.getElementById('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    showAdminStatus('Giriş bağlantısı gönderiliyor...');
    const email = document.getElementById('loginEmail').value.trim();
    const { error } = await adminSpeciesClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: new URL('admin.html', window.location.href).href
      }
    });
    if (error) {
      showAdminStatus(`Giriş bağlantısı gönderilemedi: ${error.message}`, true);
      return;
    }
    showAdminStatus('E-postana giriş bağlantısı gönderildi. Bağlantı bu siteye geri yönlendirir.');
  });

  const { data, error } = await adminSpeciesClient.auth.getSession();
  if (error) {
    showAdminStatus(`Oturum doğrulanamadı: ${error.message}`, true);
    return;
  }
  await authorizeAdmin(data.session);

  adminElements.form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const record = validateSpeciesRecord(JSON.parse(adminElements.editor.value));
      if (selectedSpeciesId && record.id !== selectedSpeciesId) {
        throw new Error('Kayıt kimliği değiştirilemez. Yeni kimlikle ayrı bir tür oluştur.');
      }
      const { error: saveError } = await adminSpeciesClient
        .from('species_catalog')
        .upsert({ id: record.id, data: record });
      if (saveError) throw saveError;
      selectedSpeciesId = record.id;
      await refreshSpeciesList();
      showSpeciesEditor(record);
      showAdminStatus(`${record.name} kaydedildi.`);
    } catch (error) {
      showAdminStatus(`Tür kaydedilemedi: ${error.message}`, true);
    }
  });

  adminElements.deleteButton.addEventListener('click', async () => {
    if (!selectedSpeciesId || !window.confirm(`${selectedSpeciesId} türünü silmek istediğine emin misin?`)) return;
    const { error } = await adminSpeciesClient
      .from('species_catalog')
      .delete()
      .eq('id', selectedSpeciesId);
    if (error) {
      showAdminStatus(`Tür silinemedi: ${error.message}`, true);
      return;
    }
    selectedSpeciesId = null;
    showSpeciesEditor(null);
    await refreshSpeciesList();
  });

  document.getElementById('newSpeciesButton').addEventListener('click', () => showSpeciesEditor(null));
  document.getElementById('refreshCommunityButton').addEventListener('click', async () => {
    if (await refreshCommunityModeration()) showAdminStatus('Moderasyon kuyruğu yenilendi.');
  });
  const importStarterButton = document.getElementById('importStarterButton');
  importStarterButton.textContent = `Mevcut ${TERRA_SPECIES_SEED.length} türü veritabanına aktar`;
  importStarterButton.addEventListener('click', async () => {
    if (!window.confirm(`${TERRA_SPECIES_SEED.length} başlangıç türünü veritabanına aktarmak istiyor musun? Var olan aynı kimlikli kayıtlar güncellenir.`)) return;
    const rows = TERRA_SPECIES_SEED.map(record => ({ id: record.id, data: record }));
    const { error } = await adminSpeciesClient.from('species_catalog').upsert(rows);
    if (error) {
      showAdminStatus(`Başlangıç kataloğu aktarılamadı: ${error.message}`, true);
      return;
    }
    try {
      await refreshSpeciesList();
      showAdminStatus(`${rows.length} başlangıç türü veritabanına aktarıldı.`);
    } catch (refreshError) {
      showAdminStatus(`Başlangıç türleri aktarıldı ancak liste yenilenemedi: ${refreshError.message}`, true);
    }
  });
  document.getElementById('signOutButton').addEventListener('click', async () => {
    const { error } = await adminSpeciesClient.auth.signOut();
    if (error) {
      showAdminStatus(`Güvenli çıkış yapılamadı: ${error.message}`, true);
      return;
    }
    adminElements.status.textContent = '';
    setAdminView('login');
  });
}

document.addEventListener('DOMContentLoaded', initializeAdminPanel);
