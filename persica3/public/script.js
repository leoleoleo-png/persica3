/* ─── PERSICA 3 — Blog JS ─────────────────────────────────────────────────── */

// ── Sanity config ─────────────────────────────────────────────────────────────
// Replace YOUR_PROJECT_ID with your actual Sanity project ID after setup
const SANITY_PROJECT_ID  = 'mbgyqkdn';
const SANITY_DATASET     = 'production';
const SANITY_API_VERSION = '2024-01-01';

function sanityQuery(groq) {
  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(groq)}`;
  return fetch(url).then(r => r.json()).then(r => r.result);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function autoLink(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(
    /(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>'
  );
}

function getEmbedUrl(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?#]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vi = url.match(/(?:vimeo\.com\/)(?:video\/)?(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  return null;
}

// ── Load settings ─────────────────────────────────────────────────────────────

async function loadSettings() {
  try {
    const settings = await sanityQuery(
      `*[_type == "siteSettings" && _id == "siteSettings"][0]{siteTitle,instagramUrl,bandcampUrl,spotifyUrl}`
    );

    if (!settings) return;

    if (settings.siteTitle) {
      document.getElementById('site-title').textContent = settings.siteTitle;
      document.getElementById('footer-text').innerHTML =
        `${escapeHtml(settings.siteTitle)} &mdash; <span id="year">${new Date().getFullYear()}</span>`;
      document.title = settings.siteTitle;
    }

    const nav   = document.getElementById('site-nav');
    const links = [
      { url: settings.instagramUrl, label: 'instagram' },
      { url: settings.bandcampUrl,  label: 'bandcamp'  },
      { url: settings.spotifyUrl,   label: 'spotify'   }
    ]
      .filter(l => l.url && l.url.trim())
      .map(l => `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${l.label}</a>`);

    nav.innerHTML = links.join('');
    nav.style.display = links.length ? 'flex' : 'none';
  } catch (err) {
    console.error('Could not load settings', err);
  }
}

// ── Render media block ────────────────────────────────────────────────────────

function renderMedia(entry) {
  const {mediaType, imageUrl, videoUrl, videoFileUrl} = entry;
  if (!mediaType || mediaType === 'none') return '';

  if (mediaType === 'image') {
    if (!imageUrl) return '';
    return `<div class="entry-media">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(entry.title || 'image')}" loading="lazy">
    </div>`;
  }

  if (mediaType === 'videolink') {
    if (!videoUrl) return '';
    const embedUrl = getEmbedUrl(videoUrl);
    if (embedUrl) {
      return `<div class="entry-media">
        <iframe src="${escapeHtml(embedUrl)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>`;
    }
    return `<div class="entry-media">
      <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener" class="video-external-link">
        watch video &rarr;
      </a>
    </div>`;
  }

  if (mediaType === 'mp4') {
    if (!videoFileUrl) return '';
    return `<div class="entry-media">
      <video controls preload="metadata">
        <source src="${escapeHtml(videoFileUrl)}" type="video/mp4">
        Your browser does not support video.
      </video>
    </div>`;
  }

  return '';
}

// ── Render a single entry ─────────────────────────────────────────────────────

function renderEntry(entry) {
  const title   = entry.title   ? `<h2 class="entry-title">${escapeHtml(entry.title)}</h2>` : '';
  const body    = entry.body    ? `<div class="entry-body">${autoLink(entry.body)}</div>` : '';
  const credits = entry.credits ? `<p class="entry-credits">${escapeHtml(entry.credits)}</p>` : '';
  const media   = renderMedia(entry);

  return `<article class="entry">
    <div class="entry-inner">
      <span class="entry-date">${formatDate(entry._createdAt)}</span>
      ${title}${body}${media}${credits}
    </div>
  </article>`;
}

// ── Load and render all entries ───────────────────────────────────────────────

async function loadEntries() {
  const container = document.getElementById('entries-container');
  try {
    const entries = await sanityQuery(
      `*[_type == "entry" && published != false] | order(orderRank asc){_id,_createdAt,title,body,credits,mediaType,"imageUrl":image.asset->url,videoUrl,"videoFileUrl":videoFile.asset->url}`
    );

    if (!entries || !entries.length) {
      container.innerHTML = '<p class="state-msg">no entries yet.</p>';
      return;
    }

    container.innerHTML = entries.map((entry, i) => {
      const sep = i < entries.length - 1 ? '<hr class="entry-sep">' : '';
      return renderEntry(entry) + sep;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p class="state-msg">could not load entries.</p>';
    console.error(err);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadSettings();
loadEntries();
