const baseUrl = 'https://gen.pollinations.ai';

const DEFAULT_VOICES = [
  'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer',
  'ash', 'ballad', 'coral', 'sage', 'verse',
  'rachel', 'domi', 'bella', 'elli', 'charlotte', 'dorothy',
  'sarah', 'emily', 'lily', 'matilda', 'adam', 'antoni',
  'arnold', 'josh', 'sam', 'daniel', 'charlie', 'james',
  'fin', 'callum', 'liam', 'george', 'brian', 'bill'
];

function getApiKey() {
  return document.getElementById('apiKey').value.trim();
}

function setStatus(el, message, isError = false) {
  if (!el) return;
  el.style.display = message ? 'block' : 'none';
  el.textContent = message || '';
  el.classList.toggle('error', isError);
  el.classList.toggle('hidden', !message);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

function fillSelect(selectId, items, labelFormatter = (x) => x) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '';
  if (!items || !items.length) return;
  select.innerHTML = items
    .map((item) => `<option value="${item.id}">${labelFormatter(item)}</option>`)
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
  if (raw.includes('"paid"') || (raw.includes('pricing') && raw.includes('paid')) || raw.includes('billing":"paid')) return 'paid';
  if (raw.includes('"quest"') || (raw.includes('pricing') && raw.includes('quest')) || raw.includes('billing":"quest')) return 'quest';
  if (raw.includes('"free"') || (raw.includes('pricing') && raw.includes('free')) || raw.includes('billing":"free')) return 'free';
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
  return models
    .filter((m) => {
      const id = getModelId(m).toLowerCase();
      if (!id) return false;

      if (category === 'text') return !id.includes('image') && !id.includes('video') && !id.includes('audio') && !id.includes('embed') && !id.includes('3d');
      if (category === 'image') return id.includes('image') || id.includes('flux') || id.includes('dream') || id.includes('ideogram') || id.includes('canvas') || id.includes('krea') || id.includes('zimage');
      if (category === 'audio') return id.includes('audio') || id.includes('tts') || id.includes('whisper') || id.includes('scribe') || id.includes('kokoro') || id.includes('eleven');
      if (category === 'video') return id.includes('video') || id.includes('veo') || id.includes('wan') || id.includes('seedance') || id.includes('reel');
      if (category === 'embeddings') return id.includes('embed');
      if (category === '3d') return id.includes('3d') || id.includes('trellis') || id.includes('rodin');
      return false;
    })
    .map((m) => ({ id: getModelId(m), label: getLabel(m), raw: m }));
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
  fillSelect(selectId, items, (item) => item.label);
}

async function initAllModelSelects() {
  try {
    await refreshCategory('text', 'textModel');
    await refreshCategory('image', 'imageModel');
    await refreshCategory('audio', 'audioModel');
    await refreshCategory('video', 'videoModel');
    await refreshCategory('embeddings', 'embedModel');
    await refreshCategory('3d', 'model3d');

    // voices are local/default, because API list for voices is not reliable here
    fillSelect('audioVoice', DEFAULT_VOICES.map(v => ({ id: v, label: v })), (item) => item.label);

    // for 3D text→image helper, reuse image models
    await refreshCategory('image', '3dImageModel');
  } catch (e) {
    console.warn('Init failed:', e.message);
    fillSelect('audioVoice', DEFAULT_VOICES.map(v => ({ id: v, label: v })), (item) => item.label);
  }
}

// tabs
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(`tab-${btn.dataset.tab}`);
    if (panel) panel.classList.add('active');
  });
});

// reload buttons
const reloadMap = [
  ['reloadTextModels', () => refreshCategory('text', 'textModel')],
  ['reloadImageModels', () => refreshCategory('image', 'imageModel')],
  ['reloadAudioModels', () => refreshCategory('audio', 'audioModel')],
  ['reloadVideoModels', () => refreshCategory('video', 'videoModel')],
  ['reloadEmbedModels', () => refreshCategory('embeddings', 'embedModel')],
  ['reload3dModels', () => refreshCategory('3d', 'model3d')],
  ['reloadAudioVoices', async () => fillSelect('audioVoice', DEFAULT_VOICES.map(v => ({ id: v, label: v })), (item) => item.label)],
];
reloadMap.forEach(([id, fn]) => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', fn);
});

