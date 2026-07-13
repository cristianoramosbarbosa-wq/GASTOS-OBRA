import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = join(root, 'dist');
const dataDir = join(root, 'data');
const dataFile = join(dataDir, 'gastos.json');
const port = Number(process.env.PORT || 5174);
const host = process.env.HOST || '0.0.0.0';
const cookieName = 'lopesrio_session';
const sessionDurationSeconds = 60 * 60 * 8;
const authSecret = process.env.AUTH_SECRET || 'local-dev-secret-change-me';
const appPassword = process.env.APP_PASSWORD || 'obra2026';

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

const sign = (payload) =>
  createHmac('sha256', authSecret).update(payload).digest('base64url');

const createSessionToken = () => {
  const payload = Buffer.from(
    JSON.stringify({ expiresAt: Date.now() + sessionDurationSeconds * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

const isValidSession = (cookieHeader = '') => {
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!cookie) return false;
  const token = decodeURIComponent(cookie.slice(cookieName.length + 1));
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof session.expiresAt === 'number' && session.expiresAt > Date.now();
  } catch {
    return false;
  }
};

const sessionCookie = (token) =>
  `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionDurationSeconds}`;

const clearSessionCookie = () =>
  `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

const passwordMatches = (candidate) => {
  const candidateBuffer = Buffer.from(candidate);
  const passwordBuffer = Buffer.from(appPassword);
  return (
    candidateBuffer.length === passwordBuffer.length &&
    timingSafeEqual(candidateBuffer, passwordBuffer)
  );
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
    if (request.url?.startsWith('/api/session')) {
      if (request.method !== 'GET') {
        return sendJson(response, 405, { error: 'Metodo nao permitido.' });
      }

      return sendJson(response, 200, {
        authenticated: isValidSession(request.headers.cookie),
      });
    }

    if (request.url?.startsWith('/api/login')) {
      if (request.method !== 'POST') {
        return sendJson(response, 405, { error: 'Metodo nao permitido.' });
      }

      const body = await readBody(request);
      const payload = JSON.parse(body || '{}');
      if (!passwordMatches(String(payload.password || ''))) {
        return sendJson(response, 401, { error: 'Senha incorreta.' });
      }

      response.setHeader('Set-Cookie', sessionCookie(createSessionToken()));
      return sendJson(response, 200, { authenticated: true });
    }

    if (request.url?.startsWith('/api/logout')) {
      if (request.method !== 'POST') {
        return sendJson(response, 405, { error: 'Metodo nao permitido.' });
      }

      response.setHeader('Set-Cookie', clearSessionCookie());
      return sendJson(response, 200, { authenticated: false });
    }

    if (request.url?.startsWith('/api/expenses')) {
      if (!isValidSession(request.headers.cookie)) {
        return sendJson(response, 401, { error: 'Acesso nao autorizado.' });
      }

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
