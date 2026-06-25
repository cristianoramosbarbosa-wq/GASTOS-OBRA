import { isValidSession } from '../server/auth.js';

export default function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  return response.status(200).json({
    authenticated: isValidSession(request.headers.cookie),
  });
}
