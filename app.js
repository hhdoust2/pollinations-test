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
  select.innerHTML = items
    .map((item) => `<option value="${item.id}">${item.label}</option>`)
    .join('');
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

function detectBillingType(model) {
  const raw = JSON.stringify(model).toLowerCase();

  if (raw.includes('"paid"') || raw.includes('billing":"paid') || raw.includes('pricing') && raw.includes('paid')) {
    return 'paid';
  }
  if (raw.includes('"quest"') || raw.includes('billing":"quest') || raw.includes('pricing') && raw.includes('quest')) {
    return 'quest';
  }
  if (raw.includes('"free"') || raw.includes('billing":"free') || raw.includes('pricing') && raw.includes('free')) {
    return 'free';
  }
  return 'unknown';
}

function getModelId(model) {
  if (typeof model === 'string') return model;
  return model?.id || '';
}

function getLabel(model) {
  const id = getModelId(model);
  const billing = detectBillingType(model);
  return `${id} — ${billing}`;
}

function filterCategoryModels(models, category) {
  return models.filter((m) => {
    const id = getModelId(m).toLowerCase();
    if (!id) return false;

    if (category === 'text') {
      return !id.includes('image') && !id.includes('video') && !id.includes('audio') && !id.includes('embed') && !id.includes('3d');
    }
    if (category === 'image') {
      return id.includes('image') || id.includes('flux') || id.includes('dream') || id.includes('ideogram') || id.includes('canvas') || id.includes('krea') || id.includes('zimage');
    }
    if (category === 'audio') {
      return id.includes('audio') || id.includes('tts') || id.includes('whisper') || id.includes('scribe') || id.includes('kokoro') || id.includes('eleven');
    }
    if (category === 'video') {
      return id.includes('video') || id.includes('veo') || id.includes('wan') || id.includes('seedance') || id.includes('reel');
    }
    if (category === 'embeddings') {
      return id.includes('embed');
    }
    if (category === '3d') {
      return id.includes('3d') || id.includes('trellis') || id.includes('rodin');
    }
    return false;
  }).map((m) => {
    const id = getModelId(m);
    return { id, label: getLabel(m), raw: m };
  });
}

function groupByBilling(models) {
  const groups = { paid: [], quest: [], free: [], unknown: [] };
  models.forEach((m) => {
    const billing = detectBillingType(m);
    const id = getModelId(m);
    if (!id) return;
    groups[billing].push({ id, label: getLabel(m), raw: m });
  });
  return groups;
}

async function loadModelsFromApi() {
  const res = await fetch(`${baseUrl}/v1/models`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return normalizeModelList(data);
}

async function refreshCategory(category, selectId) {
  const models = await loadModelsFromApi();
  const items = filterCategoryModels(models, category);
  fillSelect(selectId, items);
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
  outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت صدا.', true);
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

// models by billing type
document.getElementById('loadAllModelsBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('modelsStatus');

  try {
    setStatus(statusEl, 'در حال دریافت مدل‌ها...');
    const models = await loadModelsFromApi();
    const groups = groupByBilling(models);

    document.getElementById('modelsPaidOutput').textContent = JSON.stringify(groups.paid, null, 2);
    document.getElementById('modelsQuestOutput').textContent = JSON.stringify(groups.quest, null, 2);
    document.getElementById('modelsFreeOutput').textContent = JSON.stringify(groups.free, null, 2);
    document.getElementById('modelsUnknownOutput').textContent = JSON.stringify(groups.unknown, null, 2);

    setStatus(statusEl, 'مدل‌ها بر اساس billing type جدا شدند.');
  } catch (e) {
    setStatus(statusEl, e.message, true);
  }
});

document.addEventListener('DOMContentLoaded', initAllModelSelects);
