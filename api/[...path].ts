import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'buffer';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('API key is not configured.');
    return res.status(500).json({ error: { message: 'Server configuration error: API key is missing.' } });
  }

  const apiPath = req.url?.replace('/api', '');
  if (!apiPath) {
      return res.status(400).json({ error: { message: 'Invalid API path.' } });
  }

  const targetUrl = `${ELEVENLABS_API_URL}${apiPath}`;

  try {
    const headers: HeadersInit = {
      'xi-api-key': apiKey,
    };

    if (req.headers['accept']) {
      headers['Accept'] = req.headers['accept'];
    }
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
        body = JSON.stringify(req.body);
    }

    const elevenLabsResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'follow',
    });

    elevenLabsResponse.headers.forEach((value, key) => {
      const forbiddenHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
      if (!forbiddenHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.status(elevenLabsResponse.status);

    const responseBody = await elevenLabsResponse.arrayBuffer();
    res.send(Buffer.from(responseBody));

  } catch (error) {
    console.error('Proxy request failed:', error);
    res.status(502).json({ error: { message: 'The proxy server encountered an error.' } });
  }
}
