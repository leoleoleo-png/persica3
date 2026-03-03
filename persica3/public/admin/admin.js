/* ─── PERSICA 3 — Admin JS ───────────────────────────────────────────────── */

'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let currentId    = null;   // entry being edited (null = new)
let mediaType    = 'none'; // currently selected media tab
let clearFile    = false;  // user clicked "remove current file"
let dragSrcId    = null;   // id of the entry being dragged

// ── DOM refs ──────────────────────────────────────────────────────────────────
const loginScreen  = document.getElementById('login-screen');
const adminPanel   = document.getElementById('admin-panel');
const loginForm    = document.getElementById('login-form');
const pwInput      = document.getElementById('pw-input');
const loginErr     = document.getElementById('login-err');
const logoutBtn    = document.getElementById('logout-btn');
const newBtn       = document.getElementById('new-btn');
const settingsBtn  = document.getElementById('settings-btn');
const entryList    = document.getElementById('entry-list');
const editor       = document.getElementById('editor');

// ── Boot ──────────────────────────────────────────────────────────────────────
(async function init() {
  const res  = await fetch('/api/admin/check');
  const data = await res.json();
  if (data.authenticated) showAdmin();
})();

// ── Auth ──────────────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErr.textContent = '';
  const res = await fetch('/api/admin/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ password: pwInput.value })
  });
  if (res.ok) {
    showAdmin();
  } else {
    loginErr.textContent = 'wrong password.';
    pwInput.value = '';
    pwInput.focus();
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  adminPanel.hidden = true;
  loginScreen.style.display = 'flex';
  pwInput.value = '';
});

function showAdmin() {
  loginScreen.style.display = 'none';
  adminPanel.hidden = false;
  loadList();
}

// ── Entry list ────────────────────────────────────────────────────────────────
async function loadList() {
  entryList.innerHTML = '<p class="list-msg">loading...</p>';
  const res     = await fetch('/api/admin/entries');
  const entries = await res.json();

  if (!entries.length) {
    entryList.innerHTML = '<p class="list-msg">no entries yet.</p>';
    return;
  }

  entryList.innerHTML = entries.map(e => `
    <div class="entry-item ${e.id === currentId ? 'active' : ''}"
         data-id="${e.id}"
         draggable="true"
         onclick="openEntry('${e.id}')">
      <div class="item-title ${!e.title ? 'untitled' : ''}">
        ${esc(e.title || '(untitled)')}
      </div>
      <div class="item-date">${fmtDate(e.createdAt)}</div>
    </div>
  `).join('');

  bindDrag();
}

// ── Drag-and-drop reorder ─────────────────────────────────────────────────────
function bindDrag() {
  const items = entryList.querySelectorAll('.entry-item');

  items.forEach(item => {
    item.addEventListener('dragstart', e => {
      dragSrcId = item.dataset.id;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      entryList.querySelectorAll('.entry-item').forEach(el => el.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (item.dataset.id === dragSrcId) return;
      entryList.querySelectorAll('.entry-item').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', async e => {
      e.preventDefault();
      e.stopPropagation();
      if (!dragSrcId || dragSrcId === item.dataset.id) return;

      // Move in DOM immediately for snappy feel
      const allItems = [...entryList.querySelectorAll('.entry-item')];
      const srcEl    = allItems.find(el => el.dataset.id === dragSrcId);
      const dstEl    = item;
      if (!srcEl) return;

      const srcIdx = allItems.indexOf(srcEl);
      const dstIdx = allItems.indexOf(dstEl);
      if (srcIdx < dstIdx) dstEl.after(srcEl);
      else                  dstEl.before(srcEl);

      entryList.querySelectorAll('.entry-item').forEach(el => el.classList.remove('drag-over'));

      // Persist new order
      const newIds = [...entryList.querySelectorAll('.entry-item')].map(el => el.dataset.id);
      await fetch('/api/admin/entries/reorder', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: newIds })
      });
    });
  });
}

