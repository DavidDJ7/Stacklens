(function () {
  'use strict';

  if (window.__STACKLENS_A11Y__) return;
  window.__STACKLENS_A11Y__ = true;

  function analyzeAria() {
    const allElements = document.querySelectorAll('*');
    const ariaAttrs = new Set();
    const roles = new Set();
    let ariaCount = 0;

    allElements.forEach((el) => {
      const attrs = el.getAttributeNames().filter((a) => a.startsWith('aria-'));
      attrs.forEach((a) => ariaAttrs.add(a));
      ariaCount += attrs.length;
      const role = el.getAttribute('role');
      if (role) roles.add(role);
    });

    return { ariaAttrs: Array.from(ariaAttrs), roles: Array.from(roles), ariaCount };
  }

  function analyzeLandmarks() {
    const landmarks = {};
    const selectors = {
      'banner': 'header[role="banner"], header:not([role]), [role="banner"]',
      'navigation': 'nav, [role="navigation"]',
      'main': 'main, [role="main"]',
      'complementary': 'aside, [role="complementary"]',
      'contentinfo': 'footer, [role="contentinfo"]',
      'form': 'form, [role="form"]',
      'search': '[role="search"]',
    };

    for (const [name, sel] of Object.entries(selectors)) {
      const els = document.querySelectorAll(sel);
      landmarks[name] = { count: els.length, present: els.length > 0 };
    }
    return landmarks;
  }

  function analyzeHeadingsA11y() {
    const headingLevels = {};
    for (let i = 1; i <= 6; i++) {
      headingLevels[`h${i}`] = document.querySelectorAll(`h${i}`).length;
    }

    const headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6');
    let skippedLevel = false;
    let prevLevel = 0;

    headings.forEach((h) => {
      const level = parseInt(h.tagName[1]);
      if (prevLevel > 0 && level > prevLevel + 1) skippedLevel = true;
      prevLevel = level;
    });

    const hasH1 = headingLevels.h1 > 0;
    return { headingLevels, skippedLevel, hasH1 };
  }

  function analyzeFocus() {
    const focusable = document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable]'
    );
    const hasNegativeTabindex = document.querySelectorAll('[tabindex="-1"]').length;
    const hasSkipLink = !!document.querySelector('a[href^="#main"], a[href^="#content"], a.skip-link, .skip-link, [class*="skip"]');

    return { focusableCount: focusable.length, hasNegativeTabindex, hasSkipLink };
  }

  function analyzeContrast() {
    const issues = [];
    const sample = document.querySelectorAll('p, span, a, h1, h2, h3, button, label, .text, .content');

    let maxSamples = 50;
    sample.forEach((el) => {
      if (maxSamples <= 0) return;
      const style = getComputedStyle(el);
      const bg = style.backgroundColor;
      const color = style.color;
      const fontSize = parseFloat(style.fontSize);

      if (bg && color && bg.startsWith('rgb') && color.startsWith('rgb')) {
        const bgRgb = bg.match(/\d+/g)?.map(Number);
        const fgRgb = color.match(/\d+/g)?.map(Number);
        if (bgRgb && fgRgb && bgRgb.length >= 3 && fgRgb.length >= 3) {
          const ratio = getContrastRatio(fgRgb, bgRgb);
          const isLarge = fontSize >= 18 || (fontSize >= 14 && parseFloat(style.fontWeight) >= 700);
          const minRatio = isLarge ? 3 : 4.5;
          if (ratio < minRatio) {
            issues.push({
              element: el.tagName,
              text: el.textContent.trim().slice(0, 40),
              ratio: Math.round(ratio * 100) / 100,
              required: minRatio,
              pass: false,
            });
            maxSamples--;
          }
        }
      }
    });

    return { issues, totalChecked: sample.length, failingCount: issues.length };
  }

  function getContrastRatio(fg, bg) {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function relativeLuminance(rgb) {
    const [r, g, b] = rgb.map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function analyzeImagesA11y() {
    const images = document.querySelectorAll('img');
    let missingAlt = 0;
    let decorative = 0;
    let withAlt = 0;

    images.forEach((img) => {
      const alt = img.getAttribute('alt');
      if (alt === null || alt === undefined) missingAlt++;
      else if (alt === '') decorative++;
      else withAlt++;
    });

    return { total: images.length, missingAlt, decorative, withAlt };
  }

  function analyzeForms() {
    const forms = document.querySelectorAll('form');
    let labels = 0;
    let inputs = 0;

    forms.forEach((f) => {
      inputs += f.querySelectorAll('input:not([type="hidden"]), select, textarea').length;
      labels += f.querySelectorAll('label').length;
    });

    const allInputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    const allLabels = document.querySelectorAll('label');
    const labeledInputs = document.querySelectorAll('input:not([type="hidden"])[id]').length;
    const labelsFor = document.querySelectorAll('label[for]').length;

    let properlyLabeled = 0;
    allInputs.forEach((input) => {
      const id = input.getAttribute('id');
      if (id && document.querySelector(`label[for="${id}"]`)) properlyLabeled++;
      if (input.getAttribute('aria-label')) properlyLabeled++;
      if (input.getAttribute('aria-labelledby')) properlyLabeled++;
    });

    return { totalInputs: allInputs.length, totalLabels: allLabels.length, properlyLabeled, labeledWithFor: labelsFor };
  }

  function calculateA11yScore(results) {
    let score = 0;
    const maxScore = 100;
    const checks = [];

    // Landmarks (0-15)
    const lm = results.landmarks;
    if (lm?.main?.present) { score += 5; checks.push({ pass: true, msg: 'Has <main> landmark' }); }
    else { checks.push({ pass: false, msg: 'No <main> landmark' }); }
    if (lm?.navigation?.present) { score += 5; checks.push({ pass: true, msg: 'Has navigation landmark' }); }
    else { checks.push({ pass: false, msg: 'No navigation landmark' }); }
    if (lm?.banner?.present) { score += 5; checks.push({ pass: true, msg: 'Has banner landmark' }); }

    // Headings hierarchy (0-15)
    const h = results.headingsA11y;
    if (h?.hasH1) { score += 5; checks.push({ pass: true, msg: 'Has H1 heading' }); }
    else { checks.push({ pass: false, msg: 'No H1 heading' }); }
    if (!h?.skippedLevel) { score += 10; checks.push({ pass: true, msg: 'No skipped heading levels' }); }
    else { checks.push({ pass: false, msg: 'Skipped heading levels (e.g., H1 → H3)' }); }

    // Images (0-15)
    const imgs = results.images;
    if (imgs) {
      if (imgs.total === 0) { score += 15; checks.push({ pass: true, msg: 'No images to check' }); }
      else if (imgs.missingAlt === 0) { score += 15; checks.push({ pass: true, msg: 'All images have alt text' }); }
      else { score += Math.max(0, 15 - Math.round((imgs.missingAlt / imgs.total) * 15)); checks.push({ pass: false, msg: `${imgs.missingAlt} images missing alt text` }); }
    }

    // Forms (0-15)
    const f = results.forms;
    if (f) {
      if (f.totalInputs === 0) { score += 15; checks.push({ pass: true, msg: 'No form inputs to check' }); }
      else if (f.totalInputs === f.properlyLabeled) { score += 15; checks.push({ pass: true, msg: 'All form inputs have labels' }); }
      else { score += Math.max(0, Math.round((f.properlyLabeled / f.totalInputs) * 15)); checks.push({ pass: false, msg: `${f.totalInputs - f.properlyLabeled} inputs missing labels` }); }
    }

    // Focus (0-10)
    if (results.focus?.hasSkipLink) { score += 10; checks.push({ pass: true, msg: 'Has skip navigation link' }); }
    else { checks.push({ pass: false, msg: 'No skip navigation link found' }); }

    // ARIA usage (0-15)
    if ((results.aria?.roles?.length || 0) > 0) { score += 8; checks.push({ pass: true, msg: 'ARIA roles in use' }); }
    if ((results.aria?.ariaCount || 0) > 0) { score += 7; checks.push({ pass: true, msg: 'ARIA attributes present' }); }

    // Color contrast (0-15)
    const contrast = results.contrast;
    if (contrast) {
      if (contrast.failingCount === 0) { score += 15; checks.push({ pass: true, msg: 'No contrast issues found (spot check)' }); }
      else { score += Math.max(0, 15 - contrast.failingCount); checks.push({ pass: false, msg: `${contrast.failingCount} contrast issues found` }); }
    }

    score = Math.min(maxScore, score);
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    return { score, maxScore, grade, checks };
  }

  function runA11yAudit() {
    try {
      const aria = analyzeAria();
      const landmarks = analyzeLandmarks();
      const headingsA11y = analyzeHeadingsA11y();
      const focus = analyzeFocus();
      const contrast = analyzeContrast();
      const images = analyzeImagesA11y();
      const forms = analyzeForms();

      const results = {
        hostname: window.location.hostname,
        url: window.location.href,
        aria,
        landmarks,
        headingsA11y,
        focus,
        contrast,
        images,
        forms,
      };

      results.a11yScore = calculateA11yScore(results);

      chrome.runtime.sendMessage({
        type: 'A11Y_AUDIT_COMPLETE',
        payload: results,
      });
    } catch (e) {
      console.error('[StackLens] A11y audit error:', e);
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(runA11yAudit, 3000);
  } else {
    window.addEventListener('load', () => setTimeout(runA11yAudit, 3000));
  }
})();
