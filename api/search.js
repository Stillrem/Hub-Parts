// api/search.js
import { sources } from '../api/sources.js';

export default async function handler(req, res) {
  try {
    const { q = '', sources: srcParam = '' } = req.query;

    const query = q.trim();
    if (!query) {
      res.status(400).json({ error: 'Missing q param' });
      return;
    }

    const selectedNames = srcParam
      ? srcParam.split(',').map(s => s.trim()).filter(Boolean)
      : sources.map(s => s.name);

    const activeSources = sources.filter(s => selectedNames.includes(s.name));

    const fetchPromises = activeSources.map(async (src) => {
      const url = src.searchUrl(query);
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (PartsFinderBot; +https://stillfusion.parts)'
          }
        });
        const html = await response.text();
        const items = await src.parser(html, query);
        return { source: src.name, items };
      } catch (err) {
        console.error('Error for source', src.name, err);
        return { source: src.name, items: [] };
      }
    });

    const resultsBySource = await Promise.all(fetchPromises);

    const flatItems = [];
    for (const { source, items } of resultsBySource) {
      for (const it of items) {
        flatItems.push({ source, ...it });
      }
    }

    res.status(200).json({
      query,
      items: flatItems
    });
  } catch (err) {
    console.error('Fatal error in /api/search', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
