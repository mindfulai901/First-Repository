import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key is not configured on the server.' } });
  }

  // req.url will be like '/api/v1/models'. We need to remove the '/api' prefix.
  const path = req.url?.replace(/^\/api/, '');

  if (!path) {
    return res.status(400).json({ error: { message: 'Invalid API path provided.' } });
  }

  const targetUrl = `${ELEVENLABS_API_URL}${path}`;
  
  const headers: HeadersInit = {
    'Accept': req.headers.accept || 'application/json',
    'xi-api-key': apiKey,
  };

  const isWriteMethod = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH';
  if (isWriteMethod && req.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const elevenLabsResponse = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: isWriteMethod && req.body ? JSON.stringify(req.body) : undefined,
    });

    res.status(elevenLabsResponse.status);

    elevenLabsResponse.headers.forEach((value, key) => {
        const forbiddenHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
        if (!forbiddenHeaders.includes(key.toLowerCase())) {
            res.setHeader(key, value);
        }
    });
    
    if (elevenLabsResponse.body) {
        const bodyStream = elevenLabsResponse.body as unknown as NodeJS.ReadableStream;
        bodyStream.pipe(res);
    } else {
        res.end();
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).json({ error: { message: 'Failed to communicate with the ElevenLabs API.' } });
  }
}
