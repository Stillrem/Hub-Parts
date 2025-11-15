// app.js
const API_URL = '/api/search'; // на Vercel именно так

const SOURCE_NAMES = [
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

const queryInput = document.getElementById('queryInput');
const searchBtn = document.get
const statusLine = document.getElementById('statusLine');
const resultsList = document.getElementById('resultsList');
const resultsSubtitle = document.getElementById('resultsSubtitle');
const csvBtn = document.getElementById('csvBtn');
const sourcesListEl = document.getElementById('sourcesList');
const clearSourcesBtn = document.getElementById('clearSourcesBtn');

let activeSources = new Set(SOURCE_NAMES);
let lastItems = [];

/* build chips */

function buildSourceChips() {
  SOURCE_NAMES.forEach(name => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.source = name;
    chip.innerHTML = `
      <span class="chip-dot"></span>
      <span>${name}</span>
    `;
    chip.addEventListener('click', () => {
      if (activeSources.has(name)) {
        activeSources.delete(name);
        chip.classList.add('off');
      } else {
        activeSources.add(name);
        chip.classList.remove('off');
      }
      if (activeSources.size === 0) {
        statusLine.textContent = 'Ни один поставщик не выбран.';
        statusLine.classList.add('status-error');
      } else {
        statusLine.textContent = 'Поставщики выбраны.';
        statusLine.classList.remove('status-error');
      }
    });
    sourcesListEl.appendChild(chip);
  });
}
buildSourceChips();

clearSourcesBtn.addEventListener('click', () => {
  activeSources.clear();
  document.querySelectorAll('.chip').forEach(ch => ch.classList.add('off'));
  statusLine.textContent = 'Все поставщики сняты. Выберите хотя бы один.';
  statusLine.classList.add('status-error');
});

/* search */

async function performSearch() {
  const q = queryInput.value.trim();
  if (!q) {
    statusLine.textContent = 'Введите модель или part number.';
    statusLine.classList.add('status-error');
    return;
  }
  if (!activeSources.size) {
    statusLine.textContent = 'Выберите хотя бы одного поставщика.';
    statusLine.classList.add('status-error');
    return;
  }

  statusLine.textContent = 'Поиск…';
  statusLine.classList.remove('status-error');
  searchBtn.disabled = true;
  csvBtn.disabled = true;
  resultsList.innerHTML = '';
  resultsSubtitle.textContent = 'Загружаем результаты…';
  lastItems = [];

  const srcParam = Array.from(activeSources).join(',');

  try {
    const url = `${API_URL}?q=${encodeURIComponent(q)}&sources=${encodeURIComponent(
      srcParam
    )}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    lastItems = Array.isArray(data.items) ? data.items : [];
    if (!lastItems.length) {
      resultsSubtitle.textContent = 'Ничего не найдено.';
      statusLine.textContent = 'Поиск завершён, результатов нет.';
      return;
    }

    renderResults(lastItems);
    resultsSubtitle.textContent = `Найдено: ${lastItems.length}`;
    statusLine.textContent = 'Поиск завершён.';
    csvBtn.disabled = false;
  } catch (err) {
    console.error('Search error', err);
    statusLine.textContent = 'Ошибка при запросе. См. вкладку Network / Console.';
    statusLine.classList.add('status-error');
    resultsSubtitle.textContent = 'Ошибка при поиске.';
  } finally {
    searchBtn.disabled = false;
  }
}

searchBtn.addEventListener('click', performSearch);
queryInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    performSearch();
  }
});

/* render */

function renderResults(items) {
  resultsList.innerHTML = '';
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'result-card';

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'result-thumb-wrap';

    if (item.image) {
      const img = document.createElement('img');
      img.className = 'result-thumb';
      img.src = item.image;
      img.alt = item.title || 'Part image';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      thumbWrap.appendChild(img);
    } else {
      const span = document.createElement('div');
      span.className = 'result-thumb-fallback';
      span.textContent = '🧩';
      thumbWrap.appendChild(span);
    }

    const main = document.createElement('div');
    main.className = 'result-main';

    const titleEl = document.createElement('div');
    titleEl.className = 'result-title';
    titleEl.textContent = item.title || 'Без названия';
    main.appendChild(titleEl);

    if (item.part_number || item.price) {
      const meta = document.createElement('div');
      meta.className = 'result-meta';
      const parts = [];
      if (item.part_number) parts.push(`Part #${item.part_number}`);
      if (item.price) {
        const cur = item.currency || '';
        parts.push(
          `<span class="result-meta-strong">${item.price} ${cur}</span>`
        );
      }
      meta.innerHTML = parts.join(' · ');
      main.appendChild(meta);
    }

    const footer = document.createElement('div');
    footer.className = 'result-footer';

    const sourcePill = document.createElement('span');
    sourcePill.className = 'source-pill';
    sourcePill.textContent = item.source || 'Источник';
    footer.appendChild(sourcePill);

    if (item.link) {
      const link = document.createElement('a');
      link.className = 'source-link';
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Источник';
      footer.appendChild(link);
    }

    main.appendChild(footer);

    card.appendChild(thumbWrap);
    card.appendChild(main);
    resultsList.appendChild(card);
  }
}

/* CSV */

csvBtn.addEventListener('click', () => {
  if (!lastItems.length) return;

  const rows = [
    ['source', 'title', 'part_number', 'price', 'currency', 'link', 'image']
  ];

  for (const it of lastItems) {
    rows.push([
      it.source || '',
      it.title || '',
      it.part_number || '',
      it.price || '',
      it.currency || '',
      it.link || '',
      it.image || ''
    ]);
  }

  const csv = rows
    .map(row =>
      row
        .map(val =>
          `"${String(val || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        )
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'parts-search.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

/* PWA */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(err => console.warn('SW register error', err));
  });
}
