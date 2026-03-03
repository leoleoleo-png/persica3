/**
 * Migration script — exports data/entries.json and data/settings.json to Sanity.
 *
 * Prerequisites:
 *   1. npm install -g @sanity/client  (or: npx node scripts/migrate-to-sanity.mjs)
 *      Actually just run: node scripts/migrate-to-sanity.mjs from the repo root
 *      after running: npm install @sanity/client in this folder, OR add it to
 *      the root package.json temporarily.
 *
 * Setup before running:
 *   1. Fill in PROJECT_ID below (from sanity.io/manage → your project)
 *   2. Create a write token at sanity.io/manage → your project → API → Tokens
 *   3. Set SANITY_TOKEN env var:  export SANITY_TOKEN=sk...
 *   4. Run: node scripts/migrate-to-sanity.mjs
 */

import {createClient} from '@sanity/client'
import fs   from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────

const PROJECT_ID = process.env.SANITY_PROJECT_ID || 'YOUR_PROJECT_ID';
const DATASET    = 'production';
const TOKEN      = process.env.SANITY_TOKEN; // write token from sanity.io/manage

if (!TOKEN || TOKEN === '') {
  console.error('Error: set SANITY_TOKEN env var to a write token from sanity.io/manage');
  process.exit(1);
}
if (PROJECT_ID === 'YOUR_PROJECT_ID') {
  console.error('Error: replace YOUR_PROJECT_ID with your real project ID (or set SANITY_PROJECT_ID env var)');
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset:   DATASET,
  apiVersion: '2024-01-01',
  token:      TOKEN,
  useCdn:     false,
});

// ── Load local data ───────────────────────────────────────────────────────────

const entries  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'entries.json'), 'utf8'));
const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'settings.json'), 'utf8'));

// ── Migrate settings ──────────────────────────────────────────────────────────

async function migrateSettings() {
  console.log('Migrating settings…');
  await client.createOrReplace({
    _id:   'siteSettings',
    _type: 'siteSettings',
    siteTitle:    settings.siteTitle    || 'PERSICA 3',
    instagramUrl: settings.instagramUrl || '',
    bandcampUrl:  settings.bandcampUrl  || '',
    spotifyUrl:   settings.spotifyUrl   || '',
  });
  console.log('✓ Settings migrated');
}

// ── Upload a local file to Sanity ─────────────────────────────────────────────

async function uploadFile(localPath, mimeType) {
  const fullPath = path.join(ROOT, 'public', localPath.replace(/^\//, ''));
  if (!fs.existsSync(fullPath)) {
    console.warn(`  ⚠ File not found, skipping: ${fullPath}`);
    return null;
  }
  const buffer = fs.readFileSync(fullPath);
  const ext    = path.extname(fullPath).slice(1).toLowerCase();
  const asset  = await client.assets.upload(
    mimeType.startsWith('video') ? 'file' : 'image',
    buffer,
    {filename: path.basename(fullPath), contentType: mimeType}
  );
  console.log(`  ✓ Uploaded ${path.basename(fullPath)} → ${asset._id}`);
  return asset;
}

// ── Migrate entries ───────────────────────────────────────────────────────────

const MIME = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime'};

async function migrateEntries() {
  console.log(`\nMigrating ${entries.length} entries…`);

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    console.log(`\n[${i + 1}/${entries.length}] "${e.title || '(untitled)'}"`);

    const doc = {
      _id:        `entry-${e.id}`,
      _type:      'entry',
      orderRank:  `a${i}`, // simple initial ordering
      title:      e.title    || undefined,
      body:       e.body     || undefined,
      credits:    e.credits  || undefined,
      mediaType:  e.mediaType || 'none',
      published:  e.published !== false,
    };

    // Handle media
    if (e.mediaType === 'image') {
      const src = e.mediaFile || e.mediaUrl;
      if (src && src.startsWith('/uploads/')) {
        const ext  = path.extname(src).slice(1).toLowerCase();
        const mime = MIME[ext] || 'image/jpeg';
        const asset = await uploadFile(src, mime);
        if (asset) {
          doc.image = {_type: 'image', asset: {_type: 'reference', _ref: asset._id}};
        }
      } else if (src) {
        console.warn(`  ⚠ Remote image URL — skipping upload, add manually in Studio: ${src}`);
      }

    } else if (e.mediaType === 'videolink') {
      doc.videoUrl = e.mediaUrl || undefined;

    } else if (e.mediaType === 'mp4') {
      const src = e.mediaFile || e.mediaUrl;
      if (src && src.startsWith('/uploads/')) {
        const asset = await uploadFile(src, 'video/mp4');
        if (asset) {
          doc.videoFile = {_type: 'file', asset: {_type: 'reference', _ref: asset._id}};
        }
      }
    }

    await client.createOrReplace(doc);
    console.log(`  ✓ Created entry ${doc._id}`);
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────

try {
  await migrateSettings();
  await migrateEntries();
  console.log('\n✓ Migration complete!\n');
} catch (err) {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
}
