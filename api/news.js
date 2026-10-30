function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('News archive is not configured.');
  return { url: url.replace(/\/+$/, ''), serviceKey };
}

async function getFeed(url, serviceKey, group) {
  const query = new URLSearchParams({
    select: 'source,language,title,summary,translated_title,translated_summary,translation_provider,link,published_at,fetched_at',
    groups: `cs.{${group}}`,
    order: 'published_at.desc.nullslast',
    limit: '250'
  });
  const response = await fetch(`${url}/rest/v1/news_articles?${query}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase news read failed (${response.status}): ${details.slice(0, 500)}`);
  }
  return response.json();
}

function mapArticle(article) {
  const timestamp = article.published_at ? Date.parse(article.published_at) : 0;
  const translated = Boolean(article.translated_title);
  return {
    source: article.source,
    language: translated ? 'tr' : article.language,
    title: article.translated_title || article.title,
    summary: article.translated_summary || article.summary,
    link: article.link,
    publishedAt: article.published_at || '',
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    translated,
    translationProvider: article.translation_provider || '',
    originalLanguage: article.language,
    originalTitle: translated ? article.title : '',
    originalSummary: translated ? article.summary : ''
  };
}

async function readNews(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    const { url, serviceKey } = getSupabaseConfig();
    const [worldRows, turkeyRows] = await Promise.all([
      getFeed(url, serviceKey, 'world'),
      getFeed(url, serviceKey, 'turkey')
    ]);
    const fetchedAt = [...worldRows, ...turkeyRows]
      .map(row => Date.parse(row.fetched_at))
      .filter(Number.isFinite)
      .reduce((latest, value) => Math.max(latest, value), 0);

    return res.status(200).json({
      fetchedAt,
      translationEnabled: Boolean(process.env.GOOGLE_TRANSLATE_API_KEY),
      translatedEnglishCount: worldRows.filter(row => row.language === 'en' && row.translated_title).length,
      untranslatedEnglishCount: worldRows.filter(row => row.language === 'en' && !row.translated_title).length,
      worldItems: worldRows.map(mapArticle),
      turkeyItems: turkeyRows.map(mapArticle)
    });
  } catch (error) {
    console.error('News archive read failed:', error.message);
    return res.status(502).json({ error: 'News archive is unavailable. Check the Vercel function logs.' });
  }
}

module.exports = readNews;
