import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key is not configured on the server.' } });
  }

  try {
    // req.query.path is an array of path segments. e.g., ['v1', 'models']
    const pathSegments = req.query.path as string[];
    if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
        return res.status(400).json({ error: { message: 'Invalid API path provided.' } });
    }
    const elevenLabsPath = pathSegments.join('/');

    // Reconstruct the original query string from the request URL
    const originalUrl = new URL(req.url!, `http://${req.headers.host}`);
    const queryString = originalUrl.search; // e.g., "?search=term"

    const targetUrl = `${ELEVENLABS_API_URL}/${elevenLabsPath}${queryString}`;
    
    const headers: HeadersInit = {
      'xi-api-key': apiKey
    };
    if (req.headers['accept']) {
      headers['Accept'] = req.headers['accept'];
    }
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    const elevenLabsResponse = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : null,
      redirect: 'follow',
    });

    // Set status and headers from the origin response
    res.status(elevenLabsResponse.status);
    elevenLabsResponse.headers.forEach((value, key) => {
      // Vercel handles these headers automatically.
      const forbiddenHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
      if (!forbiddenHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Stream the body from the origin response back to the client
    if (elevenLabsResponse.body) {
      const reader = elevenLabsResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        res.write(value);
      }
    }
    res.end();

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).json({ error: { message: 'An error occurred while proxying the request to ElevenLabs.' } });
  }
}
