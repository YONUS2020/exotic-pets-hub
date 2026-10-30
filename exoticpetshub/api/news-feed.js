const NEWS_RELEVANCE = /(?:^|[^a-zığüşöç0-9])(?:egzotik|hayvan(?:lar[ıi]?|ların|lerde|ı|ın)?|köpek(?:ler|lerin|leri|lere|lerden)?|kedi(?:ler|lerin|leri|lere)?|yaban(?:ı|da|dan|ın|hayatı|hayatını|hayatında|yaşamı)?|sürüngen(?:ler|lerin|leri)?|örümcek(?:ler|lerin|leri)?|tarantula(?:lar|ların)?|akrep(?:ler|lerin)?|çıyan(?:lar|ların)?|kırkayak(?:lar|ların)?|gecko|geko|kertenkele(?:ler|lerin)?|yılan(?:lar|ların)?|piton|boa|amfibi(?:ler|lerin)?|kurbağa(?:lar|ların)?|semender(?:ler|lerin)?|böcek(?:ler|lerin)?|habitat|biyoçeşitlilik|biyolojik çeşitlilik|doğa(?:yı|da|dan|nın|sal)?|çevre(?:yi|de|den|nin)?|orman(?:lar|ları|larda|dan|da|lık|ının)?|balık(?:lar|ların)?|kuş(?:lar|ların)?|kaplumbağa(?:lar|ların)?|vaşak|kurt|deniz(?:ler|de|den)?|iklim(?:de|sel)?|ekosistem|tür koruma|kaçak hayvan|yasa dışı ticaret|wildlife|biodiversity|conservation|reptile|spider|snake|scorpion|insect|frog|amphibian|animal|species|ecosystem|endangered|extinction|mammal|bird|marine|ocean|turtle|lizard|evolution|vertebrate|invertebrate)(?:$|[^a-zığüşöç0-9])/i;
const TURKEY_RELEVANCE = /(türkiye|türk|anadolu|istanbul|ankara|izmir|antalya|muğla|van\b|artvin|rize|kapadokya|marmara|ege bölgesi|akdeniz bölgesi|karadeniz|dicle|fırat|boğaziçi|turkey|anatolia)/i;

function decodeXmlText(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '';
    })
    .replace(/&#(\d+);/g, (match, decimal) => {
      const codePoint = Number.parseInt(decimal, 10);
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '';
    })
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(xml, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<(?:(?:[\\w.-]+):)?${escapedName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${escapedName}\\s*>`, 'i');
  return xml.match(pattern)?.[1] || '';
}

function extractTagValues(xml, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<(?:(?:[\\w.-]+):)?${escapedName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${escapedName}\\s*>`, 'gi');
  return Array.from(xml.matchAll(pattern), match => decodeXmlText(match[1]));
}

function extractLink(xml) {
  const linkText = decodeXmlText(extractTag(xml, 'link'));
  if (linkText) return linkText;
  const tag = xml.match(/<(?:[\w.-]+:)?link\b([^>]*)\/?>/i)?.[1] || '';
  return tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] || '';
}

function safeNewsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function parseSourceFeed(xml, source) {
  const entries = Array.from(xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi));
  return entries.map(([, , entry]) => {
    const title = decodeXmlText(extractTag(entry, 'title')).slice(0, 180);
    const summary = decodeXmlText(
      extractTag(entry, 'description')
      || extractTag(entry, 'summary')
      || extractTag(entry, 'encoded')
      || extractTag(entry, 'content')
    ).slice(0, 280);
    const link = safeNewsUrl(extractLink(entry));
    const category = extractTagValues(entry, 'category').join(' ').slice(0, 300);
    const rawDate = extractTag(entry, 'pubDate')
      || extractTag(entry, 'published')
      || extractTag(entry, 'updated')
      || extractTag(entry, 'date');
    const timestamp = Date.parse(decodeXmlText(rawDate));
    const relevantText = `${title} ${summary}`;
    const groups = [];

    if (source.groups.includes('world') && NEWS_RELEVANCE.test(relevantText)) {
      groups.push('world');
    }
    if (source.groups.includes('turkey') && source.language === 'tr'
      && (source.includeAll
        ? !/(^|\s)(dünya|world)(\s|$)/i.test(category)
        : TURKEY_RELEVANCE.test(relevantText))) {
      groups.push('turkey');
    }

    if (!title || !link || !groups.length) return null;
    return {
      source: source.name,
      language: source.language,
      title,
      summary,
      link,
      groups,
      published_at: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
    };
  }).filter(Boolean);
}

module.exports = { decodeXmlText, parseSourceFeed, safeNewsUrl };
