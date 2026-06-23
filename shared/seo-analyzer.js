self.SEOAnalyzer = {
  analyzeMetaTags(doc) {
    const tags = {};
    const metaTags = doc.querySelectorAll('meta');
    metaTags.forEach((m) => {
      const name = m.getAttribute('name') || m.getAttribute('property') || '';
      const content = m.getAttribute('content') || '';
      if (name && content) {
        if (!tags[name]) tags[name] = [];
        tags[name].push(content);
      }
    });
    return tags;
  },

  analyzeTitle(doc) {
    const title = doc.querySelector('title');
    return {
      text: title?.textContent?.trim() || '',
      length: title?.textContent?.trim()?.length || 0,
      hasTitle: !!title,
    };
  },

  analyzeCanonical(doc) {
    const link = doc.querySelector('link[rel="canonical"]');
    return {
      href: link?.getAttribute('href') || '',
      hasCanonical: !!link,
    };
  },

  analyzeFavicon(doc) {
    const icons = doc.querySelectorAll('link[rel*="icon"]');
    return {
      icons: Array.from(icons).map((i) => ({
        rel: i.getAttribute('rel'),
        href: i.getAttribute('href'),
        sizes: i.getAttribute('sizes'),
      })),
      hasFavicon: icons.length > 0,
    };
  },

  analyzeHeadings(doc) {
    const headings = {};
    for (let i = 1; i <= 6; i++) {
      const els = doc.querySelectorAll(`h${i}`);
      headings[`h${i}`] = {
        count: els.length,
        texts: Array.from(els)
          .map((h) => h.textContent.trim())
          .filter(Boolean)
          .slice(0, 10),
      };
    }
    return headings;
  },

  analyzeImages(doc) {
    const images = doc.querySelectorAll('img');
    const results = { total: images.length, withAlt: 0, withoutAlt: 0, lazyLoaded: 0, missingAlt: [] };
    images.forEach((img) => {
      const alt = img.getAttribute('alt');
      if (alt !== null && alt !== undefined) {
        results.withAlt++;
      } else {
        results.withoutAlt++;
        const src = img.getAttribute('src') || '';
        if (src && results.missingAlt.length < 20) results.missingAlt.push(src.slice(0, 100));
      }
      if (img.getAttribute('loading') === 'lazy') results.lazyLoaded++;
    });
    return results;
  },

  analyzeLinks(doc) {
    const links = doc.querySelectorAll('a[href]');
    const internal = [];
    const external = [];
    const nofollow = [];
    const hostname = doc.location?.hostname || '';

    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const rel = a.getAttribute('rel') || '';
      const text = a.textContent.trim().slice(0, 60);
      const entry = { href: href.slice(0, 200), text };

      if (href.startsWith('http') && !href.includes(hostname)) {
        external.push(entry);
      } else if (!href.startsWith('#') && !href.startsWith('javascript:')) {
        internal.push(entry);
      }
      if (rel.includes('nofollow')) nofollow.push(entry);
    });

    return {
      total: links.length,
      internal: internal.length,
      external: external.length,
      nofollow: nofollow.length,
      internalSamples: internal.slice(0, 10),
      externalSamples: external.slice(0, 10),
    };
  },

  analyzeStructuredData(doc) {
    const jsonld = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const data = JSON.parse(s.textContent);
        jsonld.push(data);
      } catch {}
    });

    const microdata = [];
    doc.querySelectorAll('[itemscope]').forEach((el) => {
      const type = el.getAttribute('itemtype') || '';
      if (type) microdata.push(type);
    });

    return {
      jsonld: jsonld.slice(0, 5),
      jsonldCount: jsonld.length,
      microdata: [...new Set(microdata)].slice(0, 10),
      microdataCount: microdata.length,
    };
  },

  analyzeOpenGraph(doc) {
    const og = {};
    const tags = doc.querySelectorAll('meta[property^="og:"], meta[property^="twitter:"]');
    tags.forEach((t) => {
      const prop = t.getAttribute('property') || t.getAttribute('name') || '';
      const content = t.getAttribute('content') || '';
      if (prop && content) og[prop] = content;
    });
    return og;
  },

  analyzeContent(doc) {
    const text = doc.body?.textContent || '';
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const htmlLength = doc.documentElement?.innerHTML?.length || 0;
    const textLength = text.trim().length;

    const readingTime = Math.ceil(wordCount / 200);

    const paragraphs = doc.querySelectorAll('p').length;
    const hasArticle = !!doc.querySelector('article');
    const hasMain = !!doc.querySelector('main');

    return {
      wordCount,
      readingTimeMinutes: readingTime,
      textToHtmlRatio: htmlLength > 0 ? Math.round((textLength / htmlLength) * 100) : 0,
      paragraphCount: paragraphs,
      hasArticle,
      hasMain,
    };
  },

  analyzeLanguage(doc) {
    return {
      lang: doc.documentElement?.getAttribute('lang') || '',
      hasLang: !!doc.documentElement?.getAttribute('lang'),
      charset: doc.characterSet || '',
    };
  },

  analyzeViewport(doc) {
    const vp = doc.querySelector('meta[name="viewport"]');
    return {
      content: vp?.getAttribute('content') || '',
      hasViewport: !!vp,
      isMobileOptimized: vp?.getAttribute('content')?.includes('width=device-width') || false,
    };
  },

  analyzeHreflang(doc) {
    const hreflang = doc.querySelectorAll('link[rel="alternate"][hreflang]');
    return {
      tags: Array.from(hreflang).map((l) => ({
        hreflang: l.getAttribute('hreflang'),
        href: l.getAttribute('href'),
      })),
      count: hreflang.length,
    };
  },

  analyzeRobots(doc) {
    const robots = doc.querySelector('meta[name="robots"]');
    const content = robots?.getAttribute('content') || '';
    return {
      content,
      hasRobots: !!robots,
      noindex: content.includes('noindex'),
      nofollow: content.includes('nofollow'),
    };
  },

  analyzeSocial(doc) {
    const social = {};
    doc.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach((t) => {
      const key = t.getAttribute('property') || t.getAttribute('name') || '';
      const val = t.getAttribute('content') || '';
      if (key && val) social[key] = val;
    });

    const fbPages = doc.querySelectorAll('meta[property="fb:app_id"], meta[name="fb:app_id"]');
    if (fbPages.length > 0) social['fb:app_id'] = fbPages[0].getAttribute('content');

    return social;
  },

  calculateSEOScore(results) {
    let score = 0;
    const maxScore = 100;
    const checks = [];

    // Title check (0-15)
    if (results.title?.hasTitle) {
      const len = results.title.length;
      if (len >= 30 && len <= 60) { score += 15; checks.push({ pass: true, msg: 'Title tag present and optimal length (30-60 chars)' }); }
      else if (len > 0) { score += 10; checks.push({ pass: true, msg: `Title tag present but ${len < 30 ? 'too short' : 'too long'} (${len} chars)` }); }
    } else {
      checks.push({ pass: false, msg: 'Missing <title> tag' });
    }

    // Meta description (0-10)
    if (results.meta?.description?.[0]) {
      const len = results.meta.description[0].length;
      if (len >= 120 && len <= 158) { score += 10; checks.push({ pass: true, msg: 'Meta description optimal length' }); }
      else { score += 5; checks.push({ pass: true, msg: `Meta description ${len < 120 ? 'too short' : 'too long'} (${len} chars)` }); }
    } else {
      checks.push({ pass: false, msg: 'Missing meta description' });
    }

    // Viewport (0-10)
    if (results.viewport?.isMobileOptimized) { score += 10; checks.push({ pass: true, msg: 'Mobile viewport configured' }); }
    else if (results.viewport?.hasViewport) { score += 5; checks.push({ pass: true, msg: 'Viewport meta present but not optimized' }); }
    else { checks.push({ pass: false, msg: 'Missing viewport meta tag' }); }

    // Headings (0-10)
    if (results.headings?.h1?.count === 1) { score += 10; checks.push({ pass: true, msg: 'Exactly one H1 tag' }); }
    else if ((results.headings?.h1?.count || 0) > 1) { score += 5; checks.push({ pass: true, msg: `Multiple H1 tags (${results.headings.h1.count})` }); }
    else if ((results.headings?.h1?.count || 0) === 0) { checks.push({ pass: false, msg: 'No H1 tag found' }); }

    // Images alt text (0-10)
    if (results.images) {
      const ratio = results.images.total > 0 ? results.images.withAlt / results.images.total : 1;
      if (ratio >= 0.9) { score += 10; checks.push({ pass: true, msg: '90%+ images have alt text' }); }
      else if (ratio >= 0.5) { score += 5; checks.push({ pass: true, msg: `${Math.round(ratio * 100)}% images have alt text` }); }
      else { checks.push({ pass: false, msg: `Only ${Math.round(ratio * 100)}% images have alt text` }); }
    }

    // Canonical URL (0-5)
    if (results.canonical?.hasCanonical) { score += 5; checks.push({ pass: true, msg: 'Canonical URL set' }); }

    // Language (0-5)
    if (results.language?.hasLang) { score += 5; checks.push({ pass: true, msg: `Language set: ${results.language.lang}` }); }
    else { checks.push({ pass: false, msg: 'Missing lang attribute on <html>' }); }

    // Structured data (0-10)
    const sdCount = (results.structuredData?.jsonldCount || 0) + (results.structuredData?.microdataCount || 0);
    if (sdCount > 0) { score += Math.min(10, sdCount * 2); checks.push({ pass: true, msg: `Structured data found (${sdCount} items)` }); }
    else { checks.push({ pass: false, msg: 'No structured data detected' }); }

    // Open Graph (0-10)
    if (results.openGraph?.['og:title']) { score += 4; }
    if (results.openGraph?.['og:description']) { score += 3; }
    if (results.openGraph?.['og:image']) { score += 3; }
    if (results.openGraph?.['og:title']) checks.push({ pass: true, msg: 'Open Graph tags present' });

    // Content (0-10)
    const wc = results.content?.wordCount || 0;
    if (wc >= 300) { score += 10; checks.push({ pass: true, msg: `Good content length (${wc} words)` }); }
    else if (wc > 0) { score += 5; checks.push({ pass: true, msg: `Short content (${wc} words, recommend 300+)` }); }
    else { checks.push({ pass: false, msg: 'No readable content found' }); }

    // HTTPS (0-5)
    if (results.isHTTPS) { score += 5; checks.push({ pass: true, msg: 'Served over HTTPS' }); }
    else { checks.push({ pass: false, msg: 'Not served over HTTPS' }); }

    // Favicon (0-5)
    if (results.favicon?.hasFavicon) { score += 5; checks.push({ pass: true, msg: 'Favicon present' }); }
    else { checks.push({ pass: false, msg: 'No favicon detected' }); }

    // Robots (0-5)
    if (results.robots?.hasRobots && !results.robots?.noindex) { score += 5; checks.push({ pass: true, msg: 'Robots meta allows indexing' }); }

    score = Math.min(maxScore, score);

    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    return { score, maxScore, grade, checks };
  },
};

self.SEOAnalyzer = self.SEOAnalyzer;
