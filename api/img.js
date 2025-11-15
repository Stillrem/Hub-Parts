// api/img.js  (Vercel)

export default async function handler(req, res) {
  try {
    const url = req.query.url;
    if (!url) {
      res.status(400).send('Missing url');
      return;
    }

    const upstream = await fetch(url);
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buffer);
  } catch (e) {
    console.error('img proxy error', e);
    res.status(500).end();
  }
}
