const form = document.querySelector('#seed-form');
const fileInput = document.querySelector('#image');
const dropZone = document.querySelector('#drop-zone');
const errorEl = document.querySelector('#form-error');
const submitButton = document.querySelector('#submit-button');
const resultWrap = document.querySelector('#result-wrap');
const resultPanel = document.querySelector('#result-panel');
const previewWrap = document.querySelector('#photo-preview');
const previewImage = document.querySelector('#preview-image');
const visualReview = document.querySelector('#visual-review');
const ocrBox = document.querySelector('#ocr-box');
const ocrProgress = document.querySelector('#ocr-progress');
const ocrButton = document.querySelector('#read-label');
const savedChecks = document.querySelector('#saved-checks');
const savedChecksList = document.querySelector('#saved-checks-list');
const savedCheckDetail = document.querySelector('#saved-check-detail');
const compareResults = document.querySelector('#compare-results');
const loadChecksButton = document.querySelector('#load-saved-checks');
const priceGuidance = document.querySelector('#price-guidance');
const traceForm = document.querySelector('#trace-form');
const traceResult = document.querySelector('#trace-result');
const traceError = document.querySelector('#trace-error');
const traceHistory = document.querySelector('#trace-history');
const traceHistoryButton = document.querySelector('#load-trace-history');
const traceScanner = document.querySelector('#trace-scanner');
const traceCamera = document.querySelector('#trace-camera');
const traceScanStatus = document.querySelector('#trace-scan-status');
const sathiScreenshotInput = document.querySelector('#sathi-screenshot');
const readSathiScreenshotButton = document.querySelector('#read-sathi-result');
const sathiOcrProgress = document.querySelector('#sathi-ocr-progress');
const sathiOcrError = document.querySelector('#sathi-ocr-error');
const sathiOcrSuggestions = document.querySelector('#sathi-ocr-suggestions');
let ocrProgressTarget = 'packet';
const offlineStatus = document.querySelector('#offline-status');
const clearDraftsButton = document.querySelector('#clear-drafts');
const installAppButton = document.querySelector('#install-app');
const planForm = document.querySelector('#plan-form');
const planError = document.querySelector('#plan-error');
const planResult = document.querySelector('#plan-result');
const planHistory = document.querySelector('#plan-history');
const planHistoryButton = document.querySelector('#load-plans');
const germinationForm = document.querySelector('#germination-form');
const germinationError = document.querySelector('#germination-error');
const germinationResult = document.querySelector('#germination-result');
const germinationHistory = document.querySelector('#germination-history');
const germinationHistoryButton = document.querySelector('#load-germination-logs');
const concernForm = document.querySelector('#concern-form');
const concernError = document.querySelector('#concern-error');
const concernResult = document.querySelector('#concern-result');
const concernHistory = document.querySelector('#concern-history');
const concernHistoryButton = document.querySelector('#load-concern-records');
const testingState = document.querySelector('#testing-state');
const testingPathwayResults = document.querySelector('#testing-pathway-results');
const seedStandardForm = document.querySelector('#seed-standards-form');
const seedStandardReference = document.querySelector('#seed-standard-reference');
const seedStandardResult = document.querySelector('#seed-standard-result');
const seedStandardError = document.querySelector('#seed-standard-error');
const readAloudState = {button: null, utterance: null};

function attachReadAloud(container) {
  if (!container || !window.speechSynthesis || !('SpeechSynthesisUtterance' in window)) return;
  const tr = value => window.SeedGuardI18n?.translate(value) || value;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'history-toggle listen-result-button';
  button.textContent = tr('Listen to this result');
  button.addEventListener('click', () => {
    const synth = window.speechSynthesis;
    if (readAloudState.button === button && synth.speaking) {
      synth.cancel();
      readAloudState.button = null;
      button.textContent = tr('Listen to this result');
      return;
    }
    synth.cancel();
    if (readAloudState.button) readAloudState.button.textContent = tr('Listen to this result');
    const language = document.documentElement.lang.startsWith('hi') ? 'hi-IN' : 'en-IN';
    const voices = synth.getVoices();
    const voice = voices.find(item => item.lang.toLowerCase() === language.toLowerCase())
      || voices.find(item => item.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()));
    if (language === 'hi-IN' && voices.length && !voice) {
      let status = container.querySelector('.listen-result-status');
      if (!status) {
        status = document.createElement('span');
        status.className = 'listen-result-status';
        status.setAttribute('role', 'status');
        container.insertBefore(status, button.nextSibling);
      }
      status.textContent = tr('A Hindi voice is not available on this device. Add a Hindi voice in device settings.');
      return;
    }
    const readable = container.cloneNode(true);
    readable.querySelectorAll('button, a, .listen-result-status').forEach(element => element.remove());
    const utterance = new SpeechSynthesisUtterance(readable.innerText || readable.textContent || '');
    utterance.lang = language;
    if (voice) utterance.voice = voice;
    const reset = () => {
      if (readAloudState.button !== button) return;
      readAloudState.button = null;
      readAloudState.utterance = null;
      button.textContent = tr('Listen to this result');
    };
    utterance.onend = reset;
    utterance.onerror = reset;
    readAloudState.button = button;
    readAloudState.utterance = utterance;
    button.textContent = tr('Stop reading');
    synth.speak(utterance);
  });
  container.prepend(button);
}
let traceCameraStream = null;
let traceScanFrame = 0;
let deferredInstallPrompt = null;
const draftKeys = {seed: 'seedguard-seed-draft-v1', trace: 'seedguard-trace-draft-v1', plan: 'seedguard-plan-draft-v1', germination: 'seedguard-germination-draft-v1', concern: 'seedguard-concern-draft-v1', standards: 'seedguard-standards-draft-v1'};
const draftTimers = new Map();

function updateOfflineStatus(message) {
  offlineStatus.textContent = message || (navigator.onLine
    ? 'Online · packet, SATHI, sowing-plan, sample-log, and concern follow-up text auto-save on this device. Photos are not saved.'
    : 'Offline · text fields are saved on this device. Reconnect to calculate or run a check; photos are not saved.');
  offlineStatus.classList.toggle('is-offline', !navigator.onLine);
}

function formDraftValues(targetForm) {
  const data = new FormData(targetForm);
  const values = {};
  for (const field of targetForm.elements) {
    if (!field.name || ['file', 'button', 'submit', 'reset'].includes(field.type)) continue;
    if (field.type === 'checkbox') values[field.name] = data.getAll(field.name);
    else if (!(field.name in values)) values[field.name] = data.get(field.name) || '';
  }
  return values;
}

function persistDraft(targetForm, key) {
  try {
    localStorage.setItem(key, JSON.stringify({savedAt: new Date().toISOString(), values: formDraftValues(targetForm)}));
    updateOfflineStatus();
  } catch {
    updateOfflineStatus('This browser could not save a draft. Keep this page open until you finish.');
  }
}

function restoreDraft(targetForm, key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (!saved?.values || typeof saved.values !== 'object') return false;
    for (const [name, value] of Object.entries(saved.values)) {
      const matching = Array.from(targetForm.elements).filter(field => field.name === name);
      if (!matching.length) continue;
      if (matching.every(field => field.type === 'checkbox')) {
        matching.forEach(field => { field.checked = Array.isArray(value) && value.includes(field.value); });
      } else if (matching[0].type !== 'file') {
        matching[0].value = String(value ?? '');
      }
    }
    return true;
  } catch {
    return false;
  }
}

function scheduleDraftSave(targetForm, key) {
  clearTimeout(draftTimers.get(key));
  draftTimers.set(key, setTimeout(() => persistDraft(targetForm, key), 300));
}

function clearDraft(key) {
  clearTimeout(draftTimers.get(key));
  draftTimers.delete(key);
  try { localStorage.removeItem(key); } catch { /* Storage may be disabled by the browser. */ }
}

const restoredSeedDraft = restoreDraft(form, draftKeys.seed);
const restoredTraceDraft = restoreDraft(traceForm, draftKeys.trace);
const restoredPlanDraft = restoreDraft(planForm, draftKeys.plan);
const restoredGerminationDraft = restoreDraft(germinationForm, draftKeys.germination);
const restoredConcernDraft = restoreDraft(concernForm, draftKeys.concern);
const restoredStandardDraft = restoreDraft(seedStandardForm, draftKeys.standards);
const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
if (!germinationForm.elements.started_on.value) germinationForm.elements.started_on.value = localToday;
if (!germinationForm.elements.observed_on.value) germinationForm.elements.observed_on.value = localToday;
if (!concernForm.elements.observed_on.value) concernForm.elements.observed_on.value = localToday;
if (restoredSeedDraft || restoredTraceDraft || restoredPlanDraft || restoredGerminationDraft || restoredConcernDraft || restoredStandardDraft) updateOfflineStatus('Saved text details restored from this device. Review them before use; photos were not saved.');
else updateOfflineStatus();

for (const [targetForm, key] of [[form, draftKeys.seed], [traceForm, draftKeys.trace], [planForm, draftKeys.plan], [germinationForm, draftKeys.germination], [concernForm, draftKeys.concern], [seedStandardForm, draftKeys.standards]]) {
  targetForm.addEventListener('input', () => scheduleDraftSave(targetForm, key));
  targetForm.addEventListener('change', () => scheduleDraftSave(targetForm, key));
}
window.addEventListener('online', () => updateOfflineStatus());
window.addEventListener('offline', () => updateOfflineStatus());
clearDraftsButton.addEventListener('click', () => {
  clearDraft(draftKeys.seed);
  clearDraft(draftKeys.trace);
  clearDraft(draftKeys.plan);
  clearDraft(draftKeys.germination);
  clearDraft(draftKeys.concern);
  clearDraft(draftKeys.standards);
  updateOfflineStatus('Saved drafts cleared from this device. Current form values remain on screen.');
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('/sw.js').catch(error => console.warn('SeedGuard offline shell could not be installed:', error));
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installAppButton.hidden = false;
});
installAppButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  try {
    await deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
  } catch { /* The browser may dismiss or reject the install prompt. */ }
  deferredInstallPrompt = null;
  installAppButton.hidden = true;
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installAppButton.hidden = true;
});
let previewUrl = null;
let ocrWorkerPromise = null;
let priceCheckTimer = null;
let priceCheckController = null;

