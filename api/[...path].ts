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
    const headers: HeadersInit = {};

    // Forward most headers from the original request to ensure consistency.
    for (const key in req.headers) {
        // Exclude host-related headers as they are specific to the proxy request environment.
        if (!['host', 'x-forwarded-host', 'x-forwarded-proto', 'x-vercel-id', 'x-real-ip', 'x-vercel-forwarded-for', 'x-vercel-deployment-url'].includes(key.toLowerCase())) {
            const value = req.headers[key];
            if (value) {
                // Fix: A header value can be an array of strings. Join it to form a single string.
                headers[key] = Array.isArray(value) ? value.join(', ') : value;
            }
        }
    }
    
    // Securely set the secret API key, overriding any client-sent one.
    headers['xi-api-key'] = apiKey;
    
    // The `fetch` API sets its own Content-Length, so we remove the original one to avoid conflicts.
    delete headers['content-length'];
    

    let body;
    // Check if there's a body to forward. Vercel parses JSON bodies automatically.
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        // Ensure body is stringified for the fetch request.
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const elevenLabsResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'follow',
    });

    // Forward the response headers from ElevenLabs back to the client.
    elevenLabsResponse.headers.forEach((value, key) => {
      // These headers are controlled by the server and should not be blindly forwarded.
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
