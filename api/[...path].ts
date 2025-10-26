import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'buffer';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('API key is not configured.');
    return res.status(500).json({ error: { message: 'Server configuration error: API key is missing.' } });
  }

  // req.url contains the full path and query string, e.g., '/api/v1/models?search=term'
  // We remove the '/api' prefix to get the correct path for the target API.
  const apiPath = req.url?.replace('/api', '');
  if (!apiPath) {
      return res.status(400).json({ error: { message: 'Invalid API path.' } });
  }

  const targetUrl = `${ELEVENLABS_API_URL}${apiPath}`;

  try {
    const headers: HeadersInit = {
      'xi-api-key': apiKey,
    };

    // Forward essential headers from the client
    if (req.headers['accept']) {
      headers['Accept'] = req.headers['accept'];
    }
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    // `req.body` is pre-parsed by Vercel. `fetch` expects a string or Buffer.
    // Stringify the body only for appropriate methods and if it's not empty.
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

    // Forward headers from the target service to the client
    elevenLabsResponse.headers.forEach((value, key) => {
      // Avoid forwarding headers that can cause issues
      const forbiddenHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
      if (!forbiddenHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Send the status code from the target service
    res.status(elevenLabsResponse.status);

    // Buffer the response body and send it to the client
    const responseBody = await elevenLabsResponse.arrayBuffer();
    // Fix: Use Buffer object which is now imported.
    res.send(Buffer.from(responseBody));

  } catch (error) {
    console.error('Proxy request failed:', error);
    res.status(502).json({ error: { message: 'The proxy server encountered an error.' } });
  }
}