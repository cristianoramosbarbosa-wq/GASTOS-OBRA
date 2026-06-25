import { loadPerformanceData } from '../googleSheetsPublic.js';
import { isValidSession } from '../server/auth.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    if (!isValidSession(request.headers.cookie)) {
      return response.status(401).json({ error: 'Acesso não autorizado.' });
    }

    const payload = await loadPerformanceData();
    response.setHeader('Cache-Control', 'private, max-age=60');
    return response.status(200).json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao carregar os dados.';
    return response.status(500).json({ error: message });
  }
}
