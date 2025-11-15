// functions/search.js

import { sources } from './lib/sources.js';

// В Node 18+ fetch глобальный. Если нет — нужно подключить node-fetch.

export const handler = async (event, context) => {
  try {
    const q = (event.queryStringParameters && event.queryStringParameters.q || '').trim();
    const srcParam = (event.queryStringParameters && event.queryStringParameters.sources || '').trim();

    if (!q) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing q param' })
      };
    }

    const selectedNames = srcParam
      ? srcParam.split(',').map(s => s.trim()).filter(Boolean)
      : sources.map(s => s.name);

    const activeSources = sources.filter(s => selectedNames.includes(s.name));

    const fetchPromises = activeSources.map(async (src) => {
      const url = src.searchUrl(q);
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (PartsFinderBot; +https://example.com)'
          }
        });
        const html = await res.text();
        const items = await src.parser(html, q);
        return { source: src.name, items };
      } catch (err) {
        console.error('Error fetching/parsing for', src.name, err);
        return { source: src.name, items: [] };
      }
    });

    const resultsBySource = await Promise.all(fetchPromises);

    // плоский массив с source в каждом объекте
    const flatItems = [];
    for (const { source, items } of resultsBySource) {
      for (const it of items) {
        flatItems.push({ source, ...it });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        query: q,
        items: flatItems
      })
    };
  } catch (err) {
    console.error('Fatal error in search function', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
