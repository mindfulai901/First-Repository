import type { VercelRequest, VercelResponse } from '@vercel/node';
import { URLSearchParams } from 'url';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key is not configured on the server.' } });
  }

  // Reconstruct the path from the `path` query parameter provided by Vercel's routing.
  // e.g., /api/v1/models -> req.query.path is ['v1', 'models']
  const pathSegments = req.query.path as string[];
  const apiPath = pathSegments.join('/');

  // Reconstruct the query string from all other query parameters.
  const queryParams = { ...req.query };
  delete queryParams.path; // remove the path segments from query params
  
  const searchParams = new URLSearchParams(queryParams as Record<string, string>).toString();
  const fullApiPath = searchParams ? `/${apiPath}?${searchParams}` : `/${apiPath}`;
  
  const targetUrl = `${ELEVENLABS_API_URL}${fullApiPath}`;

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

    const elevenLabsResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' && req.body ? JSON.stringify(req.body) : undefined,
      redirect: 'follow',
    });

    // Forward status and headers
    res.status(elevenLabsResponse.status);
    elevenLabsResponse.headers.forEach((value, key) => {
      const forbiddenHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
      if (!forbiddenHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Send back the response body
    const responseBodyBuffer = await elevenLabsResponse.arrayBuffer();
    res.send(Buffer.from(responseBodyBuffer));

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).json({ error: { message: 'An error occurred while proxying the request.', details: error instanceof Error ? error.message : String(error) } });
  }
}
