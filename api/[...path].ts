import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key is not configured on the server.' } });
  }
  
  // Using req.query.path which is the array of path segments from the file-based route.
  // e.g., for a request to `/api/v1/models`, req.query.path will be ['v1', 'models']
  const pathSegments = req.query.path;

  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return res.status(400).json({ error: { message: 'Invalid API path provided.' } });
  }

  let path = `/${pathSegments.join('/')}`;
  
  // Re-add the original query string if it exists
  const queryStringIndex = req.url?.indexOf('?') ?? -1;
  if (queryStringIndex !== -1) {
    path += req.url?.substring(queryStringIndex);
  }

  const targetUrl = `${ELEVENLABS_API_URL}${path}`;
  
  const headers: HeadersInit = {
    'Accept': req.headers.accept || 'application/json',
    'xi-api-key': apiKey,
  };

  const isWriteMethod = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH';
  // Do not forward body for GET/HEAD/etc requests.
  const body = isWriteMethod && req.body ? JSON.stringify(req.body) : undefined;
  
  if (isWriteMethod && req.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const elevenLabsResponse = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });

    res.status(elevenLabsResponse.status);

    // Copy headers from the ElevenLabs response to our response
    elevenLabsResponse.headers.forEach((value, key) => {
        // These headers are set automatically by Vercel and should not be overridden
        const forbiddenHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
        if (!forbiddenHeaders.includes(key.toLowerCase())) {
            res.setHeader(key, value);
        }
    });
    
    // Fix: Use an async iterator to stream the response body. This avoids type errors with NodeJS streams.
    // Stream the body back to the client
    if (elevenLabsResponse.body) {
        for await (const chunk of elevenLabsResponse.body) {
            res.write(chunk);
        }
    }
    res.end();

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).json({ error: { message: 'Failed to communicate with the ElevenLabs API.' } });
  }
}