async function setFile(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
    errorEl.textContent = 'Choose a JPG, PNG or WebP image up to 8 MB.';
    clearPhoto();
    return;
  }
  errorEl.textContent = '';
  document.querySelector('#upload-title').textContent = file.name;
  document.querySelector('#upload-hint').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · ready to include`;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl;
  previewWrap.hidden = false;
  visualReview.hidden = false;
  visualReview.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
  ocrBox.hidden = false;
  document.querySelector('#ocr-error').hidden = true;
  document.querySelector('#ocr-suggestions').hidden = true;
  document.querySelector('#ocr-raw-wrap').hidden = true;
  await inspectPhoto(file);
}

function clearPhoto() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  previewImage.removeAttribute('src');
  fileInput.value = '';
  previewWrap.hidden = true;
  visualReview.hidden = true;
  visualReview.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
  ocrBox.hidden = true;
  document.querySelector('#upload-title').textContent = 'Add a clear packet photo';
  document.querySelector('#upload-hint').textContent = 'JPG, PNG or WebP · up to 8 MB';
  document.querySelector('#ocr-suggestions').hidden = true;
  document.querySelector('#ocr-raw-wrap').hidden = true;
  document.querySelector('#ocr-error').hidden = true;
}

async function inspectPhoto(file) {
  const status = document.querySelector('#quality-status');
  const title = document.querySelector('#quality-title');
  const detail = document.querySelector('#quality-detail');
  status.classList.remove('is-good', 'is-caution');
  title.textContent = 'Checking photo…';
  detail.textContent = 'Checking size, brightness and detail';
  try {
    await previewImage.decode();
    const {naturalWidth: width, naturalHeight: height} = previewImage;
    const canvas = document.createElement('canvas');
    const side = 96;
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext('2d', {willReadFrequently: true});
    context.drawImage(previewImage, 0, 0, side, side);
    const pixels = context.getImageData(0, 0, side, side).data;
    const luminance = new Float32Array(side * side);
    let sum = 0;
    for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
      luminance[p] = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      sum += luminance[p];
    }
    const mean = sum / luminance.length;
    let variance = 0;
    let edge = 0;
    let pairs = 0;
    for (let y = 0; y < side; y += 1) {
      for (let x = 0; x < side; x += 1) {
        const index = y * side + x;
        variance += (luminance[index] - mean) ** 2;
        if (x + 1 < side) { edge += Math.abs(luminance[index] - luminance[index + 1]); pairs += 1; }
        if (y + 1 < side) { edge += Math.abs(luminance[index] - luminance[index + side]); pairs += 1; }
      }
    }
    const contrast = Math.sqrt(variance / luminance.length);
    const detailLevel = edge / pairs;
    const issues = [];
    if (Math.min(width, height) < 520) issues.push('The image is small; a closer photo may help.');
    if (mean < 58) issues.push('The photo looks dark; try brighter light.');
    else if (mean > 224) issues.push('The photo looks washed out; avoid glare.');
    if (contrast < 22 || detailLevel < 4.2) issues.push('The label may lack contrast or detail; hold the camera steady and focus on the text.');
    if (issues.length) {
      status.classList.add('is-caution');
      title.textContent = 'Photo may be hard to read';
      detail.textContent = issues[0];
    } else {
      status.classList.add('is-good');
      title.textContent = 'Photo looks usable';
      detail.textContent = `${width} × ${height} px · automatic check only`;
    }
  } catch {
    status.classList.add('is-caution');
    title.textContent = 'Could not inspect this photo';
    detail.textContent = 'You can still continue or choose another image.';
  }
}

document.querySelector('#remove-photo').addEventListener('click', clearPhoto);

fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
for (const eventName of ['dragenter', 'dragover']) dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.add('dragging'); });
for (const eventName of ['dragleave', 'drop']) dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.remove('dragging'); });
dropZone.addEventListener('drop', event => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  setFile(file);
});

function updateOcrProgress(message) {
  const sathi = ocrProgressTarget === 'sathi';
  const progress = document.querySelector(sathi ? '#sathi-ocr-status' : '#ocr-status');
  const bar = document.querySelector(sathi ? '#sathi-ocr-progress-bar' : '#ocr-progress-bar');
  if (message.status) progress.textContent = message.status === 'recognizing text'
    ? (sathi ? 'Reading SATHI screenshot text…' : 'Reading packet text…')
    : 'Preparing English text recognition…';
  if (Number.isFinite(message.progress)) bar.style.width = `${Math.round(message.progress * 100)}%`;
}

function getOcrWorker() {
  if (!window.Tesseract) throw new Error('Text recognition did not load. Check your internet connection, then refresh and try again.');
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = window.Tesseract.createWorker('eng', 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
      logger: updateOcrProgress,
    });
    ocrWorkerPromise.catch(() => { ocrWorkerPromise = null; });
  }
  return ocrWorkerPromise;
}

function extractOcrSuggestions(text, confidence, ocrLines = []) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const suggestions = [];
  const lineConfidence = line => {
    const normalized = line.toLowerCase();
    const matched = ocrLines.find(item => item.text?.trim().toLowerCase() === normalized)
      || ocrLines.find(item => normalized.includes(item.text?.trim().toLowerCase()) || item.text?.trim().toLowerCase().includes(normalized));
    return Number.isFinite(matched?.confidence) ? matched.confidence : confidence;
  };
  const add = (name, value, certainty = confidence) => {
    const cleaned = value.replace(/^[\s:;#|–—-]+|[\s|]+$/g, '').replace(/\s{2,}/g, ' ').trim();
    if (cleaned && cleaned.length <= 140 && !suggestions.some(item => item.name === name)) {
      suggestions.push({name, value: cleaned, confidence: Math.max(5, Math.min(99, Math.round(certainty)))});
    }
  };
  const labeled = (pattern, name) => {
    const line = lines.find(item => pattern.test(item));
    if (line) add(name, line.replace(pattern, '').trim(), lineConfidence(line));
  };

  labeled(/^(?:brand|company|manufacturer|manufactured\s+by|marketed\s+by)\s*[:#-]?\s*/i, 'brand');
  labeled(/^(?:variety|var\.?|hybrid)\s*[:#-]?\s*/i, 'variety');

  const batchLine = lines.find(line => /\b(?:batch|lot)\s*(?:no\.?|number|#)?\s*[:#-]?\s*[A-Z0-9][A-Z0-9/-]{2,}/i.test(line));
  if (batchLine) {
    const match = batchLine.match(/\b(?:batch|lot)\s*(?:no\.?|number|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/-]{2,})/i);
    if (match) add('batch', match[1], lineConfidence(batchLine));
  }

  const datePattern = /\b(?:\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{1,2}[/.\-](?:19|20)?\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})\b/i;
  const extractDate = (name, pattern, labelPattern) => {
    const line = lines.find(item => pattern.test(item));
    if (!line) return;
    const match = line.match(datePattern);
    const value = match ? match[0] : line.replace(labelPattern, '').trim();
    add(name, value, lineConfidence(line));
  };
  extractDate('validity', /\b(?:valid(?:ity)?|expiry|expires?|use\s+before)\b/i, /.*?\b(?:valid(?:ity)?(?:\s+(?:up\s*to|upto|till))?|expiry|expires?|use\s+before)\s*[:#-]?\s*/i);
  extractDate('packed_on', /\b(?:packed\s+on|packing\s+date|date\s+packed)\b/i, /.*?\b(?:packed\s+on|packing\s+date|date\s+packed)\s*[:#-]?\s*/i);
  extractDate('test_date', /\b(?:test\s+date|date\s+of\s+test)\b/i, /.*?\b(?:test\s+date|date\s+of\s+test)\s*[:#-]?\s*/i);

  const weightLine = lines.find(line => /\b(?:net\s*(?:wt\.?|weight)|weight|contents|pack\s*size)\b/i.test(line)
    && /\b\d+(?:\.\d+)?\s*(?:kg|kgs|kilograms?|g|gm|gms|grams?)\b/i.test(line));
  if (weightLine) {
    const match = weightLine.match(/\b\d+(?:\.\d+)?\s*(?:kg|kgs|kilograms?|g|gm|gms|grams?)\b/i);
    if (match) add('weight', match[0], lineConfidence(weightLine));
  }

  const certificationLine = lines.find(line => /\b(?:certification|certified|cert\.?\s*(?:no\.?|number)|truthfully\s+label(?:led|ed)|icar|nsc|seed\s+certification)\b/i.test(line));
  if (certificationLine) add('certification', certificationLine, lineConfidence(certificationLine));

  const allText = text.toLowerCase();
  const crops = ['Mustard', 'Wheat', 'Bajra', 'Cotton', 'Tomato'];
  const detectedCrop = crops.find(crop => new RegExp(`\\b${crop.toLowerCase()}\\b`, 'i').test(allText));
  if (detectedCrop) {
    const cropLine = lines.find(line => new RegExp(`\\b${detectedCrop}\\b`, 'i').test(line));
    add('crop', detectedCrop, cropLine ? lineConfidence(cropLine) : confidence - 5);
  }
  return suggestions;
}

function renderOcrSuggestions(suggestions, confidence, rawText) {
  const panel = document.querySelector('#ocr-suggestions');
  const confidenceLabel = confidence >= 75 ? 'Good' : confidence >= 45 ? 'Moderate' : 'Low';
  if (!suggestions.length) {
    panel.innerHTML = `<div class="ocr-summary"><b>No labeled fields found</b><span>OCR confidence ${Math.round(confidence)}% · ${confidenceLabel.toLowerCase()} confidence</span></div><p class="ocr-empty">Review the recognized text below and enter any packet details manually.</p>`;
  } else {
    const labels = {brand: 'Brand / company', variety: 'Variety', batch: 'Batch / lot', validity: 'Validity date', packed_on: 'Packing date', test_date: 'Test date', weight: 'Net weight', certification: 'Certification text', crop: 'Crop'};
    panel.innerHTML = `<div class="ocr-summary"><b>Review suggested details</b><span>Overall OCR confidence ${Math.round(confidence)}% · ${confidenceLabel}</span></div><div class="suggestion-list">${suggestions.map(item => {
      const currentValue = form.elements[item.name]?.value || '';
      return `<div class="suggestion" data-name="${item.name}"><div class="suggestion-main"><small>${labels[item.name]}</small><b data-no-translate>${escapeHtml(item.value)}</b><span>Field OCR confidence: ${item.confidence}% · review before applying</span></div><button type="button" class="suggestion-use" data-value="${escapeHtml(item.value)}">${currentValue ? 'Replace' : 'Use'}</button></div>`;
    }).join('')}</div>`;
  }
  panel.hidden = false;
  document.querySelector('#ocr-raw').textContent = rawText || 'No text detected.';
  document.querySelector('#ocr-raw-wrap').hidden = false;
}

document.querySelector('#ocr-suggestions').addEventListener('click', event => {
  const button = event.target.closest('.suggestion-use');
  if (!button) return;
  const row = button.closest('.suggestion');
  const field = form.elements[row.dataset.name];
  if (!field) return;
  field.value = button.dataset.value;
  field.dispatchEvent(new Event('input', {bubbles: true}));
  field.dispatchEvent(new Event('change', {bubbles: true}));
  button.textContent = 'Added';
  button.disabled = true;
  row.classList.add('is-applied');
});

ocrButton.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const error = document.querySelector('#ocr-error');
  const panel = document.querySelector('#ocr-suggestions');
  const rawWrap = document.querySelector('#ocr-raw-wrap');
  error.hidden = true;
  panel.hidden = true;
  rawWrap.hidden = true;
  ocrProgress.hidden = false;
  document.querySelector('#ocr-status').textContent = 'Preparing text recognition…';
  document.querySelector('#ocr-progress-bar').style.width = '2%';
  ocrButton.disabled = true;
  ocrButton.textContent = 'Reading…';
  try {
    const worker = await getOcrWorker();
    const {data} = await worker.recognize(file);
    if (fileInput.files[0] !== file) return;
    const confidence = Number.isFinite(data.confidence) ? data.confidence : 0;
    renderOcrSuggestions(extractOcrSuggestions(data.text || '', confidence, data.lines || []), confidence, data.text || '');
    document.querySelector('#ocr-status').textContent = 'Text recognition complete. Review each suggestion before using it.';
    document.querySelector('#ocr-progress-bar').style.width = '100%';
  } catch (ocrFailure) {
    error.textContent = ocrFailure.message || 'Could not read this packet. Try a clearer photo or enter the details manually.';
    error.hidden = false;
  } finally {
    ocrButton.disabled = false;
    ocrButton.textContent = 'Read label';
  }
});

sathiScreenshotInput.addEventListener('change', () => {
  sathiOcrError.hidden = true;
  sathiOcrSuggestions.hidden = true;
  const file = sathiScreenshotInput.files[0];
  readSathiScreenshotButton.disabled = !file;
});

function renderSathiOcrSuggestions(suggestions, confidence, rawText) {
  const tr = value => window.SeedGuardI18n?.translate(value) || value;
  if (!suggestions.length) {
    sathiOcrSuggestions.innerHTML = `<div class="ocr-summary"><b>${escapeHtml(tr('No SATHI fields found'))}</b><span>${escapeHtml(tr('Overall OCR confidence'))} ${Math.round(confidence)}%</span></div><p class="ocr-empty">${escapeHtml(tr('Review the recognized text below and enter details manually.'))}</p>`;
  } else {
    sathiOcrSuggestions.innerHTML = `<div class="ocr-summary"><b>${escapeHtml(tr('Review SATHI suggestions'))}</b><span>${escapeHtml(tr('Overall OCR confidence'))} ${Math.round(confidence)}% · ${escapeHtml(tr('Check every value before applying'))}</span></div><div class="suggestion-list">${suggestions.map(item => {
      const currentValue = traceForm.elements[item.name]?.value || '';
      return `<div class="suggestion" data-name="${escapeHtml(item.name)}"><div class="suggestion-main"><small>${escapeHtml(tr(item.label))}</small><b data-no-translate>${escapeHtml(item.value)}</b><span>${escapeHtml(tr('Field OCR confidence'))}: ${item.confidence}% · ${escapeHtml(tr('Review before using'))}</span></div><button type="button" class="suggestion-use sathi-ocr-use" data-name="${escapeHtml(item.name)}" data-value="${escapeHtml(item.value)}">${escapeHtml(tr(currentValue ? 'Replace' : 'Use'))}</button></div>`;
    }).join('')}</div>`;
  }
  sathiOcrSuggestions.hidden = false;
  document.querySelector('#sathi-ocr-raw').textContent = rawText || 'No text detected.';
  document.querySelector('#sathi-ocr-raw-wrap').hidden = false;
}

sathiOcrSuggestions.addEventListener('click', event => {
  const button = event.target.closest('.sathi-ocr-use');
  if (!button) return;
  const field = traceForm.elements[button.dataset.name];
  if (!field) return;
  field.value = button.dataset.value;
  field.dispatchEvent(new Event('input', {bubbles: true}));
  field.dispatchEvent(new Event('change', {bubbles: true}));
  button.textContent = window.SeedGuardI18n?.translate('Added') || 'Added';
  button.disabled = true;
  button.closest('.suggestion')?.classList.add('is-applied');
});

readSathiScreenshotButton.addEventListener('click', async () => {
  const file = sathiScreenshotInput.files[0];
  if (!file) return;
  sathiOcrError.hidden = true;
  sathiOcrSuggestions.hidden = true;
  document.querySelector('#sathi-ocr-raw-wrap').hidden = true;
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type) || file.size > 8 * 1024 * 1024) {
    sathiOcrError.textContent = 'Choose a JPG, PNG or WebP screenshot up to 8 MB.';
    sathiOcrError.hidden = false;
    return;
  }
  sathiOcrProgress.hidden = false;
  document.querySelector('#sathi-ocr-progress-bar').style.width = '2%';
  document.querySelector('#sathi-ocr-status').textContent = 'Preparing English text recognition…';
  readSathiScreenshotButton.disabled = true;
  const oldButtonText = readSathiScreenshotButton.textContent;
  readSathiScreenshotButton.textContent = 'Reading…';
  ocrProgressTarget = 'sathi';
  try {
    const worker = await getOcrWorker();
    const {data} = await worker.recognize(file);
    if (sathiScreenshotInput.files[0] !== file) return;
    const confidence = Number.isFinite(data.confidence) ? data.confidence : 0;
    const rawText = data.text || '';
    const suggestions = window.SeedGuardSathiOcr?.extract(rawText, confidence, data.lines || []) || [];
    renderSathiOcrSuggestions(suggestions, confidence, rawText);
    document.querySelector('#sathi-ocr-status').textContent = 'Reading finished. Review each suggestion before using it.';
    document.querySelector('#sathi-ocr-progress-bar').style.width = '100%';
  } catch (ocrFailure) {
    sathiOcrError.textContent = ocrFailure.message || 'Could not read this screenshot. Try a clearer image or enter the details manually.';
    sathiOcrError.hidden = false;
  } finally {
    ocrProgressTarget = 'packet';
    readSathiScreenshotButton.disabled = !sathiScreenshotInput.files[0];
    readSathiScreenshotButton.textContent = oldButtonText;
  }
});

form.querySelectorAll('input, select').forEach(field => field.addEventListener('input', () => field.closest('.field')?.classList.remove('ocr-filled')));

const traceFieldNames = {crop: 'Crop', variety: 'Variety', lot: 'Lot number', tag: 'Tag number', producer: 'Producer / company'};
const traceQualityNames = {
  normal_germination: ['Normal germination', 'A recorded germination test result, not a guarantee of field emergence.'],
  weed_seed: ['Weed seed / purity', 'Interpret the unit and meaning as shown in the official record.'],
  other_crop_seed: ['Other crop seed / purity', 'Interpret the unit and meaning as shown in the official record.'],
  dead_seed: ['Dead seed', 'This recorded value alone does not predict field performance.'],
  hard_seed: ['Hard seed', 'Crop-specific interpretation may be needed.'],
  insect_damage: ['Insect damage', 'The value recorded during lot testing or inspection.'],
  abnormal_seed: ['Abnormal seed', 'The value recorded for this lot.'],
  diseased_seed: ['Diseased seed', 'The value recorded for this lot.'],
  nematode_galls: ['Nematode galls', 'The value recorded for this lot.'],
};
const packetFieldLinks = {p_crop: 'crop', p_variety: 'variety', p_lot: 'batch', p_producer: 'brand'};
for (const [traceName, seedName] of Object.entries(packetFieldLinks)) {
  const mainField = form.elements[seedName];
  const traceField = traceForm.elements[traceName];
  mainField?.addEventListener('input', () => { if (!traceField.value) traceField.value = mainField.value; });
}

function renderTraceResult(data) {
  const title = data.overall_status === 'match' ? 'Entered details match' : data.overall_status === 'mismatch' ? 'Some entered details differ' : 'Comparison is incomplete';
  const rows = data.fields.map(item => `<tr><th>${escapeHtml(traceFieldNames[item.field] || item.field)}</th><td>${escapeHtml(item.packet_value || '—')}</td><td>${escapeHtml(item.record_value || '—')}</td><td class="trace-status ${escapeHtml(item.status)}">${escapeHtml(item.status.replace('_', ' '))}</td></tr>`).join('');
  const qualityCards = (data.quality_details || []).map(item => `<article class="trace-quality-card"><b>${escapeHtml(item.field)}</b><strong>${escapeHtml(item.value)}</strong><p>${escapeHtml(item.explanation)}</p></article>`).join('');
  const savedAt = data.created_at ? `<p class="trace-summary">Saved ${escapeHtml(new Date(data.created_at).toLocaleString())}</p>` : '';
  const followUp = data.overall_status === 'mismatch' ? '<button class="history-toggle concern-prefill-button" type="button">Use these details in a follow-up record</button>' : '';
  traceResult.innerHTML = `${savedAt}<h3>${title}</h3><p class="trace-summary">${escapeHtml(data.note)}</p><table><thead><tr><th>Field</th><th>On packet</th><th>Entered SATHI record</th><th>Comparison</th></tr></thead><tbody>${rows}</tbody></table>${qualityCards ? `<h3>Quality details entered from SATHI</h3><div class="trace-quality-results">${qualityCards}</div>` : ''}<p class="trace-disclaimer">${escapeHtml(data.disclaimer)}</p><button class="history-toggle print-result-button" type="button">Print or save report</button>${followUp}`;
  traceResult.querySelector('.print-result-button').addEventListener('click', () => printSeedGuardReport(data, 'trace'));
  attachReadAloud(traceResult);
  traceResult.querySelector('.concern-prefill-button')?.addEventListener('click', () => {
    concernForm.elements.crop.value = data.packet?.crop || '';
    concernForm.elements.lot.value = data.packet?.lot || '';
    concernForm.elements.tag.value = data.packet?.tag || '';
    concernForm.elements.concern_type.value = 'sathi_difference';
    concernForm.elements.related_trace_check_id.value = data.id || '';
    for (const field of ['crop', 'lot', 'tag']) concernForm.elements[field].dispatchEvent(new Event('input', {bubbles: true}));
    concernForm.scrollIntoView({behavior: 'smooth', block: 'start'});
    concernForm.elements.notes.focus();
  });
  traceResult.hidden = false;
}

const concernTypeLabels = {
  sathi_difference: 'SATHI details differ from the packet',
  no_sathi_record: 'No SATHI record was returned',
  packet_label: 'Packet, seal, tag, or label concern',
  sample_observation: 'My small sample observation differs',
  other: 'Something else',
};
const concernEvidenceLabels = {
  packet: 'Packet kept', tag_photo: 'Tag / packet photos', receipt: 'Purchase receipt',
  sathi_result: 'SATHI result / screenshot', sample_notes: 'Sample observation notes',
};

function renderConcernRecord(data) {
  const evidence = (data.evidence || []).map(item => concernEvidenceLabels[item] || item);
  const rows = [
    ['Crop', data.crop], ['What you noticed', concernTypeLabels[data.concern_type] || data.concern_type],
    ['Date you noticed it', data.observed_on], ['Purchase date', data.purchase_date],
    ['Batch / lot number', data.lot], ['Tag number', data.tag], ['Seller / shop', data.seller],
    ['Receipt / bill number', data.receipt_reference], ['District', data.district],
    ['Linked SATHI comparison reference', data.related_trace_check_id],
    ['Evidence you have', evidence.join(', ')], ['What happened?', data.notes],
  ];
  const linkedCheckButton = data.related_trace_check_id ? '<button class="history-toggle linked-trace-button" type="button">Open linked SATHI comparison</button>' : '';
  concernResult.innerHTML = `<h3>Follow-up record saved</h3><p class="concern-result-meta">${escapeHtml(new Date(data.created_at).toLocaleString())} · ${escapeHtml(data.id.slice(0, 8))}</p><dl>${rows.filter(([, value]) => value).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><h4>Practical next steps</h4><ol>${(data.next_steps || []).map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol><p class="concern-result-note">${escapeHtml(data.note)}</p><button class="history-toggle print-result-button" type="button">Print or save this record</button>${linkedCheckButton}`;
  concernResult.hidden = false;
  attachReadAloud(concernResult);
  concernResult.querySelector('.print-result-button').addEventListener('click', () => printSeedGuardReport(data, 'concern'));
  concernResult.querySelector('.linked-trace-button')?.addEventListener('click', () => openTraceCheck(data.related_trace_check_id));
}

concernForm.addEventListener('submit', async event => {
  event.preventDefault();
  concernError.textContent = '';
  concernResult.hidden = true;
  const button = concernForm.querySelector('.concern-submit');
  button.disabled = true;
  button.querySelector('span').textContent = 'Saving record…';
  const values = Object.fromEntries(new FormData(concernForm).entries());
  const payload = {
    ...values,
    evidence: new FormData(concernForm).getAll('evidence'),
  };
  try {
    const response = await fetch('/api/concern-record', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not save this follow-up record.');
    clearDraft(draftKeys.concern);
    renderConcernRecord(data);
    if (!concernHistory.hidden) await loadConcernHistory(true);
    concernResult.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  } catch (error) {
    concernError.textContent = !navigator.onLine
      ? 'You are offline. Your draft remains on this device; reconnect to save this record.'
      : error.message || 'Could not reach SeedGuard. Check that the backend is running.';
  } finally {
    button.disabled = false;
    button.querySelector('span').textContent = 'Save follow-up record';
  }
});

async function loadConcernHistory(refresh = false) {
  concernHistoryButton.disabled = true;
  concernHistoryButton.textContent = 'Loading saved follow-up records…';
  try {
    const response = await fetch('/api/concern-records?limit=20');
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load saved follow-up records.');
    if (!data.records.length) concernHistory.innerHTML = '<p class="history-empty">No saved follow-up records yet.</p>';
    else concernHistory.innerHTML = `<div class="concern-history-items">${data.records.map(item => `<button class="concern-history-item" type="button" data-id="${escapeHtml(item.id)}"><span><b>${escapeHtml(item.crop)}${item.lot ? ` · lot ${escapeHtml(item.lot)}` : ''}</b><small>${escapeHtml(concernTypeLabels[item.concern_type] || item.concern_type)} · ${escapeHtml(item.observed_on)}</small></span><strong>Open</strong></button>`).join('')}</div>`;
    concernHistory.hidden = false;
    concernHistoryButton.textContent = refresh ? 'Refresh saved follow-up records' : 'Hide saved follow-up records';
    concernHistory.querySelectorAll('.concern-history-item').forEach(button => button.addEventListener('click', () => openConcernRecord(button.dataset.id)));
  } catch (error) {
    concernHistory.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load saved follow-up records.')}</p>`;
    concernHistory.hidden = false;
    concernHistoryButton.textContent = 'Retry saved follow-up records';
  } finally {
    concernHistoryButton.disabled = false;
  }
}

