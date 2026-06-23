(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  // --- Storage Stats ---
  async function loadStats() {
    try {
      const data = await chrome.runtime.sendMessage({ type: 'GET_ALL_DATA' });
      const entries = Object.entries(data || {});
      $('siteCount').textContent = entries.length;
      let totalScans = 0;
      for (const [, record] of entries) {
        totalScans += (record.visits?.length || 0);
      }
      $('totalScans').textContent = totalScans;
      const jsonSize = new Blob([JSON.stringify(data)]).size;
      $('storageSize').textContent = formatBytes(jsonSize);
    } catch (e) {
      console.error('[StackLens] Stats error:', e);
    }
  }

  // --- AI Settings ---
  function loadAiSettings() {
    chrome.storage.local.get('stacklens_ai_settings', (result) => {
      const settings = result.stacklens_ai_settings || {};
      if (settings.apiKey) {
        $('apiKeyInput').value = settings.apiKey;
        updateAiStatus(true, 'Connected');
      } else {
        updateAiStatus(false, 'Not configured');
      }
      if (settings.model) {
        $('modelSelect').value = settings.model;
      }
    });
  }

  function saveAiSettings() {
    const apiKey = $('apiKeyInput').value.trim();
    const model = $('modelSelect').value;

    if (!apiKey) {
      showToast('Please enter an API key');
      return;
    }

    const settings = { apiKey, model };
    chrome.storage.local.set({ stacklens_ai_settings: settings }, () => {
      updateAiStatus(true, 'Connected');
      showToast('AI settings saved');
    });
  }

  async function testConnection() {
    const apiKey = $('apiKeyInput').value.trim();
    if (!apiKey) {
      showToast('Enter an API key first');
      return;
    }

    const saveBtn = $('saveAiBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Testing...';
    updateAiStatus(false, 'Testing connection...');

    try {
      const model = $('modelSelect').value;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with exactly one word: OK' }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 10 },
        }),
      });

      if (response.ok) {
        updateAiStatus(true, `Connected (${model})`);
        showToast('Connection successful!');
        const settings = { apiKey, model };
        chrome.storage.local.set({ stacklens_ai_settings: settings });
      } else {
        const err = await response.text();
        updateAiStatus(false, `Error: ${response.status}`);
        showToast(`Connection failed: ${err.slice(0, 100)}`);
      }
    } catch (e) {
      updateAiStatus(false, 'Network error');
      showToast('Network error: ' + e.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save AI Settings';
    }
  }

  function updateAiStatus(connected, text) {
    const dot = document.querySelector('#aiStatus .status-dot');
    dot.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
    $('aiStatusText').textContent = text;
  }

  // --- Export ---
  async function exportJSON() {
    const data = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stacklens-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported as JSON');
  }

  async function exportCSV() {
    const data = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
    const entries = Object.entries(data || {});
    const rows = [['Hostname', 'Last Visited', 'Frameworks', 'CMS', 'Analytics', 'CDNs', 'CSS Frameworks', 'LCP', 'CLS', 'FCP', 'SEO Score', 'SEO Grade', 'A11y Score', 'A11y Grade', 'Word Count', 'Images Missing Alt', 'Title Length']];

    for (const [hostname, record] of entries) {
      const info = record.latest || {};
      const stack = info.stack || {};
      const vitals = info.webVitals || {};
      const seo = info.seo || {};
      const seoScore = info.seoScore || {};
      const a11yScore = info.a11yScore || {};
      rows.push([
        hostname,
        new Date(info.lastUpdated || record.visits?.[0]?.visitedAt || 0).toISOString(),
        (stack.frameworks || []).join('; '),
        (stack.cms || []).join('; '),
        (stack.analytics || []).join('; '),
        (stack.cdns || []).join('; '),
        (stack.cssFrameworks || []).join('; '),
        vitals.lcp || '',
        vitals.cls !== undefined ? vitals.cls : '',
        vitals.fcp || '',
        seoScore.score !== undefined ? seoScore.score : '',
        seoScore.grade || '',
        a11yScore.score !== undefined ? a11yScore.score : '',
        a11yScore.grade || '',
        seo.content?.wordCount || '',
        seo.images?.withoutAlt || '',
        seo.title?.length || '',
      ]);
    }

    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stacklens-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported as CSV');
  }

  async function clearAllData() {
    if (confirm('Clear all stored analysis data? This cannot be undone.')) {
      await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });
      loadStats();
      showToast('All data cleared');
    }
  }

  // --- Detection Settings ---
  function loadSettings() {
    chrome.storage.local.get('stacklens_settings', (result) => {
      const settings = result.stacklens_settings || {};
      $('autoDetect').checked = settings.autoDetect !== false;
      $('captureScreenshots').checked = settings.captureScreenshots !== false;
      $('trackPerformance').checked = settings.trackPerformance !== false;
    });
  }

  function saveSettings() {
    const settings = {
      autoDetect: $('autoDetect').checked,
      captureScreenshots: $('captureScreenshots').checked,
      trackPerformance: $('trackPerformance').checked,
    };
    chrome.storage.local.set({ stacklens_settings: settings });
    showToast('Settings saved');
  }

  // --- Utils ---
  function showToast(msg) {
    const toast = $('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadAiSettings();
    loadSettings();

    $('saveAiBtn').addEventListener('click', saveAiSettings);
    $('testAiBtn').addEventListener('click', testConnection);
    $('toggleKeyBtn').addEventListener('click', () => {
      const input = $('apiKeyInput');
      const btn = $('toggleKeyBtn');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });

    $('exportJsonBtn').addEventListener('click', exportJSON);
    $('exportCsvBtn').addEventListener('click', exportCSV);
    $('clearAllBtn').addEventListener('click', clearAllData);

    $('autoDetect').addEventListener('change', saveSettings);
    $('captureScreenshots').addEventListener('change', saveSettings);
    $('trackPerformance').addEventListener('change', saveSettings);

    $('viewLicense').addEventListener('click', (e) => {
      e.preventDefault();
      showToast('StackLens is MIT licensed. See GitHub for details.');
    });
  });
})();
