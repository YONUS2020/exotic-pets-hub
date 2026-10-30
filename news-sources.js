(function (root, createSources) {
  const sources = createSources();
  if (typeof module === 'object' && module.exports) {
    module.exports = sources;
  } else {
    root.TERRA_NEWS_SOURCES = sources;
  }
}(globalThis, () => [
  {
    name: 'BBC News Türkçe',
    url: 'https://feeds.bbci.co.uk/turkce/rss.xml',
    language: 'tr',
    groups: ['world', 'turkey']
  },
  {
    name: 'DW Türkçe',
    url: 'https://rss.dw.com/xml/rss-tur-all',
    language: 'tr',
    groups: ['world', 'turkey']
  },
  {
    name: 'Hürriyet',
    url: 'https://www.hurriyet.com.tr/rss/anasayfa',
    language: 'tr',
    groups: ['turkey'],
    includeAll: true
  },
  {
    name: 'Mongabay',
    url: 'https://news.mongabay.com/feed/',
    language: 'en',
    groups: ['world']
  },
  {
    name: 'Phys.org Biology',
    url: 'https://phys.org/rss-feed/biology-news/',
    language: 'en',
    groups: ['world']
  }
]));