// ── New entry ─────────────────────────────────────────────────────────────────
newBtn.addEventListener('click', () => {
  currentId = null;
  deactivateItems();
  settingsBtn.classList.remove('active');
  renderForm(null);
});

// ── Settings ──────────────────────────────────────────────────────────────────
settingsBtn.addEventListener('click', openSettings);

async function openSettings() {
  currentId = null;
  deactivateItems();
  settingsBtn.classList.add('active');

  const res      = await fetch('/api/admin/settings');
  const settings = await res.json();
  renderSettingsForm(settings);
}

function renderSettingsForm(settings) {
  editor.innerHTML = `
    <div class="entry-form">

      <div class="form-top">
        <h2 class="form-heading">settings</h2>
        <div class="form-btns">
          <button class="btn-save" id="settings-save-btn" onclick="saveSettings()">save</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">site title</label>
        <input class="form-input" id="s-title" type="text"
               value="${escAttr(settings.siteTitle || '')}"
               placeholder="PERSICA 3">
      </div>

      <div class="form-group">
        <label class="form-label">instagram url</label>
        <input class="form-input" id="s-instagram" type="url"
               value="${escAttr(settings.instagramUrl || '')}"
               placeholder="https://instagram.com/...">
      </div>

      <div class="form-group">
        <label class="form-label">bandcamp url</label>
        <input class="form-input" id="s-bandcamp" type="url"
               value="${escAttr(settings.bandcampUrl || '')}"
               placeholder="https://....bandcamp.com">
      </div>

      <div class="form-group">
        <label class="form-label">spotify url</label>
        <input class="form-input" id="s-spotify" type="url"
               value="${escAttr(settings.spotifyUrl || '')}"
               placeholder="https://open.spotify.com/artist/...">
      </div>

      <div class="save-status" id="settings-status"></div>

    </div>
  `;

  editor.onkeydown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveSettings();
    }
  };
}

async function saveSettings() {
  const btn    = document.getElementById('settings-save-btn');
  const status = document.getElementById('settings-status');
  btn.disabled = true;
  status.className = 'save-status';
  status.textContent = 'saving...';

  try {
    const res = await fetch('/api/admin/settings', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteTitle:    document.getElementById('s-title').value,
        instagramUrl: document.getElementById('s-instagram').value,
        bandcampUrl:  document.getElementById('s-bandcamp').value,
        spotifyUrl:   document.getElementById('s-spotify').value
      })
    });

    if (!res.ok) throw new Error(await res.text());

    status.className = 'save-status ok';
    status.textContent = 'saved.';
    setTimeout(() => { if (status) status.textContent = ''; }, 3000);
  } catch (err) {
    status.className = 'save-status err';
    status.textContent = 'error — could not save.';
    console.error(err);
  }

  btn.disabled = false;
}

// ── Open existing entry ───────────────────────────────────────────────────────
async function openEntry(id) {
  const res   = await fetch(`/api/entries/${id}`);
  const entry = await res.json();
  currentId   = id;
  deactivateItems();
  settingsBtn.classList.remove('active');
  document.querySelectorAll(`.entry-item[data-id="${id}"]`)
    .forEach(el => el.classList.add('active'));
  renderForm(entry);
}

function deactivateItems() {
  document.querySelectorAll('.entry-item').forEach(el => el.classList.remove('active'));
}

