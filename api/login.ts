import {
  createSessionToken,
  passwordMatches,
  sessionCookie,
} from '../server/auth.js';

export default function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const password = String(request.body?.password ?? '');
    if (!passwordMatches(password)) {
      return response.status(401).json({ error: 'Senha incorreta.' });
    }

    response.setHeader('Set-Cookie', sessionCookie(createSessionToken()));
    return response.status(200).json({ authenticated: true });
  } catch {
    return response.status(500).json({ error: 'Autenticação não configurada.' });
  }
}
