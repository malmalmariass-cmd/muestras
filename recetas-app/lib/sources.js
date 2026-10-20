// Pulls whatever public text a recipe post exposes (title, caption,
// description) so Claude can turn it into a structured recipe.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function detectPlatform(url) {
  const host = safeHost(url);
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host)) return "youtube";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  return "web";
}

function safeHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

async function get(url, { json = false } = {}) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, "accept-language": "es-MX,es;q=0.9,en;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json ? res.json() : res.text();
}

function meta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
    "i",
  );
  const m = html.match(re);
  return decodeEntities(m?.[1] ?? m?.[2] ?? "");
}

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

async function oembed(endpoint, url) {
  try {
    return await get(`${endpoint}?format=json&url=${encodeURIComponent(url)}`, { json: true });
  } catch {
    return null;
  }
}

async function pageMeta(url) {
  try {
    const html = await get(url);
    return { html, title: meta(html, "og:title"), description: meta(html, "og:description") || meta(html, "description") };
  } catch {
    return { html: "", title: "", description: "" };
  }
}

export async function fetchSourceText(url) {
  const platform = detectPlatform(url);
  let title = "";
  let author = "";
  const parts = [];

  if (platform === "youtube") {
    const oe = await oembed("https://www.youtube.com/oembed", url);
    title = oe?.title ?? "";
    author = oe?.author_name ?? "";
    const page = await pageMeta(url);
    // The full video description lives in the player JSON, not in the meta tags.
    const m = page.html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    if (m) parts.push(JSON.parse(`"${m[1]}"`));
    else if (page.description) parts.push(page.description);
    title ||= page.title;
  } else if (platform === "tiktok") {
    const oe = await oembed("https://www.tiktok.com/oembed", url);
    title = oe?.title ?? "";
    author = oe?.author_name ?? "";
    if (title) parts.push(title);
    if (!title) {
      const page = await pageMeta(url);
      title = page.title;
      if (page.description) parts.push(page.description);
    }
  } else {
    // Instagram and generic sites: the caption is usually in og:description.
    const page = await pageMeta(url);
    title = page.title;
    if (page.description) parts.push(page.description);
    const ld = page.html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
    if (ld) {
      for (const block of ld) {
        const body = block.replace(/^<script[^>]*>|<\/script>$/gi, "");
        if (/Recipe/.test(body)) parts.push(body.slice(0, 8000));
      }
    }
  }

  return { platform, title, author, text: parts.join("\n\n").trim() };
}