// ── Form rendering ────────────────────────────────────────────────────────────
function renderForm(entry) {
  clearFile = false;
  mediaType = entry?.mediaType || 'none';

  const isEdit       = !!entry;
  const hasImageFile = isEdit && entry.mediaType === 'image' && entry.mediaFile;
  const hasMp4File   = isEdit && entry.mediaType === 'mp4'   && entry.mediaFile;
  const imgFilename  = hasImageFile ? entry.mediaFile.split('/').pop() : '';
  const mp4Filename  = hasMp4File   ? entry.mediaFile.split('/').pop() : '';

  // Pre-fill URL fields per type
  const imgUrl  = (isEdit && entry.mediaType === 'image'     && !entry.mediaFile) ? (entry.mediaUrl || '') : '';
  const vidUrl  = (isEdit && entry.mediaType === 'videolink')                      ? (entry.mediaUrl || '') : '';
  const mp4Url  = (isEdit && entry.mediaType === 'mp4'       && !entry.mediaFile) ? (entry.mediaUrl || '') : '';

  editor.innerHTML = `
    <div class="entry-form">

      <div class="form-top">
        <h2 class="form-heading">${isEdit ? 'edit entry' : 'new entry'}</h2>
        <div class="form-btns">
          ${isEdit ? `<button class="btn-delete" onclick="deleteEntry('${entry.id}')">delete</button>` : ''}
          <button class="btn-save" id="save-btn" onclick="saveEntry()">save</button>
        </div>
      </div>

      <!-- Title -->
      <div class="form-group">
        <label class="form-label">title</label>
        <input class="form-input" id="f-title" type="text"
               value="${escAttr(entry?.title || '')}"
               placeholder="entry title">
      </div>

      <!-- Body -->
      <div class="form-group">
        <label class="form-label">body</label>
        <textarea class="form-textarea" id="f-body"
                  placeholder="write something...">${esc(entry?.body || '')}</textarea>
      </div>

      <!-- Credits -->
      <div class="form-group">
        <label class="form-label">credits</label>
        <input class="form-input" id="f-credits" type="text"
               value="${escAttr(entry?.credits || '')}"
               placeholder="photo by, music by, etc.">
      </div>

      <!-- Media -->
      <div class="form-group">
        <label class="form-label">media</label>

        <!-- Type tabs -->
        <div class="media-tabs">
          <button class="media-tab ${mediaType === 'none'      ? 'active' : ''}" onclick="setTab('none',      this)">none</button>
          <button class="media-tab ${mediaType === 'image'     ? 'active' : ''}" onclick="setTab('image',     this)">image</button>
          <button class="media-tab ${mediaType === 'videolink' ? 'active' : ''}" onclick="setTab('videolink', this)">video link</button>
          <button class="media-tab ${mediaType === 'mp4'       ? 'active' : ''}" onclick="setTab('mp4',       this)">mp4</button>
        </div>

        <!-- Image section -->
        <div class="media-section ${mediaType === 'image' ? 'active' : ''}" id="sec-image">
          ${hasImageFile ? `
            <div class="current-file" id="cur-img">
              <span>current: ${esc(imgFilename)}</span>
              <button class="btn-remove-file" onclick="removeFile('img')">remove</button>
            </div>
          ` : ''}
          <div class="upload-zone" onclick="document.getElementById('up-img').click()">
            <label class="upload-hint">
              <strong>upload image</strong>
              jpg, png, gif, webp &mdash; click to browse
            </label>
            <input type="file" id="up-img" accept="image/*"
                   onchange="previewUpload(this,'prev-img','image')">
          </div>
          <div class="file-preview" id="prev-img"></div>
          <p class="or-divider">or paste url</p>
          <input class="form-input" id="f-img-url" type="url"
                 value="${escAttr(imgUrl)}"
                 placeholder="https://example.com/image.jpg">
        </div>

        <!-- Video link section -->
        <div class="media-section ${mediaType === 'videolink' ? 'active' : ''}" id="sec-videolink">
          <input class="form-input" id="f-vid-url" type="url"
                 value="${escAttr(vidUrl)}"
                 placeholder="youtube.com/watch?v=...  or  vimeo.com/...">
        </div>

        <!-- MP4 section -->
        <div class="media-section ${mediaType === 'mp4' ? 'active' : ''}" id="sec-mp4">
          ${hasMp4File ? `
            <div class="current-file" id="cur-mp4">
              <span>current: ${esc(mp4Filename)}</span>
              <button class="btn-remove-file" onclick="removeFile('mp4')">remove</button>
            </div>
          ` : ''}
          <div class="upload-zone" onclick="document.getElementById('up-mp4').click()">
            <label class="upload-hint">
              <strong>upload video</strong>
              mp4 &mdash; click to browse
            </label>
            <input type="file" id="up-mp4" accept="video/mp4,video/*"
                   onchange="previewUpload(this,'prev-mp4','video')">
          </div>
          <div class="file-preview" id="prev-mp4"></div>
          <p class="or-divider">or paste url</p>
          <input class="form-input" id="f-mp4-url" type="url"
                 value="${escAttr(mp4Url)}"
                 placeholder="https://example.com/video.mp4">
        </div>

      </div><!-- /media form-group -->

      <div class="save-status" id="save-status"></div>

    </div>
  `;

  // Cmd/Ctrl+S to save
  editor.onkeydown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveEntry();
    }
  };
}