async function openConcernRecord(recordId) {
  concernResult.hidden = false;
  concernResult.innerHTML = '<p class="history-loading">Loading saved follow-up record…</p>';
  try {
    const response = await fetch(`/api/concern-records/${encodeURIComponent(recordId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load this record.');
    renderConcernRecord(data);
    concernResult.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  } catch (error) {
    concernResult.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load this record.')}</p>`;
  }
}

concernHistoryButton.addEventListener('click', () => {
  if (!concernHistory.hidden) { concernHistory.hidden = true; concernHistoryButton.textContent = 'Show saved follow-up records'; return; }
  loadConcernHistory();
});

function testingCenterCard(center) {
  const role = center.type === 'central' ? 'Central Seed Testing Laboratory' : 'Regional centre of the Central Seed Testing Laboratory';
  return `<article class="testing-center-card ${center.in_selected_state ? 'is-selected-state' : ''}"><div class="testing-center-meta">${escapeHtml(role)}${center.in_selected_state ? `<span>${escapeHtml(center.state)}</span>` : ''}</div><h4>${escapeHtml(center.name)}</h4><p><span>${escapeHtml(center.city)}</span>, <span>${escapeHtml(center.state)}</span></p><div class="testing-center-links"><a href="${escapeHtml(center.website)}" target="_blank" rel="noopener noreferrer">Open institution website ↗</a><a href="${escapeHtml(center.source_url)}" target="_blank" rel="noopener noreferrer">View Government notification ↗</a></div></article>`;
}

async function loadTestingPathways(state = testingState.value) {
  testingPathwayResults.innerHTML = '<p class="history-loading">Loading official testing routes…</p>';
  const query = state ? `?state=${encodeURIComponent(state)}` : '';
  try {
    const response = await fetch(`/api/testing-pathways${query}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load testing routes.');
    const tr = value => window.SeedGuardI18n?.translate(value) || value;
    const matching = data.centers.filter(center => center.in_selected_state);
    const matchingContent = !state
      ? '<p class="testing-state-prompt">Choose your state / UT to highlight a listed centre in that state.</p>'
      : matching.length
        ? `<p class="testing-match-note">This listed centre is in your selected state. It may not be the closest option and may not accept farmer service samples.</p><div class="testing-center-list">${matching.map(testingCenterCard).join('')}</div>`
        : '<p class="testing-state-prompt">No central or regional centre in this list matches your state. Ask your state seed authority for the nearest notified seed testing laboratory.</p>';
    const allCenters = `<details class="testing-all-centers"><summary>See all listed central and regional centres</summary><div class="testing-center-list">${data.centers.map(testingCenterCard).join('')}</div></details>`;
    const steps = data.preparation_steps.map(step => `<li>${escapeHtml(step)}</li>`).join('');
    testingPathwayResults.innerHTML = `<div class="testing-selected-result"><h3>${state ? `<span>${escapeHtml(tr('Testing route for'))}</span> <span>${escapeHtml(state)}</span>` : escapeHtml(tr('Choose a state to find an official route'))}</h3>${matchingContent}</div>${allCenters}<div class="testing-next-steps"><h3>Before you send a seed sample</h3><ol>${steps}</ol></div><div class="testing-official-links"><a href="${escapeHtml(data.state_contact_directory)}" target="_blank" rel="noopener noreferrer">Open SATHI state contact directory ↗</a><a href="${escapeHtml(data.notification_url)}" target="_blank" rel="noopener noreferrer">Read the Government notification ↗</a></div><p class="testing-source-note">${escapeHtml(data.note)}</p>`;
  } catch (error) {
    testingPathwayResults.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load official testing routes. Reconnect and try again.')}</p>`;
  }
}

testingState.addEventListener('change', () => loadTestingPathways());
loadTestingPathways();

const standardFieldLabels = {
  pure_seed_percent: 'Pure seed',
  inert_matter_percent: 'Inert matter',
  normal_germination_percent: 'Germination',
  moisture_percent: 'Moisture',
  other_crop_seeds_per_kg: 'Other crop seeds',
  weed_seeds_per_kg: 'Weed seeds',
};

function standardQuery() {
  const values = new FormData(seedStandardForm);
  return new URLSearchParams({crop: values.get('crop'), seed_type: values.get('seed_type'), seed_class: values.get('seed_class')});
}

function replaceSelectOptions(select, items, preferredValue) {
  const tr = value => window.SeedGuardI18n?.translate(value) || value;
  const values = items.map(item => item.value);
  const selected = values.includes(preferredValue) ? preferredValue : values[0];
  select.replaceChildren(...items.map(item => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = tr(item.label);
    option.selected = item.value === selected;
    return option;
  }));
}

async function updateSeedStandardChoices(changed = 'crop') {
  const cropSelect = seedStandardForm.elements.crop;
  const typeSelect = seedStandardForm.elements.seed_type;
  const classSelect = seedStandardForm.elements.seed_class;
  const previousType = typeSelect.value;
  const previousClass = classSelect.value;
  const response = await fetch('/api/seed-standard-options');
  const data = await response.json();
  if (!response.ok || !Array.isArray(data.crops)) throw new Error('Could not load supported crop options.');
  const crop = data.crops.find(item => item.value === cropSelect.value) || data.crops[0];
  if (!crop) throw new Error('No crop references are available.');
  replaceSelectOptions(cropSelect, data.crops, crop.value);
  const type = crop.types.find(item => item.value === (changed === 'crop' ? previousType : typeSelect.value)) || crop.types[0];
  replaceSelectOptions(typeSelect, crop.types, type.value);
  const activeType = crop.types.find(item => item.value === typeSelect.value);
  replaceSelectOptions(classSelect, activeType.classes, changed === 'crop' ? previousClass : classSelect.value);
}

function standardReferenceTable(data) {
  const tr = value => window.SeedGuardI18n?.translate(value) || value;
  const rows = data.metrics.map(metric => `<tr><th>${escapeHtml(tr(metric.label))}</th><td>${escapeHtml(tr(metric.threshold_display))}</td><td>${escapeHtml(tr(metric.meaning))}</td></tr>`).join('');
  return `<h3>${escapeHtml(tr(data.crop_label))} · ${escapeHtml(tr(data.seed_type_label))} · ${escapeHtml(tr(data.seed_class_label))}</h3><p>${escapeHtml(tr(data.source_title))} · ${escapeHtml(tr(data.source_section))}</p><table><thead><tr><th>${escapeHtml(tr('Measure'))}</th><th>${escapeHtml(tr('Published reference'))}</th><th>${escapeHtml(tr('What it means'))}</th></tr></thead><tbody>${rows}</tbody></table><p><a href="${escapeHtml(data.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tr('Open source manual ↗'))}</a></p>`;
}

async function loadSeedStandardReference() {
  seedStandardReference.innerHTML = '<p class="history-loading">Loading published reference values…</p>';
  try {
    const response = await fetch(`/api/seed-standards?${standardQuery()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not load this crop reference.');
    seedStandardReference.innerHTML = standardReferenceTable(data);
    seedStandardError.textContent = '';
  } catch (error) {
    seedStandardReference.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load reference values.')}</p>`;
  }
}

seedStandardForm.addEventListener('change', async event => {
  seedStandardResult.hidden = true;
  try {
    await updateSeedStandardChoices(event.target.name === 'seed_class' ? 'class' : event.target.name === 'seed_type' ? 'type' : 'crop');
    await loadSeedStandardReference();
  } catch (error) {
    seedStandardReference.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load crop options.')}</p>`;
  }
});
seedStandardForm.addEventListener('submit', async event => {
  event.preventDefault();
  seedStandardError.textContent = '';
  const button = seedStandardForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.querySelector('span').textContent = 'Comparing values…';
  const formValues = Object.fromEntries(new FormData(seedStandardForm).entries());
  const payload = {crop: formValues.crop, seed_type: formValues.seed_type, seed_class: formValues.seed_class};
  for (const key of Object.keys(standardFieldLabels)) payload[key] = formValues[key] === '' ? null : Number(formValues[key]);
  try {
    const response = await fetch('/api/seed-standard-check', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
    const data = await response.json();
    if (!response.ok) {
      const detail = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join(' ') : data.detail;
      throw new Error(detail || 'Could not compare these values.');
    }
    const tr = value => window.SeedGuardI18n?.translate(value) || value;
    const summary = data.overall_status === 'review_needed'
      ? 'One or more entered values are outside this published reference. Confirm the crop, seed class, units, and report with a qualified laboratory or certification agency.'
      : 'Each value you entered is within this published reference. This does not certify or authenticate the seed lot.';
    const rows = data.findings.map(item => {
      const entered = item.value == null ? '—' : `${item.value}${item.unit === '%' ? '%' : ` ${item.unit}`}`;
      const statusText = {within_reference: 'Within reference', below_reference: 'Below minimum', above_reference: 'Above maximum', not_entered: 'No value entered'}[item.status];
      return `<tr><th>${escapeHtml(tr(item.label))}</th><td>${escapeHtml(entered)}</td><td>${escapeHtml(tr(item.threshold_display))}</td><td><span class="seed-standard-status ${item.status}">${escapeHtml(tr(statusText))}</span></td></tr>`;
    }).join('');
    seedStandardResult.innerHTML = `<h3>${escapeHtml(tr(data.crop_label))} · ${escapeHtml(tr(data.seed_type_label))} · ${escapeHtml(tr(data.seed_class_label))}</h3><p class="seed-standard-summary">${escapeHtml(tr(summary))}</p><table><thead><tr><th>${escapeHtml(tr('Measure'))}</th><th>${escapeHtml(tr('Reported value'))}</th><th>${escapeHtml(tr('Published reference'))}</th><th>${escapeHtml(tr('Comparison'))}</th></tr></thead><tbody>${rows}</tbody></table><p class="seed-standard-summary">${escapeHtml(tr(data.note))}</p>`;
    attachReadAloud(seedStandardResult);
    seedStandardResult.hidden = false;
  } catch (error) {
    seedStandardError.textContent = error.message || 'Could not compare these values. Reconnect and try again.';
  } finally {
    button.disabled = false;
    button.querySelector('span').textContent = 'Compare report values';
  }
});
updateSeedStandardChoices().then(loadSeedStandardReference).catch(error => {
  seedStandardReference.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load crop options.')}</p>`;
});

function stopTraceScanner() {
  if (traceScanFrame) cancelAnimationFrame(traceScanFrame);
  traceScanFrame = 0;
  traceCameraStream?.getTracks().forEach(track => track.stop());
  traceCameraStream = null;
  traceCamera.srcObject = null;
  traceScanner.hidden = true;
}

function applyScannedPacketCode(rawValue) {
  const extracted = {};
  const addPair = (key, value) => {
    const normalized = String(key).toLowerCase().replace(/[^a-z]/g, '');
    if (!value) return;
    if (normalized.includes('lot') && !extracted.lot) extracted.lot = String(value).trim();
    if ((normalized.includes('tag') || normalized.includes('certificationnumber')) && !extracted.tag) extracted.tag = String(value).trim();
  };
  try {
    if (/^https?:\/\//i.test(rawValue)) {
      const url = new URL(rawValue);
      url.searchParams.forEach((value, key) => addPair(key, value));
    } else {
      const json = JSON.parse(rawValue);
      if (json && typeof json === 'object' && !Array.isArray(json)) Object.entries(json).forEach(([key, value]) => addPair(key, value));
    }
  } catch { /* Plain-text codes are treated as a tag identifier below. */ }
  if (!extracted.tag && !extracted.lot) extracted.tag = rawValue.trim();
  if (extracted.tag) traceForm.elements.p_tag.value = extracted.tag;
  if (extracted.lot) traceForm.elements.p_lot.value = extracted.lot;
  traceScanStatus.textContent = 'Code read. Check the filled values against the packet before comparing.';
  stopTraceScanner();
}

async function startTraceScanner() {
  if (!('BarcodeDetector' in window)) {
    traceScanner.hidden = false;
    traceScanStatus.textContent = 'Code scanning is not supported in this browser. Enter the tag and lot numbers manually.';
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    traceScanner.hidden = false;
    traceScanStatus.textContent = 'Camera access is unavailable. Enter the tag and lot numbers manually.';
    return;
  }
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = supported.filter(format => ['qr_code', 'code_128', 'code_39', 'data_matrix', 'pdf417', 'ean_13', 'ean_8'].includes(format));
    if (!formats.length) throw new Error('This browser cannot scan common packet codes. Enter the tag and lot numbers manually.');
    const detector = new window.BarcodeDetector({formats});
    traceScanner.hidden = false;
    traceScanStatus.textContent = 'Allow camera access and hold the packet code in view.';
    traceCameraStream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: 'environment'}}, audio: false});
    traceCamera.srcObject = traceCameraStream;
    await traceCamera.play();
    const scanFrame = async () => {
      if (!traceCameraStream) return;
      try {
        const codes = await detector.detect(traceCamera);
        if (codes[0]?.rawValue) { applyScannedPacketCode(codes[0].rawValue); return; }
      } catch { /* Keep scanning; a transient frame can be undecodable. */ }
      traceScanFrame = requestAnimationFrame(scanFrame);
    };
    traceScanFrame = requestAnimationFrame(scanFrame);
  } catch (error) {
    stopTraceScanner();
    traceScanner.hidden = false;
    traceScanStatus.textContent = error.name === 'NotAllowedError'
      ? 'Camera permission was not granted. Enter the tag and lot numbers manually.'
      : error.message || 'Could not start the camera. Enter the tag and lot numbers manually.';
  }
}

