// app.js

const API_URL = '/.netlify/functions/search';

const PROVIDERS = [
  'SearsPartsDirect',
  'RepairClinic',
  'ReliableParts',
  'AppliancePartsPros',
  'PartSelect',
  'Encompass',
  'Marcone',
  'eBay',
  'Amazon'
];

let selectedProviders = new Set(PROVIDERS);
let lastResultsFlat = [];

// DOM
const form = document.getElementById('search-form');
const input = document.getElementById('query');
const statusEl = document.getElementById('search-status');
const chipsWrap = document.getElementById('providers-chips');
const resultsGrid = document.getElementById('results-grid');
const resultsCount = document.getElementById('results-count');
const btnToggleAll = document.getElementById('toggle-all');
const btnExportCSV = document.getElementById('export-csv');

// --- Init chips ---
function renderProviderChips() {
  chipsWrap.innerHTML = '';
  PROVIDERS.forEach((name) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip active';
    chip.dataset.provider = name;
    chip.innerHTML = `
      <span class="dot"></span>
      <span>${name}</span>
    `;
    chip.addEventListener('click', () => {
      if (selectedProviders.has(name)) {
        selectedProviders.delete(name);
        chip.classList.remove('active');
      } else {
        selectedProviders.add(name);
        chip.classList.add('active');
      }
      updateToggleAllLabel();
    });
    chipsWrap.appendChild(chip);
  });
}

function updateToggleAllLabel() {
  if (selectedProviders.size === PROVIDERS.length) {
    btnToggleAll.textContent = 'Снять всё';
  } else if (selectedProviders.size === 0) {
    btnToggleAll.textContent = 'Все';
  } else {
    btnToggleAll.textContent = 'Все';
  }
}

btnToggleAll.addEventListener('click', () => {
  if (selectedProviders.size === PROVIDERS.length) {
    // снять всё
    selectedProviders.clear();
    document.querySelectorAll('.chip').forEach((chip) => chip.classList.remove('active'));
  } else {
    // выбрать всё
    selectedProviders = new Set(PROVIDERS);
    document.querySelectorAll('.chip').forEach((chip) => chip.classList.add('active'));
  }
  updateToggleAllLabel();
});

renderProviderChips();
updateToggleAllLabel();

// --- Search handler ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  if (selectedProviders.size === 0) {
    statusEl.textContent = 'Выберите хотя бы одного поставщика.';
    return;
  }

  const sourcesParam = Array.from(selectedProviders).join(',');

  setLoading(true);
  statusEl.textContent = 'Ищем по сайтам…';

  try {
    const url = new URL(API_URL, window.location.origin);
    url.searchParams.set('q', q);
    url.searchParams.set('sources', sourcesParam);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.items) {
      throw new Error('Неправильный формат ответа API');
    }

    lastResultsFlat = data.items;
    renderResults(data.items);
    btnExportCSV.disabled = data.items.length === 0;

    statusEl.textContent =
      data.items.length
        ? `Готово: найдено ${data.items.length} позиций`
        : 'Ничего не найдено. Попробуйте уточнить запрос.';

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Ошибка при запросе. Проверьте консоль.';
    renderResults([]);
    btnExportCSV.disabled = true;
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  if (isLoading) {
    statusEl.textContent = 'Поиск…';
    resultsGrid.classList.add('loading');
  } else {
    resultsGrid.classList.remove('loading');
  }
}

// --- Render results ---
function renderResults(items) {
  resultsGrid.innerHTML = '';
  resultsCount.textContent = items.length
    ? `Найдено: ${items.length}`
    : 'Пока ничего не найдено';

  if (!items.length) return;

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'result-card';

    const imgSrc = item.image || '';
    const price = item.price || '';
    const availability = item.availability || '';
    const pn = item.part_number || '';

    card.innerHTML = `
      <div class="result-header">
        <div class="result-thumb-wrap">
          ${
            imgSrc
              ? `<img class="result-thumb" src="${imgSrc}" loading="lazy" alt="part image"/>`
              : `<div class="result-thumb-placeholder">🔧</div>`
          }
        </div>
        <div class="result-main">
          <div class="result-title" title="${escapeHTML(item.title || '')}">
            ${escapeHTML(item.title || '')}
          </div>
          <div class="result-meta">
            ${
              item.source
                ? `<span class="badge-source">${escapeHTML(item.source)}</span>`
                : ''
            }
            ${
              pn
                ? `<span class="badge-pn">PN: ${escapeHTML(pn)}</span>`
                : ''
            }
          </div>
        </div>
      </div>
      <div class="result-footer">
        <div>
          ${
            price
              ? `<div class="result-price">${escapeHTML(price)}</div>`
              : ''
          }
          ${
            availability
              ? `<div class="result-availability">${escapeHTML(availability)}</div>`
              : ''
          }
        </div>
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="result-link">
          Открыть
        </a>
      </div>
    `;

    resultsGrid.appendChild(card);
  }
}

function escapeHTML(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// --- CSV Export ---
btnExportCSV.addEventListener('click', () => {
  if (!lastResultsFlat.length) return;

  const headers = [
    'source',
    'title',
    'part_number',
    'price',
    'availability',
    'link',
    'image'
  ];

  const rows = lastResultsFlat.map((item) =>
    headers.map((h) => {
      const v = item[h] != null ? String(item[h]) : '';
      // CSV escape
      if (v.includes('"') || v.includes(',') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `parts-search-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// --- PWA: register service worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('SW registration failed', err));
  });
}