// text
const genTextBtn = document.getElementById('genTextBtn');
if (genTextBtn) {
  genTextBtn.addEventListener('click', async () => {
    const statusEl = document.getElementById('textStatus');
    const outputEl = document.getElementById('textOutput');
    try {
      setStatus(statusEl, 'در حال تولید متن...');
      const prompt = document.getElementById('textPrompt')?.value.trim() || '';
      const model = document.getElementById('textModel')?.value || '';

      const data = await apiFetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
      });

      if (outputEl) outputEl.textContent = data?.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
      setStatus(statusEl, 'متن تولید شد.');
    } catch (e) {
      setStatus(statusEl, e.message, true);
    }
  });
}

// image
const genImageBtn = document.getElementById('genImageBtn');
if (genImageBtn) {
  genImageBtn.addEventListener('click', () => {
    const statusEl = document.getElementById('imageStatus');
    const outputEl = document.getElementById('imageOutput');
    const prompt = document.getElementById('imagePrompt')?.value.trim() || '';
    const model = document.getElementById('imageModel')?.value || '';
    const apiKey = getApiKey();

    if (!prompt) return setStatus(statusEl, 'پرامپت تصویر خالی است.', true);

    setStatus(statusEl, 'در حال ساخت تصویر...');
    if (!outputEl) return;

    outputEl.onload = () => setStatus(statusEl, 'تصویر آماده شد.');
    outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت تصویر.', true);

    let url = `${baseUrl}/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}`;
    if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;
    outputEl.src = url;
  });
}

// audio
const genAudioBtn = document.getElementById('genAudioBtn');
if (genAudioBtn) {
  genAudioBtn.addEventListener('click', async () => {
    const statusEl = document.getElementById('audioStatus');
    const outputEl = document.getElementById('audioOutput');
    const text = document.getElementById('audioText')?.value.trim() || '';
    const voice = document.getElementById('audioVoice')?.value || 'nova';
    const mode = document.getElementById('audioMode')?.value || 'url';
    const audioModel = document.getElementById('audioModel')?.value || '';
    const apiKey = getApiKey();

    if (!text) return setStatus(statusEl, 'متن صدا خالی است.', true);
    if (!outputEl) return;

    setStatus(statusEl, 'در حال ساخت صدا...');

    try {
      if (mode === 'speech') {
        const data = await apiFetch('/v1/audio/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: audioModel || 'openai-audio',
            voice,
            input: text
          })
        });

        // اگر API باینری/بلوب برگرداند و fetch wrapper نتواند handle کند، از URL mode استفاده کن.
        // اینجا اگر JSON نبود یا پاسخ مستقیم نبود، fallback نداریم.
        if (typeof data === 'string') {
          outputEl.src = data;
        } else {
          outputEl.src = URL.createObjectURL(new Blob([data]));
        }
        setStatus(statusEl, 'صدا آماده شد.');
      } else {
        let url = `${baseUrl}/audio/${encodeURIComponent(text)}?voice=${encodeURIComponent(voice)}`;
        if (audioModel) url += `&model=${encodeURIComponent(audioModel)}`;
        if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

        outputEl.src = url;
        outputEl.oncanplay = () => setStatus(statusEl, 'صدا آماده شد.');
        outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت صدا. اگر voice کار نکرد، حالت GET را نگه دار و voice دیگری امتحان کن.', true);
      }
    } catch (e) {
      setStatus(statusEl, e.message, true);
    }
  });
}

