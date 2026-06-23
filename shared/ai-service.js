const AI_SERVICE = {
  DEFAULT_MODEL: 'gemma-4-31b-it',
  API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',

  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get('stacklens_ai_settings', (result) => {
        const settings = result.stacklens_ai_settings || {};
        resolve(settings.apiKey || '');
      });
    });
  },

  async getModel() {
    return new Promise((resolve) => {
      chrome.storage.local.get('stacklens_ai_settings', (result) => {
        const settings = result.stacklens_ai_settings || {};
        resolve(settings.model || AI_SERVICE.DEFAULT_MODEL);
      });
    });
  },

  async generateContent(prompt, options = {}) {
    const apiKey = await AI_SERVICE.getApiKey();
    if (!apiKey) {
      throw new Error('No API key configured. Add your Google AI Studio key in Settings.');
    }

    const model = options.model || await AI_SERVICE.getModel();
    const temperature = options.temperature ?? 0.3;
    const maxOutputTokens = options.maxOutputTokens ?? 1024;

    const url = `${AI_SERVICE.API_BASE}/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        topK: options.topK ?? 1,
        topP: options.topP ?? 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  },

  async analyzeStack(pageData) {
    const prompt = `You are a web technology expert. Analyze the following page data and identify ALL technologies, frameworks, libraries, and tools used.

Page data:
- URL: ${pageData.url}
- Title: ${pageData.title || 'N/A'}
- Scripts found: ${(pageData.scripts || []).join(', ')}
- Meta tags: ${JSON.stringify(pageData.meta || {})}
- DOM attributes detected: ${(pageData.attrs || []).join(', ')}
- Global variables: ${(pageData.globals || []).join(', ')}
- Detected patterns (regex): ${JSON.stringify(pageData.detectedStack || {})}

Return ONLY a JSON object with categories as keys and arrays of technology names as values. Example:
{"frameworks":["React","Next.js"],"cms":["WordPress"],"analytics":["Google Analytics 4"],"cssFrameworks":["Tailwind CSS"]}

If unsure about something, omit it. Be precise and specific.`;
    return AI_SERVICE.generateContent(prompt, { temperature: 0.1, maxOutputTokens: 2048 });
  },

  async analyzeSEO(pageData, seoData) {
    const prompt = `You are an SEO expert. Given the following page analysis, provide actionable recommendations.

URL: ${pageData.url}
Title: ${seoData.title || 'N/A'} (${(seoData.title || '').length} chars)
Meta description: ${seoData.metaDesc || 'N/A'}
Heading structure: ${JSON.stringify(seoData.headings || {})}
Word count: ${seoData.wordCount || 0}
Images: ${seoData.imageCount || 0} total, ${seoData.imagesMissingAlt || 0} missing alt text
Links: ${seoData.internalLinks || 0} internal, ${seoData.externalLinks || 0} external
Has canonical: ${seoData.hasCanonical ? 'Yes' : 'No'}
Has structured data: ${seoData.hasStructuredData ? 'Yes' : 'No'}
Is HTTPS: ${seoData.isHTTPS ? 'Yes' : 'No'}
Has Open Graph: ${seoData.hasOG ? 'Yes' : 'No'}

Provide 3-5 specific, actionable SEO recommendations for this page. Format as a bullet list with clear explanations. Focus on the most impactful changes.`;
    return AI_SERVICE.generateContent(prompt, { temperature: 0.3, maxOutputTokens: 1024 });
  },

  async generatePageSummary(pageData) {
    const prompt = `Summarize this webpage in 3-4 concise sentences.

URL: ${pageData.url}
Title: ${pageData.title || 'N/A'}
Main visible text (first 2000 chars): ${(pageData.bodyText || '').slice(0, 2000)}

Provide: what the site/app does, its primary audience, its key features or offerings, and overall positioning. Be objective and factual.`;
    return AI_SERVICE.generateContent(prompt, { temperature: 0.2, maxOutputTokens: 512 });
  },

  async compareCompetitors(sites) {
    const siteDescs = sites.map((s, i) =>
      `Site ${i + 1}: ${s.hostname}
- Title: ${s.title || 'N/A'}
- Tech stack: ${JSON.stringify(s.stack || {})}
- SEO score: ${s.seoScore || 'N/A'}
- Word count: ${s.wordCount || 0}
- Page size: ${s.pageSize || 'N/A'} bytes`
    ).join('\n\n');

    const prompt = `You are a competitive analysis expert. Compare the following websites and provide insights.

${siteDescs}

Provide a concise competitive analysis covering:
1. Tech stack differences and similarities
2. Which site has better SEO/performance
3. Notable strategic observations
4. Recommendations for each site to improve

Keep it to 4-6 bullet points total. Be specific and data-driven.`;
    return AI_SERVICE.generateContent(prompt, { temperature: 0.3, maxOutputTokens: 1024 });
  },

  async detectWithAI(pageData) {
    const prompt = `Analyze this webpage for its technology stack, including frameworks, libraries, and services.

Page: ${pageData.url}
Title: ${pageData.title}
Script sources: ${pageData.scripts?.slice(0, 30).join(', ') || 'none'}
DOM attributes (data-*): ${pageData.attrs?.join(', ') || 'none'}
Inline HTML patterns: ${pageData.htmlPatterns || 'none'}

Return a JSON object ONLY with detected technologies. Format:
{"frameworks":[],"cms":[],"analytics":[],"cssFrameworks":[],"libraries":[],"hosting":[]}

Only include technologies you are confident about. Return {} if nothing can be determined.`;
    return AI_SERVICE.generateContent(prompt, { temperature: 0.1, maxOutputTokens: 1024 });
  },
};

self.AI_SERVICE = AI_SERVICE;
