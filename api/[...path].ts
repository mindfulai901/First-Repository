import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key is not configured on the server. Please contact the administrator.' } });
  }
  
  if (!path || !Array.isArray(path)) {
      return res.status(400).json({ error: { message: 'Invalid API path provided.' } });
  }

  const endpointPath = path.join('/');
  const targetUrl = `${ELEVENLABS_API_URL}/${endpointPath}`;

  try {
    const elevenLabsResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': req.headers.accept || 'application/json',
        'xi-api-key': apiKey,
      },
      body: (req.method === 'POST' || req.method === 'PUT') ? JSON.stringify(req.body) : undefined,
    });

    res.status(elevenLabsResponse.status);

    elevenLabsResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'connection') {
            res.setHeader(key, value);
        }
    });

    if (elevenLabsResponse.body) {
        // @ts-ignore
        elevenLabsResponse.body.pipe(res);
    } else {
        res.end();
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).json({ error: { message: 'Failed to communicate with the ElevenLabs API.' } });
  }
}
