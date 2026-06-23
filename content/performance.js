(function () {
  'use strict';

  if (window.__STACKLENS_PERF__) return;
  window.__STACKLENS_PERF__ = true;

  function captureResourceTimings() {
    const entries = performance.getEntriesByType('resource');
    const resources = entries.map((e) => ({
      name: e.name.slice(0, 200),
      type: e.initiatorType,
      duration: Math.round(e.duration),
      size: e.transferSize || e.encodedBodySize || 0,
      protocol: e.nextHopProtocol || '',
      dns: Math.round(e.domainLookupEnd - e.domainLookupStart),
      tcp: Math.round(e.connectEnd - e.connectStart),
      tls: e.secureConnectionStart > 0 ? Math.round(e.connectEnd - e.secureConnectionStart) : 0,
      ttfb: Math.round(e.responseStart - e.requestStart),
      download: Math.round(e.responseEnd - e.responseStart),
    }));

    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    const byType = {};
    resources.forEach((r) => {
      if (!byType[r.type]) byType[r.type] = { count: 0, totalSize: 0, totalDuration: 0 };
      byType[r.type].count++;
      byType[r.type].totalSize += r.size;
      byType[r.type].totalDuration += r.duration;
    });

    return { resources, totalSize, byType };
  }

  function estimateBundleSize() {
    let totalScriptSize = 0;
    let totalStyleSize = 0;
    let totalFontSize = 0;
    let totalImageSize = 0;

    const resources = performance.getEntriesByType('resource');
    for (const r of resources) {
      const size = r.transferSize || r.encodedBodySize || 0;
      if (r.initiatorType === 'script') totalScriptSize += size;
      else if (r.initiatorType === 'css' || r.initiatorType === 'link') totalStyleSize += size;
      else if (r.initiatorType === 'font') totalFontSize += size;
      else if (r.initiatorType === 'img' || r.initiatorType === 'image') totalImageSize += size;
    }

    const scriptTags = document.querySelectorAll('script');
    const inlineScripts = Array.from(scriptTags)
      .filter((s) => !s.src)
      .reduce((sum, s) => sum + (s.textContent ? s.textContent.length : 0), 0);

    return {
      scripts: totalScriptSize,
      styles: totalStyleSize,
      fonts: totalFontSize,
      images: totalImageSize,
      inlineScripts,
      total: totalScriptSize + totalStyleSize + totalFontSize + totalImageSize + inlineScripts,
    };
  }

  function getPageLoadMetrics() {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return {};

    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart),
      domComplete: Math.round(nav.domComplete),
      loadEvent: Math.round(nav.loadEventEnd - nav.loadEventStart),
      domInteractive: Math.round(nav.domInteractive),
      totalLoadTime: Math.round(nav.loadEventEnd - nav.startTime),
      redirectCount: nav.redirectCount,
      type: nav.type,
    };
  }

  let metrics = {};

  function captureWebVitals() {
    try {
      if (PerformanceObserver) {
        const lcpObs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const last = entries[entries.length - 1];
            metrics.lcp = Math.round(last.startTime);
            metrics.lcpElement = last.element ? last.element.tagName : '';
          }
        });
        lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });

        const clsObs = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          metrics.cls = Math.round(clsValue * 1000) / 1000;
        });
        clsObs.observe({ type: 'layout-shift', buffered: true });

        try {
          const inpObs = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              const last = entries[entries.length - 1];
              metrics.inp = Math.round(last.duration);
            }
          });
          inpObs.observe({ type: 'first-input', buffered: true });
        } catch (e) {
          // INP not supported in all browsers
        }

        const fcpObs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            metrics.fcp = Math.round(entries[0].startTime);
          }
        });
        fcpObs.observe({ type: 'paint', buffered: true });
      }
    } catch (e) {
      console.error('[StackLens] Web Vitals error:', e);
    }
  }

  function sendPerformanceData() {
    const resourceTimings = captureResourceTimings();
    const bundleEstimate = estimateBundleSize();
    const pageLoad = getPageLoadMetrics();

    chrome.runtime.sendMessage({
      type: 'PERFORMANCE_COMPLETE',
      payload: {
        hostname: window.location.hostname,
        url: window.location.href,
        webVitals: metrics,
        resourceTimings,
        bundleEstimate,
        pageLoad,
        capturedAt: Date.now(),
      },
    });
  }

  captureWebVitals();

  if (document.readyState === 'complete') {
    setTimeout(sendPerformanceData, 3000);
  } else {
    window.addEventListener('load', () => setTimeout(sendPerformanceData, 3000));
  }
})();
