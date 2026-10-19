const communityElements = {
  setup: document.getElementById('communitySetupNotice'),
  auth: document.getElementById('communityAuthPanel'),
  loginForm: document.getElementById('communityLoginForm'),
  email: document.getElementById('communityEmail'),
  members: document.getElementById('communityMemberPanel'),
  signedInLabel: document.getElementById('communitySignedInLabel'),
  signOut: document.getElementById('communitySignOutButton'),
  postForm: document.getElementById('communityPostForm'),
  displayName: document.getElementById('communityDisplayName'),
  speciesName: document.getElementById('communitySpeciesName'),
  question: document.getElementById('communityQuestion'),
  questionCount: document.getElementById('communityQuestionCount'),
  photo: document.getElementById('communityPhoto'),
  submit: document.getElementById('communityPostSubmit'),
  ownQueue: document.getElementById('communityOwnQueue'),
  status: document.getElementById('communityStatus'),
  feed: document.getElementById('communityFeed')
};

const COMMUNITY_BUCKET = 'community-media';
const COMMUNITY_IMAGE_LIMIT = 8 * 1024 * 1024;
const COMMUNITY_BAD_WORDS = /\b(?:amk|aq|oc|orospu|sik|yarrak|pic|ibne|amcik|serefsiz|gerizekali|salak|aptal|kahpe|surtuk|fuck|shit|bitch|asshole|cunt|dick|bastard|motherfucker)\b/i;
let communityClient = null;
let activeCommunityUser = null;

function setCommunityStatus(message, isError = false) {
  communityElements.status.textContent = message;
  communityElements.status.className = `text-sm ${isError ? 'text-rose-300' : 'text-slate-300'}`;
}

function normalizeCommunityText(text) {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, character => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[character])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function validateCommunityText(text) {
  if (COMMUNITY_BAD_WORDS.test(normalizeCommunityText(text))) {
    throw new Error('Argo veya hakaret içeren metin paylaşamazsın.');
  }
}

function makeCommunityElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatCommunityDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Tarih bilgisi yok' : date.toLocaleString('tr-TR');
}

async function verifyImageFile(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('JPG, PNG veya WebP biçiminde bir fotoğraf seç.');
  }
  if (file.size < 12 || file.size > COMMUNITY_IMAGE_LIMIT) {
    throw new Error('Fotoğraf 12 bayttan büyük ve 8 MB veya daha küçük olmalıdır.');
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  const typeMatchesSignature = (isPng && file.type === 'image/png')
    || (isJpeg && file.type === 'image/jpeg')
    || (isWebp && file.type === 'image/webp');
  if (!typeMatchesSignature) {
    throw new Error('Dosyanın gerçek biçimi desteklenen bir fotoğraf değil.');
  }
}

async function sanitizeCommunityImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Fotoğraf güvenli biçimde işlenemedi.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(result => result
      ? resolve(result)
      : reject(new Error('Fotoğraf yeniden kodlanamadı.')), outputType, 0.88);
  });
  if (blob.size > COMMUNITY_IMAGE_LIMIT) {
    throw new Error('İşlenmiş fotoğraf 8 MB sınırını aşıyor; daha küçük bir fotoğraf seç.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
    throw new Error('Tarayıcı fotoğrafı desteklenen biçimde güvenli olarak hazırlayamadı.');
  }
  return blob;
}

async function loadCommunityProfile() {
  const { data, error } = await communityClient
    .from('community_profiles')
    .select('display_name')
    .eq('user_id', activeCommunityUser.id)
    .maybeSingle();
  if (error) throw error;
  communityElements.displayName.value = data?.display_name || '';
}

