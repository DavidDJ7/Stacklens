# StackLens — Enterprise Project Report

**Version:** 1.2.0  
**Document Date:** June 2026  
**Classification:** Internal / Portfolio  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Module Catalog](#4-module-catalog)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Workflow Specifications](#6-workflow-specifications)
7. [Feature Catalog](#7-feature-catalog)
8. [Security & Privacy Architecture](#8-security--privacy-architecture)
9. [Performance Analysis](#9-performance-analysis)
10. [API Reference](#10-api-reference)
11. [Storage Schema](#11-storage-schema)
12. [Detection Pattern Reference](#12-detection-pattern-reference)
13. [Testing Strategy](#13-testing-strategy)
14. [Deployment Guide](#14-deployment-guide)
15. [Future Roadmap](#15-future-roadmap)

---

## 1. Executive Summary

### 1.1 Product Overview

StackLens is a **zero-backend, local-first Chrome extension** that automatically detects, catalogs, and analyzes the technology stack, design patterns, performance metrics, SEO health, and accessibility compliance of any website a user visits. It operates entirely offline after initial configuration, storing all data locally in the user's browser.

### 1.2 Problem Statement

Web developers, designers, product managers, and competitive intelligence analysts frequently need to understand what technologies power competing websites. Existing solutions either:
- Require sending page data to external servers (privacy concern)
- Charge subscription fees for multi-site tracking
- Focus on a single dimension (e.g., only stack detection or only performance)

### 1.3 Solution

StackLens solves this by running all analysis **in-browser** through a Manifest V3 extension architecture. The system performs multi-dimensional analysis across four verticals:

| Vertical | Input Source | Output |
|----------|-------------|--------|
| Stack Detection | DOM, scripts, meta tags, globals | Framework/library inventory |
| Visual Analysis | Computed styles, DOM structure | Color palette, typography, layout |
| Performance | PerformanceObserver, ResourceTiming | Core Web Vitals, bundle estimates |
| SEO Audit | Meta tags, headings, links, structured data | SEO score + recommendations |
| Accessibility | ARIA, landmarks, contrast, forms | A11y score + compliance checks |
| AI Analysis | Google AI Studio API (user's key) | Summaries, insights, recommendations |

### 1.4 Key Metrics

- **100+** detection patterns across 16 technology categories
- **8** content scripts performing parallel analysis
- **0** external API calls (for core features)
- **100%** local storage via IndexedDB + chrome.storage.local
- **A-F scoring** for SEO and accessibility
- **4** AI analysis modes (BYOK model)

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
+=====================================================================+
|                        CHROME BROWSER                                |
|                                                                      |
|  +-----------------------------------------+                        |
|  |         Extension Context               |                        |
|  |                                         |                        |
|  |  +------------------+  +-------------+  |  +------------------+  |
|  |  |   Popup (HTML)   |  | Options (HTM|  |  | Service Worker   |  |
|  |  |   popup.html     |  | options.html|  |  | background.js    |  |
|  |  |   popup.css      |  | options.js  |  |  |                  |  |
|  |  |   popup.js       |  |             |  |  | Message Router   |  |
|  |  +--------+---------+  +------+------+  |  | Storage Manager  |  |
|  |           |                   |          |  +--------+---------+  |
|  |           +--------+----------+          |           |            |
|  |                    |                     |           |            |
|  |           +--------v---------+           |  +--------v---------+  |
|  |           |   chrome.storage |           |  |  IndexedDB       |  |
|  |           |   .local         |           |  |  (stacklens-db)  |  |
|  |           +------------------+           |  +------------------+  |
|  |                                         |                        |
|  +-----------------------------------------+                        |
|                                          |                          |
|  +---------------------------------------v------------------------+ |
|  |              Content Scripts (Isolated World)                    | |
|  |                                                                  | |
|  |  +---------+  +-----------+  +----------+  +---------+         | |
|  |  |detector |  |visual-    |  |perfor-   |  |seo-     |         | |
|  |  |.js      |  |audit.js   |  |mance.js  |  |audit.js |         | |
|  |  +----+----+  +-----+-----+  +----+-----+  +----+----+         | |
|  |       |             |              |             |               | |
|  |  +----v----+  +-----v-----+  +----v-----+  +----v----+         | |
|  |  |patterns |  |computed   |  |Perform-  |  |seo-     |         | |
|  |  |.js      |  |styles     |  |anceObs.  |  |analyzer |         | |
|  |  +---------+  +-----------+  +----------+  +---------+         | |
|  |                                                                  | |
|  +------------------------------------------------------------------+ |
|                         |                                            |
|                         v                                            |
|              +----------+----------+                                 |
|              |     Web Page DOM     |                                 |
|              +---------------------+                                 |
+=====================================================================+

                         |
                   [optional]
                         v
+==================================+
|   Google AI Studio API           |
|   (gemma-4-31b-it)               |
|   User-provided API key           |
+==================================+
```

### 2.2 Component Interaction Model

```
                    +------------------+
                    |   Service Worker |<-------- Initializes storage
                    |   (background.js)|
                    +--------+---------+
                             |
              Message Routing (chrome.runtime.onMessage)
                             |
         +-------------------+-------------------+
         |                   |                   |
  +------v------+    +------v------+    +------v------+
  |  Content    |    |   Popup     |    |  Options    |
  |  Scripts    |    |   (UI)      |    |  (Settings) |
  |  (tab)      |    |  popup.js   |    |  options.js |
  +------+------+    +------+------+    +------+------+
         |                   |                   |
         |            +------v------+            |
         +-----------> chrome.storage <----------+
                     |  .local       |
                     +---------------+
```

### 2.3 Content Script Execution Order

```
Page Load Start
      |
      v
shared/patterns.js        -- Defines PATTERNS global (detection regex)
      |
      v
shared/seo-analyzer.js     -- Defines SEOAnalyzer global
      |
      v
content/detector.js        -- Timestamp +1500ms: DOM/script/meta analysis
      |
      v
content/visual-audit.js    -- Timestamp +2000ms: Colors, fonts, layout
      |
      v
content/performance.js     -- Timestamp +3000ms: Web Vitals + resources
      |
      v
content/seo-audit.js       -- Timestamp +2500ms: SEO meta/heading/content
      |
      v
content/a11y-audit.js      -- Timestamp +3000ms: Accessibility analysis
      |
      v
content/scraper.js         -- Timestamp +3500ms: Images, videos, text, links
      |
      v
Each sends message to background.js via chrome.runtime.sendMessage
      |
      v
background.js stores in chrome.storage.local
      |
      v
Popup reads from chrome.storage.local on demand
```

---

## 3. Technology Stack

### 3.1 Stack Matrix

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Extension Platform | Chrome Manifest V3 | — | Extension framework with service workers |
| UI Rendering | Vanilla JS + HTML5 | — | Popup and options pages |
| Styling | CSS3 Custom Properties | — | Dark theme, responsive popup |
| Local Storage | chrome.storage.local | — | Site analysis data (JSON blob) |
| Local Database | IndexedDB | — | Structured query support for future use |
| Detection Engine | Regex + DOM Traversal | — | 100+ patterns across 16 categories |
| Content Scraper | DOM + iframe analysis | — | Images, videos, article text |
| Performance API | PerformanceObserver | — | LCP, CLS, FCP, INP capture |
| Resource Analysis | PerformanceResourceTiming | — | Bundle sizes, request waterfall |
| AI Integration | Google AI Studio API | REST | ByOK model (Gemma 4 31B IT) |
| Accessibility | WCAG 2.1 AA | — | Contrast ratios, ARIA validation |
| Security | CSP + local-only | — | No external data egress |
| Build | None (unpacked) | — | Zero build tools, pure source |

### 3.2 Dependency Graph

```
      popup.js ────────────┬─────────── ai-service.js
          │                │                │
          │                │         googleapis.com
          │                │          (API call)
          │                │
          ├── utils.js (shared via self)
          │
      popup.css
          │
      popup.html ──────── ai-service.js (script tag)

      background.js ──── chrome.storage.local
                            │
                         IndexedDB (future)

      content/detector.js ──── patterns.js
      content/visual-audit.js ──── (standalone)
      content/performance.js ──── (standalone)
      content/seo-audit.js ──── seo-analyzer.js
      content/a11y-audit.js ──── (standalone)
      content/scraper.js ──── (standalone)

      options.js ──── chrome.storage.local
      options.html
```

### 3.3 Zero External Dependencies — Rationale

The system intentionally uses **zero npm packages, zero CDN resources, and zero build tools.** Rationale:

1. **No supply chain risk** — Every line is auditable
2. **Instant load** — No CDN fetch latency
3. **Offline capability** — All analysis runs without internet
4. **Portfolio signal** — Demonstrates deep understanding of browser APIs
5. **CSP compliance** — Strict `script-src 'self'` enforced

---

## 4. Module Catalog

### 4.1 Module Inventory

```
F:\stacklens\
│
├── manifest.json              # MV3 manifest (54 lines)
├── background.js              # Service worker (147 lines)
├── .gitignore
│
├── shared/
│   ├── patterns.js            # 100+ detection regex patterns (14667 bytes)
│   ├── seo-analyzer.js        # SEO analysis engine (10961 bytes)
│   ├── ai-service.js          # Google AI Studio client (6247 bytes)
│   ├── storage.js             # IndexedDB wrapper (3579 bytes)
│   └── utils.js               # Shared utility functions (2778 bytes)
│
├── content/
│   ├── detector.js            # Stack detection logic (3169 bytes)
│   ├── visual-audit.js        # Color, font, layout extraction (5243 bytes)
│   ├── performance.js         # Web Vitals + resource capture (5290 bytes)
│   ├── seo-audit.js           # SEO audit execution (1998 bytes)
│   ├── a11y-audit.js          # Accessibility audit (10201 bytes)
│   └── scraper.js             # Content extraction (images, video, text, links)
│
├── popup/
│   ├── popup.html             # Main dashboard UI (7599 bytes)
│   ├── popup.css              # All UI styles (19608 bytes)
│   └── popup.js               # Dashboard logic + AI features (38972 bytes)
│
├── options/
│   ├── options.html           # Settings page (9620 bytes)
│   └── options.js             # Settings logic (8246 bytes)
│
├── icons/                     # Generated PNG icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
│
├── tools/
│   └── generate-icons.html    # Icon generation tool
│
└── docs/
    └── PROJECT_REPORT.md      # This document
```

### 4.2 Module Responsibility Matrix

| Module | Type | Responsibility | Key APIs Used |
|--------|------|---------------|---------------|
| `manifest.json` | Config | Declares permissions, scripts, resources | Manifest V3 schema |
| `background.js` | SW | Message routing, storage CRUD, tab events | `chrome.runtime`, `chrome.storage`, `chrome.tabs` |
| `patterns.js` | Shared | Regex patterns for 17 tech categories | `self` global assignment |
| `seo-analyzer.js` | Shared | SEO scoring algorithm, meta/link analysis | Document API, `self` |
| `ai-service.js` | Shared | Google AI Studio API client | `fetch`, `chrome.storage.local` |
| `storage.js` | Shared | IndexedDB wrapper (CRUD) | `indexedDB` API |
| `utils.js` | Shared | Formatting, export, color utilities | Various |
| `detector.js` | Content | Injector + pattern matcher | `chrome.runtime.sendMessage` |
| `visual-audit.js` | Content | CSSOM traversal | `getComputedStyle`, `chrome.runtime` |
| `performance.js` | Content | Web Vitals observer | `PerformanceObserver`, `performance.getEntries` |
| `seo-audit.js` | Content | SEO analysis driver | `seo-analyzer.js`, `chrome.runtime` |
| `a11y-audit.js` | Content | Accessibility scanner | `getComputedStyle`, `querySelectorAll` |
| `scraper.js` | Content | Image/video/text/link extraction | DOM traversal, `chrome.runtime` |
| `popup.html` | UI | Dashboard shell | DOM |
| `popup.css` | UI | All visual styling | CSS custom properties |
| `popup.js` | UI | Tab system, rendering, AI integration | `chrome.runtime`, `AI_SERVICE` |
| `options.html` | UI | Settings shell | DOM |
| `options.js` | UI | Settings storage, export, AI config | `chrome.storage.local` |

---

## 5. Data Flow Diagrams

### 5.1 Context Diagram (DFD Level 0)

```
                      +-----------------------+
                      |                       |
         +------------+     STACKLENS         +------------+
         |            |                       |            |
         |            +-----------+-----------+            |
         |                        |                        |
         |                        |                        |
+--------v--------+     +---------v--------+     +---------v--------+
|                  |     |                  |     |                  |
|   Web Page       |     |   User (Dev)     |     | Google AI Studio |
|   (DOM Source)   |     |   (Analyst)      |     | (Optional API)   |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
     |                         |                         |
     | Page HTML, CSS, JS      | Clicks, queries         | API key + prompt
     | Headers, globals        | Export requests         | (user-owned)
     | Performance entries     | Settings config         |
     +------------------------>+                         |
                               |                         |
                               | Send prompts            |
                               +------------------------>+
                               |                         |
                               | Return analysis text    |
                               <------------------------+
```

### 5.2 Level 1 DFD — Core Analysis Flow

```
                        +------------------+
                        |   Web Page DOM   |
                        +--------+---------+
                                 |
                    +------------+------------+
                    |            |             |
            +-------v----+ +----v------+ +----v-------+
            | DOM Parser | | CSSOM     | | Performance|
            | detector   | | visual-   | | Observer   |
            | .js        | | audit.js  | | performance|
            +-----+------+ +-----+-----+ | .js        |
                  |              |        +-----+------+
                  |              |              |
            +-----v------+ +----v------+ +-----v------+
            | patterns   | | computed  | | Web Vitals |
            | .js        | | styles    | | + resources|
            +-----+------+ +-----+-----+ +-----+------+
                  |              |              |
                  +-------+------+--------------+
                          |
                   +------v-------+
                   | chrome.runtime.sendMessage()
                   +------+-------+
                          |
                   +------v-------+
                   | background.js |
                   +------+-------+
                          |
                   +------v-------+
                   | chrome.storage|
                   | .local        |
                   +---------------+
```

### 5.3 Level 1 DFD — UI & User Interaction Flow

```
+------------------+     +------------------+
|   User clicks    |     |   User opens     |
|   extension icon |     |   Settings page  |
+--------+---------+     +--------+---------+
         |                        |
+--------v---------+     +--------v---------+
|   popup.html     |     |   options.html   |
|   loads          |     |   loads          |
+--------+---------+     +--------+---------+
         |                        |
+--------v---------+     +--------v---------+
|   popup.js       |     |   options.js     |
|   requests data  |     |   reads/writes   |
|   from storage   |     |   config keys    |
+--------+---------+     +--------+---------+
         |                        |
+--------v---------+     +--------v---------+
|   Render site    |     |   chrome.storage |
|   list + detail  |     |   .local         |
|   + comparison   |     +------------------+
+--------+---------+
         |
         | (optional AI tab)
+--------v---------+
|   AI_SERVICE     |
|   .generateContent|
+--------+---------+
         |
+--------v---------+
|  googleapis.com  |
|  /v1beta/models/ |
|  gemma-4-31b-it  |
+------------------+
```

### 5.4 Level 2 DFD — Stack Detection Detail

```
+------------------+
|   Page Load      |
|   (DOM complete) |
+--------+---------+
         |
+--------v---------+
|   detector.js    |
|   (IIFE, runs    |
|    once via flag) |
+--------+---------+
         |
         +-------------------------------+
         |                               |
+--------v--------+          +----------v-----------+
| getScriptSrcs() |          | getMetaTags()         |
| Collect all     |          | Parse name + content  |
| <script src>    |          | from <meta> elements  |
+--------+--------+          +----------+-----------+
         |                               |
+--------v--------+          +----------v-----------+
| getGlobalVars() |          | getAttributes()       |
| Window keys     |          | data-* / aria-* attrs |
| (filtered)      |          | across all elements   |
+--------+--------+          +----------+-----------+
         |                               |
         +-------+-------+---------------+
                 |       |
        +--------v-------v----+
        |  detectPatterns()  |
        |  Iterate PATTERNS   |
        |  Test regex against |
        |  scripts + html +   |
        |  attrs + globals    |
        +--------+-----------+
                 |
        +--------v-----------+
        |  Build result obj  |
        |  {frameworks:[],   |
        |   cms:[], ...}     |
        +--------+-----------+
                 |
        +--------v-----------+
        |  sendMessage({     |
        |   type: 'STACK_    |
        |   DETECTED',       |
        |   payload})        |
        +--------------------+
```

### 5.5 Level 2 DFD — SEO Audit Detail

```
+------------------------+
|   seo-audit.js         |
|   (call timer +2500ms) |
+-----------+------------+
            |
   +--------+--------+
   |  SEOAnalyzer.*  |
   +--------+--------+
            |
   +--------+--------+--------------+--------------+
   |                  |              |              |
+--v-------+  +------v------+ +----v------+ +-----v------+
| Title    |  | Meta Tags   | | Canonical | | Favicon    |
| + length |  | description | | + href     | | + count    |
| + status |  | robots, etc | | + exists   | | + rels     |
+----------+  +------+------+ +----+------+ +-----+------+
                     |              |              |
+------------+  +----v------+ +----v------+ +-----v------+
| Headings   |  | Images    | | Links     | | Structured |
| H1-H6      |  | alt text  | | internal  | | Data       |
| + counts   |  | lazy load | | external  | | JSON-LD    |
| + texts    |  | missing   | | nofollow  | | microdata  |
+------------+  +-----------+ +-----------+ +-----+------+
                                                     |
+------------+  +-----------+ +-----------+ +--------v------+
| Open Graph |  | Content   | | Language  | | Viewport     |
| og:title   |  | wordCount | | lang attr | | mobile opt   |
| og:desc    |  | text/html | | charset   | | width=dev-w  |
| og:image   |  | read time | +-----------+ +--------------+
+------------+  +-----------+
                     |
            +--------v--------+
            | calculateSEOScore|
            | 100-pt scale     |
            | A-F grade        |
            +--------+--------+
                     |
            +--------v--------+
            | sendMessage({   |
            |  type: 'SEO_    |
            |  AUDIT_COMPLETE'|
            | })              |
            +-----------------+
```

### 5.6 Level 2 DFD — AI Analysis Flow

```
+------------------------+
|   User clicks AI btn   |
|   in popup             |
+-----------+------------+
            |
   +--------v--------+
   | runAiAnalysis() |
   | disable buttons |
   | show spinner    |
   +--------+--------+
            |
   +--------v--------+
   | getPageDataForAI|
   | (from storage)  |
   +--------+--------+
            |
   +--------v--------+
   | AI_SERVICE.*    |
   | (based on mode) |
   +--------+--------+
            |
   +--------v------------------+
   | fetch(googleapis.com/     |
   |   v1beta/models/          |
   |   gemma-4-31b-it:         |
   |   generateContent)        |
   +--------+------------------+
            |
   +--------v--------+
   | Parse response  |
   | extract .text   |
   +--------+--------+
            |
   +--------v--------+
   | renderAiMarkdown|
   | (simple MD ->   |
   |  HTML converter)|
   +--------+--------+
            |
   +--------v--------+
   | Display result  |
   | in #aiResult    |
   +-----------------+
```

---

## 6. Workflow Specifications

### 6.1 Page Analysis Lifecycle

```
TIME    EVENT                         ACTOR              DATA FLOW
----    -----                         -----               ---------
T+0ms   User navigates to URL         Browser             Tab created
T+50ms  manifest.json matches URL     Chrome              Injects content scripts
T+100ms Content scripts initialize    Isolated world      PATTERNS + SEOAnalyzer loaded
T+500ms DOMContentLoaded fires        Page                —
T+1.5s  detector.js runs              Content script      Reads DOM → sends STACK_DETECTED
T+2.0s  visual-audit.js runs          Content script      Reads CSSOM → sends VISUAL_AUDIT_COMPLETE
T+2.5s  seo-audit.js runs             Content script      Runs SEOAnalyzer → sends SEO_AUDIT_COMPLETE
T+3.0s  performance.js runs           Content script      PerformanceObserver → sends PERFORMANCE_COMPLETE
T+3.0s  a11y-audit.js runs            Content script      Runs scanner → sends A11Y_AUDIT_COMPLETE
T+3.5s  scraper.js runs               Content script      Extracts content → sends SCRAPER_COMPLETE
T+4.0s  All messages received         Service worker      Merges into chrome.storage.local
T+?     User opens popup              Extension UI        Requests GET_ALL_DATA → renders
```

### 6.2 User Interaction Workflow

```
+-------------------+     +-------------------+     +-------------------+
| Open Extension    |     | Browse Sites Tab  |     | Click Site Card   |
| (click icon)      | --> | (list view)       | --> | (detail view)     |
+-------------------+     +-------------------+     +-------------------+
                                                           |
                                              +-----------+-----------+
                                              |                       |
                                     +--------v--------+    +--------v--------+
                                     | View Stack      |    | View SEO Score  |
                                     | (frameworks)    |    | (A-F + checks)  |
                                     +-----------------+    +-----------------+
                                              |                       |
                                     +--------v--------+    +--------v--------+
                                     | View Visual     |    | View A11y Score |
                                     | (palette, fonts)|    | (A-F + issues)  |
                                     +-----------------+    +-----------------+
                                              |                       |
                                     +--------v--------+    +--------v--------+
                                     | View Perf Data  |    | View Bundle     |
                                     | (vitals, reqs)  |    | (size estimate) |
                                     +-----------------+    +-----------------+

+-------------------+     +-------------------+
| Switch to Compare |     | Select 2 sites    |
| Tab               | --> | Click Compare     |
+-------------------+     +-------------------+
                                  |
                         +--------v--------+
                         | Compare Table    |
                         | Stack + Vitals   |
                         | SEO + A11y       |
                         | Score bars       |
                         +-----------------+

+-------------------+     +-------------------+
| Switch to AI Tab  |     | Click analysis    |
| (needs API key)   | --> | (Summary, SEO,    |
+-------------------+     | Stack, Compare)   |
                          +--------+----------+
                                   |
                          +--------v----------+
                          | Loading spinner   |
                          | + API response    |
                          | + Markdown render |
                          +-------------------+
```

### 6.3 Screenshot Capture Workflow

```
+-------------------+
| User clicks       |
| camera icon in    |
| header            |
+--------+----------+
         |
+--------v----------+
| popup.js          |
| captureScreenshot |
+--------+----------+
         |
+--------v----------+
| chrome.tabs.query |
| (active tab)      |
+--------+----------+
         |
+--------v----------+
| chrome.tabs.      |
| captureVisibleTab |
| (format: 'png')   |
+--------+----------+
         |
+--------v----------+
| Send dataUrl to   |
| background.js via |
| CAPTURE_SCREENSHOT|
+--------+----------+
         |
+--------v----------+
| background.js     |
| stores to         |
| chrome.storage    |
| .local            |
+-------------------+
```

---

## 7. Feature Catalog

### 7.1 Complete Feature Matrix

| # | Feature | Category | Phase | Detection Method | Output |
|---|---------|----------|-------|-----------------|--------|
| 1 | Framework Detection | Stack | 1 | Regex on script src + globals + attrs | React, Vue, Angular, Svelte, etc. |
| 2 | Meta-Framework Detection | Stack | 1 | Regex on globals + script paths | Next.js, Nuxt, Remix, Gatsby |
| 3 | CMS Detection | Stack | 1 | Script paths + meta generator + globals | WordPress, Shopify, Drupal, Wix |
| 4 | Analytics Detection | Stack | 1 | Script src match + global function check | GA4, Mixpanel, Hotjar, Segment |
| 5 | CDN Detection | Stack | 1 | Script URL pattern matching | Cloudflare, jsDelivr, UNPKG |
| 6 | CSS Framework Detection | Stack | 1 | Script src + class name patterns | Tailwind, Bootstrap, Material UI |
| 7 | Bundler Detection | Stack | 1 | Global var + script comment patterns | Webpack, Vite, Parcel |
| 8 | Font Provider Detection | Stack | 1 | Stylesheet URL + class patterns | Google Fonts, Adobe Fonts |
| 9 | Hosting Detection | Stack | 1 | URL pattern matching | Vercel, Netlify, AWS |
| 10 | Ad Network Detection | Stack | 1 | Script src + global function | Google Ads, Taboola, Criteo |
| 11 | Chat/UT Engine Detection | Stack | 1 | Script src + global object | Intercom, Drift, Crisp |
| 12 | Color Palette Extraction | Visual | 2 | getComputedStyle on all elements | Top 20 colors by frequency |
| 13 | Typography Audit | Visual | 2 | Font family + size + weight collection | Top 10 fonts, all sizes/weights |
| 14 | Layout Metrics | Visual | 2 | OffsetWidth + display detection | Container widths, grid type |
| 15 | UI Element Analysis | Visual | 2 | getBoundingClientRect on buttons/links | Button styles, dimensions |
| 16 | LCP Capture | Perf | 3 | PerformanceObserver 'largest-contentful-paint' | Time in ms |
| 17 | CLS Capture | Perf | 3 | PerformanceObserver 'layout-shift' | Score (unitless) |
| 18 | FCP Capture | Perf | 3 | PerformanceObserver 'paint' (first-contentful-paint) | Time in ms |
| 19 | INP Capture | Perf | 3 | PerformanceObserver 'first-input' | Time in ms |
| 20 | Resource Waterfall | Perf | 3 | performance.getEntriesByType('resource') | Count, size, duration by type |
| 21 | Bundle Size Estimate | Perf | 3 | transferSize sum by initiatorType | JS, CSS, font, image totals |
| 22 | Page Load Metrics | Perf | 3 | Navigation Timing API | DOM events, total load time |
| 23 | Title Analysis | SEO | 3 | <title> tag extraction | Text + length + SEO status |
| 24 | Meta Description | SEO | 3 | <meta name="description"> content | Text + length optimization |
| 25 | Open Graph Tags | SEO | 3 | <meta property="og:*"> | og:title, og:desc, og:image |
| 26 | Twitter Cards | SEO | 3 | <meta name="twitter:*"> | twitter:card, twitter:site |
| 27 | Heading Structure | SEO | 3 | H1-H6 count + text extraction | Hierarchy + completeness check |
| 28 | Image Alt Analysis | SEO | 3 | img[alt] presence check | count with/without alt |
| 29 | Link Analysis | SEO | 3 | href + rel parsing | Internal/external/nofollow counts |
| 30 | Structured Data | SEO | 3 | JSON-LD parse + microdata scan | Schema types + count |
| 31 | Canonical URL | SEO | 3 | <link rel="canonical"> | Present + href |
| 32 | Robots Meta | SEO | 3 | <meta name="robots"> content | noindex/nofollow detection |
| 33 | Viewport Check | SEO | 3 | <meta name="viewport"> content | Mobile optimization status |
| 34 | Language Detection | SEO | 3 | <html lang=""> attribute | Language code |
| 35 | Content Analysis | SEO | 3 | body text word count + reading time | Word count, text/HTML ratio |
| 36 | Hreflang Detection | SEO | 3 | <link rel="alternate" hreflang=""> | Language region tags |
| 37 | Favicon Check | SEO | 3 | <link rel="*icon*"> | Presence + count |
| 38 | SEO Score Calculation | SEO | 3 | Weighted 100-point algorithm | Score + grade (A-F) |
| 39 | ARIA Analysis | A11y | 3 | aria-* attribute + role collection | ARIA usage report |
| 40 | Landmarks | A11y | 3 | Semantic elements + role detection | landmark presence |
| 41 | Heading Hierarchy | A11y | 3 | Level order validation | Skipped level detection |
| 42 | Focus Management | A11y | 3 | Focusable elements + skip links | Count + skip link presence |
| 43 | Color Contrast | A11y | 3 | WCAG 2.1 AA ratio calculation | Failing ratio list |
| 44 | Form Labeling | A11y | 3 | label[for] + aria-label check | Properly labeled count |
| 45 | A11y Score Calculation | A11y | 3 | Weighted 100-point algorithm | Score + grade (A-F) |
| 46 | Image Scraping | Scraper | 3 | img element extraction with dimensions | Up to 50 images |
| 47 | Video Detection | Scraper | 3 | video/source/iframe extraction | Up to 20 videos |
| 48 | Text Content Extraction | Scraper | 3 | body text, word count, first paragraphs | Word/char count |
| 49 | Article Detection | Scraper | 3 | <article> element parsing | Headline, paragraphs, images |
| 50 | Link Harvesting | Scraper | 3 | href extraction from <a> elements | Up to 30 links |
| 51 | Structured Content | Scraper | 3 | <table> and <ul>/<ol> extraction | Table rows, list items |
| 52 | Screenshot Capture | UI | 4 | chrome.tabs.captureVisibleTab | PNG data URL stored locally |
| 53 | Site List | UI | 4 | chrome.storage.local read | Sortable, searchable list |
| 54 | Tech Filter | UI | 4 | Filter by category | Framework/CMS/Analytics toggle |
| 55 | Site Detail View | UI | 4 | Single site full report | All analysis sections |
| 56 | Side-by-Side Compare | UI | 4 | Two-site comparison table | Stack + Vitals + SEO + A11y |
| 57 | Score Comparison | UI | 4 | Visual score bars | SEO + A11y side-by-side |
| 58 | Collapsible Sections | UI | 4 | Toggle sections open/closed | UX enhancement |
| 59 | JSON Export | Export | 4 | chrome.runtime.sendMessage + Blob | Full data JSON download |
| 60 | CSV Export | Export | 4 | Row builder + Blob | Structured CSV download |
| 61 | Clear All Data | Export | 4 | chrome.storage.local.remove | Data reset |
| 62 | Delete Single Site | Export | 4 | Remove key from stored data | Selective deletion |
| 63 | Chat Interface | AI | 5 | AI_SERVICE.generateContent + site context | Conversational Q&A |
| 64 | Timeline View | UI | 4 | Visit diff comparison + rendering | Stack changes over time |
| 65 | Trend Charts | UI | 4 | SVG bar/donut/sparkline charts | Tech adoption, scores, activity |
| 66 | Alerts System | Background | 4 | Stack-change detection + notifications | Alert cards, badge count |
| 67 | AI Page Summary | AI | 5 | AI_SERVICE.generatePageSummary | 3-4 sentence summary |
| 68 | AI SEO Recommendations | AI | 5 | AI_SERVICE.analyzeSEO | 3-5 actionable tips |
| 69 | AI Stack Deep-Dive | AI | 5 | AI_SERVICE.generateContent + context | Strategic stack analysis |
| 70 | AI Competitor Insight | AI | 5 | AI_SERVICE.compareCompetitors | 4-way competitive analysis |
| 71 | API Key Management | AI | 5 | chrome.storage.local secret storage | Encrypted local key |
| 72 | Model Selection | AI | 5 | Dropdown config | gemma-4-31b-it + alternatives |
| 73 | Connection Tester | AI | 5 | Live API validation | Connectivity status |

### 7.2 Feature-Pattern Density Map

```
Category           Patterns   Detection Method         Avg. Confidence
----------------   ---------  ----------------------   ---------------
Frameworks         16         Regex + globals + attrs   High
MetaFrameworks     4          Globals + scripts         High
CMS                10         Script paths + meta       High
Analytics          18         Script URLs + functions   High
CDNs               8          URL pattern match         Medium
CSS Frameworks     12         Scripts + class names     Medium-High
Bundlers           7          Globals + scripts         Medium
Fonts              4          Stylesheet URLs           High
Hosting            8          URL patterns              Medium
Ad Networks        5          Script URLs               High
Chat Engines       8          Script URLs + globals     High
Auth               5          Script URLs               Medium
Payments           5          Script URLs + globals     High
Testing            5          Script paths              Low (dev only)
Monorepo           4          Config file paths         Low
Scraper            6          DOM element extraction    High
```

---

## 8. Security & Privacy Architecture

### 8.1 Trust Model

```
+------------------+     +------------------+
|   User's Browser |     |  External World  |
|                  |     |                  |
|  +-------------+ |     |  +------------+  |
|  | Key Stored  | |     |  | Google AI  |  |
|  | Locally     | |     |  | Studio API |  |
|  | (never      | | Opt-|  +-----+------+  |
|  |  egressed)  | | in  |        |         |
|  +-------------+ |     |        | Only when|
|  +-------------+ |     |        | user     |
|  | Page Data   | |     |        | triggers |
|  | Analyzed    | |     |        | AI       |
|  | Locally     | |     |        +----------+
|  +-------------+ |     |                  |
+------------------+     +------------------+
```

### 8.2 Data Classification

| Data Class | Examples | Storage | Transmission | Retention |
|------------|---------|---------|-------------|-----------|
| Page Metadata | URL, title, hostname | chrome.storage.local | None (local only) | Until user clears |
| Tech Stack | Framework names, versions | chrome.storage.local | None | Until user clears |
| Visual Data | Color hex codes, font names | chrome.storage.local | None | Until user clears |
| Performance | LCP, CLS, resource sizes | chrome.storage.local | None | Until user clears |
| SEO Data | Title, description, headings | chrome.storage.local | None | Until user clears |
| A11y Data | ARIA roles, contrast ratios | chrome.storage.local | None | Until user clears |
| Screenshots | PNG data URLs | chrome.storage.local | None | Until user clears |
| API Key | Google AI Studio key | chrome.storage.local | Only to Google API (user-initiated) | Until user removes |
| AI Prompts | Page context + user action | In-memory | Only to Google API (user-initiated) | Not stored |

### 8.3 Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

- **`script-src 'self'`** — Only scripts bundled in the extension can execute. No inline scripts, no eval(), no CDN-hosted scripts.
- **`object-src 'self'`** — Only local plugin content.
- **No `connect-src` restriction** — Extensions can make fetch calls to any host. The only external call is the user-initiated Google AI Studio API request.

### 8.4 Permission Justification

| Permission | Why Needed | Risk |
|------------|-----------|------|
| `storage` | Persist analysis data + settings | Low — local only |
| `activeTab` | Access current tab's DOM + screenshot | Low — requires user gesture |
| `scripting` | Execute content scripts on pages | Low — declarative only |
| `tabs` | Query active tab, capture screenshot | Low — requires user gesture |
| `<all_urls>` | Content script injection on any site | Low — scripts are read-only, no modification |
| `host_permissions` | Match patterns for content scripts | Low — required for <all_urls> in MV3 |

### 8.5 Privacy Guarantees

1. **Zero data egress** — No analytics, no telemetry, no page data leaves the browser except user-triggered AI requests.
2. **API key isolation** — The Google AI Studio API key is stored in `chrome.storage.local` and only sent in HTTP headers to `generativelanguage.googleapis.com`. The key is never logged, never transmitted elsewhere.
3. **No third-party dependencies** — Zero npm packages means zero supply chain risk.
4. **User-controlled deletion** — Single-site delete, clear all, and full export available.
5. **Transparent operation** — All storage contents are human-readable JSON.

---

## 9. Performance Analysis

### 9.1 Time Budget

```
Phase              Target    Actual (estimate)     Impact
----               -----     -----------------     ------
Content script     2000ms    1500-3500ms           Parallel execution with staggered timers
load + detection
Popup open +       500ms     200-400ms             Data read from chrome.storage.local (async)
render
AI API call        5000ms    2000-5000ms           Depends on model + network + prompt size
(user-initiated)
Screenshot         1000ms    500-1500ms            chrome.tabs.captureVisibleTab (async)
capture
```

### 9.2 Storage Size Estimates

| Scenario | Sites | Visits | Estimated Size |
|----------|-------|--------|---------------|
| Light use | 10 | 50 | ~50 KB |
| Moderate use | 50 | 200 | ~250 KB |
| Heavy use | 200 | 1000 | ~1.5 MB |
| With screenshots | 20 | 20 | ~5-10 MB (screenshots dominate) |

### 9.3 Chrome Storage Limits

- **chrome.storage.local**: ~10 MB per extension (Chrome), significantly more in Edge/other Chromium browsers.
- **IndexedDB**: No practical limit (limited by disk space).
- **Max 100 visits per hostname** enforced in `background.js` to prevent unbounded growth.

### 9.4 Optimization Strategies

1. **Staggered content script execution** — Detection (1.5s), Visual (2s), SEO (2.5s), Perf/A11y (3s). Prevents all scripts running simultaneously.
2. **Single-fire IIFE pattern** — Each content script sets a `window.__STACKLENS_*__` flag to prevent re-execution on sub-page navigation.
3. **Truncated payloads** — Script URLs truncated to 200 chars, body text to 2000 chars for AI prompts, missing alt text samples limited to 20.
4. **Debounced search** — Site list search is debounced to avoid re-render on every keystroke.
5. **Thumbnail-only screenshots** — Stored as JPEG-level quality PNGs, displayed at max 180px height.

---

## 10. API Reference

### 10.1 Message Protocol

All inter-component communication uses `chrome.runtime.sendMessage()` with a standard envelope:

```typescript
interface StackLensMessage {
  type:    string;       // Message type identifier
  payload: any;          // Type-specific payload
}

interface StackLensResponse {
  success?: boolean;
  error?:   string;
  data?:    any;
}
```

### 10.2 Message Type Catalog

| Type | Sender | Receiver | Payload | Response |
|------|--------|----------|---------|----------|
| `STACK_DETECTED` | Content | Background | `{hostname, url, title, stack, pageSize}` | `{success}` |
| `VISUAL_AUDIT_COMPLETE` | Content | Background | `{hostname, palette, typography, layout, uiElements}` | `{success}` |
| `PERFORMANCE_COMPLETE` | Content | Background | `{hostname, webVitals, resourceTimings, bundleEstimate, pageLoad}` | `{success}` |
| `SEO_AUDIT_COMPLETE` | Content | Background | `{hostname, seo, seoScore}` | `{success}` |
| `A11Y_AUDIT_COMPLETE` | Content | Background | `{hostname, a11y, a11yScore}` | `{success}` |
| `SCRAPER_COMPLETE` | Content | Background | `{hostname, images, videos, textContent, structured, article, links, headings}` | `{success}` |
| `CAPTURE_SCREENSHOT` | Popup | Background | `{hostname, dataUrl}` | `{success}` |
| `GET_ALL_DATA` | Popup | Background | `{}` | `{...allData}` |
| `GET_ALERTS` | Popup | Background | `{}` | `alerts[]` |
| `CLEAR_ALERTS` | Popup | Background | `{}` | `{success}` |
| `MARK_ALERT_READ` | Popup | Background | `{id}` | `{success}` |
| `GET_HOSTNAME_DATA` | Popup | Background | `{hostname}` | `{...hostnameData}` |
| `DELETE_HOSTNAME` | Popup | Background | `{hostname}` | `{success}` |
| `CLEAR_ALL_DATA` | Popup | Background | `{}` | `{success}` |
| `DELETE_HOSTNAME` | Popup | Background | `{hostname}` | `{success}` |
| `EXPORT_DATA` | Popup | Background | `{}` | `{...allData}` |

### 10.3 AI Service API

```typescript
interface AIService {
  // Low-level: Send any prompt to the configured model
  generateContent(prompt: string, options?: {
    model?: string;              // Default: gemma-4-31b-it
    temperature?: number;        // Default: 0.3
    maxOutputTokens?: number;    // Default: 1024
    topK?: number;               // Default: 1
    topP?: number;               // Default: 0.95
  }): Promise<string>;

  // High-level: Page analysis modes
  generatePageSummary(pageData: {
    url: string;
    title: string;
    bodyText: string;
  }): Promise<string>;

  analyzeSEO(pageData: { url: string }, seoData: {
    title: string;
    metaDesc: string;
    headings: object;
    wordCount: number;
    imageCount: number;
    imagesMissingAlt: number;
    hasCanonical: boolean;
    hasStructuredData: boolean;
    isHTTPS: boolean;
    hasOG: boolean;
  }): Promise<string>;

  compareCompetitors(sites: Array<{
    hostname: string;
    title: string;
    stack: object;
    seoScore: number;
    wordCount: number;
  }>): Promise<string>;

  detectWithAI(pageData: {
    url: string;
    title: string;
    scripts: string[];
    attrs: string[];
    htmlPatterns: string;
  }): Promise<string>;  // Returns JSON string
}
```

### 10.4 Storage Schema

```typescript
// chrome.storage.local structure
interface StackLensStorage {
  stacklens_data: {
    [hostname: string]: {
      hostname: string;
      latest: SiteSnapshot | null;
      visits: SiteSnapshot[];
    };
  };
  stacklens_ai_settings: {
    apiKey: string;     // Google AI Studio API key
    model: string;       // Model identifier (default: gemma-4-31b-it)
  };
  stacklens_settings: {
    autoDetect: boolean;
    captureScreenshots: boolean;
    trackPerformance: boolean;
  };
  stacklens_alerts: Alert[];
}

interface SiteSnapshot {
  hostname: string;
  url: string;
  title: string;
  lastUpdated: number;    // Epoch ms
  visitedAt?: number;     // Epoch ms

  // From detector.js
  stack: {
    frameworks?: string[];
    metaFrameworks?: string[];
    cms?: string[];
    analytics?: string[];
    cdns?: string[];
    cssFrameworks?: string[];
    bundlers?: string[];
    fonts?: string[];
    hosting?: string[];
    // ... other categories
  };
  pageSize?: number;
  scriptCount?: number;

  // From visual-audit.js
  palette?: Array<{ color: string; count: number }>;
  typography?: {
    families: Array<{ family: string; count: number }>;
    sizes: string[];
    weights: string[];
  };
  layout?: {
    viewportWidth: number;
    viewportHeight: number;
    containerWidths: number[];
    gridSystems: string[];
    hasCSSGrid: boolean;
    hasFlexbox: boolean;
    breakpoints: string[];
  };
  uiElements?: Array<{
    tag: string; text: string; width: number; height: number;
    bgColor: string; textColor: string; borderRadius: string;
  }>;

  // From performance.js
  webVitals?: {
    lcp?: number; lcpElement?: string;
    cls?: number; fcp?: number; inp?: number;
  };
  resourceTimings?: {
    resources: Array<{name: string; type: string; duration: number; size: number; dns: number; tcp: number; ttfb: number; download: number}>;
    totalSize: number;
    byType: { [type: string]: { count: number; totalSize: number; totalDuration: number } };
  };
  bundleEstimate?: { scripts: number; styles: number; fonts: number; images: number; total: number };
  pageLoad?: { domContentLoaded: number; domComplete: number; loadEvent: number; totalLoadTime: number };

  // From seo-audit.js
  seo?: object;           // Full SEO analysis result
  seoScore?: { score: number; maxScore: number; grade: string; checks: Array<{pass: boolean; msg: string}> };

  // From a11y-audit.js
  a11y?: object;          // Full a11y analysis result
  a11yScore?: { score: number; maxScore: number; grade: string; checks: Array<{pass: boolean; msg: string}> };

  // From screenshot
  screenshot?: string;    // data:image/png;base64,...

  // From scraper.js
  scrapedImages?: Array<{src: string; alt: string; width: number; height: number; lazy: boolean; visible: boolean}>;
  scrapedVideos?: Array<{src: string; type: string; poster: string; width: number; height: number}>;
  scrapedText?: { wordCount: number; charCount: number; firstParagraphs: string[] };
  scrapedStructured?: { tables: Array<{rows: string[][]}>; lists: Array<{type: string; items: string[]}> };
  scrapedArticle?: { headline: string; paragraphs: string[]; images: number; wordCount: number } | null;
  scrapedLinks?: Array<{href: string; text: string; isButton: boolean; hasIcon: boolean}>;
  scrapedHeadings?: Array<{level: number; text: string; id: string}>;
  scrapedAt?: number;
}

interface Alert {
  id: string;
  type: 'added' | 'removed';
  category: string;
  techs: string[];
  hostname: string;
  time: number;
  read: boolean;
}
```

---

## 11. Detection Pattern Reference

### 11.1 Pattern Architecture

Each pattern is a tuple of `{ regex: RegExp, type: string }` where `type` determines which page source is searched:

| Type | Source | Example Use Case |
|------|--------|-----------------|
| `script` | All `<script src="...">` URLs concatenated | `react(\.min)?\.js` |
| `global` | `Object.keys(window)` filtered | `__NEXT_DATA__` |
| `attr` | All `data-*` and `aria-*` attribute names | `data-reactroot` |
| `meta` | All `<meta name/content>` values | `generator=WordPress` |
| `html` | `document.documentElement.outerHTML` (truncated 50k) | `<app-root` |

### 11.2 Sample Pattern Registry

```
CATEGORY: frameworks
├── React:       /react(\.min)?\.js/            [script]
│                /__REACT_DEVTOOLS_GLOBAL_HOOK__/ [global]
│                /data-reactroot/                [attr]
├── Vue:         /vue(\.min)?\.js/               [script]
│                /__VUE_DEVTOOLS_GLOBAL_HOOK__/   [global]
│                /data-v-/                       [attr]
├── Angular:     /angular(\.min)?\.js/           [script]
│                /ng-version/                     [attr]
│                /<app-root/                      [html]
└── Svelte:      /svelte(\.min)?\.js/            [script]

CATEGORY: cms
├── WordPress:   /\/wp-content\//                [script]
│                /generator.*WordPress/i          [meta]
├── Shopify:     /cdn\.shopify\.com/              [script]
│                /window\.Shopify/                [global]
└── Squarespace: /\/static\.squarespace/          [script]

CATEGORY: analytics
├── GA4:         /gtag.*config.*G-/               [script]
│                /googletagmanager\.com\/gtag\/js/ [script]
├── Mixpanel:    /cdn\.mxpnl\.com/               [script]
│                /mixpanel\.init/                 [script]
└── Hotjar:      /hotjar/                         [script]

CATEGORY: cssFrameworks
├── Tailwind:    /tailwindcss/                    [script]
│                /class="[^"]*(m|p|flex|grid)-/   [attr]
├── Bootstrap:   /bootstrap(\.min)?\./            [script]
│                /class="[^"]*(col|row|btn)-/     [attr]
└── Material UI: /@mui\//                         [script]

CATEGORY: bundlers
├── Webpack:     /__webpack_require__/            [global]
│                /webpackJsonp/                   [global]
├── Vite:        /\/@vite\//                      [script]
└── esbuild:     /esbuild/                        [script]
```

---

## 12. Testing Strategy

### 12.1 Test Layers

```
Layer              Scope                        Method
----               -----                        ------
Unit               patterns.js regex            Manual validation on known sites
                   utils.js functions           Visual inspection
Integration        Each content script          Load test pages, verify console output
                   Message passing              Chrome DevTools extension inspection
System             End-to-end flow              Install unpacked, visit sites, verify storage
UI                 Popup rendering              Open popup, verify all tabs render
Regression         Cross-analysis comparison    Same site, compare multiple scans
Privacy            Data egress monitoring       DevTools Network tab — verify zero calls
AI                 API integration              Test connection with valid/invalid keys
```

### 12.2 Validation Checklist

- [ ] Extension loads with no errors (chrome://extensions)
- [ ] Service worker registered and active
- [ ] Content scripts inject on `http://` and `https://` pages
- [ ] `chrome.storage.local` populates after page visit
- [ ] Popup opens and renders site list
- [ ] Search filters work
- [ ] Tech filter (Framework/CMS/Analytics) works
- [ ] Site card click shows detail view
- [ ] All sections render: Stack, SEO, A11y, Visual, Performance
- [ ] Collapsible sections toggle
- [ ] Screenshot captures and persists
- [ ] Export JSON downloads valid file
- [ ] Options page loads correctly
- [ ] AI settings save and load
- [ ] API key test connection works
- [ ] AI analysis generates response
- [ ] Error states display correctly (no key, API error)
- [ ] Clear all data works
- [ ] Delete single site works
- [ ] No console errors from extension code

---

## 13. Deployment Guide

### 13.1 Local Development

```bash
# Clone or copy the project
git clone <repo> stacklens

# Load in Chrome
chrome://extensions
# → Enable "Developer mode"
# → "Load unpacked"
# → Select F:\stacklens
```

### 13.2 Chrome Web Store Publishing

```bash
# Requirements:
# - $5 one-time developer registration fee
# - ZIP the project folder (exclude tools/ and docs/)
# - 128x128 icon for store listing
# - Screenshots (1280x800) showing popup + options
# - Short description (132 chars max)
# - Detailed description / privacy policy

# Build distribution ZIP
cd F:\stacklens
Compress-Archive -Path manifest.json, background.js, content, popup, options, shared, icons -DestinationPath stacklens-v1.2.0.zip
```

### 13.3 Environment Requirements

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 120+ (MV3 support) | ✅ Full support |
| Edge | 120+ (Chromium) | ✅ Full support |
| Brave | 1.60+ | ✅ Full support |
| Opera | 100+ | ✅ Full support |
| Firefox | 109+ | ✅ Full support (screenshot not available — gracefully handled) |
| Vivaldi | Latest | ✅ Full support (Chromium-based) |

---

## 14. Future Roadmap

### Phase 5: Enhanced AI

| Feature | Description | Status |
|---------|-------------|--------|
| Chat interface | Conversational Q&A about analyzed sites | ✅ Implemented |
| Batch AI analysis | Analyze all stored sites in one request | 🔜 Planned |
| Custom prompts | User-defined analysis templates | 🔜 Planned |
| Local AI (future) | WebLLM / Transformers.js for offline AI | 🔜 Future |

### Phase 6: Comparison & Trends

| Feature | Description | Status |
|---------|-------------|--------|
| Timeline view | Stack changes over time for a single site | ✅ Implemented |
| Trend charts | Technology adoption rates across all tracked sites | ✅ Implemented |
| Alerts system | Stack-change detection + notifications | ✅ Implemented |
| CSV import/export | Merge data from multiple instances | 🔜 Planned |
| Bookmark groups | Organize sites by project/competitor set | 🔜 Planned |

### Phase 7: Advanced Detection

| Feature | Description |
|---------|-------------|
| JavaScript AST analysis | Parse inline scripts for framework patterns |
| Network request inspection | webRequest API for API endpoint detection |
| Cookie/Storage analysis | Identify session management patterns |
| Custom pattern editor | User-contributed detection rules |

### Phase 8: Reporting

| Feature | Description |
|---------|-------------|
| PDF report generation | Printable competitor analysis reports |
| Email reports | Scheduled report delivery via email |
| Dashboard widgets | Customizable home screen with KPIs |
| API access | REST API for programmatic data access |

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| BYOK | Bring Your Own Key — user provides their own API key |
| CLS | Cumulative Layout Shift — visual stability metric |
| CSP | Content Security Policy — HTTP header for security rules |
| DFD | Data Flow Diagram — system data movement visualization |
| FCP | First Contentful Paint — initial render timing |
| IIFE | Immediately Invoked Function Expression — self-executing function |
| INP | Interaction to Next Paint — interactivity metric |
| LCP | Largest Contentful Paint — loading performance metric |
| MV3 | Manifest V3 — current Chrome extension specification |
| SW | Service Worker — background script in MV3 |
| WCAG | Web Content Accessibility Guidelines |
| Web Vitals | Google's performance metrics (LCP, CLS, INP/FID) |

---

## Appendix B: ASCII Architecture Poster

```
                    ┌───────────────────────────────────────┐
                     │          STACKLENS v1.2               │
                    │     Local Competitor Stack Analyzer    │
                    └───────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
    ┌────┴────┐               ┌──────┴──────┐            ┌──────┴──────┐
    │ CONTENT │               │   SERVICE   │            │     UI      │
    │ SCRIPTS │◄─── msg ──────│   WORKER    │──── msg ───│  (POPUP)    │
    │(6 files)│               │(background) │            │(3 tabs + AI)│
    └────┬────┘               └──────┬──────┘            └──────┬──────┘
         │                          │                          │
         │                   ┌──────┴──────┐                   │
         │                   │ STORAGE     │                   │
         └───────────────────│ (local + DB)│───────────────────┘
                             └─────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │         (optional)       │                          │
    ┌────┴────┐                                              │
    │ GOOGLE  │
    │ AI API  │
    │ Gemma-4 │
    └─────────┘
```

---

*End of Project Report — StackLens v1.2.0*  
*Document generated: June 2026*  
*Author: StackLens Engineering*
