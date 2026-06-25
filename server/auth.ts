import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'lopesrio_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET não configurado.');
  return secret;
};

const sign = (payload: string) =>
  createHmac('sha256', getSecret()).update(payload).digest('base64url');

export const createSessionToken = () => {
  const payload = Buffer.from(
    JSON.stringify({ expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

export const isValidSession = (cookieHeader = '') => {
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return false;
  const token = decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1));
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
    const session = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { expiresAt?: number };
    return typeof session.expiresAt === 'number' && session.expiresAt > Date.now();
  } catch {
    return false;
  }
};

export const sessionCookie = (token: string) =>
  `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}`;

export const clearSessionCookie = () =>
  `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export const passwordMatches = (candidate: string) => {
  const configuredPassword = process.env.APP_PASSWORD;
  if (!configuredPassword) throw new Error('APP_PASSWORD não configurada.');

  const candidateBuffer = Buffer.from(candidate);
  const passwordBuffer = Buffer.from(configuredPassword);
  return (
    candidateBuffer.length === passwordBuffer.length &&
    timingSafeEqual(candidateBuffer, passwordBuffer)
  );
};
