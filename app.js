const baseUrl = 'https://gen.pollinations.ai';

const MODEL_CATEGORIES = {
  text: [
    'openai',
    'openai-fast',
    'gpt-oss',
    'gpt-5.4',
    'gpt-5.4-mini',
    'openai-large',
    'gemini-fast',
    'claude',
    'claude-sonnet-5',
    'deepseek',
    'llama',
    'qwen-coder',
  ],
  image: [
    'flux',
    'krea',
    'dreamshaper',
    'kontext',
    'seedream5',
    'seedream5-pro',
    'ideogram-v4-quality',
    'gptimage',
    'gpt-image-2',
    'qwen-image',
    'nova-canvas',
  ],
  audio: [
    'elevenlabs',
    'elevenflash',
    'eleven-multilingual-v2',
    'qwen-tts',
    'qwen-tts-instruct',
    'whisper',
    'gpt-transcribe',
    'scribe',
    'grok-tts',
    'kokoro',
  ],
  video: [
    'veo',
    'seedance-2.0',
    'seedance-2.5',
    'wan',
    'wan-fast',
    'wan-pro',
    'grok-video-pro',
    'nova-reel',
  ],
  embeddings: [
    'gemini-2',
    'openai-3-small',
    'openai-3-large',
    'cohere-embed-v4',
    'qwen3-embedding-8b',
  ],
  '3d': [
    'trellis-2',
    'hyper3d-rodin',
  ],
};

const VOICES = [
  'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer',
  'ash', 'ballad', 'coral', 'sage', 'verse'
];

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

// init selects
fillSelect('textModel', MODEL_CATEGORIES.text);
fillSelect('imageModel', MODEL_CATEGORIES.image);
fillSelect('audioVoice', VOICES);
fillSelect('audioModel', ['elevenlabs', 'qwen-tts', 'gpt-transcribe', 'scribe', 'kokoro']);
fillSelect('videoModel', MODEL_CATEGORIES.video);
fillSelect('embedModel', MODEL_CATEGORIES.embeddings);
fillSelect('model3d', MODEL_CATEGORIES['3d']);

// tabs
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

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

// audio (URL-based)
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
  outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت صدا. اگر مدل پشتیبانی نشود، مدل دیگر را امتحان کن.', true);
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

  outputEl.textContent = `3D URL:\n${url}\n\nخروجی معمولاً فایل GLB است.`;
  setStatus(statusEl, 'لینک 3D آماده شد.');
});

// models list by category
async function loadModelCategory(category) {
  const outputMap = {
    text: 'modelsTextOutput',
    image: 'modelsImageOutput',
    audio: 'modelsAudioOutput',
    video: 'modelsVideoOutput',
    embeddings: 'modelsEmbeddingsOutput',
    '3d': 'models3dOutput',
  };

  const outputEl = document.getElementById(outputMap[category]);
  try {
    outputEl.textContent = 'در حال دریافت...';
    const res = await fetch(`${baseUrl}/v1/models`);
    const data = await res.json();

    const allModels = data?.data || [];
    const filtered = allModels.filter(m => {
      const id = (m.id || '').toLowerCase();
      if (category === '3d') return id.includes('3d') || id.includes('trellis') || id.includes('rodin');
      if (category === 'embeddings') return (m.object || '').includes('model') || id.includes('embed');
      if (category === 'audio') return id.includes('audio') || id.includes('tts') || id.includes('whisper') || id.includes('scribe') || id.includes('kokoro');
      if (category === 'video') return id.includes('video') || id.includes('veo') || id.includes('wan') || id.includes('seedance');
      if (category === 'image') return id.includes('image') || id.includes('flux') || id.includes('dream') || id.includes('ideogram') || id.includes('canvas') || id.includes('krea');
      if (category === 'text') return !(id.includes('image') || id.includes('video') || id.includes('audio') || id.includes('embed') || id.includes('3d'));
      return true;
    });

    outputEl.textContent = JSON.stringify(filtered.map(m => ({
      id: m.id,
      object: m.object,
      created: m.created,
    })), null, 2);
  } catch (e) {
    outputEl.textContent = e.message;
  }
}

document.querySelectorAll('[data-load-models]').forEach((btn) => {
  btn.addEventListener('click', () => loadModelCategory(btn.dataset.loadModels));
});
