(function () {
  'use strict';

  if (window.__STACKLENS_VISUAL__) return;
  window.__STACKLENS_VISUAL__ = true;

  function extractColorPalette() {
    const colors = new Map();
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      const style = getComputedStyle(el);
      const props = ['color', 'background-color', 'border-color', 'background'];
      for (const prop of props) {
        const val = style[prop];
        if (val && val.startsWith('rgb')) {
          const rgb = val.match(/\d+/g);
          if (rgb) {
            const key = `#${rgb.slice(0, 3).map((n) => parseInt(n).toString(16).padStart(2, '0')).join('')}`;
            colors.set(key, (colors.get(key) || 0) + 1);
          }
        }
      }
    }
    const sorted = Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([color, count]) => ({ color, count }));
    return sorted;
  }

  function extractTypography() {
    const fontFamilies = new Map();
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      const style = getComputedStyle(el);
      const family = style.fontFamily;
      if (family) {
        const clean = family.split(',')[0].replace(/['"]/g, '').trim();
        if (clean && clean !== 'inherit') {
          fontFamilies.set(clean, (fontFamilies.get(clean) || 0) + 1);
        }
      }
    }
    const sorted = Array.from(fontFamilies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([family, count]) => ({ family, count }));

    const sizes = new Set();
    const weights = new Set();
    document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,li,div').forEach((el) => {
      const style = getComputedStyle(el);
      sizes.add(style.fontSize);
      weights.add(style.fontWeight);
    });

    return {
      families: sorted,
      sizes: Array.from(sizes).filter(s => s !== 'inherit').slice(0, 20),
      weights: Array.from(weights).filter(w => w !== 'inherit').slice(0, 10),
    };
  }

  function extractLayout() {
    const widths = new Set();
    const containerWidths = [];
    document.querySelectorAll('.container, .wrapper, main, [class*="container"], [class*="wrapper"]').forEach((el) => {
      const w = el.offsetWidth;
      if (w > 200) containerWidths.push(w);
    });
    const gridSystems = [];
    if (document.querySelector('[class*="grid"], .row, [class*="col-"], [style*="grid"]')) {
      document.querySelectorAll('[class*="grid"], .row, [class*="col-"]').forEach((el) => {
        const style = getComputedStyle(el);
        if (style.display === 'grid' || style.display === 'flex') {
          gridSystems.push(style.display === 'grid' ? 'CSS Grid' : 'Flexbox');
        }
      });
    }

    const breakpoints = [];
    const vw = window.innerWidth;
    if (vw < 576) breakpoints.push('xs');
    else if (vw < 768) breakpoints.push('sm');
    else if (vw < 992) breakpoints.push('md');
    else if (vw < 1200) breakpoints.push('lg');
    else if (vw < 1400) breakpoints.push('xl');
    else breakpoints.push('xxl');

    return {
      viewportWidth: vw,
      viewportHeight: window.innerHeight,
      containerWidths: [...new Set(containerWidths)].slice(0, 5),
      gridSystems: [...new Set(gridSystems)],
      hasCSSGrid: document.querySelector('[style*="display: grid"], [style*="display:grid"]') !== null,
      hasFlexbox: document.querySelector('[style*="display: flex"], [style*="display:flex"]') !== null,
      breakpoints,
    };
  }

  function extractButtonsAndLinks() {
    const buttons = [];
    document.querySelectorAll('a, button, [role="button"], input[type="submit"]').forEach((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        buttons.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 50),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          bgColor: style.backgroundColor,
          textColor: style.color,
          borderRadius: style.borderRadius,
          padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
        });
      }
    });
    return buttons.slice(0, 30);
  }

  function runVisualAudit() {
    try {
      const palette = extractColorPalette();
      const typography = extractTypography();
      const layout = extractLayout();
      const uiElements = extractButtonsAndLinks();

      chrome.runtime.sendMessage({
        type: 'VISUAL_AUDIT_COMPLETE',
        payload: {
          hostname: window.location.hostname,
          url: window.location.href,
          palette,
          typography,
          layout,
          uiElements,
          auditedAt: Date.now(),
        },
      });
    } catch (e) {
      console.error('[StackLens] Visual audit error:', e);
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(runVisualAudit, 2000);
  } else {
    window.addEventListener('load', () => setTimeout(runVisualAudit, 2000));
  }
})();
