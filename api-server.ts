import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';

// Load .env.local for local development
(function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
  console.log('[env] Loaded .env.local');
})();

// A simple HTTP server that runs the Vercel serverless functions locally
function getBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';

  // Only handle /api/*
  if (!pathname.startsWith('/api/')) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  // Resolve file path: e.g. /api/auth/login -> api/auth/login.ts
  const cleanPath = pathname.replace(/\/$/, '');
  const relativeFilePath = cleanPath.slice(1) + '.ts';
  const absoluteFilePath = path.join(process.cwd(), relativeFilePath);

  if (!fs.existsSync(absoluteFilePath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `API endpoint ${pathname} not found` }));
    return;
  }

  try {
    const fileUrl = url.pathToFileURL(absoluteFilePath).href;
    const module = await import(fileUrl + '?t=' + Date.now());
    const handler = module.default;

    // Decorate req and res
    const vercelReq = req as any;
    vercelReq.query = parsedUrl.query;
    vercelReq.body = await getBody(req);
    vercelReq.cookies = {};

    if (req.headers.cookie) {
      const cookies: any = {};
      req.headers.cookie.split(';').forEach(c => {
        const parts = c.split('=');
        if (parts[0]) {
          cookies[parts[0].trim()] = (parts[1] || '').trim();
        }
      });
      vercelReq.cookies = cookies;
    }

    const vercelRes = res as any;
    vercelRes.status = (code: number) => {
      res.statusCode = code;
      return vercelRes;
    };
    vercelRes.json = (data: any) => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify(data));
      return vercelRes;
    };
    vercelRes.send = (data: any) => {
      res.end(data);
      return vercelRes;
    };

    await handler(vercelReq, vercelRes);
  } catch (err: any) {
    console.error(`Error handling ${pathname}:`, err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
    }
  }
});

server.listen(3001, () => {
  console.log('API Server running on http://localhost:3001');
});
