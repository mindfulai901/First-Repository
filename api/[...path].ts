import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key is not configured on the server.' } });
  }

  // req.url contains the full path and query string after the /api prefix (e.g., /v1/models)
  // This is a more reliable way to construct the target URL than parsing req.query.
  const targetUrl = `${ELEVENLABS_API_URL}${req.url}`;
  
  const headers: HeadersInit = {
    'Accept': req.headers.accept || 'application/json',
    'xi-api-key': apiKey,
  };

  const isWriteMethod = req.method === 'POST' || req.method === 'PUT';
  if (isWriteMethod && req.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const elevenLabsResponse = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      // Only include body for write methods and if a body exists
      body: isWriteMethod && req.body ? JSON.stringify(req.body) : undefined,
    });

    res.status(elevenLabsResponse.status);

    elevenLabsResponse.headers.forEach((value, key) => {
        // These headers can interfere with Vercel's response handling and should not be forwarded.
        const forbiddenHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
        if (!forbiddenHeaders.includes(key.toLowerCase())) {
            res.setHeader(key, value);
        }
    });
    
    // Pipe the response body from ElevenLabs directly to the client.
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