// video
const genVideoBtn = document.getElementById('genVideoBtn');
if (genVideoBtn) {
  genVideoBtn.addEventListener('click', () => {
    const statusEl = document.getElementById('videoStatus');
    const outputEl = document.getElementById('videoOutput');
    const prompt = document.getElementById('videoPrompt')?.value.trim() || '';
    const model = document.getElementById('videoModel')?.value || '';
    const duration = document.getElementById('videoDuration')?.value || '4';
    const apiKey = getApiKey();

    if (!prompt) return setStatus(statusEl, 'پرامپت ویدیو خالی است.', true);

    setStatus(statusEl, 'در حال ساخت ویدیو...');
    let url = `${baseUrl}/video/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&duration=${encodeURIComponent(duration)}`;
    if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

    if (outputEl) {
      outputEl.src = url;
      outputEl.onloadeddata = () => setStatus(statusEl, 'ویدیو آماده شد.');
      outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت ویدیو.', true);
    }
  });
}

// embeddings
const genEmbedBtn = document.getElementById('genEmbedBtn');
if (genEmbedBtn) {
  genEmbedBtn.addEventListener('click', async () => {
    const statusEl = document.getElementById('embedStatus');
    const outputEl = document.getElementById('embedOutput');
    try {
      setStatus(statusEl, 'در حال تولید embedding...');
      const text = document.getElementById('embedText')?.value.trim() || '';
      const model = document.getElementById('embedModel')?.value || '';

      const data = await apiFetch('/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: text, dimensions: 512 })
      });

      if (outputEl) outputEl.textContent = JSON.stringify(data, null, 2);
      setStatus(statusEl, 'Embedding ساخته شد.');
    } catch (e) {
      setStatus(statusEl, e.message, true);
    }
  });
}

// 3D
const gen3dBtn = document.getElementById('gen3dBtn');
if (gen3dBtn) {
  gen3dBtn.addEventListener('click', async () => {
    const statusEl = document.getElementById('model3dStatus');
    const outputEl = document.getElementById('model3dOutput');
    const input = document.getElementById('model3dInput')?.value.trim() || '';
    const model = document.getElementById('model3d')?.value || 'trellis-2';
    const resolution = document.getElementById('resolution3d')?.value || 'low';
    const imageModel = document.getElementById('3dImageModel')?.value || '';
    const apiKey = getApiKey();

    if (!input) return setStatus(statusEl, 'ورودی 3D خالی است.', true);

    setStatus(statusEl, 'در حال ساخت 3D...');

    try {
      let imageUrl = input;

      // اگر ورودی URL تصویر نیست، اول یک تصویر بساز
      if (!/^https?:\/\//i.test(input)) {
        imageUrl = `${baseUrl}/image/${encodeURIComponent(input)}?model=${encodeURIComponent(imageModel || 'flux')}`;
        if (apiKey) imageUrl += `&key=${encodeURIComponent(apiKey)}`;
      }

      let url = `${baseUrl}/3d/${encodeURIComponent('no_prompt_for_trellis_needed')}`;
      url += `?model=${encodeURIComponent(model)}&resolution=${encodeURIComponent(resolution)}&image=${encodeURIComponent(imageUrl)}`;
      if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

      if (outputEl) {
        outputEl.textContent = `3D URL:\n${url}\n\nاگر مدل trellis-2 باشد، حتما image= لازم است.`;
      }
      setStatus(statusEl, 'لینک 3D آماده شد.');
    } catch (e) {
      setStatus(statusEl, e.message, true);
    }
  });
}

// models
const loadAllModelsBtn = document.getElementById('loadAllModelsBtn');
if (loadAllModelsBtn) {
  loadAllModelsBtn.addEventListener('click', async () => {
    const statusEl = document.getElementById('modelsStatus');
    try {
      setStatus(statusEl, 'در حال دریافت مدل‌ها...');
      const models = await loadModelsFromApi();
      const groups = groupByBilling(models);

      setText('modelsPaidOutput', JSON.stringify(groups.paid, null, 2));
      setText('modelsQuestOutput', JSON.stringify(groups.quest, null, 2));
      setText('modelsFreeOutput', JSON.stringify(groups.free, null, 2));
      setText('modelsUnknownOutput', JSON.stringify(groups.unknown, null, 2));

      setStatus(statusEl, 'مدل‌ها بر اساس billing type جدا شدند.');
    } catch (e) {
      setStatus(statusEl, e.message, true);
    }
  });
}

document.addEventListener('DOMContentLoaded', initAllModelSelects);
