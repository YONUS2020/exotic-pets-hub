const { timingSafeEqual } = require('node:crypto');
const NEWS_SOURCES = require('../../news-sources');
const { decodeXmlText, parseSourceFeed } = require('../news-feed');

const RETENTION_DAYS = 180;
const FEED_TIMEOUT_MS = 4500;
const UPSERT_BATCH_SIZE = 100;
const TRANSLATION_BATCH_SIZE = 30;
const TRANSLATION_TIMEOUT_MS = 3000;

function hasValidCronAuthorization(req) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.authorization || '';
  if (!secret) return false;

  const expectedBuffer = Buffer.from(`Bearer ${secret}`);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length
    && timingSafeEqual(expectedBuffer, providedBuffer);
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'exoticpetshub-NewsBot/1.0 (+https://exoticpetshub.com.tr)' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
    return parseSourceFeed(await response.text(), source);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`${source.name}: feed zaman aşımına uğradı.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Vercel ortam değişkenlerinde tanımlı olmalı.');
  return { url: url.replace(/\/+$/, ''), serviceKey };
}

async function supabaseRequest(path, options = {}) {
  const { url, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase news request failed (${response.status}): ${details.slice(0, 500)}`);
  }
}

async function translateArticles(articles) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return {
      translatedCount: 0,
      translationErrors: ['GOOGLE_TRANSLATE_API_KEY is not configured.']
    };
  }

  const untranslatedEnglish = articles.filter(article => article.language === 'en'
    && article.groups.includes('world'));
  const batches = [];
  for (let index = 0; index < untranslatedEnglish.length; index += TRANSLATION_BATCH_SIZE) {
    batches.push(untranslatedEnglish.slice(index, index + TRANSLATION_BATCH_SIZE));
  }

  const results = await Promise.all(batches.map(async batch => {
    const textItems = [];
    for (const article of batch) {
      textItems.push({ article, field: 'translated_title', text: article.title });
      if (article.summary) textItems.push({ article, field: 'translated_summary', text: article.summary });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);
    try {
      const endpoint = new URL('https://translation.googleapis.com/language/translate/v2');
      endpoint.searchParams.set('key', apiKey);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: textItems.map(item => item.text),
          source: 'en',
          target: 'tr',
          format: 'text'
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Google Translation HTTP ${response.status}`);
      const payload = await response.json();
      const translations = payload.data?.translations;
      if (!Array.isArray(translations) || translations.length !== textItems.length) {
        throw new Error('Google Translation returned an incomplete result.');
      }
      textItems.forEach((item, index) => {
        item.article[item.field] = decodeXmlText(translations[index].translatedText || '');
      });
      for (const article of batch) article.translation_provider = 'Google Cloud Translation';
      return { translatedCount: batch.length, error: null };
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'Google Translation request timed out.'
        : error.message;
      return { translatedCount: 0, error: message };
    } finally {
      clearTimeout(timeout);
    }
  }));

  return {
    translatedCount: results.reduce((total, result) => total + result.translatedCount, 0),
    translationErrors: results.filter(result => result.error).map(result => result.error)
  };
}

function collectArticles(results, syncedAt) {
  const articles = new Map();
  const sourceErrors = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      sourceErrors.push(result.reason.message);
      return;
    }
    for (const item of result.value) {
      const existing = articles.get(item.link);
      if (existing) {
        existing.groups = Array.from(new Set([...existing.groups, ...item.groups]));
        if (item.published_at && (!existing.published_at || item.published_at > existing.published_at)) {
          existing.published_at = item.published_at;
        }
      } else {
        articles.set(item.link, { ...item, fetched_at: syncedAt });
      }
    }
  });
  return { articles: Array.from(articles.values()), sourceErrors };
}

async function syncNews(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!hasValidCronAuthorization(req)) {
    return res.status(process.env.CRON_SECRET ? 401 : 503).json({
      error: process.env.CRON_SECRET ? 'Unauthorized.' : 'CRON_SECRET is not configured.'
    });
  }

  try {
    getSupabaseConfig();
    const results = await Promise.allSettled(NEWS_SOURCES.map(fetchSource));
    if (!results.some(result => result.status === 'fulfilled')) {
      throw new Error(results.map(result => result.reason.message).join(' · ') || 'RSS kaynaklarından haber alınamadı.');
    }

    const syncedAt = new Date().toISOString();
    const { articles, sourceErrors } = collectArticles(results, syncedAt);
    const { translatedCount, translationErrors } = await translateArticles(articles);
    for (let index = 0; index < articles.length; index += UPSERT_BATCH_SIZE) {
      const batch = articles.slice(index, index + UPSERT_BATCH_SIZE);
      await supabaseRequest('news_articles?on_conflict=link', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(batch)
      });
    }

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await supabaseRequest(`news_articles?fetched_at=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' }
    });

    return res.status(200).json({
      syncedAt,
      articleCount: articles.length,
      translatedCount,
      sourceErrors,
      translationErrors
    });
  } catch (error) {
    console.error('Scheduled news sync failed:', error.message);
    return res.status(502).json({ error: 'Scheduled news sync failed. Check the Vercel function logs.' });
  }
}

module.exports = syncNews;
