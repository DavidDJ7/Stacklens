# StackLens

**Local-first Chrome extension for competitive technology stack analysis**

StackLens automatically detects, catalogs, and analyzes the technology stack, design patterns, performance metrics, SEO health, accessibility compliance, and scraped content of any website you visit — entirely in your browser with zero backend dependencies.

---

## Features

- **Stack Detection** — 100+ regex patterns across 16 technology categories (frameworks, CMS, analytics, CDNs, CSS frameworks, bundlers, fonts, hosting, ad networks, chat engines, auth, payments, testing, monorepo, databases)
- **Visual Analysis** — Color palette extraction, typography audit, layout metrics, UI element inspection
- **Performance Metrics** — Core Web Vitals (LCP, CLS, FCP, INP), resource waterfall, bundle size estimation
- **SEO Audit** — 100-point A-F scoring across 15 check categories (meta tags, headings, images, links, structured data, Open Graph, content analysis)
- **Accessibility Audit** — ARIA analysis, landmark detection, heading hierarchy, focus management, WCAG 2.1 AA contrast ratios, form labeling
- **Content Scraping** — Image/video extraction, article parsing, link harvesting, structured content (tables/lists)
- **AI Analysis** — Page summaries, SEO recommendations, stack deep-dives, competitive insights powered by Google AI Studio (BYOK — Bring Your Own Key)
- **Chat Interface** — Conversational Q&A against your tracked site data with full context awareness
- **Side-by-Side Comparison** — Compare any two sites across stack, vitals, SEO, and accessibility scores
- **Trends & Insights** — SVG charts showing technology adoption, score distributions, and scan activity
- **Stack Change Alerts** — Automatic detection of technology changes with badge notifications
- **Timeline View** — Per-site history showing stack changes over time
- **Full Export** — JSON and CSV export of all analysis data

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              CHROME BROWSER                  │
│                                             │
│  ┌─────────────────────┐  ┌──────────────┐  │
│  │     Popup (UI)      │  │   Options    │  │
│  │   popup.html/css/js │  │  settings    │  │
│  └──────────┬──────────┘  └──────┬───────┘  │
│             │                    │           │
│  ┌──────────┴──────────┐  ┌──────┴───────┐  │
│  │   Service Worker    │  │    Storage   │  │
│  │   background.js     │  │  local + DB  │  │
│  └──────────┬──────────┘  └──────────────┘  │
│             │                                │
│  ┌──────────┴──────────┐                     │
│  │   Content Scripts   │                     │
│  │   (6 analysis files)│                     │
│  └─────────────────────┘                     │
└─────────────────────────────────────────────┘
```

All analysis runs in the isolated content script world. Data is persisted via `chrome.storage.local`. The only external request is to the Google AI Studio API when you explicitly trigger AI analysis.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension Platform | Chrome Manifest V3 |
| UI | Vanilla JS, HTML5, CSS3 Custom Properties |
| Storage | chrome.storage.local + IndexedDB |
| Detection Engine | Regex + DOM Traversal |
| Performance API | PerformanceObserver + Resource Timing |
| AI Integration | Google AI Studio API (Gemma 4 31B IT) |
| Accessibility | WCAG 2.1 AA |
| Security | CSP `script-src 'self'` |
| Dependencies | **Zero** (no npm, no CDN, no build tools) |

---

## Installation

### From Source (Developer Mode)

1. Clone the repository:
   ```bash
   git clone https://github.com/DavidDJ7/Stacklens.git
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable **Developer mode** (toggle in top-right)

4. Click **Load unpacked** and select the `F:\stacklens` directory (or wherever you cloned)

5. Visit any website — content scripts fire automatically after page load

### From Chrome Web Store

*(Coming soon)*

---

## Configuration

1. Click the StackLens icon in the toolbar
2. Click the gear icon to open **Settings**
3. **AI Analysis** (optional): Paste your Google AI Studio API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
4. **Detection Settings**: Toggle auto-detection, screenshots, and performance tracking
5. **Export**: Download your data as JSON or CSV at any time

---

## Usage

1. **Browse normally** — StackLens analyzes pages in the background as you visit them
2. **Open the popup** — Click the StackLens icon to see your tracked sites
3. **Sites tab** — Search, filter by tech category, click any site for full analysis
4. **Detail view** — Stack, SEO, A11y, Visual, Performance, Scraped content, Timeline
5. **Compare tab** — Select two sites for side-by-side comparison
6. **AI tab** — Generate summaries, SEO tips, stack analysis, or competitor insights
7. **Chat tab** — Ask natural language questions about your tracked data
8. **Alerts tab** — Review technology stack changes detected by the service worker
9. **Trends** — Click "Trends" in the footer for charts showing adoption and activity

---

## Project Structure

```
├── manifest.json          # MV3 extension manifest
├── background.js          # Service worker (message routing, storage, alerts)
├── content/
│   ├── detector.js        # Stack detection (1.5s)
│   ├── visual-audit.js    # Color, typography, layout (2s)
│   ├── seo-audit.js       # SEO analysis driver (2.5s)
│   ├── performance.js     # Web Vitals + resources (3s)
│   ├── a11y-audit.js      # Accessibility audit (3s)
│   └── scraper.js         # Content extraction (3.5s)
├── shared/
│   ├── patterns.js        # 100+ detection regex patterns
│   ├── seo-analyzer.js    # SEO scoring engine
│   ├── ai-service.js      # Google AI Studio client
│   ├── webgpu.js          # WebGPU detection + compute
│   ├── chart-utils.js     # SVG chart engine (zero deps)
│   ├── storage.js         # IndexedDB wrapper
│   └── utils.js           # Shared utilities
├── popup/
│   ├── popup.html         # Main dashboard
│   ├── popup.css          # Dark theme styles
│   └── popup.js           # UI logic (~970 lines)
├── options/
│   ├── options.html       # Settings page
│   └── options.js         # Settings logic
├── icons/                 # Extension icons (16/32/48/128)
├── docs/
│   └── PROJECT_REPORT.md  # Comprehensive enterprise report
└── tools/
    └── generate-icons.html # Icon generation utility
```

---

## Security & Privacy

- **Zero data egress** — No analytics, no telemetry, no page data leaves your browser
- **BYOK** — Your AI API key stays in `chrome.storage.local`, only sent to Google when you trigger analysis
- **No third-party code** — Zero npm packages, zero CDN resources, zero build tools
- **User-controlled** — Clear all data, delete individual sites, or export anytime
- **CSP enforced** — `script-src 'self'; object-src 'self'`

---

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome 120+ | ✅ Primary target |
| Edge 120+ | ✅ Tested |
| Brave 1.60+ | ✅ Tested |
| Opera 100+ | ✅ Should work |
| Firefox 109+ | ⚠️ Partial — screenshot capture (`captureVisibleTab`) and some APIs differ |

---

## License

MIT
