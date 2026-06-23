const PATTERNS = {
  frameworks: {
    React: [
      { re: /react(\.min)?\.js/, type: 'script' },
      { re: /__REACT_DEVTOOLS_GLOBAL_HOOK__/, type: 'global' },
      { re: /data-reactroot/, type: 'attr' },
      { re: /data-reactid/, type: 'attr' },
      { re: /_reactRootContainer/, type: 'global' },
      { re: /\.__reactFiber/, type: 'global' },
    ],
    'Next.js': [
      { re: /__NEXT_DATA__/, type: 'global' },
      { re: /\/_next\/static\//, type: 'script' },
      { re: /next\.(min\.)?js/, type: 'script' },
      { re: /<meta name="next-head-count"/, type: 'html' },
    ],
    Vue: [
      { re: /vue(\.min)?\.js/, type: 'script' },
      { re: /__VUE_DEVTOOLS_GLOBAL_HOOK__/, type: 'global' },
      { re: /data-v-/, type: 'attr' },
      { re: /_uid/, type: 'global' },
      { re: /<div id="app">/, type: 'html' },
    ],
    'Vue.js 3': [
      { re: /vue\.production\.min\.js/, type: 'script' },
      { re: /__vue_app__/, type: 'global' },
      { re: /@vue\/runtime-core/, type: 'script' },
    ],
    Nuxt: [
      { re: /__NUXT__/, type: 'global' },
      { re: /\/_nuxt\//, type: 'script' },
    ],
    Angular: [
      { re: /angular(\.min)?\.js/, type: 'script' },
      { re: /ng-version/, type: 'attr' },
      { re: /<app-root/, type: 'html' },
      { re: /zone\.js/, type: 'script' },
    ],
    Svelte: [
      { re: /svelte(\.min)?\.js/, type: 'script' },
      { re: /__svelte/, type: 'global' },
    ],
    Sapper: [
      { re: /__SAPPER__/, type: 'global' },
    ],
    Preact: [
      { re: /preact(\.min)?\.js/, type: 'script' },
      { re: /__PREACT_DEVTOOLS__/, type: 'global' },
    ],
    Lit: [
      { re: /lit(\.min)?\.js/, type: 'script' },
      { re: /lit-element/, type: 'script' },
    ],
    Alpine: [
      { re: /alpine(\.min)?\.js/, type: 'script' },
      { re: /x-data/, type: 'attr' },
    ],
    Stimulus: [
      { re: /stimulus(\.min)?\.js/, type: 'script' },
      { re: /data-controller/, type: 'attr' },
    ],
    Ember: [
      { re: /ember(\.min)?\.js/, type: 'script' },
      { re: /Ember\.[A-Z]/, type: 'global' },
    ],
    Backbone: [
      { re: /backbone(\.min)?\.js/, type: 'script' },
      { re: /Backbone\.[A-Z]/, type: 'global' },
    ],
    'Gatsby': [
      { re: /___gatsby/, type: 'global' },
      { re: /\/_gatsby\//, type: 'script' },
    ],
    Docusaurus: [
      { re: /__DOCUSAURUS__/, type: 'global' },
      { re: /docusaurus/, type: 'meta' },
    ],
  },

  metaFrameworks: {
    'Remix': [
      { re: /__remixContext/, type: 'global' },
      { re: /remix\/live-relative/', type: 'script' },
    ],
    'Solid.js': [
      { re: /solid(\.min)?\.js/, type: 'script' },
      { re: /_SOLID_/, type: 'global' },
    ],
    'Qwik': [
      { re: /qwik(\.min)?\.js/, type: 'script' },
      { re: /__qwik__/, type: 'global' },
    ],
  },

  ssr: {
    'Next.js SSR': [
      { re: /__NEXT_DATA__/, type: 'global' },
    ],
    'Nuxt SSR': [
      { re: /__NUXT__/, type: 'global' },
    ],
    'Remix SSR': [
      { re: /__remixContext/, type: 'global' },
    ],
  },

  cms: {
    WordPress: [
      { re: /\/wp-content\//, type: 'script' },
      { re: /\/wp-includes\//, type: 'script' },
      { re: /<meta name="generator" content="WordPress/i, type: 'meta' },
      { re: /wp-emoji-release/, type: 'script' },
    ],
    Shopify: [
      { re: /shopify\.com/, type: 'script' },
      { re: /Shopify\.shop/, type: 'global' },
      { re: /cdn\.shopify\.com/, type: 'script' },
      { re: /window\.Shopify/, type: 'global' },
    ],
    Drupal: [
      { re: /Drupal\.(behaviors|settings)/, type: 'global' },
      { re: /\/sites\/default\//, type: 'script' },
    ],
    Joomla: [
      { re: /joomla!/i, type: 'meta' },
      { re: /\/media\/jui\//, type: 'script' },
    ],
    Squarespace: [
      { re: /squarespace\.com/, type: 'script' },
      { re: /\/static\.squarespace/, type: 'script' },
      { re: /Squarespace/, type: 'global' },
    ],
    Wix: [
      { re: /wix\.com/, type: 'script' },
      { re: /Wix\.(getSite|Utils)/, type: 'global' },
    ],
    Webflow: [
      { re: /webflow\.js/, type: 'script' },
      { re: /<meta name="generator" content="Webflow"/i, type: 'meta' },
    ],
    Ghost: [
      { re: /ghost(\.min)?\.js/, type: 'script' },
      { re: /Ghost/, type: 'meta' },
    ],
    Strapi: [
      { re: /strapi/, type: 'meta' },
    ],
    Contentful: [
      { re: /contentful/, type: 'script' },
    ],
  },

  analytics: {
    'Google Analytics 4': [
      { re: /gtag\s*\(\s*["']config["']\s*,\s*["']G-/, type: 'script' },
      { re: /googletagmanager\.com\/gtag\/js/, type: 'script' },
    ],
    'Google Analytics UA': [
      { re: /gtag\s*\(\s*["']config["']\s*,\s*["']UA-/, type: 'script' },
      { re: /google-analytics\.com\/analytics\.js/, type: 'script' },
      { re: /ga\s*\(/, type: 'script' },
    ],
    'Google Tag Manager': [
      { re: /googletagmanager\.com\/gtm\.js/, type: 'script' },
      { re: /<iframe[^>]*googletagmanager/, type: 'html' },
    ],
    Mixpanel: [
      { re: /cdn\.mxpnl\.com/, type: 'script' },
      { re: /mixpanel\.init/, type: 'script' },
      { re: /mixpanel\.track/, type: 'script' },
    ],
    Amplitude: [
      { re: /amplitude\.com/, type: 'script' },
      { re: /amplitude\.init/, type: 'script' },
    ],
    Hotjar: [
      { re: /hotjar/, type: 'script' },
      { re: /hj\.('|")/, type: 'script' },
    ],
    FullStory: [
      { re: /fullstory\.com/, type: 'script' },
      { re: /FS\.('|")/, type: 'script' },
    ],
    Heap: [
      { re: /heapanalytics\.com/, type: 'script' },
      { re: /heap\.('|")/, type: 'script' },
    ],
    Segment: [
      { re: /cdn\.segment\.com/, type: 'script' },
      { re: /analytics\.load/, type: 'script' },
    ],
    'Facebook Pixel': [
      { re: /connect\.facebook\.net/, type: 'script' },
      { re: /fbq\s*\(/, type: 'script' },
    ],
    'HubSpot Analytics': [
      { re: /js\.hs-scripts\.com/, type: 'script' },
      { re: /hs-analytics/, type: 'script' },
    ],
    'LinkedIn Insight': [
      { re: /snap\.licdn\.com/, type: 'script' },
      { re: /_linkedin_/i, type: 'script' },
    ],
    'Twitter Pixel': [
      { re: /static\.ads-twitter\.com/, type: 'script' },
      { re: /twq\s*\(/, type: 'script' },
    ],
    'Pinterest Tag': [
      { re: /ct\.pinterest\.com/, type: 'script' },
      { re: /pintrk\s*\(/, type: 'script' },
    ],
    'Reddit Pixel': [
      { re: /alb\.reddit\.com/, type: 'script' },
      { re: /rdt\s*\(/, type: 'script' },
    ],
    Matomo: [
      { re: /matomo\.js/, type: 'script' },
      { re: /_paq\.push/, type: 'script' },
    ],
    Plausible: [
      { re: /plausible\.io/, type: 'script' },
      { re: /plausible\s*\(/, type: 'script' },
    ],
    Fathom: [
      { re: /cdn\.usefathom\.com/, type: 'script' },
      { re: /fathom\.('|")/, type: 'script' },
    ],
    PostHog: [
      { re: /posthog/, type: 'script' },
      { re: /posthog\.init/, type: 'script' },
    ],
    Vercel: [
      { re: /vercel-insights/, type: 'script' },
      { re: /\/_vercel\/insights/, type: 'script' },
    ],
  },

  cdns: {
    Cloudflare: [
      { re: /cloudflare/, type: 'script' },
      { re: /cdn\.cloudflare\.com/, type: 'script' },
    ],
    CloudFront: [
      { re: /cloudfront\.net/, type: 'script' },
    ],
    Akamai: [
      { re: /akamai/, type: 'script' },
      { re: /akamaihd\.net/, type: 'script' },
    ],
    Fastly: [
      { re: /fastly\.net/, type: 'script' },
    ],
    KeyCDN: [
      { re: /keycdn\.com/, type: 'script' },
    ],
    UNPKG: [
      { re: /unpkg\.com/, type: 'script' },
    ],
    jsDelivr: [
      { re: /cdn\.jsdelivr\.net/, type: 'script' },
    ],
    cdnjs: [
      { re: /cdnjs\.cloudflare\.com/, type: 'script' },
    ],
  },

  cssFrameworks: {
    Tailwind: [
      { re: /tailwindcss/, type: 'script' },
      { re: /class="[^"]*\b(m|p|flex|grid|gap|text|bg|w|h)-/, type: 'attr' },
    ],
    Bootstrap: [
      { re: /bootstrap(\.min)?\.(css|js)/, type: 'script' },
      { re: /class="[^"]*\b(col|row|container|btn|navbar|card|modal)-/, type: 'attr' },
    ],
    'Bootstrap 5': [
      { re: /bootstrap@5/, type: 'script' },
      { re: /data-bs-/, type: 'attr' },
    ],
    Bulma: [
      { re: /bulma(\.min)?\.css/, type: 'script' },
      { re: /class="[^"]*\b(column|button|navbar|card|tile|level)-/, type: 'attr' },
    ],
    Foundation: [
      { re: /foundation(\.min)?\.(css|js)/, type: 'script' },
      { re: /class="[^"]*\b(grid|cell|button|callout|top-bar)-/, type: 'attr' },
    ],
    Materialize: [
      { re: /materialize(\.min)?\.(css|js)/, type: 'script' },
      { re: /class="[^"]*\b(card|nav|row|col|btn|input-field)-/, type: 'attr' },
    ],
    'Material UI': [
      { re: /@mui\//, type: 'script' },
      { re: /css-[a-z]/i, type: 'attr' },
      { re: /Mui[A-Z]/, type: 'global' },
    ],
    Chakra: [
      { re: /@chakra-ui/, type: 'script' },
      { re: /chakra-ui/, type: 'script' },
    ],
    Ant Design: [
      { re: /antd(\.min)?\.(css|js)/, type: 'script' },
      { re: /class="[^"]*\bant-/i, type: 'attr' },
    ],
    'Semantic UI': [
      { re: /semantic(\.min)?\.(css|js)/, type: 'script' },
      { re: /class="[^"]*\bui\s/, type: 'attr' },
    ],
    Tachyons: [
      { re: /tachyons(\.min)?\.css/, type: 'script' },
      { re: /class="[^"]*\b(pa|ma|f|w|h|b)-/, type: 'attr' },
    ],
    'Styled Components': [
      { re: /styled-components/, type: 'script' },
      { re: /sc-b[a-z0-9]+/, type: 'attr' },
    ],
  },

  bundlers: {
    Webpack: [
      { re: /webpack/, type: 'script' },
      { re: /__webpack_require__/, type: 'global' },
      { re: /webpackJsonp/, type: 'global' },
    ],
    Vite: [
      { re: /\/@vite\//, type: 'script' },
      { re: /__vite__/, type: 'global' },
    ],
    Parcel: [
      { re: /parcel/, type: 'script' },
      { re: /parcelRequire/, type: 'global' },
    ],
    Rollup: [
      { re: /rollup/, type: 'script' },
    ],
    esbuild: [
      { re: /esbuild/, type: 'script' },
    ],
    Turbopack: [
      { re: /turbopack/, type: 'script' },
    ],
    'Swc': [
      { re: /@swc/, type: 'script' },
    ],
  },

  fonts: {
    'Google Fonts': [
      { re: /fonts\.googleapis\.com/, type: 'script' },
      { re: /fonts\.gstatic\.com/, type: 'script' },
    ],
    'Adobe Fonts': [
      { re: /use\.typekit\.net/, type: 'script' },
      { re: /p typekit/i, type: 'html' },
    ],
    'Font Awesome': [
      { re: /font-awesome/, type: 'script' },
      { re: /fontawesome/, type: 'script' },
      { re: /fa[srlb]?\s/, type: 'attr' },
    ],
    'Material Icons': [
      { re: /Material Icons/, type: 'html' },
      { re: /materialicons/, type: 'script' },
    ],
  },

  hosting: {
    Vercel: [
      { re: /vercel\.com/, type: 'script' },
      { re: /vercel\.live/, type: 'script' },
    ],
    Netlify: [
      { re: /netlify\.com/, type: 'script' },
      { re: /netlify\.app/, type: 'script' },
    ],
    'AWS (general)': [
      { re: /amazonaws\.com/, type: 'script' },
    ],
    'GitHub Pages': [
      { re: /github\.io/, type: 'script' },
    ],
    Firebase: [
      { re: /firebase/, type: 'script' },
      { re: /firestore/, type: 'script' },
    ],
    Heroku: [
      { re: /herokuapp\.com/, type: 'script' },
    ],
    'Cloudflare Pages': [
      { re: /pages\.dev/, type: 'script' },
    ],
    Render: [
      { re: /onrender\.com/, type: 'script' },
    ],
  },

  adNetworks: {
    'Google Ads': [
      { re: /googlesyndication\.com/, type: 'script' },
      { re: /adsbygoogle/, type: 'script' },
    ],
    'Amazon Ads': [
      { re: /amazon-adsystem\.com/, type: 'script' },
    ],
    Taboola: [
      { re: /taboola\.com/, type: 'script' },
    ],
    Outbrain: [
      { re: /outbrain\.com/, type: 'script' },
    ],
    'Criteo': [
      { re: /criteo\.com/, type: 'script' },
    ],
    'The Trade Desk': [
      { re: /adsrvr\.org/, type: 'script' },
    ],
  },

  utEngines: {
    Intercom: [
      { re: /intercom/, type: 'script' },
      { re: /Intercom/, type: 'global' },
    ],
    Drift: [
      { re: /drift\.com/, type: 'script' },
      { re: /drift\.('|")/, type: 'script' },
    ],
    Crisp: [
      { re: /crisp\.chat/, type: 'script' },
    ],
    'LiveChat': [
      { re: /livechat\.com/, type: 'script' },
    ],
    Tidio: [
      { re: /tidio\.co/, type: 'script' },
    ],
    Zendesk: [
      { re: /zendesk\.com/, type: 'script' },
    ],
    Freshchat: [
      { re: /freshchat\.com/, type: 'script' },
    ],
    'HubSpot Chat': [
      { re: /hs-scripts\.com/, type: 'script' },
      { re: /HubSpotConversations/, type: 'global' },
    ],
  },

  auth: {
    Auth0: [
      { re: /auth0\.com/, type: 'script' },
      { re: /auth0-js/, type: 'script' },
    ],
    Firebase: [
      { re: /firebase/, type: 'script' },
      { re: /firebase\.auth/, type: 'script' },
    ],
    Clerk: [
      { re: /clerk/, type: 'script' },
    ],
    Supabase: [
      { re: /supabase/, type: 'script' },
    ],
    NextAuth: [
      { re: /next-auth/, type: 'script' },
    ],
  },

  databases: {
    Supabase: [
      { re: /supabase/, type: 'script' },
    ],
    Firebase: [
      { re: /firebaseio\.com/, type: 'script' },
    ],
    Prisma: [
      { re: /prisma/, type: 'script' },
    ],
  },

  payments: {
    Stripe: [
      { re: /stripe\.com/, type: 'script' },
      { re: /Stripe/, type: 'global' },
    ],
    PayPal: [
      { re: /paypal\.com/, type: 'script' },
    ],
    'Square': [
      { re: /square\.com/, type: 'script' },
    ],
    LemonSqueezy: [
      { re: /lemonsqueezy/, type: 'script' },
    ],
    Paddle: [
      { re: /paddle\.com/, type: 'script' },
    ],
  },

  monorepo: {
    Nx: [
      { re: /nx\.json/, type: 'script' },
    ],
    Turborepo: [
      { re: /turbo\.json/, type: 'script' },
    ],
    Lerna: [
      { re: /lerna\.json/, type: 'script' },
    ],
    Rush: [
      { re: /rush\.json/, type: 'script' },
    ],
  },

  test: {
    Jest: [
      { re: /jest/, type: 'script' },
    ],
    Cypress: [
      { re: /cypress/, type: 'script' },
    ],
    Playwright: [
      { re: /playwright/, type: 'script' },
    ],
    Vitest: [
      { re: /vitest/, type: 'script' },
    ],
    Storybook: [
      { re: /storybook/, type: 'script' },
    ],
  },
};

const PATTERN_ORDER = [
  'frameworks',
  'metaFrameworks',
  'cms',
  'analytics',
  'cdns',
  'cssFrameworks',
  'bundlers',
  'fonts',
  'hosting',
  'adNetworks',
  'utEngines',
  'auth',
  'databases',
  'payments',
  'monorepo',
  'test',
];

self.PATTERNS = PATTERNS;
self.PATTERN_ORDER = PATTERN_ORDER;
