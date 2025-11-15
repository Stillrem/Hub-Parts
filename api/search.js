// api/search.js  (для Vercel / аналог для Netlify)

import { sources } from './lib/sources.js';

export default async function handler(req, res) {
  const { q } = req.query || {};
  const query = String(q || '').trim();

  if (!query) {
    res.status(200).json({ items: [] });
    return;
  }

  try {
    // Параллельно по всем источникам
    const tasks = sources.map(async (src) => {
      try {
        const resp = await fetch(src.searchUrl(query));
        const html = await resp.text();
        const parsed = await src.parser(html, query);

        return parsed.map(p => ({
          supplier: src.name,
          part_number: p.part_number || '',
          name: p.title || '',
          image: p.image || '',
          url: p.link || '',
          price: p.price || '',
          currency: p.currency || '',
          availability: p.availability || '',
          oem_flag: p.oem_flag ?? false,
          brand: p.brand || '',
          model: p.model || '',
          compatibility: p.compatibility || '',
          equivalents: p.equivalents || [],
          notes: p.notes || ''
        }));
      } catch (e) {
        console.error('Error in source', src.name, e);
        return [];
      }
    });

    const results = await Promise.all(tasks);
    const items = results.flat();

    res.status(200).json({ items });
  } catch (e) {
    console.error('Global error', e);
    res.status(500).json({ items: [], error: String(e.message || e) });
  }
}
