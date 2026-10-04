/**
 * Vercel Serverless Function: PWA Manifest & Install Logo Extractor
 * Fetches HTML and Web App Manifest without browser CORS limitations.
 * Extracts the official high-resolution install logo (512x512 / 192x192 maskable/any)
 * according to W3C PWA installation specifications.
 */

async function extractTrueInstallLogo(targetUrl) {
  let cleanUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;
  const parsed = new URL(cleanUrl);
  const origin = parsed.origin;

  let manifestData = null;
  let finalManifestUrl = null;

  // 1. Fetch HTML to find <link rel="manifest"> or <link rel="apple-touch-icon">
  let html = '';
  try {
    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*',
      },
    });
    if (res.ok) html = await res.text();
  } catch {}

  const manifestLinks = [];
  const manifestHrefMatch =
    html.match(/<link[^>]+rel=["'](?:manifest|alternate\s+manifest)["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:manifest|alternate\s+manifest)["']/i);

  if (manifestHrefMatch && manifestHrefMatch[1]) {
    manifestLinks.push(new URL(manifestHrefMatch[1], cleanUrl).href);
  }
  manifestLinks.push(origin + '/manifest.json');
  manifestLinks.push(origin + '/manifest.webmanifest');
  manifestLinks.push(origin + '/site.webmanifest');

  for (const mUrl of manifestLinks) {
    try {
      const mRes = await fetch(mUrl, { headers: { Accept: 'application/json,text/plain,*/*' } });
      if (mRes.ok) {
        const ct = mRes.headers.get('content-type') || '';
        if (!ct.includes('html')) {
          const text = await mRes.text();
          try {
            const data = JSON.parse(text);
            if (data && typeof data === 'object' && (data.icons || data.name || data.short_name)) {
              manifestData = data;
              finalManifestUrl = mUrl;
              break;
            }
          } catch {}
        }
      }
    } catch {}
  }

  // Extract <title> and meta description
  let detectedName = '';
  let detectedDesc = '';
  if (manifestData?.name) detectedName = manifestData.name.trim();
  else if (manifestData?.short_name) detectedName = manifestData.short_name.trim();

  if (manifestData?.description) detectedDesc = manifestData.description.trim();

  if (!detectedName && html) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const cleanTitle = titleMatch[1].trim().split(/ [|\-–—:] /)[0].trim();
      if (cleanTitle) detectedName = cleanTitle;
    }
  }

  if (!detectedDesc && html) {
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch && descMatch[1]) detectedDesc = descMatch[1].trim();
  }

  // Parse apple touch icons and link icons from HTML
  const linkIcons = [];
  const linkRegex = /<link\s+([^>]+)>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const attrs = linkMatch[1];
    const relMatch = attrs.match(/rel=["']([^"']+)["']/i);
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    if (relMatch && hrefMatch) {
      const rel = relMatch[1].toLowerCase();
      const href = hrefMatch[1].trim();
      const sizesMatch = attrs.match(/sizes=["']([^"']+)["']/i);
      const sizes = sizesMatch ? sizesMatch[1] : '';
      try {
        const absHref = new URL(href, cleanUrl).href;
        if (rel.includes('apple-touch-icon')) {
          linkIcons.push({
            url: absHref,
            sizes: sizes || '180x180',
            sizeNum: sizes ? parseInt(sizes.split('x')[0], 10) : 180,
            purpose: 'any',
            type: 'image/png',
            source: 'apple-touch-icon',
            label: 'Apple Touch Icon (iOS Install)',
          });
        } else if (rel.includes('icon')) {
          const sz = sizes ? parseInt(sizes.split('x')[0], 10) : absHref.endsWith('.svg') ? 256 : 64;
          linkIcons.push({
            url: absHref,
            sizes: sizes || (absHref.endsWith('.svg') ? 'vector' : `${sz}x${sz}`),
            sizeNum: sz,
            purpose: 'any',
            type: absHref.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
            source: 'link-icon',
            label: `Favicon (${sizes || '64px'})`,
          });
        }
      } catch {}
    }
  }

  const rawIcons = [];

  // 1. From Web App Manifest: The actual installed logo
  if (manifestData?.icons && Array.isArray(manifestData.icons)) {
    for (const ic of manifestData.icons) {
      if (ic.src) {
        try {
          const abs = new URL(ic.src, finalManifestUrl || cleanUrl).href;
          const sz = ic.sizes ? parseInt(ic.sizes.split('x')[0], 10) : 192;
          const purpose = (ic.purpose || 'any').toLowerCase();
          rawIcons.push({
            url: abs,
            sizes: ic.sizes || `${sz}x${sz}`,
            sizeNum: isNaN(sz) ? 192 : sz,
            purpose,
            type: ic.type || 'image/png',
            source: 'manifest',
            label: `PWA Install Logo (${ic.sizes || '192x192'}${purpose.includes('maskable') ? ' Maskable' : ''})`,
          });
        } catch {}
      }
    }
  }

  // 2. Add apple-touch-icons
  linkIcons.forEach(li => rawIcons.push(li));

  // 3. Probe standard fallback paths if rawIcons is empty
  if (rawIcons.length === 0) {
    const probePaths = [
      { path: '/icon-512x512.png', sizeNum: 512, label: 'PWA Icon (512px)' },
      { path: '/icon-192x192.png', sizeNum: 192, label: 'PWA Icon (192px)' },
      { path: '/icons/icon-512x512.png', sizeNum: 512, label: 'PWA Icon (512px)' },
      { path: '/icons/icon-192x192.png', sizeNum: 192, label: 'PWA Icon (192px)' },
      { path: '/pwa-512x512.png', sizeNum: 512, label: 'PWA Icon (512px)' },
      { path: '/pwa-192x192.png', sizeNum: 192, label: 'PWA Icon (192px)' },
      { path: '/android-chrome-512x512.png', sizeNum: 512, label: 'Android PWA Icon (512px)' },
      { path: '/android-chrome-192x192.png', sizeNum: 192, label: 'Android PWA Icon (192px)' },
      { path: '/apple-touch-icon.png', sizeNum: 180, label: 'Apple Touch Icon (180px)' },
      { path: '/favicon.svg', sizeNum: 256, label: 'Vector SVG Favicon' },
    ];

    for (const pr of probePaths) {
      try {
        const full = origin + pr.path;
        const res = await fetch(full, { method: 'HEAD' });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && !ct.includes('html') && (ct.startsWith('image/') || pr.path.endsWith('.svg') || pr.path.endsWith('.png'))) {
          rawIcons.push({
            url: full,
            sizes: `${pr.sizeNum}x${pr.sizeNum}`,
            sizeNum: pr.sizeNum,
            purpose: 'any',
            type: ct || 'image/png',
            source: 'probe',
            label: pr.label,
          });
        }
      } catch {}
    }
  }

  // Rank candidate icons specifically for PWA installation:
  // 1. Manifest icons are top priority (they are the actual installed app logo)
  // 2. High-resolution: 512x512 preferred, then 192x192, then 180x180
  // 3. Maskable / Any purpose
  rawIcons.sort((a, b) => {
    const aIsManifest = a.source === 'manifest';
    const bIsManifest = b.source === 'manifest';
    if (aIsManifest && !bIsManifest) return -1;
    if (!aIsManifest && bIsManifest) return 1;

    const aScore = (a.sizeNum === 512 ? 1000 : a.sizeNum === 192 ? 500 : a.sizeNum) + (a.purpose.includes('maskable') ? 50 : 0);
    const bScore = (b.sizeNum === 512 ? 1000 : b.sizeNum === 192 ? 500 : b.sizeNum) + (b.purpose.includes('maskable') ? 50 : 0);
    return bScore - aScore;
  });

  // Deduplicate icons by URL
  const uniqueIcons = [];
  const seenUrls = new Set();
  for (const ic of rawIcons) {
    if (!seenUrls.has(ic.url)) {
      seenUrls.add(ic.url);
      uniqueIcons.push(ic);
    }
  }

  const installLogo = uniqueIcons.length > 0 ? uniqueIcons[0].url : null;
  const installLogoDetails = uniqueIcons.length > 0 ? uniqueIcons[0] : null;

  return {
    name: detectedName,
    description: detectedDesc,
    themeColor: manifestData?.theme_color || '',
    backgroundColor: manifestData?.background_color || '',
    installLogo,
    installLogoDetails,
    manifestFound: Boolean(manifestData),
    manifestUrl: finalManifestUrl,
    icons: uniqueIcons,
  };
}

export default async function handler(req, res) {
  // Support Web standard Response if running in Edge runtime
  if (!res && typeof req === 'object' && 'url' in req) {
    const parsedUrl = new URL(req.url);
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    try {
      const data = await extractTrueInstallLogo(targetUrl);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  // Node.js serverless runtime
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query?.url || (req.url && new URL(req.url, 'http://localhost').searchParams.get('url'));
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const result = await extractTrueInstallLogo(targetUrl);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export { extractTrueInstallLogo };
