const STORAGE_KEY = 'stacklens_data';
const ALERTS_KEY = 'stacklens_alerts';

async function getStoredData() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
}

async function setStoredData(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

async function updateHostnameData(hostname, update) {
  const data = await getStoredData();
  if (!data[hostname]) {
    data[hostname] = { hostname, visits: [], latest: null };
  }
  const prevStack = data[hostname].latest?.stack || {};
  const newStack = update.stack || {};

  data[hostname].latest = { ...data[hostname].latest, ...update, lastUpdated: Date.now() };
  data[hostname].visits.push({ ...update, visitedAt: Date.now() });
  if (data[hostname].visits.length > 100) {
    data[hostname].visits = data[hostname].visits.slice(-100);
  }
  await setStoredData(data);

  if (Object.keys(prevStack).length > 0 && Object.keys(newStack).length > 0) {
    const changes = detectStackChanges(prevStack, newStack, hostname);
    if (changes.length > 0) {
      await addAlerts(changes);
    }
  }
  return data[hostname];
}

function detectStackChanges(prev, curr, hostname) {
  const changes = [];
  const allCats = [...new Set([...Object.keys(prev), ...Object.keys(curr)])];
  for (const cat of allCats) {
    const prevTechs = prev[cat] || [];
    const currTechs = curr[cat] || [];
    const added = currTechs.filter((t) => !prevTechs.includes(t));
    const removed = prevTechs.filter((t) => !currTechs.includes(t));
    if (added.length > 0) {
      changes.push({ type: 'added', category: cat, techs: added, hostname, time: Date.now() });
    }
    if (removed.length > 0) {
      changes.push({ type: 'removed', category: cat, techs: removed, hostname, time: Date.now() });
    }
  }
  return changes;
}

async function addAlerts(changes) {
  const result = await chrome.storage.local.get(ALERTS_KEY);
  const alerts = result[ALERTS_KEY] || [];
  for (const c of changes) {
    alerts.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...c,
      read: false,
    });
  }
  const recent = alerts.slice(0, 200);
  await chrome.storage.local.set({ [ALERTS_KEY]: recent });

  for (const c of changes) {
    const dir = c.type === 'added' ? 'added' : 'removed';
    const techs = c.techs.join(', ');
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `StackLens Alert: ${c.hostname}`,
        message: `${dir === 'added' ? 'New' : 'Removed'} ${c.category}: ${techs}`,
        priority: 1,
      });
    } catch (e) {
      console.error('[StackLens] Notification error:', e);
    }
  }
}

async function captureScreenshot(tabId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: 'png' });
    return dataUrl;
  } catch (e) {
    console.error('[StackLens] Screenshot error:', e);
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;
  const hostname = payload?.hostname || (sender?.tab?.url ? new URL(sender.tab.url).hostname : 'unknown');

  switch (type) {
    case 'STACK_DETECTED':
      updateHostnameData(hostname, { stack: payload.stack, url: payload.url, title: payload.title, pageSize: payload.pageSize, scriptCount: payload.scriptCount });
      sendResponse({ success: true });
      break;

    case 'VISUAL_AUDIT_COMPLETE':
      updateHostnameData(hostname, { palette: payload.palette, typography: payload.typography, layout: payload.layout, uiElements: payload.uiElements });
      sendResponse({ success: true });
      break;

    case 'PERFORMANCE_COMPLETE':
      updateHostnameData(hostname, { webVitals: payload.webVitals, resourceTimings: payload.resourceTimings, bundleEstimate: payload.bundleEstimate, pageLoad: payload.pageLoad });
      sendResponse({ success: true });
      break;

    case 'SEO_AUDIT_COMPLETE':
      updateHostnameData(hostname, { seo: payload, seoScore: payload.seoScore });
      sendResponse({ success: true });
      break;

    case 'A11Y_AUDIT_COMPLETE':
      updateHostnameData(hostname, { a11y: payload, a11yScore: payload.a11yScore });
      sendResponse({ success: true });
      break;

    case 'SCRAPER_COMPLETE':
      updateHostnameData(hostname, {
        scrapedImages: payload.images,
        scrapedVideos: payload.videos,
        scrapedText: payload.textContent,
        scrapedStructured: payload.structured,
        scrapedArticle: payload.article,
        scrapedLinks: payload.links,
        scrapedHeadings: payload.headings,
        scrapedAt: payload.scrapedAt,
      });
      sendResponse({ success: true });
      break;

    case 'CAPTURE_SCREENSHOT':
      if (payload?.dataUrl) {
        updateHostnameData(hostname, { screenshot: payload.dataUrl });
        sendResponse({ success: true });
      } else {
        (async () => {
          const dataUrl = await captureScreenshot(sender.tab?.id);
          if (dataUrl) updateHostnameData(hostname, { screenshot: dataUrl });
          sendResponse({ success: !!dataUrl, dataUrl });
        })();
        return true;
      }
      break;

    case 'GET_ALL_DATA':
      (async () => {
        const data = await getStoredData();
        sendResponse(data);
      })();
      return true;

    case 'GET_HOSTNAME_DATA':
      (async () => {
        const data = await getStoredData();
        sendResponse(data[payload?.hostname] || null);
      })();
      return true;

    case 'CLEAR_ALL_DATA':
      (async () => {
        await chrome.storage.local.remove(STORAGE_KEY);
        sendResponse({ success: true });
      })();
      return true;

    case 'DELETE_HOSTNAME':
      (async () => {
        const data = await getStoredData();
        delete data[payload?.hostname];
        await setStoredData(data);
        sendResponse({ success: true });
      })();
      return true;

    case 'EXPORT_DATA':
      (async () => {
        const data = await getStoredData();
        sendResponse(data);
      })();
      return true;

    case 'GET_ALERTS':
      (async () => {
        const result = await chrome.storage.local.get(ALERTS_KEY);
        sendResponse(result[ALERTS_KEY] || []);
      })();
      return true;

    case 'CLEAR_ALERTS':
      (async () => {
        await chrome.storage.local.remove(ALERTS_KEY);
        sendResponse({ success: true });
      })();
      return true;

    case 'MARK_ALERT_READ':
      (async () => {
        const result = await chrome.storage.local.get(ALERTS_KEY);
        const alerts = result[ALERTS_KEY] || [];
        const updated = alerts.map((a) => (a.id === payload?.id ? { ...a, read: true } : a));
        await chrome.storage.local.set({ [ALERTS_KEY]: updated });
        sendResponse({ success: true });
      })();
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    const hostname = new URL(tab.url).hostname;
    updateHostnameData(hostname, { url: tab.url, title: tab.title || '', visitedAt: Date.now() });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (!result[STORAGE_KEY]) chrome.storage.local.set({ [STORAGE_KEY]: {} });
  });
  chrome.storage.local.get(ALERTS_KEY, (result) => {
    if (!result[ALERTS_KEY]) chrome.storage.local.set({ [ALERTS_KEY]: [] });
  });
  chrome.alarms.create('stackCheck', { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'stackCheck') {
    chrome.storage.local.get([STORAGE_KEY, ALERTS_KEY], (result) => {
      const data = result[STORAGE_KEY] || {};
      const existingAlerts = result[ALERTS_KEY] || [];
      const summary = { total: Object.keys(data).length, withAlerts: existingAlerts.length };
      try {
        chrome.action.setBadgeText({ text: summary.withAlerts > 0 ? String(summary.withAlerts) : '' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      } catch (e) { /* badge may not be available in all contexts */ }
    });
  }
});
