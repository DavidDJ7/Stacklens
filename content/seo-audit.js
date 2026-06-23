(function () {
  'use strict';

  if (window.__STACKLENS_SEO__) return;
  window.__STACKLENS_SEO__ = true;

  function runSEOAudit() {
    try {
      const analyzer = self.SEOAnalyzer;
      if (!analyzer) {
        console.error('[StackLens] SEOAnalyzer not found');
        return;
      }
      const doc = document;

      const title = analyzer.analyzeTitle(doc);
      const meta = analyzer.analyzeMetaTags(doc);
      const canonical = analyzer.analyzeCanonical(doc);
      const favicon = analyzer.analyzeFavicon(doc);
      const headings = analyzer.analyzeHeadings(doc);
      const images = analyzer.analyzeImages(doc);
      const links = analyzer.analyzeLinks(doc);
      const structuredData = analyzer.analyzeStructuredData(doc);
      const openGraph = analyzer.analyzeOpenGraph(doc);
      const content = analyzer.analyzeContent(doc);
      const language = analyzer.analyzeLanguage(doc);
      const viewport = analyzer.analyzeViewport(doc);
      const hreflang = analyzer.analyzeHreflang(doc);
      const robots = analyzer.analyzeRobots(doc);
      const social = analyzer.analyzeSocial(doc);

      const isHTTPS = window.location.protocol === 'https:';

      const results = {
        hostname: window.location.hostname,
        url: window.location.href,
        title,
        meta,
        canonical,
        favicon,
        headings,
        images,
        links,
        structuredData,
        openGraph,
        content,
        language,
        viewport,
        hreflang,
        robots,
        social,
        isHTTPS,
      };

      results.seoScore = analyzer.calculateSEOScore(results);

      chrome.runtime.sendMessage({
        type: 'SEO_AUDIT_COMPLETE',
        payload: results,
      });
    } catch (e) {
      console.error('[StackLens] SEO audit error:', e);
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(runSEOAudit, 2500);
  } else {
    window.addEventListener('load', () => setTimeout(runSEOAudit, 2500));
  }
})();
