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

async function apiFetch(path, options = {}) {
  const apiKey = getApiKey();
  const headers = { ...(options.headers || {}) };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetch(baseUrl + path, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    let errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }

  if (contentType.includes('application/json')) {
    return await res.json();
  }

  return await res.text();
}

// Tabs
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// Text
document.getElementById('genTextBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('textStatus');
  const outputEl = document.getElementById('textOutput');
  const prompt = document.getElementById('textPrompt').value.trim();
  const model = document.getElementById('textModel').value;

  try {
    setStatus(statusEl, 'در حال تولید متن...');
    outputEl.textContent = '';

    const data = await apiFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const text = data?.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
    outputEl.textContent = text;
    setStatus(statusEl, 'متن تولید شد.');
  } catch (e) {
    setStatus(statusEl, e.message, true);
  }
});

// Image
document.getElementById('genImageBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('imageStatus');
  const outputEl = document.getElementById('imageOutput');
  const prompt = document.getElementById('imagePrompt').value.trim();
  const model = document.getElementById('imageModel').value;
  const apiKey = getApiKey();

  if (!prompt) {
    setStatus(statusEl, 'پرامپت تصویر خالی است.', true);
    return;
  }

  setStatus(statusEl, 'در حال ساخت تصویر...');
  outputEl.onload = () => setStatus(statusEl, 'تصویر آماده شد.');
  outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت تصویر.', true);

  let url = `${baseUrl}/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}`;
  if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;
  outputEl.src = url;
});

// Audio
document.getElementById('genAudioBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('audioStatus');
  const outputEl = document.getElementById('audioOutput');
  const text = document.getElementById('audioText').value.trim();
  const voice = document.getElementById('audioVoice').value;
  const model = document.getElementById('audioModel').value;
  const apiKey = getApiKey();

  if (!text) {
    setStatus(statusEl, 'متن صدا خالی است.', true);
    return;
  }

  setStatus(statusEl, 'در حال ساخت صدا...');

  let url = `${baseUrl}/audio/${encodeURIComponent(text)}?voice=${encodeURIComponent(voice)}&model=${encodeURIComponent(model)}`;
  if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

  outputEl.src = url;
  outputEl.oncanplay = () => setStatus(statusEl, 'صدا آماده شد.');
  outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت صدا.', true);
});

// Video
document.getElementById('genVideoBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('videoStatus');
  const outputEl = document.getElementById('videoOutput');
  const prompt = document.getElementById('videoPrompt').value.trim();
  const model = document.getElementById('videoModel').value;
  const duration = document.getElementById('videoDuration').value;
  const apiKey = getApiKey();

  if (!prompt) {
    setStatus(statusEl, 'پرامپت ویدیو خالی است.', true);
    return;
  }

  setStatus(statusEl, 'در حال ساخت ویدیو...');

  let url = `${baseUrl}/video/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&duration=${encodeURIComponent(duration)}`;
  if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

  outputEl.src = url;
  outputEl.onloadeddata = () => setStatus(statusEl, 'ویدیو آماده شد.');
  outputEl.onerror = () => setStatus(statusEl, 'خطا در ساخت ویدیو.', true);
});

// Embeddings
document.getElementById('genEmbedBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('embedStatus');
  const outputEl = document.getElementById('embedOutput');
  const text = document.getElementById('embedText').value.trim();

  try {
    setStatus(statusEl, 'در حال تولید embedding...');
    outputEl.textContent = '';

    const data = await apiFetch('/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai-3-small',
        input: text,
        dimensions: 512
      })
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

  if (!prompt) {
    setStatus(statusEl, 'ورودی 3D خالی است.', true);
    return;
  }

  setStatus(statusEl, 'در حال ساخت 3D...');

  let url = `${baseUrl}/3d/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&resolution=${encodeURIComponent(resolution)}`;
  if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

  outputEl.textContent = url;
  setStatus(statusEl, 'لینک 3D آماده شد. (GLB)');
});

// Models
document.getElementById('loadModelsBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('modelsStatus');
  const outputEl = document.getElementById('modelsOutput');

  try {
    setStatus(statusEl, 'در حال دریافت لیست مدل‌ها...');
    outputEl.textContent = '';

    const res = await fetch(`${baseUrl}/v1/models`);
    const data = await res.json();

    outputEl.textContent = JSON.stringify(data, null, 2);
    setStatus(statusEl, 'لیست مدل‌ها دریافت شد.');
  } catch (e) {
    setStatus(statusEl, e.message, true);
  }
});
