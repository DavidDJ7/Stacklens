(function () {
  'use strict';

  if (window.__STACKLENS_DETECTOR__) return;
  window.__STACKLENS_DETECTOR__ = true;

  function getScriptSrcs() {
    const srcs = [];
    document.querySelectorAll('script').forEach((s) => {
      if (s.src) srcs.push(s.src);
    });
    return srcs;
  }

  function getMetaTags() {
    const metas = {};
    document.querySelectorAll('meta').forEach((m) => {
      const name = m.getAttribute('name') || m.getAttribute('property') || '';
      const content = m.getAttribute('content') || '';
      if (name && content) metas[name.toLowerCase()] = content;
    });
    return metas;
  }

  function getGlobalVars() {
    const keys = Object.keys(window).filter((k) => !k.startsWith('__') && !k.startsWith('chrome') && k !== 'self' && k !== 'top' && k !== 'parent');
    return keys;
  }

  function getInlineHTML() {
    return document.documentElement.outerHTML.slice(0, 50000);
  }

  function getAttributes() {
    const attrs = new Set();
    document.querySelectorAll('*').forEach((el) => {
      el.getAttributeNames().forEach((a) => {
        if (a.startsWith('data-') || a.startsWith('aria-')) attrs.add(a);
      });
    });
    return Array.from(attrs);
  }

  function detectPatterns() {
    const results = {};
    const html = getInlineHTML();
    const scripts = getScriptSrcs();
    const metas = getMetaTags();
    const globals = getGlobalVars();
    const attrs = getAttributes();
    const allText = scripts.join(' ') + ' ' + html + ' ' + Object.values(metas).join(' ') + ' ' + globals.join(' ') + ' ' + attrs.join(' ');

    for (const category of PATTERN_ORDER) {
      const categoryPatterns = PATTERNS[category];
      if (!categoryPatterns) continue;
      for (const [name, checks] of Object.entries(categoryPatterns)) {
        for (const check of checks) {
          let match = false;
          const target = check.type === 'script' ? scripts.join(' ') : check.type === 'meta' ? Object.values(metas).join(' ') : check.type === 'global' ? globals.join(' ') : check.type === 'attr' ? attrs.join(' ') : html;
          if (check.re.test(target)) {
            match = true;
          }
          if (match) {
            if (!results[category]) results[category] = [];
            if (!results[category].includes(name)) results[category].push(name);
            break;
          }
        }
      }
    }
    return results;
  }

  function runDetection() {
    try {
      const stack = detectPatterns();
      const hostname = window.location.hostname;
      const record = {
        hostname,
        url: window.location.href,
        title: document.title,
        stack,
        detectedAt: Date.now(),
        pageSize: document.documentElement.innerHTML.length,
        scriptCount: document.querySelectorAll('script').length,
      };

      chrome.runtime.sendMessage({
        type: 'STACK_DETECTED',
        payload: record,
      });
    } catch (e) {
      console.error('[StackLens] Detection error:', e);
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(runDetection, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(runDetection, 1500));
  }
})();