document.querySelector('#open-trace-scanner').addEventListener('click', startTraceScanner);
document.querySelector('#close-trace-scanner').addEventListener('click', stopTraceScanner);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopTraceScanner(); });

traceForm.addEventListener('submit', async event => {
  event.preventDefault();
  traceError.textContent = '';
  traceResult.hidden = true;
  const button = traceForm.querySelector('.trace-submit');
  button.disabled = true;
  button.textContent = 'Comparing details…';
  const values = Object.fromEntries(new FormData(traceForm).entries());
  const packet = Object.fromEntries(Object.keys(traceFieldNames).map(key => [key, values[`p_${key}`] || '']));
  const official_record = Object.fromEntries(Object.keys(traceFieldNames).map(key => [key, values[`r_${key}`] || '']));
  const quality_details = Object.fromEntries(Object.keys(traceQualityNames).map(key => [key, values[`q_${key}`] || '']).filter(([, value]) => value.trim()));
  try {
    const response = await fetch('/api/trace-compare', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({packet, official_record, quality_details}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not compare those details.');
    clearDraft(draftKeys.trace);
    renderTraceResult(data);
    traceResult.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    loadTraceHistory();
  } catch (error) {
    traceError.textContent = !navigator.onLine
      ? 'You are offline. The SATHI and packet text remains saved on this device; reconnect to compare.'
      : error.message || 'Could not reach SeedGuard. Check that the backend is running.';
  } finally {
    button.disabled = false;
    button.textContent = 'Compare details';
  }
});

async function loadTraceHistory() {
  traceHistoryButton.disabled = true;
  traceHistoryButton.textContent = 'Loading saved checks…';
  try {
    const response = await fetch('/api/trace-checks?limit=20');
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load saved SATHI checks.');
    if (!data.checks.length) {
      traceHistory.innerHTML = '<p class="history-empty">No saved SATHI checks yet.</p>';
    } else {
      const statusLabels = {match: 'Match', mismatch: 'Differences found', incomplete: 'Incomplete'};
      traceHistory.innerHTML = `<div class="trace-history-items">${data.checks.map(item => `<button class="trace-history-item" type="button" data-id="${escapeHtml(item.id)}"><span><b>${escapeHtml(item.crop || 'Seed check')}${item.variety ? ` · ${escapeHtml(item.variety)}` : ''}</b><small>${item.lot ? `Lot ${escapeHtml(item.lot)} · ` : ''}${escapeHtml(new Date(item.created_at).toLocaleString())}</small></span><strong class="trace-status ${escapeHtml(item.overall_status)}">${statusLabels[item.overall_status]}</strong></button>`).join('')}</div>`;
      traceHistory.querySelectorAll('.trace-history-item').forEach(item => item.addEventListener('click', () => openTraceCheck(item.dataset.id)));
    }
    traceHistory.hidden = false;
    traceHistoryButton.textContent = 'Refresh saved SATHI checks';
  } catch (error) {
    traceHistory.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load saved SATHI checks.')}</p>`;
    traceHistory.hidden = false;
    traceHistoryButton.textContent = 'Retry saved SATHI checks';
  } finally {
    traceHistoryButton.disabled = false;
  }
}

async function openTraceCheck(checkId) {
  traceResult.hidden = false;
  traceResult.innerHTML = '<p class="history-loading">Loading saved SATHI check…</p>';
  try {
    const response = await fetch(`/api/trace-checks/${encodeURIComponent(checkId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load this SATHI check.');
    renderTraceResult(data);
    traceResult.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  } catch (error) {
    traceResult.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load this SATHI check.')}</p>`;
  }
}

traceHistoryButton.addEventListener('click', () => {
  if (!traceHistory.hidden) { traceHistory.hidden = true; traceHistoryButton.textContent = 'Show saved SATHI checks'; return; }
  loadTraceHistory();
});

function formatRupees(value) {
  return new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 2}).format(value);
}

function formatKg(value) {
  return `${new Intl.NumberFormat('en-IN', {maximumFractionDigits: 3}).format(value)} kg`;
}

function renderSowingPlan(data) {
  const rateUnit = data.rate_unit === 'kg_per_hectare' ? 'kg per hectare' : 'kg per acre';
  const areaUnit = data.area_unit === 'hectares' ? 'hectares' : 'acres';
  const cropLabel = `${escapeHtml(data.crop)}${data.variety ? ` · ${escapeHtml(data.variety)}` : ''}`;
  const savedLabel = data.saved ? 'Saved to your SeedGuard history.' : 'This calculation was not saved.';
  planResult.innerHTML = `<h3>${cropLabel} · sowing plan</h3><p class="plan-summary">For ${escapeHtml(data.area)} ${areaUnit}, using your entered rate of ${escapeHtml(data.seed_rate_kg)} ${rateUnit}. ${savedLabel}</p><div class="plan-result-grid"><article class="plan-result-card"><span>Seed needed from your rate</span><strong>${formatKg(data.seed_needed_kg)}</strong></article><article class="plan-result-card"><span>Whole packs to buy</span><strong>${data.packs_to_buy}</strong></article><article class="plan-result-card"><span>Estimated total</span><strong>${formatRupees(data.estimated_total)}</strong></article><article class="plan-result-card"><span>Extra after whole packs</span><strong>${formatKg(data.surplus_kg)}</strong></article></div><p class="plan-result-note">${escapeHtml(data.note)} One pack is ${escapeHtml(data.pack_weight_kg)} kg at ${formatRupees(data.price_per_pack)}.</p>`;
  planResult.hidden = false;
  attachReadAloud(planResult);
}

planForm.addEventListener('submit', async event => {
  event.preventDefault();
  planError.textContent = '';
  planResult.hidden = true;
  if (!navigator.onLine) {
    planError.textContent = 'Reconnect to calculate this plan. Your entered details remain saved on this device.';
    return;
  }
  const submit = planForm.querySelector('button[type="submit"]');
  const label = submit.querySelector('span:first-child');
  submit.disabled = true;
  label.textContent = 'Calculating…';
  const values = Object.fromEntries(new FormData(planForm).entries());
  const payload = {
    crop: values.crop.trim(), variety: values.variety.trim(),
    area: Number(values.area), area_unit: values.area_unit,
    seed_rate_kg: Number(values.seed_rate_kg), rate_unit: values.rate_unit,
    pack_weight_kg: Number(values.pack_weight_kg), price_per_pack: Number(values.price_per_pack),
    save: planForm.elements.save.checked,
  };
  try {
    const response = await fetch('/api/sowing-plan', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(Array.isArray(data.detail) ? 'Check the area, rate, pack weight, and price values.' : data.detail || 'Could not calculate this plan.');
    clearDraft(draftKeys.plan);
    renderSowingPlan(data);
    if (data.saved && !planHistory.hidden) await loadSowingPlans(true);
    planResult.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  } catch (error) {
    planError.textContent = !navigator.onLine ? 'Connection was lost. Your text details are saved on this device.' : error.message || 'Could not reach SeedGuard. Check that the backend is running.';
  } finally {
    submit.disabled = false;
    label.textContent = 'Calculate seed and budget';
  }
});

planHistoryButton.addEventListener('click', () => {
  if (!planHistory.hidden) { planHistory.hidden = true; planHistoryButton.textContent = 'Show saved sowing plans'; return; }
  loadSowingPlans();
});

async function loadSowingPlans(refresh = false) {
  planHistoryButton.disabled = true;
  planHistoryButton.textContent = 'Loading saved plans…';
  try {
    const response = await fetch('/api/sowing-plans?limit=20');
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load saved plans.');
    if (!data.plans.length) planHistory.innerHTML = '<p class="history-empty">No saved sowing plans yet.</p>';
    else planHistory.innerHTML = `<div class="plan-history-list">${data.plans.map(item => {
      const when = new Date(item.created_at);
      const date = Number.isNaN(when.getTime()) ? '' : when.toLocaleString();
      return `<div class="plan-history-item"><span><b>${escapeHtml(item.crop)}${item.variety ? ` · ${escapeHtml(item.variety)}` : ''}</b><small>${escapeHtml(formatKg(item.seed_needed_kg))} needed · ${item.packs_to_buy} packs${date ? ` · ${escapeHtml(date)}` : ''}</small></span><strong>${escapeHtml(formatRupees(item.estimated_total))}</strong></div>`;
    }).join('')}</div>`;
    planHistory.hidden = false;
    planHistoryButton.textContent = refresh ? 'Refresh saved sowing plans' : 'Hide saved sowing plans';
  } catch (error) {
    planHistory.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load saved plans.')}</p>`;
    planHistory.hidden = false;
    planHistoryButton.textContent = 'Retry saved sowing plans';
  } finally {
    planHistoryButton.disabled = false;
  }
}

function renderGerminationObservation(data) {
  const cropLabel = `${escapeHtml(data.crop)}${data.variety ? ` · ${escapeHtml(data.variety)}` : ''}`;
  const differenceText = data.difference_points == null ? '' : data.difference_points === 0
    ? 'Same as packet statement'
    : `${Math.abs(data.difference_points)} percentage points ${data.difference_points < 0 ? 'lower' : 'higher'}`;
  const difference = data.difference_points == null
    ? ''
    : `<article class="germination-result-card"><span>Difference from packet statement</span><strong>${escapeHtml(differenceText)}</strong></article>`;
  const saved = data.saved ? 'Saved in SeedGuard history.' : 'This observation was not saved.';
  const methodLabels = {paper_towel: 'Paper towel / tissue', jute: 'Jute / gunny cloth', cloth: 'Other clean cloth', other: 'Other'};
  germinationResult.innerHTML = `<h3>${cropLabel} · sample observation</h3><p class="germination-summary">${escapeHtml(saved)} Started ${escapeHtml(data.started_on)} · counted ${escapeHtml(data.observed_on)}${data.lot ? ` · lot ${escapeHtml(data.lot)}` : ''}</p><div class="germination-result-grid"><article class="germination-result-card"><span>Observed in this sample</span><strong>${escapeHtml(data.observed_percent)}%</strong></article><article class="germination-result-card"><span>Normal seedlings counted</span><strong>${escapeHtml(data.normal_seedlings_count)} / ${escapeHtml(data.sample_count)}</strong></article>${difference}</div><p class="germination-result-note"><span>Method</span>: ${escapeHtml(methodLabels[data.method] || data.method)}${data.label_germination_percent == null ? '' : ` · <span>Packet statement</span>: ${escapeHtml(data.label_germination_percent)}%`}${data.notes ? ` · <span>Notes</span>: <span data-no-translate>${escapeHtml(data.notes)}</span>` : ''}<br>${escapeHtml(data.note)}</p><button class="history-toggle print-result-button" type="button">Print or save report</button>`;
  germinationResult.hidden = false;
  germinationResult.querySelector('.print-result-button').addEventListener('click', () => printSeedGuardReport(data, 'germination'));
  attachReadAloud(germinationResult);
}

germinationForm.addEventListener('submit', async event => {
  event.preventDefault();
  germinationError.textContent = '';
  germinationResult.hidden = true;
  if (!navigator.onLine) {
    germinationError.textContent = 'Reconnect to calculate this observation. Your entered details remain saved on this device.';
    return;
  }
  const submit = germinationForm.querySelector('button[type="submit"]');
  const label = submit.querySelector('span:first-child');
  submit.disabled = true;
  label.textContent = 'Calculating…';
  const values = Object.fromEntries(new FormData(germinationForm).entries());
  const payload = {
    crop: values.crop.trim(), variety: values.variety.trim(), lot: values.lot.trim(),
    sample_count: Number(values.sample_count), normal_seedlings_count: Number(values.normal_seedlings_count),
    label_germination_percent: values.label_germination_percent === '' ? null : Number(values.label_germination_percent),
    started_on: values.started_on, observed_on: values.observed_on,
    method: values.method, notes: values.notes.trim(), save: germinationForm.elements.save.checked,
  };
  if (payload.normal_seedlings_count > payload.sample_count) {
    germinationError.textContent = 'Normal seedlings counted cannot exceed the sample size.';
    submit.disabled = false;
    label.textContent = 'Calculate sample observation';
    return;
  }
  if (payload.observed_on < payload.started_on) {
    germinationError.textContent = 'The count date cannot be before the start date.';
    submit.disabled = false;
    label.textContent = 'Calculate sample observation';
    return;
  }
  try {
    const response = await fetch('/api/germination-log', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      const errors = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join(' ') : data.detail;
      throw new Error(errors || 'Could not calculate this observation.');
    }
    clearDraft(draftKeys.germination);
    renderGerminationObservation(data);
    if (data.saved && !germinationHistory.hidden) await loadGerminationLogs(true);
    germinationResult.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  } catch (error) {
    germinationError.textContent = !navigator.onLine
      ? 'Connection was lost. Your text details are saved on this device.'
      : error.message || 'Could not reach SeedGuard. Check that the backend is running.';
  } finally {
    submit.disabled = false;
    label.textContent = 'Calculate sample observation';
  }
});

germinationHistoryButton.addEventListener('click', () => {
  if (!germinationHistory.hidden) { germinationHistory.hidden = true; germinationHistoryButton.textContent = 'Show saved sample observations'; return; }
  loadGerminationLogs();
});

async function loadGerminationLogs(refresh = false) {
  germinationHistoryButton.disabled = true;
  germinationHistoryButton.textContent = 'Loading saved observations…';
  try {
    const response = await fetch('/api/germination-logs?limit=20');
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load saved observations.');
    if (!data.logs.length) germinationHistory.innerHTML = '<p class="history-empty">No saved sample observations yet.</p>';
    else germinationHistory.innerHTML = `<div class="germination-history-list">${data.logs.map(item => {
      const label = `${item.crop}${item.variety ? ` · ${item.variety}` : ''}${item.lot ? ` · Lot ${item.lot}` : ''}`;
      return `<button class="germination-history-item" type="button" data-id="${escapeHtml(item.id)}"><span><b>${escapeHtml(label)}</b><small>${escapeHtml(item.sample_count)} seeds · counted ${escapeHtml(item.observed_on)}</small></span><strong>${escapeHtml(item.observed_percent)}%</strong></button>`;
    }).join('')}</div>`;
    germinationHistory.hidden = false;
    germinationHistoryButton.textContent = refresh ? 'Refresh saved observations' : 'Hide saved sample observations';
    germinationHistory.querySelectorAll('.germination-history-item').forEach(button => button.addEventListener('click', () => openGerminationLog(button.dataset.id)));
  } catch (error) {
    germinationHistory.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load saved observations.')}</p>`;
    germinationHistory.hidden = false;
    germinationHistoryButton.textContent = 'Retry saved observations';
  } finally {
    germinationHistoryButton.disabled = false;
  }
}

async function openGerminationLog(logId) {
  germinationResult.hidden = false;
  germinationResult.innerHTML = '<p class="history-loading">Loading saved observation…</p>';
  try {
    const response = await fetch(`/api/germination-logs/${encodeURIComponent(logId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load this observation.');
    renderGerminationObservation(data);
    germinationResult.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  } catch (error) {
    germinationResult.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load this observation.')}</p>`;
  }
}

async function fetchPriceGuidance() {
  const crop = form.elements.crop.value;
  const price = Number(form.elements.price.value);
  if (!crop || !Number.isFinite(price) || price <= 0) {
    priceGuidance.hidden = true;
    priceGuidance.textContent = '';
    return;
  }
  if (priceCheckController) priceCheckController.abort();
  priceCheckController = new AbortController();
  priceGuidance.hidden = false;
  priceGuidance.className = 'price-guidance';
  priceGuidance.textContent = 'Checking configured range…';
  try {
    const params = new URLSearchParams({crop, price: String(price)});
    const response = await fetch(`/api/price-check?${params}`, {signal: priceCheckController.signal});
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Price range is unavailable.');
    const range = `${formatRupees(data.reference_range.min)}–${formatRupees(data.reference_range.max)} per pack`;
    const difference = data.within_reference_range
      ? 'Price is within this demo range.'
      : `${formatRupees(Math.abs(data.difference_from_range))} (${Math.abs(data.difference_percent)}%) ${data.difference_from_range < 0 ? 'below' : 'above'} the nearest edge.`;
    priceGuidance.classList.add(data.within_reference_range ? 'is-in-range' : 'is-out-of-range');
    priceGuidance.textContent = `Demo reference: ${range}. ${difference} Pack sizes and local prices vary.`;
  } catch (error) {
    if (error.name === 'AbortError') return;
    priceGuidance.textContent = error.message || 'Price range is unavailable.';
    priceGuidance.classList.add('is-out-of-range');
  }
}

function schedulePriceGuidance() {
  clearTimeout(priceCheckTimer);
  priceCheckTimer = setTimeout(fetchPriceGuidance, 220);
}

form.elements.crop.addEventListener('change', schedulePriceGuidance);
form.elements.price.addEventListener('input', schedulePriceGuidance);
form.elements.crop.addEventListener('change', () => {
  if (!planForm.elements.crop.value && form.elements.crop.value) {
    planForm.elements.crop.value = form.elements.crop.value;
    scheduleDraftSave(planForm, draftKeys.plan);
  }
});
for (const [source, target] of [[form.elements.crop, germinationForm.elements.crop], [form.elements.variety, germinationForm.elements.variety], [form.elements.batch, germinationForm.elements.lot]]) {
  const prefill = () => {
    if (!target.value && source.value) {
      target.value = source.value;
      scheduleDraftSave(germinationForm, draftKeys.germination);
    }
  };
  source.addEventListener('input', prefill);
  source.addEventListener('change', prefill);
}
if (restoredSeedDraft) schedulePriceGuidance();
loadChecksButton.addEventListener('click', () => loadHistory(Boolean(savedChecksList.querySelector('.history-error'))));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function printSeedGuardReport(data, kind) {
  const report = document.querySelector('#print-report');
  const tr = value => window.SeedGuardI18n?.translate(value) || value;
  const fieldRow = (label, value) => value ? `<div><dt>${escapeHtml(tr(label))}</dt><dd>${escapeHtml(value)}</dd></div>` : '';
  const rows = [];
  let title;
  let subtitle;
  let sections;
  let disclaimer;
  if (kind === 'concern') {
    title = tr('Seed concern follow-up record');
    subtitle = `${data.crop}${data.lot ? ` · ${tr('Lot')} ${data.lot}` : ''}`;
    const evidence = (data.evidence || []).map(item => tr(concernEvidenceLabels[item] || item)).join('; ');
    sections = `<section class="print-section"><h2>${escapeHtml(tr('What you recorded'))}</h2><dl>${fieldRow('Crop', data.crop)}${fieldRow('Concern', tr(concernTypeLabels[data.concern_type] || data.concern_type))}${fieldRow('Date noticed', data.observed_on)}${fieldRow('Purchase date', data.purchase_date)}${fieldRow('Batch / lot number', data.lot)}${fieldRow('Tag number', data.tag)}${fieldRow('Seller / shop', data.seller)}${fieldRow('Receipt / bill number', data.receipt_reference)}${fieldRow('District', data.district)}${fieldRow('Evidence you already have', evidence)}${fieldRow('What happened?', data.notes)}</dl></section><section class="print-section"><h2>${escapeHtml(tr('Practical next steps'))}</h2><ol>${(data.next_steps || []).map(step => `<li>${escapeHtml(tr(step))}</li>`).join('')}</ol></section>`;
    disclaimer = tr(data.note);
  } else if (kind === 'trace') {
    title = tr('SATHI record comparison');
    subtitle = tr('Values entered manually by the farmer');
    sections = `<section class="print-section"><h2>${escapeHtml(tr('Packet and SATHI details'))}</h2><table><thead><tr><th>${escapeHtml(tr('Field'))}</th><th>${escapeHtml(tr('On packet'))}</th><th>${escapeHtml(tr('Entered SATHI record'))}</th><th>${escapeHtml(tr('Comparison'))}</th></tr></thead><tbody>${(data.fields || []).map(item => `<tr><th>${escapeHtml(tr(traceFieldNames[item.field] || item.field))}</th><td>${escapeHtml(item.packet_value || '—')}</td><td>${escapeHtml(item.record_value || '—')}</td><td>${escapeHtml(tr(item.status.replace('_', ' ')))}</td></tr>`).join('')}</tbody></table></section>${data.quality_details?.length ? `<section class="print-section"><h2>${escapeHtml(tr('Quality details entered from SATHI'))}</h2><dl>${data.quality_details.map(item => fieldRow(item.field, item.value)).join('')}</dl></section>` : ''}<section class="print-section"><h2>${escapeHtml(tr('What this comparison means'))}</h2><dl>${fieldRow('Comparison result', tr(data.overall_status))}${fieldRow('Note', tr(data.note))}</dl></section>`;
    disclaimer = `${tr(data.disclaimer)} ${tr('SeedGuard does not fetch or authenticate SATHI records automatically.')}`;
  } else if (kind === 'germination') {
    title = tr('Farmer seed-sample observation');
    subtitle = `${data.crop}${data.variety ? ` · ${data.variety}` : ''}`;
    const method = tr(({paper_towel: 'Paper towel / tissue', jute: 'Jute / gunny cloth', cloth: 'Other clean cloth', other: 'Other'})[data.method] || data.method);
    sections = `<section class="print-section"><h2>${escapeHtml(tr('Your sample record'))}</h2><dl>${fieldRow('Crop', data.crop)}${fieldRow('Variety', data.variety)}${fieldRow('Batch / lot number', data.lot)}${fieldRow('Seeds in your sample', data.sample_count)}${fieldRow('Normal seedlings counted', data.normal_seedlings_count)}${fieldRow('Observed in this sample', `${data.observed_percent}%`)}${data.label_germination_percent == null ? '' : fieldRow('Packet germination statement', `${data.label_germination_percent}%`)}${data.difference_points == null ? '' : fieldRow('Difference from packet statement', data.difference_points === 0 ? tr('Same as packet statement') : `${Math.abs(data.difference_points)} percentage points ${tr(data.difference_points < 0 ? 'lower' : 'higher')}`)}${fieldRow('Method', method)}${fieldRow('Sample started', data.started_on)}${fieldRow('Counted on', data.observed_on)}${fieldRow('Notes', data.notes)}</dl></section>`;
    disclaimer = tr(data.note);
  } else {
    title = tr('Seed packet review');
    subtitle = `${data.crop} · ${tr(data.verdict)}`;
    const fields = data.fields || {};
    const labels = {variety: 'Variety', brand: 'Brand / company', batch: 'Batch / lot number', validity: 'Validity / test date', packed_on: 'Packing date', test_date: 'Test date', weight: 'Net weight', certification: 'Certification text'};
    const labelRows = Object.entries(labels).map(([key, label]) => fieldRow(label, fields[key])).join('');
    const visualLabels = (fields.visual_flags || '').split('|').filter(Boolean).map(flag => ({package_damage: 'Packet looks torn, open, or resealed', label_damage: 'Label looks altered, damaged, or incomplete', seed_condition: 'Seeds appear discolored, moldy, damaged, or mixed with debris'}[flag] || flag));
    sections = `<section class="print-section"><h2>${escapeHtml(tr('Purchase and label details'))}</h2><dl>${fieldRow('Crop', data.crop)}${fieldRow('Risk indicator score', `${data.score}/100 · ${tr(data.verdict)}`)}${fieldRow('Price per pack', formatRupees(data.price))}${fieldRow('Quantity', `${data.quantity} kg`)}${fieldRow('Source', tr(({known_retailer: 'Known retailer / cooperative', local_seller: 'Local seller', unknown: 'I don’t know the source'})[data.source_type] || data.source_type))}${labelRows}${visualLabels.length ? fieldRow('Farmer visual observations', visualLabels.map(tr).join('; ')) : ''}</dl></section><section class="print-section"><h2>${escapeHtml(tr('What we noticed'))}</h2><dl>${(data.reasons || []).map(reason => fieldRow(reason.title, reason.detail)).join('')}</dl></section><section class="print-section"><h2>${escapeHtml(tr('What you can do next'))}</h2><ol>${(data.actions || []).map(action => `<li>${escapeHtml(tr(action))}</li>`).join('')}</ol></section>`;
    disclaimer = `${data.disclaimer || ''} ${tr('Price ranges are demo configuration and may not reflect local market prices.')}`;
  }
  const createdAt = data.created_at ? new Date(data.created_at).toLocaleString() : new Date().toLocaleString();
  report.innerHTML = `<div class="print-brand">SEEDGUARD<span>${escapeHtml(tr('Farmer decision support'))}</span></div><h1>${escapeHtml(title)}</h1><p class="print-subtitle">${escapeHtml(subtitle)}</p><p class="print-generated">${escapeHtml(tr('Prepared'))}: ${escapeHtml(createdAt)}${data.id ? ` · ${escapeHtml(tr('Reference'))}: ${escapeHtml(data.id)}` : ''}</p>${sections}<div class="print-report-foot"><strong>${escapeHtml(tr('Important limits'))}</strong><p>${escapeHtml(disclaimer)}</p></div><div class="print-report-actions"><button type="button" id="print-now">${escapeHtml(tr('Print or save as PDF'))}</button></div>`;
  report.hidden = false;
  document.body.classList.add('printing');
  const reset = () => { document.body.classList.remove('printing'); report.hidden = true; };
  window.addEventListener('afterprint', reset, {once: true});
  report.querySelector('#print-now').addEventListener('click', () => window.print());
  window.print();
}

function showResult(data) {
  const style = data.score >= 60 ? 'high' : data.score >= 30 ? 'caution' : '';
  const icons = {positive: '✓', caution: '•'};
  resultPanel.innerHTML = `
    <div class="result-header"><div class="score-circle ${style}">${data.score}</div><div class="result-heading"><small>YOUR SEED CHECK · ${escapeHtml(data.crop).toUpperCase()}</small><h3>${escapeHtml(data.verdict)}</h3><p>Risk indicator score · ${escapeHtml(data.id.slice(0, 8))}</p></div></div>
    <div class="result-grid"><div><h4>What we noticed</h4>${data.reasons.map(reason => `<div class="reason"><span class="reason-icon" style="color:${reason.type === 'positive' ? '#41815a' : '#b47b39'}">${icons[reason.type] || '•'}</span><div><b>${escapeHtml(reason.title)}</b><p>${escapeHtml(reason.detail)}</p></div></div>`).join('')}</div><div><h4>What you can do next</h4><ol class="actions">${data.actions.map(action => `<li>${escapeHtml(action)}</li>`).join('')}</ol><button class="history-toggle" id="history-toggle" type="button">View saved checks and compare</button></div></div>
    <div class="disclaimer">${escapeHtml(data.disclaimer)} Price ranges are demo configuration and may not reflect local market prices.</div><button class="history-toggle print-result-button" type="button">Print or save report</button>`;
  attachReadAloud(resultPanel);
  resultWrap.hidden = false;
  resultPanel.querySelector('.print-result-button').addEventListener('click', () => printSeedGuardReport(data, 'seed'));
  document.querySelector('#history-toggle').addEventListener('click', async () => {
    await loadHistory(true);
    savedChecks.scrollIntoView({behavior: 'smooth', block: 'start'});
  });
  resultWrap.scrollIntoView({behavior: 'smooth', block: 'start'});
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  errorEl.textContent = '';
  if (!navigator.onLine) {
    errorEl.textContent = 'You are offline. Your text details are saved on this device; reconnect to analyze.';
    return;
  }
  submitButton.disabled = true;
  submitButton.querySelector('span:first-child').textContent = 'Reviewing details…';
  try {
    const response = await fetch('/api/analyze-seed', {method: 'POST', body: new FormData(form)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not analyze this check.');
    clearDraft(draftKeys.seed);
    showResult(data);
  } catch (error) {
    errorEl.textContent = !navigator.onLine
      ? 'Connection was lost. Your text details are saved on this device; reconnect to analyze.'
      : error.message || 'Could not reach SeedGuard. Check that the backend is running.';
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span:first-child').textContent = 'Review this seed';
  }
});

async function loadHistory(forceOpen = false) {
  if (!forceOpen && !savedChecksList.hidden) {
    savedChecksList.hidden = true;
    savedCheckDetail.hidden = true;
    compareResults.hidden = true;
    loadChecksButton.textContent = 'Show recent checks';
    return;
  }
  loadChecksButton.disabled = true;
  loadChecksButton.textContent = 'Loading checks…';
  try {
    const response = await fetch('/api/seed-checks?limit=20');
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load saved checks.');
    const checks = data.checks || [];
    if (!checks.length) {
      savedChecksList.innerHTML = '<p class="history-empty">No saved checks yet. Analyze a seed to add one here.</p>';
    } else {
      savedChecksList.innerHTML = `<div class="history-toolbar"><p>Select 2–4 checks to compare. Open a row to see its saved reasons and next steps.</p><button class="compare-selected" id="compare-selected" type="button" disabled>Compare selected</button></div><div class="history-items">${checks.map(item => {
        const date = new Date(item.created_at);
        const when = Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
        return `<div class="history-item"><label class="history-choice"><input class="history-select" type="checkbox" value="${escapeHtml(item.id)}"><span><b>${escapeHtml(item.crop)}</b><small>${formatRupees(item.price)} · ${escapeHtml(item.quantity)} kg${when ? ` · ${escapeHtml(when)}` : ''}</small></span></label><span class="history-verdict ${item.score >= 60 ? 'high' : item.score >= 30 ? 'caution' : ''}">${escapeHtml(item.verdict)} · ${item.score}</span><button class="open-saved-check" type="button" data-check-id="${escapeHtml(item.id)}">Details</button></div>`;
      }).join('')}</div>`;
    }
    savedChecksList.hidden = false;
    savedCheckDetail.hidden = true;
    compareResults.hidden = true;
    loadChecksButton.textContent = 'Hide recent checks';
    savedChecksList.querySelectorAll('.history-select').forEach(input => input.addEventListener('change', updateCompareSelection));
    savedChecksList.querySelectorAll('.open-saved-check').forEach(button => button.addEventListener('click', () => loadSavedCheck(button.dataset.checkId)));
    document.querySelector('#compare-selected')?.addEventListener('click', compareSelectedChecks);
  } catch (error) {
    savedChecksList.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load saved checks.')}</p>`;
    savedChecksList.hidden = false;
    loadChecksButton.textContent = 'Retry loading checks';
  } finally {
    loadChecksButton.disabled = false;
  }
}

function updateCompareSelection() {
  const selected = savedChecksList.querySelectorAll('.history-select:checked').length;
  const button = document.querySelector('#compare-selected');
  if (!button) return;
  button.disabled = selected < 2 || selected > 4;
  button.textContent = selected > 4 ? 'Choose up to 4 checks' : `Compare selected${selected ? ` (${selected})` : ''}`;
}

async function loadSavedCheck(checkId) {
  const detail = savedCheckDetail;
  detail.hidden = false;
  compareResults.hidden = true;
  detail.innerHTML = '<p class="history-loading">Loading saved check…</p>';
  try {
    const response = await fetch(`/api/seed-checks/${encodeURIComponent(checkId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not load this saved check.');
    const style = data.score >= 60 ? 'high' : data.score >= 30 ? 'caution' : '';
    const icons = {positive: '✓', caution: '•'};
    detail.innerHTML = `<div class="saved-detail-top"><div><small>SAVED SEED CHECK</small><h3>${escapeHtml(data.crop)} · ${escapeHtml(data.verdict)}</h3></div><button class="close-detail" type="button">Close</button></div><div class="result-header"><div class="score-circle ${style}">${data.score}</div><div class="result-heading"><small>RISK INDICATOR SCORE</small><p>${escapeHtml(new Date(data.created_at).toLocaleString())}</p></div></div><div class="result-grid"><div><h4>What we noticed</h4>${data.reasons.map(reason => `<div class="reason"><span class="reason-icon" style="color:${reason.type === 'positive' ? '#41815a' : '#b47b39'}">${icons[reason.type] || '•'}</span><div><b>${escapeHtml(reason.title)}</b><p>${escapeHtml(reason.detail)}</p></div></div>`).join('')}</div><div><h4>What you can do next</h4><ol class="actions">${data.actions.map(action => `<li>${escapeHtml(action)}</li>`).join('')}</ol></div></div><div class="disclaimer">${escapeHtml(data.disclaimer)}</div>`;
    detail.querySelector('.close-detail').addEventListener('click', () => { detail.hidden = true; });
    detail.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  } catch (error) {
    detail.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not load this saved check.')}</p>`;
  }
}

async function compareSelectedChecks() {
  const checkIds = [...savedChecksList.querySelectorAll('.history-select:checked')].map(input => input.value);
  if (checkIds.length < 2 || checkIds.length > 4) return;
  const button = document.querySelector('#compare-selected');
  button.disabled = true;
  button.textContent = 'Comparing…';
  compareResults.hidden = false;
  compareResults.innerHTML = '<p class="history-loading">Comparing saved evidence…</p>';
  try {
    const response = await fetch('/api/compare', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({check_ids: checkIds}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not compare those checks.');
    const sourceNames = {known_retailer: 'Known retailer', local_seller: 'Local seller', unknown: 'Unknown source'};
    compareResults.innerHTML = `<div class="comparison-heading"><div><small>SEEDGUARD COMPARISON</small><h3>Compare your checked options</h3></div><button class="close-detail" type="button">Close</button></div><div class="comparison-grid">${data.options.map(item => `<article class="comparison-card ${item.best_supported ? 'is-best-supported' : ''}">${item.best_supported ? '<span class="best-supported">Best-supported signal set</span>' : ''}<h4>${escapeHtml(item.crop)}</h4><div class="comparison-score">${escapeHtml(item.verdict)} <b>${item.score}/100</b></div><dl><div><dt>Price</dt><dd>${formatRupees(item.price)} · ${escapeHtml(item.quantity)} kg</dd></div><div><dt>Source</dt><dd>${sourceNames[item.source_type] || 'Local seller'}</dd></div><div><dt>Label details</dt><dd>${item.label_fields_present}/4 provided</dd></div><div><dt>Packet photo</dt><dd>${item.has_photo ? 'Included' : 'Not included'}</dd></div></dl></article>`).join('')}</div><p class="comparison-note">${escapeHtml(data.note)}</p>`;
    compareResults.querySelector('.close-detail').addEventListener('click', () => { compareResults.hidden = true; });
    compareResults.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  } catch (error) {
    compareResults.innerHTML = `<p class="history-error">${escapeHtml(error.message || 'Could not compare those checks.')}</p>`;
  } finally {
    updateCompareSelection();
  }
}

