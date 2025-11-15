// api/search.js
const { sources } = require('./sources');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const q = (req.query.q || '').toString().trim();
    const srcParam = (req.query.sources || '').toString();

    if (!q) {
      res.status(400).json({ error: 'Missing q param' });
      return;
    }

    const selectedNames = srcParam
      ? srcParam.split(',').map(s => s.trim()).filter(Boolean)
      : sources.map(s => s.name);

    const activeSources = sources.filter(s =>
      selectedNames.includes(s.name)
    );

    if (!activeSources.length) {
      res.status(400).json({ error: 'No valid sources selected' });
      return;
    }

    const tasks = activeSources.map(async src => {
      const url = src.searchUrl(q);
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (PartsFinderBot; StillFusion)'
          }
        });
        const html = await response.text();
        const items = await src.parser(html, q);
        return { source: src.name, items };
      } catch (e) {
        console.error('Error scraping', src.name, e);
        return { source: src.name, items: [] };
      }
    });

    const results = await Promise.all(tasks);

    const flat = [];
    for (const { source, items } of results) {
      for (const it of items || []) {
        flat.push({ source, ...it });
      }
    }

    res.status(200).json({ query: q, items: flat });
  } catch (e) {
    console.error('Fatal /api/search error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};