async function loadOwnCommunityQueue() {
  const { data, error } = await communityClient
    .from('community_posts')
    .select('id, question, species_name, status, created_at')
    .eq('author_id', activeCommunityUser.id)
    .in('status', ['pending', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;

  communityElements.ownQueue.replaceChildren();
  if (!data.length) return;
  communityElements.ownQueue.append(makeCommunityElement('h3', 'text-sm font-semibold text-slate-300', 'Gönderi durumların'));
  for (const post of data) {
    const label = post.status === 'pending' ? 'Yönetici incelemesi bekleniyor' : 'Yayımlanmadı';
    const row = makeCommunityElement('p', 'rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300');
    row.textContent = `${label} · ${formatCommunityDate(post.created_at)} · ${post.question}`;
    communityElements.ownQueue.append(row);
  }
}

async function renderCommunityFeed() {
  communityElements.feed.replaceChildren();
  const { data: posts, error } = await communityClient
    .from('community_posts')
    .select('id, question, species_name, image_path, created_at, author_id, community_profiles(display_name)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;

  if (!posts.length) {
    communityElements.feed.append(makeCommunityElement(
      'p',
      'glass-panel rounded-2xl p-6 text-slate-300 md:col-span-2',
      'Henüz onaylanmış paylaşım yok. İlk fotoğraflı soruyu sen paylaşabilirsin.'
    ));
    return;
  }

  const postIds = posts.map(post => post.id);
  const imagePaths = posts.map(post => post.image_path);
  const [commentResult, imageResult] = await Promise.all([
    communityClient
      .from('community_comments')
      .select('id, post_id, body, created_at, community_profiles(display_name)')
      .in('post_id', postIds)
      .eq('status', 'published')
      .order('created_at'),
    communityClient.storage.from(COMMUNITY_BUCKET).createSignedUrls(imagePaths, 3600)
  ]);
  if (commentResult.error) throw commentResult.error;
  const signedUrls = new Map((imageResult.data || []).filter(item => item.signedUrl).map(item => [item.path, item.signedUrl]));
  const commentsByPost = new Map();
  for (const comment of commentResult.data) {
    const comments = commentsByPost.get(comment.post_id) || [];
    comments.push(comment);
    commentsByPost.set(comment.post_id, comments);
  }

  if (imageResult.error) {
    setCommunityStatus(`Fotoğraflar yüklenemedi: ${imageResult.error.message}`, true);
  }

  for (const post of posts) {
    const card = makeCommunityElement('article', 'glass-panel overflow-hidden rounded-2xl');
    const signedUrl = signedUrls.get(post.image_path);
    if (signedUrl) {
      const image = document.createElement('img');
      image.src = signedUrl;
      image.alt = `Topluluk fotoğrafı${post.species_name ? `: ${post.species_name}` : ''}`;
      image.loading = 'lazy';
      image.className = 'max-h-[28rem] w-full bg-slate-950 object-contain';
      card.append(image);
    } else {
      card.append(makeCommunityElement('p', 'p-4 text-sm text-rose-300', 'Bu fotoğrafın güvenli bağlantısı alınamadı.'));
    }

    const body = makeCommunityElement('div', 'space-y-3 p-4 sm:p-5');
    const title = makeCommunityElement('h3', 'break-words text-lg font-bold text-white', post.question);
    const meta = makeCommunityElement(
      'p',
      'text-xs text-slate-400',
      `${post.community_profiles?.display_name || 'Topluluk üyesi'} · ${formatCommunityDate(post.created_at)}`
    );
    body.append(title, meta);
    if (post.species_name) body.append(makeCommunityElement('p', 'text-sm text-emerald-200', post.species_name));

    const comments = makeCommunityElement('div', 'space-y-2 border-t border-slate-800 pt-3');
    comments.append(makeCommunityElement('h4', 'text-sm font-semibold text-slate-200', 'Yorumlar'));
    const postComments = commentsByPost.get(post.id) || [];
    if (!postComments.length) comments.append(makeCommunityElement('p', 'text-xs text-slate-500', 'Henüz onaylanmış yorum yok.'));
    for (const comment of postComments) {
      const commentCard = makeCommunityElement('p', 'break-words rounded-lg bg-slate-950/60 p-3 text-sm text-slate-300');
      const author = makeCommunityElement('span', 'mr-2 font-semibold text-emerald-200', comment.community_profiles?.display_name || 'Topluluk üyesi');
      commentCard.append(author, document.createTextNode(comment.body));
      comments.append(commentCard);
    }

    if (activeCommunityUser) {
      const form = document.createElement('form');
      form.dataset.commentPostId = post.id;
      form.className = 'space-y-2';
      const input = document.createElement('textarea');
      input.required = true;
      input.minLength = 2;
      input.maxLength = 500;
      input.rows = 2;
      input.placeholder = 'Kısa ve saygılı bir yorum yaz...';
      input.setAttribute('aria-label', 'Yorum');
      input.className = 'w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white';
      const submit = makeCommunityElement('button', 'rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700', 'Yorumu incelemeye gönder');
      submit.type = 'submit';
      form.append(input, submit);
      comments.append(form);
    } else {
      const loginLink = makeCommunityElement('a', 'text-sm text-emerald-300 underline', 'Yorum yapmak için e-posta ile giriş yap');
      loginLink.href = '#communityAuthPanel';
      loginLink.addEventListener('click', () => communityElements.email.focus());
      comments.append(loginLink);
    }
    body.append(comments);
    card.append(body);
    communityElements.feed.append(card);
  }
}

async function showCommunityUser(user) {
  activeCommunityUser = user || null;
  communityElements.auth.hidden = Boolean(user);
  communityElements.members.hidden = !user;
  if (user) {
    communityElements.signedInLabel.textContent = 'Giriş yapıldı · e-posta gizlidir';
    await Promise.all([loadCommunityProfile(), loadOwnCommunityQueue()]);
  }
  await renderCommunityFeed();
}

async function submitCommunityPost(event) {
  event.preventDefault();
  communityElements.submit.disabled = true;
  try {
    const displayName = communityElements.displayName.value.trim();
    const question = communityElements.question.value.trim();
    const speciesName = communityElements.speciesName.value.trim();
    const file = communityElements.photo.files[0];
    if (!activeCommunityUser) throw new Error('Paylaşım için önce e-posta ile giriş yap.');
    if (!communityElements.postForm.reportValidity()) return;
    validateCommunityText(displayName);
    validateCommunityText(question);
    if (speciesName) validateCommunityText(speciesName);
    await verifyImageFile(file);
    const safeImage = await sanitizeCommunityImage(file);

    const { error: profileError } = await communityClient
      .from('community_profiles')
      .upsert({
        user_id: activeCommunityUser.id,
        display_name: displayName,
        updated_at: new Date().toISOString()
      });
    if (profileError) throw profileError;

    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[safeImage.type];
    const imagePath = `community/${activeCommunityUser.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await communityClient.storage
      .from(COMMUNITY_BUCKET)
      .upload(imagePath, safeImage, { contentType: safeImage.type, cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;

    const { error: postError } = await communityClient
      .from('community_posts')
      .insert({
        author_id: activeCommunityUser.id,
        question,
        species_name: speciesName || null,
        image_path: imagePath
      });
    if (postError) {
      const { error: cleanupError } = await communityClient.storage.from(COMMUNITY_BUCKET).remove([imagePath]);
      if (cleanupError) throw new Error(`Gönderi kaydedilemedi: ${postError.message}. Fotoğraf temizliği de başarısız: ${cleanupError.message}`);
      throw postError;
    }

    communityElements.postForm.reset();
    communityElements.questionCount.textContent = '0';
    communityElements.displayName.value = displayName;
    await loadOwnCommunityQueue();
    setCommunityStatus('Gönderin alındı. Yönetici onayından sonra herkese görünür olacak.');
  } catch (error) {
    setCommunityStatus(`Gönderi paylaşılmadı: ${error.message}`, true);
  } finally {
    communityElements.submit.disabled = false;
  }
}

async function submitCommunityComment(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.commentPostId) return;
  event.preventDefault();
  const textarea = form.querySelector('textarea');
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const body = textarea.value.trim();
    validateCommunityText(body);
    const { error } = await communityClient
      .from('community_comments')
      .insert({
        post_id: form.dataset.commentPostId,
        author_id: activeCommunityUser.id,
        body
      });
    if (error) throw error;
    form.reset();
    setCommunityStatus('Yorumun incelemeye gönderildi. Onaydan sonra bu paylaşımın altında görünür.');
  } catch (error) {
    setCommunityStatus(`Yorum gönderilemedi: ${error.message}`, true);
  } finally {
    submit.disabled = false;
  }
}

async function initializeCommunity() {
  communityClient = getTerraSupabaseClient();
  if (!communityClient) {
    communityElements.setup.hidden = false;
    return;
  }

  communityElements.auth.hidden = false;
  communityElements.loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    setCommunityStatus('Giriş bağlantısı gönderiliyor...');
    const { error } = await communityClient.auth.signInWithOtp({
      email: communityElements.email.value.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: new URL('community.html', window.location.href).href
      }
    });
    if (error) {
      setCommunityStatus(`Giriş bağlantısı gönderilemedi: ${error.message}`, true);
      return;
    }
    setCommunityStatus('E-posta kutuna giriş bağlantısı gönderdik. Bağlantı seni bu topluluk sayfasına geri getirir.');
  });

  communityElements.question.addEventListener('input', () => {
    communityElements.questionCount.textContent = String(communityElements.question.value.length);
  });
  communityElements.postForm.addEventListener('submit', submitCommunityPost);
  communityElements.feed.addEventListener('submit', submitCommunityComment);
  communityElements.signOut.addEventListener('click', async () => {
    const { error } = await communityClient.auth.signOut();
    if (error) {
      setCommunityStatus(`Çıkış yapılamadı: ${error.message}`, true);
      return;
    }
    activeCommunityUser = null;
    communityElements.members.hidden = true;
    communityElements.auth.hidden = false;
    communityElements.ownQueue.replaceChildren();
    await renderCommunityFeed();
    setCommunityStatus('Oturum kapatıldı.');
  });

  const { data, error } = await communityClient.auth.getSession();
  if (error) {
    setCommunityStatus(`Oturum doğrulanamadı: ${error.message}`, true);
    return;
  }
  await showCommunityUser(data.session?.user || null);
  communityClient.auth.onAuthStateChange((_event, session) => {
    void showCommunityUser(session?.user || null).catch(error => {
      setCommunityStatus(`Topluluk verileri yüklenemedi: ${error.message}`, true);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  void initializeCommunity().catch(error => {
    setCommunityStatus(`Topluluk başlatılamadı: ${error.message}`, true);
  });
});
