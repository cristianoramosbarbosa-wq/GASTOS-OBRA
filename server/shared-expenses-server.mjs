import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = join(root, 'dist');
const dataDir = join(root, 'data');
const dataFile = join(dataDir, 'gastos.json');
const port = Number(process.env.PORT || 5174);
const host = process.env.HOST || '0.0.0.0';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
};

const readBody = (request) =>
  new Promise((resolveBody, rejectBody) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        request.destroy();
        rejectBody(new Error('Payload muito grande.'));
      }
    });
    request.on('end', () => resolveBody(body));
    request.on('error', rejectBody);
  });

const readExpenses = async () => {
  try {
    const content = await readFile(dataFile, 'utf8');
    const payload = JSON.parse(content);
    return Array.isArray(payload.expenses) ? payload.expenses : [];
  } catch {
    return [];
  }
};

const writeExpenses = async (expenses) => {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify({ expenses }, null, 2)}\n`, 'utf8');
};

const serveStatic = async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const safePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const requestedPath = safePath ? join(distDir, safePath) : join(distDir, 'index.html');
  const filePath = requestedPath.startsWith(distDir) ? requestedPath : join(distDir, 'index.html');

  try {
    const fileStat = await stat(filePath);
    const finalPath = fileStat.isDirectory() ? join(filePath, 'index.html') : filePath;
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': mimeTypes[extname(finalPath)] || 'application/octet-stream',
    });
    createReadStream(finalPath).pipe(response);
  } catch {
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    });
    createReadStream(join(distDir, 'index.html')).pipe(response);
  }
};

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith('/api/expenses')) {
      if (request.method === 'GET') {
        return sendJson(response, 200, { expenses: await readExpenses() });
      }

      if (request.method === 'PUT') {
        const body = await readBody(request);
        const payload = JSON.parse(body || '{}');
        const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];
        await writeExpenses(expenses);
        return sendJson(response, 200, { ok: true, expenses });
      }

      return sendJson(response, 405, { error: 'Metodo nao permitido.' });
    }

    return serveStatic(request, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado.';
    return sendJson(response, 500, { error: message });
  }
});

server.listen(port, host, () => {
  console.log(`Controle de gastos rodando em http://localhost:${port}`);
});
