const baseUrl = 'https://gen.pollinations.ai';

function getApiKey() {
  return document.getElementById('apiKey').value.trim();
}

function setStatus(el, message, isError = false) {
  el.style.display = message ? 'block' : 'none';
  el.textContent = message || '';
  el.classList.toggle('error', isError);
  el.classList.toggle('hidden', !message);
}

function fillSelect(selectId, items) {
  const select = document.getElementById(selectId);
  select.innerHTML = '';

  if (!items || !items.length) return;

  select.innerHTML = items.map(v => `<option value="${v}">${v}</option>`).join('');
}

async function apiFetch(path, options = {}) {
  const apiKey = getApiKey();
  const headers = { ...(options.headers || {}) };

  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(baseUrl + path, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }

  if (contentType.includes('application/json')) return await res.json();
  return await res.text();
}

function normalizeModelList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function filterCategoryModels(models, category) {
  return models
    .map(m => (typeof m === 'string' ? m : m?.id))
    .filter(Boolean)
    .filter(id => {
      const x = id.toLowerCase();

      if (category === 'text') {
        return !x.includes('image') && !x.includes('video') && !x.includes('audio') && !x.includes('embed') && !x.includes('3d');
      }
      if (category === 'image') {
        return x.includes('image') || x.includes('flux') || x.includes('dream') || x.includes('ideogram') || x.includes('canvas') || x.includes('krea') || x.includes('zimage');
      }
      if (category === 'audio') {
        return x.includes('audio') || x.includes('tts') || x.includes('whisper') || x.includes('scribe') || x.includes('kokoro') || x.includes('eleven');
      }
      if (category === 'video') {
        return x.includes('video') || x.includes('veo') || x.includes('wan') || x.includes('seedance') || x.includes('reel');
      }
      if (category === 'embeddings') {
        return x.includes('embed');
      }
      if (category === '3d') {
        return x.includes('3d') || x.includes('trellis') || x.includes('rodin');
      }
      return false;
    });
}

async function loadModelsFromApi() {
  const res = await fetch(`${baseUrl}/v1/models`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return normalizeModelList(data);
}

async function refreshCategory(category, selectId, debugElId = null) {
  const items = filterCategoryModels(await loadModelsFromApi(), category);
  fillSelect(selectId, items);
  if (debugElId) document.getElementById(debugElId).textContent = JSON.stringify(items, null, 2);
}

async function initAllModelSelects() {
  try {
    await refreshCategory('text', 'textModel');
    await refreshCategory('image', 'imageModel');
    await refreshCategory('audio', 'audioModel');
    await refreshCategory('video', 'videoModel');
    await refreshCategory('embeddings', 'embedModel');
    await refreshCategory('3d', 'model3d');
  } catch (e) {
    console.warn('Model select init failed:', e.message);
  }
}

// tabs
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// reload buttons
document.getElementById('reloadTextModels').addEventListener('click', () => refreshCategory('text', 'textModel'));
document.getElementById('reloadImageModels').addEventListener('click', () => refreshCategory('image', 'imageModel'));
document.getElementById('reloadAudioModels').addEventListener('click', () => refreshCategory('audio', 'audioModel'));
document.getElementById('reloadVideoModels').addEventListener('click', () => refreshCategory('video', 'videoModel'));
document.getElementById('reloadEmbedModels').addEventListener('click', () => refreshCategory('embeddings', 'embedModel'));
document.getElementById('reload3dModels').addEventListener('click', () => refreshCategory('3d', 'model3d'));

// text
document.getElementById('genTextBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('textStatus');
  const outputEl = document.getElementById('textOutput');
  try {
    setStatus(statusEl, 'در حال تولید متن...');
    const prompt = document.getElementById('textPrompt').value.trim();
    const model = document.getElementById('textModel').value;

    const data = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
    });

    outputEl.textContent = data?.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
    setStatus(statusEl, 'متن تولید شد.');
  } catch (e) {
    setStatus(statusEl, e.message, true);
  }
});

// image
document.getElementById('genImageBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('imageStatus');
  const outputEl = document.getElementById('imageOutput');
  const prompt = document.getElementById('imagePrompt').value.trim();
  const model = document.getElementById('imageModel').value;
  const apiKey = getApiKey();

  if (!prompt) return setStatus(statusEl, 'پرامپت تصویر خالی است.', true);

  setStatus(statusEl, 'در حال ساخت تصویر...');
  outputEl.onload = () => setStatus(statusEl, 'تصویر آماده شد.');
  outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت تصویر.', true);

  let url = `${baseUrl}/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}`;
  if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;
  outputEl.src = url;
});