// ── Media tab switching ───────────────────────────────────────────────────────
function setTab(type, btn) {
  mediaType = type;
  document.querySelectorAll('.media-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.media-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(`sec-${type}`);
  if (sec) sec.classList.add('active');
}

// ── File preview ──────────────────────────────────────────────────────────────
function previewUpload(input, previewId, kind) {
  const file = input.files[0];
  if (!file) return;
  const url  = URL.createObjectURL(file);
  const prev = document.getElementById(previewId);
  prev.innerHTML = kind === 'image'
    ? `<img src="${url}" alt="preview">`
    : `<video src="${url}" controls></video>`;
}

// ── Remove current file ───────────────────────────────────────────────────────
function removeFile(which) {
  clearFile = true;
  const el = document.getElementById(which === 'img' ? 'cur-img' : 'cur-mp4');
  if (el) el.remove();
}

// ── Save entry ────────────────────────────────────────────────────────────────
async function saveEntry() {
  const btn    = document.getElementById('save-btn');
  const status = document.getElementById('save-status');
  btn.disabled = true;
  status.className = 'save-status';
  status.textContent = 'saving...';

  const fd = new FormData();
  fd.append('title',     document.getElementById('f-title').value);
  fd.append('body',      document.getElementById('f-body').value);
  fd.append('credits',   document.getElementById('f-credits').value);
  fd.append('mediaType', mediaType);
  fd.append('clearFile', clearFile ? 'true' : 'false');

  if (mediaType === 'image') {
    const upImg = document.getElementById('up-img');
    if (upImg?.files[0]) {
      fd.append('file', upImg.files[0]);
    } else {
      fd.append('mediaUrl', document.getElementById('f-img-url')?.value || '');
    }
  } else if (mediaType === 'videolink') {
    fd.append('mediaUrl', document.getElementById('f-vid-url')?.value || '');
  } else if (mediaType === 'mp4') {
    const upMp4 = document.getElementById('up-mp4');
    if (upMp4?.files[0]) {
      fd.append('file', upMp4.files[0]);
    } else {
      fd.append('mediaUrl', document.getElementById('f-mp4-url')?.value || '');
    }
  }

  try {
    const url    = currentId ? `/api/admin/entries/${currentId}` : '/api/admin/entries';
    const method = currentId ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, body: fd });

    if (!res.ok) throw new Error(await res.text());

    const saved = await res.json();
    if (!currentId) currentId = saved.id;

    status.className = 'save-status ok';
    status.textContent = 'saved.';
    setTimeout(() => { if (status) status.textContent = ''; }, 3000);

    await loadList();
    // Re-highlight
    document.querySelectorAll('.entry-item').forEach(el =>
      el.classList.toggle('active', el.dataset.id === currentId)
    );
  } catch (err) {
    status.className = 'save-status err';
    status.textContent = 'error — could not save.';
    console.error(err);
  }

  btn.disabled = false;
}

// ── Delete entry ──────────────────────────────────────────────────────────────
async function deleteEntry(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  const res = await fetch(`/api/admin/entries/${id}`, { method: 'DELETE' });
  if (res.ok) {
    currentId = null;
    editor.innerHTML = '<p class="editor-welcome">entry deleted.</p>';
    await loadList();
  } else {
    alert('Could not delete entry.');
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  const d  = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(str) {
  return esc(str).replace(/"/g, '&quot;');
}
