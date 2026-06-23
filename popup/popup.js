(function () {
  'use strict';

  let allData = {};
  let currentHostname = '';
  let activeFilter = 'all';
  let alerts = [];

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  function init() {
    setupTabs();
    setupSearch();
    setupFilters();
    setupButtons();
    loadData();
    loadAlerts();
    checkWebGPU();
  }

  // --- Tab System ---
  function setupTabs() {
    $$('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach((t) => t.classList.remove('active'));
        $$('.tab-content').forEach((c) => c.classList.remove('active'));
        tab.classList.add('active');
        $(tab.dataset.tab + 'Tab').classList.add('active');
        if (tab.dataset.tab === 'compare') populateCompareSelects();
        if (tab.dataset.tab === 'ai') checkAiSetup();
      });
    });
  }

  // --- Search ---
  function setupSearch() {
    $('searchInput').addEventListener('input', () => renderSiteList());
  }

  // --- Filters ---
  function setupFilters() {
    $$('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderSiteList();
      });
    });
  }

  // --- Buttons ---
  function setupButtons() {
    $('refreshBtn').addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
      });
    });
    $('screenshotBtn').addEventListener('click', captureScreenshot);
    $('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());
    $('gotoSettingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());
    $('exportBtn').addEventListener('click', exportData);
    $('clearBtn').addEventListener('click', clearAllData);
    $('compareBtn').addEventListener('click', runComparison);
    $('trendsBtn').addEventListener('click', showTrendsModal);
    $('clearAlertsBtn').addEventListener('click', clearAlerts);
    $('alertsBadgeBtn').addEventListener('click', () => switchTab('alerts'));
    $('chatSendBtn').addEventListener('click', sendChat);
    $('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

    $$('.ai-btn').forEach((btn) => {
      btn.addEventListener('click', () => runAiAnalysis(btn.dataset.action));
    });

    $$('.suggestion').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('chatInput').value = btn.dataset.q;
        sendChat();
      });
    });
  }

  function switchTab(tabName) {
    $$('.tab').forEach((t) => t.classList.remove('active'));
    $$('.tab-content').forEach((c) => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    $(tabName + 'Tab').classList.add('active');
    if (tabName === 'compare') populateCompareSelects();
    if (tabName === 'ai') checkAiSetup();
  }

  function showToast(msg) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // --- WebGPU Check ---
  async function checkWebGPU() {
    const badge = $('gpuBadge');
    try {
      const supported = await WebGPU.isSupported();
      if (supported) {
        const info = await WebGPU.getAdapterInfo();
        const label = info ? info.vendor.slice(0, 8) : 'WebGPU';
        badge.textContent = '⚡ ' + label;
        badge.style.display = 'inline-flex';
      } else {
        badge.textContent = '⚡ N/A';
        badge.className = 'gpu-badge unsupported';
        badge.style.display = 'none';
      }
    } catch (e) {
      badge.style.display = 'none';
    }
  }

  // --- Screenshot ---
  async function captureScreenshot() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) { showToast('No active tab'); return; }
      const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].id, { format: 'png' });
      if (dataUrl) {
        const hostname = new URL(tabs[0].url).hostname;
        await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT', payload: { hostname, dataUrl } });
        if (allData[hostname]) allData[hostname].latest.screenshot = dataUrl;
        showToast('Screenshot captured!');
        if (currentHostname === hostname) renderCurrentSite();
      }
    } catch (e) {
      const isFirefox = navigator.userAgent.includes('Firefox');
      showToast(isFirefox ? 'Screenshot: not supported in Firefox' : 'Screenshot failed: ' + e.message);
    }
  }

  // --- Data Loading ---
  async function loadData() {
    try {
      const data = await chrome.runtime.sendMessage({ type: 'GET_ALL_DATA' });
      allData = data || {};
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url) {
        currentHostname = new URL(tabs[0].url).hostname;
        renderCurrentSite();
      }
      renderSiteList();
    } catch (e) {
      console.error('[StackLens] Load error:', e);
    }
  }

  // --- Alerts ---
  async function loadAlerts() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'GET_ALERTS' });
      alerts = result || [];
      updateAlertBadges();
      renderAlerts();
    } catch (e) {
      console.error('[StackLens] Alert load error:', e);
    }
  }

  function updateAlertBadges() {
    const unread = alerts.filter((a) => !a.read).length;
    const badge = $('alertBadgeCount');
    const tabBadge = $('alertsTabCount');
    if (unread > 0) {
      badge.style.display = 'flex';
      badge.textContent = unread > 99 ? '99+' : unread;
      tabBadge.style.display = 'inline-flex';
      tabBadge.textContent = unread > 99 ? '99+' : unread;
    } else {
      badge.style.display = 'none';
      tabBadge.style.display = 'none';
    }
  }

  function renderAlerts() {
    const list = $('alertsList');
    $('alertsCount').textContent = `${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`;

    if (alerts.length === 0) {
      list.innerHTML = '<p class="empty-state">No alerts yet. Alerts fire when a tracked site\'s technology stack changes.</p>';
      return;
    }

    list.innerHTML = alerts.slice(0, 50).map((a) => {
      const dir = a.type === 'added' ? 'added' : 'removed';
      const icon = a.type === 'added'
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>';

      const techTags = a.techs.map((t) => `<span class="alert-tech ${dir}">${escapeHtml(t)}</span>`).join('');

      return `<div class="alert-card ${a.read ? '' : 'unread'}" data-id="${escapeHtml(a.id)}">
        <div class="alert-icon ${dir}">${icon}</div>
        <div class="alert-body">
          <div class="alert-hostname">${escapeHtml(a.hostname)}</div>
          <div class="alert-detail">${dir === 'added' ? 'Added' : 'Removed'} in ${escapeHtml(a.category || 'unknown')}</div>
          <div class="alert-techs">${techTags}</div>
          <div class="alert-time">${formatDate(a.time)}</div>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.alert-card').forEach((card) => {
      card.addEventListener('click', async () => {
        const id = card.dataset.id;
        if (id) {
          await chrome.runtime.sendMessage({ type: 'MARK_ALERT_READ', payload: { id } });
          loadAlerts();
        }
      });
    });
  }

  async function clearAlerts() {
    await chrome.runtime.sendMessage({ type: 'CLEAR_ALERTS' });
    alerts = [];
    updateAlertBadges();
    renderAlerts();
    showToast('Alerts cleared');
  }

  // --- Chat ---
  async function sendChat() {
    const input = $('chatInput');
    const text = input.value.trim();
    if (!text) return;

    const messages = $('chatMessages');
    messages.innerHTML += `<div class="chat-msg user"><div class="msg-bubble">${escapeHtml(text)}</div></div>`;
    messages.scrollTop = messages.scrollHeight;
    input.value = '';

    try {
      const settings = await new Promise((resolve) => {
        chrome.storage.local.get('stacklens_ai_settings', (r) => resolve(r.stacklens_ai_settings || {}));
      });
      if (!settings.apiKey) {
        messages.innerHTML += `<div class="chat-msg system error"><div class="msg-bubble">Please add your Google AI Studio API key in Settings first.</div></div>`;
        return;
      }

      const systemPrompt = buildChatContext(text);
      const response = await AI_SERVICE.generateContent(systemPrompt, { temperature: 0.3, maxOutputTokens: 2048 });

      const formatted = renderChatMarkdown(response);
      messages.innerHTML += `<div class="chat-msg system"><div class="msg-bubble">${formatted}</div></div>`;
      messages.scrollTop = messages.scrollHeight;
    } catch (e) {
      messages.innerHTML += `<div class="chat-msg system error"><div class="msg-bubble">Error: ${escapeHtml(e.message)}</div></div>`;
    }
  }

  function buildChatContext(question) {
    const entries = Object.entries(allData).slice(0, 20);
    let context = `You are a competitive analysis assistant. You have data on ${entries.length} tracked websites.\n\n`;

    entries.forEach(([hostname, record]) => {
      const info = record.latest || {};
      const stack = info.stack || {};
      const seoScore = info.seoScore;
      const a11yScore = info.a11yScore;
      const v = info.webVitals || {};
      const visits = record.visits?.length || 1;

      context += `Site: ${hostname}\n`;
      context += `  Title: ${info.title || 'N/A'}\n`;
      context += `  Visits: ${visits}\n`;
      context += `  Stack: ${JSON.stringify(stack)}\n`;
      if (seoScore) context += `  SEO Score: ${seoScore.score}/100 (Grade: ${seoScore.grade})\n`;
      if (a11yScore) context += `  A11y Score: ${a11yScore.score}/100 (Grade: ${a11yScore.grade})\n`;
      if (v.lcp) context += `  LCP: ${v.lcp}ms, CLS: ${v.cls || 'N/A'}, FCP: ${v.fcp || 'N/A'}ms\n`;
      context += '\n';
    });

    context += `\nUser question: ${question}\n\nProvide a helpful, data-driven answer. Use bullet points where appropriate. Be concise.`;

    return context;
  }

  function renderChatMarkdown(text) {
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/##\s+(.+)/g, '<strong>$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => '<ul>' + m.replace(/\n$/, '') + '</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    return '<p>' + html + '</p>';
  }

  // --- Site List ---
  function renderSiteList() {
    const query = ($('searchInput').value || '').toLowerCase();
    let entries = Object.entries(allData).filter(([h]) => h.includes(query));
    if (activeFilter !== 'all') {
      entries = entries.filter(([, d]) => { const s = d.latest?.stack || {}; return s[activeFilter] && s[activeFilter].length > 0; });
    }

    const sorted = entries.sort((a, b) => {
      const ta = a[1].latest?.lastUpdated || a[1].visits?.[a[1].visits.length - 1]?.visitedAt || 0;
      const tb = b[1].latest?.lastUpdated || b[1].visits?.[b[1].visits.length - 1]?.visitedAt || 0;
      return tb - ta;
    });

    const list = $('siteList');
    list.innerHTML = '';
    if (sorted.length === 0) {
      list.innerHTML = '<p class="empty-state">No sites analyzed yet. Visit some websites!</p>';
      $('siteCount').textContent = '0 sites';
      return;
    }

    sorted.forEach(([hostname, data]) => {
      const info = data.latest || {};
      const stack = info.stack || {};
      const allTechs = Object.values(stack).flat();
      const topTechs = allTechs.slice(0, 4);
      const seoScore = info.seoScore;
      const a11yScore = info.a11yScore;
      const avgGrade = (seoScore || a11yScore) ? calcAvgGrade(seoScore, a11yScore) : 'na';
      const visitCount = data.visits?.length || 1;

      list.innerHTML += `<div class="site-card" data-hostname="${escapeHtml(hostname)}">
        <div class="site-info">
          <div class="site-name">${escapeHtml(hostname)} <span style="font-size:10px;color:var(--text-2);font-weight:400;">${visitCount}v</span></div>
          <div class="site-meta">${info.title ? escapeHtml(info.title).slice(0, 50) : ''} ${info.title ? '·' : ''} ${formatDate(info.lastUpdated)}</div>
          <div class="site-badges">${topTechs.map((t) => `<span class="badge badge-tech">${escapeHtml(t)}</span>`).join('')}</div>
        </div>
        <div class="site-card-score">
          <span class="mini-score ${avgGrade}">${avgGrade === 'na' ? '—' : avgGrade.toUpperCase()}</span>
          <button class="delete-btn" data-hostname="${escapeHtml(hostname)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>`;
    });

    list.querySelectorAll('.site-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-btn')) showSiteDetail(card.dataset.hostname);
      });
      card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHostname(card.dataset.hostname);
      });
    });

    $('siteCount').textContent = `${sorted.length} site${sorted.length !== 1 ? 's' : ''}`;
  }

  function calcAvgGrade(seo, a11y) {
    const scores = [];
    if (seo?.score) scores.push(seo.score);
    if (a11y?.score) scores.push(a11y.score);
    if (!scores.length) return 'na';
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return avg >= 90 ? 'a' : avg >= 80 ? 'b' : avg >= 70 ? 'c' : avg >= 60 ? 'd' : 'f';
  }

  // --- Site Detail ---
  function showSiteDetail(hostname) {
    const data = allData[hostname];
    if (!data) return;
    currentHostname = hostname;
    switchTab('current');
    renderDetail(data);
  }

  function renderCurrentSite() {
    const data = allData[currentHostname];
    if (!data) {
      $('currentSiteInfo').innerHTML = '<p class="empty-state">No analysis yet. Refresh to trigger detection.</p>';
      return;
    }
    renderDetail(data);
  }

  function renderDetail(data) {
    const info = data.latest || {};
    const stack = info.stack || {};
    const visits = data.visits || [];
    const palette = info.palette || [];
    const typography = info.typography || {};
    const layout = info.layout || {};
    const vitals = info.webVitals || {};
    const resources = info.resourceTimings || {};
    const bundles = info.bundleEstimate || {};
    const seo = info.seo || {};
    const seoScore = info.seoScore;
    const a11y = info.a11y || {};
    const a11yScore = info.a11yScore;
    const screenshot = info.screenshot;
    const sImages = info.scrapedImages || [];
    const sVideos = info.scrapedVideos || [];
    const sText = info.scrapedText || {};
    const sArticle = info.scrapedArticle || {};

    let html = '';

    if (screenshot) {
      html += `<div class="screenshot-container"><img src="${screenshot}" alt="Screenshot" /></div>`;
    }

    html += `<div class="site-title-bar">
      <span class="site-domain">${escapeHtml(currentHostname)}</span>
      <span class="site-url">${escapeHtml(info.url || '')}</span>
    </div>`;

    // Scores
    if (seoScore || a11yScore) {
      html += `<div class="detail-section"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg> Scores</h3><div class="detail-body">`;
      if (seoScore) {
        const g = (seoScore.grade || '').toLowerCase();
        html += `<div class="score-row"><span class="score-badge ${g}">${seoScore.grade}</span><div class="score-info"><div class="score-label">SEO Score</div><div class="score-num">${seoScore.score}/${seoScore.maxScore}</div><div class="score-bar"><div class="score-bar-fill ${g}" style="width:${seoScore.score}%"></div></div></div></div>`;
      }
      if (a11yScore) {
        const g = (a11yScore.grade || '').toLowerCase();
        html += `<div class="score-row"><span class="score-badge ${g}">${a11yScore.grade}</span><div class="score-info"><div class="score-label">Accessibility</div><div class="score-num">${a11yScore.score}/${a11yScore.maxScore}</div><div class="score-bar"><div class="score-bar-fill ${g}" style="width:${a11yScore.score}%"></div></div></div></div>`;
      }
      html += `</div></div>`;
    }

    // Stack
    if (Object.keys(stack).length > 0) {
      let s = '';
      for (const [cat, techs] of Object.entries(stack)) {
        if (techs.length > 0) s += `<p><strong>${capitalize(cat)}:</strong> ${techs.join(', ')}</p>`;
      }
      html += makeSection('Stack', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', s);
    }

    // Timeline
    if (visits.length >= 2) {
      html += renderTimeline(visits);
    }

    // SEO
    if (Object.keys(seo).length > 0) {
      html += renderSEOSection(seo, seoScore);
    }

    // A11y
    if (Object.keys(a11y).length > 0) {
      html += renderA11ySection(a11y, a11yScore);
    }

    // Visual
    if (palette.length > 0) {
      html += makeSection('Color Palette', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
        `<div class="palette-grid">${palette.map((c) => `<div class="palette-item" style="background:${c.color}" data-color="${c.color}"></div>`).join('')}</div>`);
    }

    if (typography.families?.length > 0) {
      html += makeSection('Typography', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
        `<div class="typography-list">${typography.families.map((f) => `<div class="font-sample"><span class="font-name" style="font-family:${f.family}">${escapeHtml(f.family)}</span><span class="font-count">${f.count}x</span></div>`).join('')}</div>`);
    }

    if (Object.keys(layout).length > 0) {
      let lay = `<p><strong>Viewport:</strong> ${layout.viewportWidth || '?'}×${layout.viewportHeight || '?'}px</p>`;
      if (layout.containerWidths?.length) lay += `<p><strong>Containers:</strong> ${layout.containerWidths.join(', ')}px</p>`;
      if (layout.gridSystems?.length) lay += `<p><strong>Grid:</strong> ${layout.gridSystems.join(', ')}</p>`;
      if (layout.breakpoints?.length) lay += `<p><strong>Breakpoint:</strong> ${layout.breakpoints.join(', ')}</p>`;
      html += makeSection('Layout', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>', lay);
    }

    // Performance
    if (Object.keys(vitals).length > 0) {
      let p = '';
      if (vitals.lcp) { const c = vitals.lcp <= 2500 ? 'good' : vitals.lcp <= 4000 ? 'needs-improvement' : 'poor'; p += `<p><strong>LCP:</strong> ${vitals.lcp}ms <span class="perf-bar"><span class="perf-bar-fill ${c}" style="width:${Math.min(100, (vitals.lcp / 8000) * 100)}%"></span></span></p>`; }
      if (vitals.cls !== undefined) { const c = vitals.cls <= 0.1 ? 'good' : vitals.cls <= 0.25 ? 'needs-improvement' : 'poor'; p += `<p><strong>CLS:</strong> ${vitals.cls} <span class="perf-bar"><span class="perf-bar-fill ${c}" style="width:${Math.min(100, (vitals.cls / 0.5) * 100)}%"></span></span></p>`; }
      if (vitals.fcp) p += `<p><strong>FCP:</strong> ${vitals.fcp}ms</p>`;
      if (vitals.inp) p += `<p><strong>INP:</strong> ${vitals.inp}ms</p>`;
      html += makeSection('Web Vitals', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>', p);
    }

    if (resources.byType && Object.keys(resources.byType).length > 0) {
      let r = `<table style="width:100%;font-size:12px;"><tr style="color:var(--text-2);"><td style="padding:2px 0;">Total</td><td style="padding:2px 0;text-align:right;">${resources.resources?.length || 0} req</td><td style="padding:2px 0;text-align:right;">${formatBytes(resources.totalSize || 0)}</td></tr>`;
      for (const [t, ri] of Object.entries(resources.byType)) {
        r += `<tr style="color:var(--text-2);"><td style="padding:2px 0;">${t}</td><td style="padding:2px 0;text-align:right;">${ri.count}</td><td style="padding:2px 0;text-align:right;">${formatBytes(ri.totalSize)}</td></tr>`;
      }
      r += `</table>`;
      html += makeSection('Resources', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>', r);
    }

    if (Object.keys(bundles).length > 0) {
      let b = `<p><strong>Scripts:</strong> ${formatBytes(bundles.scripts || 0)}</p><p><strong>Styles:</strong> ${formatBytes(bundles.styles || 0)}</p><p><strong>Fonts:</strong> ${formatBytes(bundles.fonts || 0)}</p><p><strong>Images:</strong> ${formatBytes(bundles.images || 0)}</p><p><strong>Total:</strong> ${formatBytes(bundles.total || 0)}</p>`;
      html += makeSection('Bundle Estimate', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>', b);
    }

    // Scraped Content
    if (sImages.length > 0) {
      let g = `<div class="image-gallery">`;
      sImages.slice(0, 6).forEach((img) => {
        const dims = img.width && img.height ? `${img.width}×${img.height}` : '';
        g += `<div class="image-gallery-item"><img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || '')}" onerror="this.style.display='none'" /><div class="img-meta">${escapeHtml(dims)}${img.lazy ? ' lazy' : ''}${!img.visible ? ' hidden' : ''}</div></div>`;
      });
      g += `</div>`;
      if (sImages.length > 6) g += `<p style="font-size:10px;color:var(--text-2);margin-top:4px;">+${sImages.length - 6} more images</p>`;
      html += makeSection(`Images (${sImages.length})`, '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>', g);
    }

    if (sVideos.length > 0) {
      let v = sVideos.slice(0, 5).map((vid) => `<p style="font-size:11px;color:var(--text-2);"><strong>${vid.type}</strong>: ${escapeHtml(vid.src.slice(0, 80))}${vid.width ? ` (${vid.width}×${vid.height})` : ''}</p>`).join('');
      if (sVideos.length > 5) v += `<p style="font-size:10px;color:var(--text-2);">+${sVideos.length - 5} more</p>`;
      html += makeSection(`Videos (${sVideos.length})`, '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>', v);
    }

    if (sText.wordCount) {
      let t = `<p><strong>Word count:</strong> ${sText.wordCount} · <strong>Chars:</strong> ${sText.charCount}</p>`;
      if (sText.firstParagraphs?.length) {
        t += sText.firstParagraphs.map((p) => `<p style="font-size:11px;color:var(--text-2);margin-top:4px;">${escapeHtml(p)}</p>`).join('');
      }
      html += makeSection('Content', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', t);
    }

    if (sArticle.headline) {
      let a = `<p><strong>${escapeHtml(sArticle.headline)}</strong></p><p style="font-size:11px;color:var(--text-2);">${sArticle.wordCount} words · ${sArticle.images} images · ${sArticle.paragraphs?.length || 0} paragraphs</p>`;
      if (sArticle.paragraphs?.length) {
        a += sArticle.paragraphs.slice(0, 3).map((p) => `<p style="font-size:11px;color:var(--text-2);margin-top:4px;">${escapeHtml(p.slice(0, 150))}${p.length > 150 ? '...' : ''}</p>`).join('');
      }
      html += makeSection('Article', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', a);
    }

    if (!html) {
      html = '<p class="empty-state">No data yet. Visit this page or click Refresh.</p>';
    }

    $('currentSiteInfo').innerHTML = html;
  }

  // --- Timeline ---
  function renderTimeline(visits) {
    if (visits.length < 2) return '';

    const items = visits.slice().reverse();
    const firstStack = items[0]?.stack || {};

    let html = '<div class="detail-section"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><polyline points="8 5 3 12 8 19"/></svg> Timeline</h3><div class="detail-body"><div class="timeline">';

    let prevStack = firstStack;
    items.forEach((visit, idx) => {
      const curStack = visit.stack || {};
      const date = formatDate(visit.visitedAt || visit.lastUpdated);

      html += `<div class="timeline-item">
        <div class="timeline-date">${date}${idx === 0 ? ' (first)' : ''}${idx === items.length - 1 ? ' (latest)' : ''}</div>`;

      if (idx > 0) {
        const diffs = getStackDiffs(prevStack, curStack);
        if (diffs.added.length > 0 || diffs.removed.length > 0) {
          html += '<div class="timeline-diff">';
          diffs.added.forEach((t) => { html += `<span class="diff-added">+${escapeHtml(t)}</span>`; });
          diffs.removed.forEach((t) => { html += `<span class="diff-removed">-${escapeHtml(t)}</span>`; });
          html += '</div>';
        } else {
          html += '<div class="timeline-content" style="color:var(--text-2);">No stack changes</div>';
        }
      } else {
        const allTechs = Object.values(curStack).flat();
        html += `<div class="timeline-content">${allTechs.slice(0, 5).join(', ')}${allTechs.length > 5 ? '...' : ''}</div>`;
      }

      html += '</div>';
      prevStack = curStack;
    });

    html += '</div></div></div>';
    return html;
  }

  function getStackDiffs(prev, curr) {
    const added = [], removed = [];
    const allCats = [...new Set([...Object.keys(prev), ...Object.keys(curr)])];
    for (const cat of allCats) {
      const p = prev[cat] || [], c = curr[cat] || [];
      c.forEach((t) => { if (!p.includes(t)) added.push(t); });
      p.forEach((t) => { if (!c.includes(t)) removed.push(t); });
    }
    return { added, removed };
  }

  // --- SEO Section ---
  function renderSEOSection(seo, score) {
    let html = `<div class="detail-section"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> SEO Audit</h3><div class="detail-body">`;
    if (score?.checks) {
      html += `<div class="breakdown-list">${score.checks.slice(0, 10).map((c) => `<div class="breakdown-item"><span class="breakdown-dot ${c.pass ? 'pass' : 'fail'}"></span><span class="breakdown-msg">${escapeHtml(c.msg)}</span></div>`).join('')}</div><br>`;
    }
    if (seo.title) html += `<p><strong>Title:</strong> ${escapeHtml(seo.title.text || '(none)')} <span style="color:var(--text-2);font-size:11px;">(${seo.title.length} chars)</span></p>`;
    const importantMeta = ['description', 'robots', 'viewport'];
    if (seo.meta) { importantMeta.forEach((k) => { if (seo.meta[k]) html += `<p><strong>${k}:</strong> ${escapeHtml(seo.meta[k][0])}</p>`; }); }
    if (seo.openGraph && Object.keys(seo.openGraph).length > 0) {
      html += `<br><p><strong>Open Graph:</strong></p><div class="meta-tags">`;
      Object.entries(seo.openGraph).slice(0, 6).forEach(([k, v]) => { html += `<div class="meta-tag-row"><span class="meta-key">${escapeHtml(k)}</span><span class="meta-value">${escapeHtml(String(v))}</span></div>`; });
      html += `</div>`;
    }
    if (seo.headings) {
      html += `<br><p><strong>Heading Structure:</strong></p><div class="heading-bar">`;
      for (let i = 1; i <= 6; i++) {
        const h = seo.headings[`h${i}`];
        const count = h?.count || 0;
        const maxCount = Math.max(1, ...Object.values(seo.headings).map((h) => h?.count || 0));
        html += `<div class="heading-bar-item"><div class="heading-bar-fill h${i}" style="height:${Math.max(4, (count / maxCount) * 100)}%"></div><span class="heading-bar-label">h${i}:${count}</span></div>`;
      }
      html += `</div>`;
    }
    if (seo.links) {
      html += `<br><div class="seo-stat-grid">
        <div class="seo-stat"><div class="stat-label">Internal links</div><div class="stat-value">${seo.links.internal || 0}</div></div>
        <div class="seo-stat"><div class="stat-label">External links</div><div class="stat-value">${seo.links.external || 0}</div></div>
        <div class="seo-stat"><div class="stat-label">Total images</div><div class="stat-value">${seo.images?.total || 0}</div></div>
        <div class="seo-stat"><div class="stat-label">Missing alt</div><div class="stat-value ${seo.images?.withoutAlt > 0 ? 'warning' : 'good'}">${seo.images?.withoutAlt || 0}</div></div>
        <div class="seo-stat"><div class="stat-label">Word count</div><div class="stat-value">${seo.content?.wordCount || 0}</div></div>
        <div class="seo-stat"><div class="stat-label">Reading time</div><div class="stat-value">${seo.content?.readingTimeMinutes || 0} min</div></div>
      </div>`;
    }
    if (seo.content) html += `<br><p><strong>Content:</strong> ${seo.content.wordCount} words · ${seo.content.readingTimeMinutes} min · ${seo.content.textToHtmlRatio}% text/HTML</p>`;
    if (seo.canonical) html += `<p><strong>Canonical:</strong> ${seo.canonical.hasCanonical ? escapeHtml(seo.canonical.href) : '<span style="color:var(--danger)">Not set</span>'}</p>`;
    if (seo.robots) {
      html += `<p><strong>Robots:</strong> ${seo.robots.content || '<span style="color:var(--text-2)">Default (all allowed)</span>'}`;
      if (seo.robots.noindex) html += ` <span style="color:var(--danger)">· NOINDEX</span>`;
      if (seo.robots.nofollow) html += ` <span style="color:var(--warning)">· NOFOLLOW</span>`;
      html += `</p>`;
    }
    if (seo.structuredData) html += `<p><strong>Structured data:</strong> ${seo.structuredData.jsonldCount} JSON-LD · ${seo.structuredData.microdataCount} microdata items</p>`;
    if (seo.hreflang?.count > 0) html += `<p><strong>Hreflang:</strong> ${seo.hreflang.count} tags</p>`;
    if (seo.favicon) html += `<p><strong>Favicon:</strong> ${seo.favicon.hasFavicon ? 'Present' : '<span style="color:var(--warning)">Missing</span>'}</p>`;
    if (seo.language) html += `<p><strong>Language:</strong> ${seo.language.lang || '<span style="color:var(--warning)">Not set</span>'} · ${seo.language.charset || ''}</p>`;
    html += `<p><strong>HTTPS:</strong> ${seo.isHTTPS ? '<span style="color:var(--success)">Yes</span>' : '<span style="color:var(--danger)">No</span>'}</p>`;
    html += `</div></div>`;
    return html;
  }

  // --- A11y Section ---
  function renderA11ySection(a11y, score) {
    let html = `<div class="detail-section"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> Accessibility</h3><div class="detail-body">`;
    if (score?.checks) {
      html += `<div class="breakdown-list">${score.checks.slice(0, 8).map((c) => `<div class="breakdown-item"><span class="breakdown-dot ${c.pass ? 'pass' : 'fail'}"></span><span class="breakdown-msg">${escapeHtml(c.msg)}</span></div>`).join('')}</div><br>`;
    }
    if (a11y.landmarks) {
      const present = Object.entries(a11y.landmarks).filter(([, v]) => v.present).map(([k]) => k);
      html += `<p><strong>Landmarks:</strong> ${present.length > 0 ? present.join(', ') : '<span style="color:var(--warning)">None detected</span>'}</p>`;
    }
    if (a11y.headingsA11y) {
      const h = a11y.headingsA11y;
      const parts = Object.entries(h.headingLevels || {}).filter(([, c]) => c > 0).map(([k, c]) => `${k}=${c}`);
      html += `<p><strong>Headings:</strong> ${parts.join(', ')}${h.skippedLevel ? ' <span style="color:var(--warning)">· Skipped levels!</span>' : ''}</p>`;
    }
    if (a11y.images) html += `<p><strong>Images:</strong> ${a11y.images.total} total · ${a11y.images.withAlt} with alt · ${a11y.images.missingAlt} missing alt · ${a11y.images.decorative} decorative</p>`;
    if (a11y.forms) {
      html += `<p><strong>Forms:</strong> ${a11y.forms.totalInputs} inputs · ${a11y.forms.properlyLabeled} labeled`;
      if (a11y.forms.totalInputs > 0 && a11y.forms.properlyLabeled < a11y.forms.totalInputs) html += ` <span style="color:var(--danger)">· ${a11y.forms.totalInputs - a11y.forms.properlyLabeled} unlabeled</span>`;
      html += `</p>`;
    }
    if (a11y.focus) {
      html += `<p><strong>Focus:</strong> ${a11y.focus.focusableCount} elements`;
      html += a11y.focus.hasSkipLink ? ` · Skip link present` : ` · <span style="color:var(--warning)">No skip link</span>`;
      html += `</p>`;
    }
    if (a11y.aria) html += `<p><strong>ARIA:</strong> ${a11y.aria.ariaCount} attributes · ${a11y.aria.roles?.length || 0} roles</p>`;
    if (a11y.contrast?.issues?.length > 0) {
      html += `<br><p><strong>Contrast issues (${a11y.contrast.failingCount}):</strong></p>`;
      a11y.contrast.issues.slice(0, 5).forEach((issue) => {
        html += `<div class="contrast-issue"><span>${escapeHtml(issue.text || issue.element)}</span><span class="ratio-badge fail">${issue.ratio}:1 (need ${issue.required}:1)</span></div>`;
      });
    }
    html += `</div></div>`;
    return html;
  }

  function makeSection(title, icon, body) {
    return `<div class="detail-section">
      <h3 class="collapsible-header" onclick="this.classList.toggle('collapsed'); this.nextElementSibling.classList.toggle('collapsed')">
        ${icon} ${title}
        <span class="collapse-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>
      </h3>
      <div class="detail-body collapsible-body">${body}</div>
    </div>`;
  }

  // --- Compare ---
  function populateCompareSelects() {
    const s1 = $('compareSite1'), s2 = $('compareSite2');
    const cv1 = s1.value, cv2 = s2.value;
    s1.innerHTML = '<option value="">Site 1</option>';
    s2.innerHTML = '<option value="">Site 2</option>';
    Object.keys(allData).sort().forEach((h) => {
      s1.innerHTML += `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`;
      s2.innerHTML += `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`;
    });
    if (cv1 && allData[cv1]) s1.value = cv1;
    if (cv2 && allData[cv2]) s2.value = cv2;
  }

  function runComparison() {
    const h1 = $('compareSite1').value, h2 = $('compareSite2').value;
    if (!h1 || !h2) { $('compareResults').innerHTML = '<p class="empty-state">Select two sites.</p>'; return; }
    const d1 = allData[h1]?.latest || {}, d2 = allData[h2]?.latest || {};
    const s1 = d1.stack || {}, s2 = d2.stack || {};
    const v1 = d1.webVitals || {}, v2 = d2.webVitals || {};
    const r1 = d1.resourceTimings || {}, r2 = d2.resourceTimings || {};
    const seo1 = d1.seoScore || {}, seo2 = d2.seoScore || {};
    const a111 = d1.a11yScore || {}, a112 = d2.a11yScore || {};
    const allCats = [...new Set([...Object.keys(s1), ...Object.keys(s2)])];

    let html = `<table class="compare-table"><tr><th>Metric</th><th>${escapeHtml(h1)}</th><th>${escapeHtml(h2)}</th></tr>`;
    html += `<tr><td colspan="3" style="background:var(--surface-2);font-weight:600;">Scores</td></tr>`;
    html += `<tr><td>SEO</td><td>${seo1.score !== undefined ? seo1.score + '/' + seo1.maxScore + ' (' + seo1.grade + ')' : '<span class="muted">—</span>'}</td><td>${seo2.score !== undefined ? seo2.score + '/' + seo2.maxScore + ' (' + seo2.grade + ')' : '<span class="muted">—</span>'}</td></tr>`;
    html += `<tr><td>Accessibility</td><td>${a111.score !== undefined ? a111.score + '/' + a111.maxScore + ' (' + a111.grade + ')' : '<span class="muted">—</span>'}</td><td>${a112.score !== undefined ? a112.score + '/' + a112.maxScore + ' (' + a112.grade + ')' : '<span class="muted">—</span>'}</td></tr>`;
    html += `<tr><td colspan="3" style="background:var(--surface-2);font-weight:600;">Stack</td></tr>`;
    for (const cat of allCats) {
      html += `<tr><td>${capitalize(cat)}</td><td>${(s1[cat] || []).join(', ') || '<span class="muted">—</span>'}</td><td>${(s2[cat] || []).join(', ') || '<span class="muted">—</span>'}</td></tr>`;
    }
    html += `<tr><td colspan="3" style="background:var(--surface-2);font-weight:600;">Web Vitals</td></tr>`;
    html += `<tr><td>LCP</td><td>${v1.lcp ? v1.lcp + 'ms' : '<span class="muted">—</span>'}</td><td>${v2.lcp ? v2.lcp + 'ms' : '<span class="muted">—</span>'}</td></tr>`;
    html += `<tr><td>CLS</td><td>${v1.cls !== undefined ? v1.cls : '<span class="muted">—</span>'}</td><td>${v2.cls !== undefined ? v2.cls : '<span class="muted">—</span>'}</td></tr>`;
    html += `<tr><td>FCP</td><td>${v1.fcp ? v1.fcp + 'ms' : '<span class="muted">—</span>'}</td><td>${v2.fcp ? v2.fcp + 'ms' : '<span class="muted">—</span>'}</td></tr>`;
    html += `<tr><td>Resources</td><td>${r1.resources?.length || 0} req · ${formatBytes(r1.totalSize || 0)}</td><td>${r2.resources?.length || 0} req · ${formatBytes(r2.totalSize || 0)}</td></tr>`;

    const seoData1 = d1.seo || {}, seoData2 = d2.seo || {};
    html += `<tr><td colspan="3" style="background:var(--surface-2);font-weight:600;">SEO</td></tr>`;
    html += `<tr><td>Title</td><td>${seoData1.title?.length || '<span class="muted">—</span>'}</td><td>${seoData2.title?.length || '<span class="muted">—</span>'}</td></tr>`;
    html += `<tr><td>Words</td><td>${seoData1.content?.wordCount || '<span class="muted">—</span>'}</td><td>${seoData2.content?.wordCount || '<span class="muted">—</span>'}</td></tr>`;
    html += `<tr><td>Alt missing</td><td>${seoData1.images?.withoutAlt || 0}</td><td>${seoData2.images?.withoutAlt || 0}</td></tr>`;
    html += `</table>`;

    html += `<br><div class="detail-section"><h3>Score Bars</h3><div class="detail-body"><table class="compare-table">`;
    const s1s = seo1.score || 0, s2s = seo2.score || 0;
    const a1s = a111.score || 0, a2s = a112.score || 0;
    html += `<tr><td>SEO</td><td><span class="perf-bar"><span class="perf-bar-fill ${s1s >= 80 ? 'good' : s1s >= 60 ? 'needs-improvement' : 'poor'}" style="width:${s1s}%"></span></span> ${s1s}%</td><td><span class="perf-bar"><span class="perf-bar-fill ${s2s >= 80 ? 'good' : s2s >= 60 ? 'needs-improvement' : 'poor'}" style="width:${s2s}%"></span></span> ${s2s}%</td></tr>`;
    html += `<tr><td>A11y</td><td><span class="perf-bar"><span class="perf-bar-fill ${a1s >= 80 ? 'good' : a1s >= 60 ? 'needs-improvement' : 'poor'}" style="width:${a1s}%"></span></span> ${a1s}%</td><td><span class="perf-bar"><span class="perf-bar-fill ${a2s >= 80 ? 'good' : a2s >= 60 ? 'needs-improvement' : 'poor'}" style="width:${a2s}%"></span></span> ${a2s}%</td></tr>`;
    html += `</table></div></div>`;

    $('compareResults').innerHTML = html;
  }

  // --- Trends Modal ---
  function showTrendsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'trends-overlay';
    overlay.innerHTML = `<div class="trends-modal">
      <h2>Trends & Insights <button class="close-btn" id="trendsCloseBtn">&times;</button></h2>
      <div id="trendsContent"><p class="loading">Generating charts...</p></div>
    </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#trendsCloseBtn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    renderTrends(overlay.querySelector('#trendsContent'));
  }

  function renderTrends(container) {
    const entries = Object.entries(allData);
    const now = Date.now();

    // Tech adoption bar chart
    const techCounts = {};
    entries.forEach(([, d]) => {
      const stack = d.latest?.stack || {};
      Object.values(stack).flat().forEach((t) => { techCounts[t] = (techCounts[t] || 0) + 1; });
    });
    const sortedTechs = Object.entries(techCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const techData = sortedTechs.map(([t, c]) => ({ label: t.length > 10 ? t.slice(0, 10) + '…' : t, value: c }));
    const techChart = Charts.bar(techData, { width: 260, height: 120, title: 'Tech Adoption' });

    // Category donut
    const catCounts = {};
    entries.forEach(([, d]) => {
      const stack = d.latest?.stack || {};
      Object.keys(stack).forEach((cat) => { catCounts[cat] = (catCounts[cat] || 0) + (stack[cat]?.length || 0); });
    });
    const donutData = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, v]) => ({ label: capitalize(c), value: v }));
    const donutChart = Charts.donut(donutData);

    // Scores sparkline per site
    const siteScores = entries.filter(([, d]) => d.latest?.seoScore?.score).map(([h, d]) => ({
      label: h.length > 12 ? h.slice(0, 12) + '…' : h,
      value: d.latest.seoScore.score,
    })).sort((a, b) => b.value - a.value).slice(0, 6);
    const scoreChart = siteScores.length > 0 ? Charts.bar(siteScores, { width: 260, height: 100, barColor: '#22c55e', title: 'SEO Scores' }) : '';

    // Visit activity sparkline
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const day = now - (29 - i) * 86400000;
      return { label: '', value: entries.filter(([, d]) => (d.latest?.lastUpdated || 0) > day && (d.latest?.lastUpdated || 0) < day + 86400000).length };
    });
    const activityChart = Charts.bar(last30Days, { width: 260, height: 60, barColor: '#6c63ff' });

    let html = '';

    if (Object.keys(allData).length === 0) {
      html = '<p class="empty-state">No data yet. Track some sites first.</p>';
    } else {
      html += `<div class="trend-section"><h3>Technology Distribution</h3><div class="svg-container">${techChart}</div></div>`;
      html += `<div class="trend-section"><h3>Categories Breakdown</h3>${donutChart}</div>`;
      if (scoreChart) html += `<div class="trend-section"><h3>Site SEO Scores</h3><div class="svg-container">${scoreChart}</div></div>`;
      html += `<div class="trend-section"><h3>Scan Activity (30 days)</h3><div class="svg-container">${activityChart}</div></div>`;
    }

    container.innerHTML = html;
  }

  // --- AI Features ---
  let aiKeyChecked = false;

  async function checkAiSetup() {
    try {
      const settings = await new Promise((r) => chrome.storage.local.get('stacklens_ai_settings', (res) => r(res.stacklens_ai_settings || {})));
      $('aiSetup').style.display = settings.apiKey ? 'none' : 'block';
      $('aiPanel').style.display = settings.apiKey ? 'flex' : 'none';
      if (settings.apiKey) $('aiModelBadge').textContent = settings.model || 'gemma-4-31b-it';
    } catch (e) { console.error('[StackLens] checkAiSetup error:', e); }
  }

  function setAiStatus(state) { $('aiStatusDot').className = 'ai-status-dot ' + state; }
  function disableAiButtons(d) { $$('.ai-btn').forEach((b) => (b.disabled = d)); }

  async function runAiAnalysis(action) {
    const rd = $('aiResult');
    rd.innerHTML = '<div class="ai-loading"><span class="spinner"></span> Analyzing...</div>';
    setAiStatus('loading');
    disableAiButtons(true);
    try {
      let r = '';
      if (action === 'summary') r = await aiPageSummary();
      else if (action === 'seo') r = await aiSEOTips();
      else if (action === 'stack') r = await aiStackDeepDive();
      else if (action === 'compare') r = await aiCompetitorInsight();
      rd.innerHTML = r;
      setAiStatus('success');
    } catch (e) {
      rd.innerHTML = `<div class="ai-error"><strong>Error:</strong> ${escapeHtml(e.message)}</div>`;
      setAiStatus('error');
    } finally { disableAiButtons(false); }
  }

  function renderAiMarkdown(text) {
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/##\s+(.+)/g, '<h4>$1</h4>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>').replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => '<ul>' + m.replace(/\n$/, '') + '</ul>')
      .replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    return '<p>' + html + '</p>';
  }

  async function getPageDataForAI() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const hn = tabs[0]?.url ? new URL(tabs[0].url).hostname : currentHostname;
    const d = allData[hn]?.latest || allData[currentHostname]?.latest || {};
    return { hostname: hn, url: d.url || tabs[0]?.url || '', title: d.title || '', stack: d.stack || {}, seo: d.seo || {}, seoScore: d.seoScore, a11y: d.a11y || {}, a11yScore: d.a11yScore, webVitals: d.webVitals || {}, resourceTimings: d.resourceTimings || {}, bundleEstimate: d.bundleEstimate || {}, palette: d.palette || [], typography: d.typography || {}, layout: d.layout || {} };
  }

  async function aiPageSummary() {
    const p = await getPageDataForAI();
    const t = await AI_SERVICE.generatePageSummary({ url: p.url, title: p.title, bodyText: p.title + ' ' + (p.seo?.content?.wordCount ? `Page has ${p.seo.content.wordCount} words` : '') });
    return renderAiMarkdown(t);
  }

  async function aiSEOTips() {
    const p = await getPageDataForAI();
    const seo = p.seo || {};
    const t = await AI_SERVICE.analyzeSEO({ url: p.url }, {
      title: seo.title?.text || p.title || '', metaDesc: seo.meta?.description?.[0] || '',
      headings: seo.headings || {}, wordCount: seo.content?.wordCount || 0,
      imageCount: seo.images?.total || 0, imagesMissingAlt: seo.images?.withoutAlt || 0,
      internalLinks: seo.links?.internal || 0, externalLinks: seo.links?.external || 0,
      hasCanonical: seo.canonical?.hasCanonical || false, hasStructuredData: (seo.structuredData?.jsonldCount || 0) > 0,
      isHTTPS: seo.isHTTPS || false, hasOG: !!(seo.openGraph?.['og:title']),
    });
    return renderAiMarkdown(t);
  }

  async function aiStackDeepDive() {
    const p = await getPageDataForAI();
    const stack = p.stack || {};
    const allTechs = Object.values(stack).flat();
    const prompt = `You are a web technology expert. Analyze this website's technology stack.

URL: ${p.url}
Title: ${p.title}
Detected technologies: ${allTechs.join(', ') || 'None detected yet.'}
Full stack breakdown: ${JSON.stringify(stack, null, 2)}

Provide a brief analysis (3-5 sentences) covering:
1. What this tech stack says about the site (modern? enterprise? custom?)
2. Notable technology choices and what they imply
3. Any obvious gaps or over-engineering

Then list interesting technical observations as bullet points.`;
    const t = await AI_SERVICE.generateContent(prompt, { temperature: 0.3, maxOutputTokens: 1024 });
    return renderAiMarkdown(t);
  }

  async function aiCompetitorInsight() {
    const entries = Object.entries(allData).sort((a, b) => { const ta = a[1].latest?.lastUpdated || 0, tb = b[1].latest?.lastUpdated || 0; return tb - ta; });
    if (entries.length < 2) return '<p class="ai-empty">Need at least 2 analyzed sites.</p>';
    const topSites = entries.slice(0, 4).map(([hostname, record]) => {
      const info = record.latest || {};
      return { hostname, title: info.title || '', stack: info.stack || {}, seoScore: info.seoScore?.score, wordCount: info.seo?.content?.wordCount || 0, pageSize: info.pageSize || 0 };
    });
    const t = await AI_SERVICE.compareCompetitors(topSites);
    return renderAiMarkdown(t);
  }

  // --- Data Management ---
  async function deleteHostname(hostname) {
    await chrome.runtime.sendMessage({ type: 'DELETE_HOSTNAME', payload: { hostname } });
    delete allData[hostname];
    renderSiteList();
  }

  async function clearAllData() {
    if (confirm('Clear all stored analysis data?')) {
      await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });
      allData = {};
      renderSiteList();
      $('currentSiteInfo').innerHTML = '<p class="empty-state">No data. Visit pages and analyze!</p>';
      $('compareResults').innerHTML = '<p class="empty-state">Select two sites and click Compare.</p>';
    }
  }

  async function exportData() {
    const data = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stacklens-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Utilities ---
  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return diff + 'm ago';
    if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
    if (diff < 43200) return Math.floor(diff / 1440) + 'd ago';
    return d.toLocaleDateString();
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])/g, ' $1').trim();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