// audio
document.getElementById('genAudioBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('audioStatus');
  const outputEl = document.getElementById('audioOutput');
  const text = document.getElementById('audioText').value.trim();
  const voice = document.getElementById('audioVoice').value;
  const model = document.getElementById('audioModel').value;
  const apiKey = getApiKey();

  if (!text) return setStatus(statusEl, 'متن صدا خالی است.', true);

  setStatus(statusEl, 'در حال ساخت صدا...');
  let url = `${baseUrl}/audio/${encodeURIComponent(text)}?voice=${encodeURIComponent(voice)}&model=${encodeURIComponent(model)}`;
  if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

  outputEl.src = url;
  outputEl.oncanplay = () => setStatus(statusEl, 'صدا آماده شد.');
  outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت صدا. اگر مدل پاسخ نداد، مدل دیگری را از لیست امتحان کن.', true);
});

// video
document.getElementById('genVideoBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('videoStatus');
  const outputEl = document.getElementById('videoOutput');
  const prompt = document.getElementById('videoPrompt').value.trim();
  const model = document.getElementById('videoModel').value;
  const duration = document.getElementById('videoDuration').value;
  const apiKey = getApiKey();

  if (!prompt) return setStatus(statusEl, 'پرامپت ویدیو خالی است.', true);

  setStatus(statusEl, 'در حال ساخت ویدیو...');
  let url = `${baseUrl}/video/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&duration=${encodeURIComponent(duration)}`;
  if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

  outputEl.src = url;
  outputEl.onloadeddata = () => setStatus(statusEl, 'ویدیو آماده شد.');
  outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت ویدیو.', true);
});

// embeddings
document.getElementById('genEmbedBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('embedStatus');
  const outputEl = document.getElementById('embedOutput');
  try {
    setStatus(statusEl, 'در حال تولید embedding...');
    const text = document.getElementById('embedText').value.trim();
    const model = document.getElementById('embedModel').value;

    const data = await apiFetch('/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text, dimensions: 512 })
    });

    outputEl.textContent = JSON.stringify(data, null, 2);
    setStatus(statusEl, 'Embedding ساخته شد.');
  } catch (e) {
    setStatus(statusEl, e.message, true);
  }
});

// 3D
document.getElementById('gen3dBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('model3dStatus');
  const outputEl = document.getElementById('model3dOutput');
  const prompt = document.getElementById('model3dPrompt').value.trim();
  const model = document.getElementById('model3d').value;
  const resolution = document.getElementById('resolution3d').value;
  const apiKey = getApiKey();

  if (!prompt) return setStatus(statusEl, 'ورودی 3D خالی است.', true);

  setStatus(statusEl, 'در حال ساخت 3D...');
  let url = `${baseUrl}/3d/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&resolution=${encodeURIComponent(resolution)}`;
  if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

  outputEl.textContent = url;
  setStatus(statusEl, 'لینک 3D آماده شد.');
});

// load all models and show per category
document.getElementById('loadAllModelsBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('modelsStatus');

  try {
    setStatus(statusEl, 'در حال دریافت مدل‌ها...');
    const models = await loadModelsFromApi();

    const textModels = filterCategoryModels(models, 'text');
    const imageModels = filterCategoryModels(models, 'image');
    const audioModels = filterCategoryModels(models, 'audio');
    const videoModels = filterCategoryModels(models, 'video');
    const embeddingModels = filterCategoryModels(models, 'embeddings');
    const model3d = filterCategoryModels(models, '3d');

    document.getElementById('modelsTextOutput').textContent = JSON.stringify(textModels, null, 2);
    document.getElementById('modelsImageOutput').textContent = JSON.stringify(imageModels, null, 2);
    document.getElementById('modelsAudioOutput').textContent = JSON.stringify(audioModels, null, 2);
    document.getElementById('modelsVideoOutput').textContent = JSON.stringify(videoModels, null, 2);
    document.getElementById('modelsEmbeddingsOutput').textContent = JSON.stringify(embeddingModels, null, 2);
    document.getElementById('models3dOutput').textContent = JSON.stringify(model3d, null, 2);

    setStatus(statusEl, 'مدل‌ها لود شدند.');
  } catch (e) {
    setStatus(statusEl, e.message, true);
  }
});

document.addEventListener('DOMContentLoaded', initAllModelSelects);
