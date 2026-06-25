import { clearSessionCookie } from '../server/auth.js';

export default function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  response.setHeader('Set-Cookie', clearSessionCookie());
  return response.status(200).json({ authenticated: false });
}
