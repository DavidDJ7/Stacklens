(function () {
  'use strict';

  if (window.__STACKLENS_SCRAPER__) return;
  window.__STACKLENS_SCRAPER__ = true;

  function scrapeImages() {
    const images = [];
    const seen = new Set();
    document.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (!src || seen.has(src)) return;
      seen.add(src);
      const rect = img.getBoundingClientRect();
      images.push({
        src: src.slice(0, 300),
        alt: (img.getAttribute('alt') || '').slice(0, 100),
        width: img.naturalWidth || Math.round(rect.width),
        height: img.naturalHeight || Math.round(rect.height),
        lazy: img.getAttribute('loading') === 'lazy',
        visible: rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight,
      });
    });
    return images.slice(0, 50);
  }

  function scrapeVideos() {
    const videos = [];
    const seen = new Set();
    document.querySelectorAll('video, source, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="player"]').forEach((el) => {
      let src = el.getAttribute('src') || el.getAttribute('data-src') || '';
      if (!src || seen.has(src)) return;
      seen.add(src);
      const poster = el.getAttribute('poster') || '';
      videos.push({
        src: src.slice(0, 300),
        type: el.tagName === 'IFRAME' ? (src.includes('youtube') ? 'youtube' : src.includes('vimeo') ? 'vimeo' : 'embedded') : 'html5',
        poster: poster ? poster.slice(0, 200) : '',
        width: el.offsetWidth || 0,
        height: el.offsetHeight || 0,
      });
    });

    document.querySelectorAll('video').forEach((v) => {
      const poster = v.getAttribute('poster') || '';
      if (poster && !seen.has(poster)) {
        seen.add(poster);
        videos.push({
          src: poster.slice(0, 300),
          type: 'poster',
          poster: '',
          width: v.offsetWidth,
          height: v.offsetHeight,
        });
      }
    });

    return videos.slice(0, 20);
  }

  function scrapeTextContent() {
    const text = document.body?.textContent || '';
    const words = text.trim().split(/\s+/).filter(Boolean);
    return {
      wordCount: words.length,
      charCount: text.trim().length,
      firstParagraphs: (() => {
        const ps = [];
        document.querySelectorAll('p').forEach((p) => {
          const t = p.textContent.trim();
          if (t && ps.length < 5) ps.push(t.slice(0, 200));
        });
        return ps;
      })(),
    };
  }

  function scrapeStructuredContent() {
    const tables = [];
    document.querySelectorAll('table').forEach((t, i) => {
      if (i >= 5) return;
      const rows = [];
      t.querySelectorAll('tr').forEach((r) => {
        const cells = [];
        r.querySelectorAll('th, td').forEach((c) => cells.push(c.textContent.trim().slice(0, 50)));
        if (cells.length > 0) rows.push(cells);
      });
      if (rows.length > 0) tables.push({ rows: rows.slice(0, 10) });
    });

    const lists = [];
    document.querySelectorAll('ul, ol').forEach((l, i) => {
      if (i >= 5) return;
      const items = [];
      l.querySelectorAll('li').forEach((li) => {
        items.push(li.textContent.trim().slice(0, 100));
      });
      if (items.length > 0) lists.push({ type: l.tagName.toLowerCase(), items: items.slice(0, 10) });
    });

    return { tables, lists };
  }

  function scrapeArticleContent() {
    const article = document.querySelector('article');
    if (!article) return null;
    return {
      headline: article.querySelector('h1')?.textContent?.trim()?.slice(0, 200) || '',
      paragraphs: (() => {
        const ps = [];
        article.querySelectorAll('p').forEach((p) => {
          const t = p.textContent.trim();
          if (t && ps.length < 10) ps.push(t.slice(0, 300));
        });
        return ps;
      })(),
      images: article.querySelectorAll('img').length,
      wordCount: (article.textContent || '').trim().split(/\s+/).filter(Boolean).length,
    };
  }

  function scrapeLinks() {
    const links = [];
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#') || href.startsWith('javascript:')) return;
      const rect = a.getBoundingClientRect();
      const text = a.textContent.trim();
      links.push({
        href: href.slice(0, 300),
        text: text.slice(0, 80),
        isButton: rect.width > 0 && rect.height > 0 && (a.querySelector('img') || a.getAttribute('role') === 'button'),
        hasIcon: !!a.querySelector('svg, img, i'),
      });
    });
    return links.slice(0, 30);
  }

  function scrapeHeadings() {
    const headings = [];
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      headings.push({
        level: parseInt(h.tagName[1]),
        text: h.textContent.trim().slice(0, 200),
        id: h.getAttribute('id') || '',
      });
    });
    return headings;
  }

  function runScraper() {
    try {
      const images = scrapeImages();
      const videos = scrapeVideos();
      const textContent = scrapeTextContent();
      const structured = scrapeStructuredContent();
      const article = scrapeArticleContent();
      const links = scrapeLinks();
      const headings = scrapeHeadings();

      const totalMediaSize = images.reduce((s, i) => s + (i.width * i.height || 0), 0);

      chrome.runtime.sendMessage({
        type: 'SCRAPER_COMPLETE',
        payload: {
          hostname: window.location.hostname,
          url: window.location.href,
          images,
          imageCount: images.length,
          videos,
          videoCount: videos.length,
          textContent,
          structured,
          article,
          links,
          linkCount: links.length,
          headings,
          totalMediaSize,
          scrapedAt: Date.now(),
        },
      });
    } catch (e) {
      console.error('[StackLens] Scraper error:', e);
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(runScraper, 3500);
  } else {
    window.addEventListener('load', () => setTimeout(runScraper, 3500));
  }
})();
