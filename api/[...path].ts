import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key is not configured on the server.' } });
  }

  // req.url contains the full path and query string, e.g., '/api/v1/models?foo=bar'
  // We remove the '/api' prefix to get the path for the target API, e.g., '/v1/models?foo=bar'
  const pathWithQuery = req.url?.substring(4); 
  
  if (!pathWithQuery) {
    return res.status(400).json({ error: { message: 'Invalid API path provided.' } });
  }

  const targetUrl = `${ELEVENLABS_API_URL}${pathWithQuery}`;

  try {
    const headers: HeadersInit = {
      'xi-api-key': apiKey,
    };
    
    // Forward relevant headers from the client request
    if (req.headers['accept']) {
      headers['Accept'] = req.headers['accept'];
    }
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    const elevenLabsResponse = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      // Only include a body for methods that support it.
      // Vercel automatically parses the body, so we need to re-stringify it for the fetch call.
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      redirect: 'follow',
    });

    // Forward the status code from the ElevenLabs response
    res.status(elevenLabsResponse.status);

    // Forward the headers from the ElevenLabs response
    elevenLabsResponse.headers.forEach((value, key) => {
      // Vercel handles these headers automatically; setting them manually can cause conflicts.
      const forbiddenHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
      if (!forbiddenHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Buffer the entire response body and then send it.
    // This is simpler and more reliable than streaming for this API.
    const responseBodyBuffer = await elevenLabsResponse.arrayBuffer();
    res.send(Buffer.from(responseBodyBuffer));

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).json({ error: { message: 'An error occurred while proxying the request.' } });
  }
}
